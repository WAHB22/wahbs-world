import Dexie, { type Table } from "dexie";
import { format, parse, receive, tick, type Clock } from "./hlc";
import { uuidv7 } from "./ids";
import { parseRow, TABLES, type AnyRow, type Input, type Row, type TableName } from "./schema";

/** Extra indexes per table, on top of id, rev and hlc. */
const INDEXES: Partial<Record<TableName, string>> = {
  days: "day",
  checkins: "local_day, kind",
  tasks: "area, due_on",
  terms: "status",
  courses: "term_id",
  schedule_blocks: "weekday, term_id",
  assessments: "due_on, course_id",
  shifts: "starts_at",
  transactions: "occurred_on",
  project_tasks: "project_id",
  memories: "occurred_on",
  people: "name",
  training_sessions: "occurred_on",
};

export type OutboxEntry = { seq?: number; table: TableName; row_id: string; hlc: string; row: AnyRow; queued_at: string };
type Meta = { key: string; value: unknown };

class WorldDb extends Dexie {
  outbox!: Table<OutboxEntry, number>;
  meta!: Table<Meta, string>;
  constructor(name: string) {
    super(name);
    const spec: Record<string, string> = { outbox: "++seq, table, row_id", meta: "key" };
    for (const t of TABLES) spec[t] = ["id", "rev", "hlc", INDEXES[t]].filter(Boolean).join(", ");
    this.version(1).stores(spec);
  }
  rows<T extends TableName>(t: T): Table<Row<T>, string> {
    return this.table(t) as Table<Row<T>, string>;
  }
}

type Listener = () => void;

/**
 * The device side of every write. A write is validated, stamped with the hybrid clock,
 * and stored together with its outbox entry in one IndexedDB transaction, so it is
 * saved before any network call happens and nothing can be half written.
 */
export class Store {
  private listeners = new Set<Listener>();
  private constructor(
    readonly db: WorldDb,
    readonly deviceId: string,
    private clock: Clock,
  ) {}

  static async open(name = "wahbs-world"): Promise<Store> {
    const db = new WorldDb(name);
    await db.open();
    let device = (await db.meta.get("device"))?.value as string | undefined;
    if (!device) {
      device = uuidv7().slice(-12);
      await db.meta.put({ key: "device", value: device });
    }
    const saved = (await db.meta.get("clock"))?.value as string | undefined;
    const clock = saved ? { ...parse(saved), device } : { wall: 0, counter: 0, device };
    return new Store(db, device, clock);
  }

  close() {
    this.db.close();
  }

  onLocalWrite(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private stamp(): string {
    this.clock = tick(this.clock, Date.now());
    return format(this.clock);
  }

  /** Create or replace a row. Returns the stored row. */
  async put<T extends TableName>(table: T, input: Partial<Input<T>> & Record<string, unknown>): Promise<Row<T>> {
    const now = new Date().toISOString();
    const existing = input.id ? await this.db.rows(table).get(input.id as string) : undefined;
    const hlc = this.stamp();
    const candidate = {
      ...(existing ?? {}),
      ...input,
      id: (input.id as string | undefined) ?? uuidv7(),
      created_at: (existing?.created_at as string | undefined) ?? (input.created_at as string | undefined) ?? now,
      updated_at: now,
      hlc,
      rev: existing?.rev ?? null,
      device_id: this.deviceId,
      user_id: existing?.user_id ?? null,
      deleted_at: (input.deleted_at as string | null | undefined) ?? (existing?.deleted_at as string | null | undefined) ?? null,
    };
    const row = parseRow(table, candidate);
    await this.db.transaction("rw", [this.db.table(table), this.db.outbox, this.db.meta], async () => {
      await this.db.rows(table).put(row);
      await this.db.outbox.add({ table, row_id: row.id, hlc, row: row as AnyRow, queued_at: now });
      await this.db.meta.put({ key: "clock", value: hlc });
    });
    this.listeners.forEach((fn) => fn());
    return row;
  }

  /** Change some fields of an existing row. */
  async patch<T extends TableName>(table: T, id: string, changes: Partial<Input<T>>): Promise<Row<T>> {
    const existing = await this.db.rows(table).get(id);
    if (!existing) throw new Error(`${table} ${id} not found`);
    return this.put(table, { ...(existing as object), ...(changes as object), id } as Partial<Input<T>>);
  }

  /** Soft delete: the tombstone syncs so the other device learns about it. */
  async remove<T extends TableName>(table: T, id: string): Promise<void> {
    await this.patch(table, id, { deleted_at: new Date().toISOString() } as Partial<Input<T>>);
  }

  async restore<T extends TableName>(table: T, id: string): Promise<void> {
    await this.patch(table, id, { deleted_at: null } as Partial<Input<T>>);
  }

  async get<T extends TableName>(table: T, id: string): Promise<Row<T> | undefined> {
    return this.db.rows(table).get(id);
  }

  /** Live rows only (tombstones hidden). */
  async all<T extends TableName>(table: T): Promise<Row<T>[]> {
    return (await this.db.rows(table).toArray()).filter((r) => !r.deleted_at);
  }

  /**
   * Merge a row that came from the server or an import. Newer hybrid clock wins;
   * an equal clock only records the server revision. Nothing is queued for upload
   * unless `queue` is set (imports queue, pulls do not).
   */
  async applyRemote(table: TableName, incoming: AnyRow, opts: { queue?: boolean } = {}): Promise<"applied" | "same" | "older"> {
    const row = parseRow(table, incoming) as AnyRow;
    this.clock = receive(this.clock, row.hlc, Date.now());
    let outcome = "older" as "applied" | "same" | "older";
    await this.db.transaction("rw", [this.db.table(table), this.db.outbox, this.db.meta], async () => {
      const local = (await this.db.table(table).get(row.id)) as AnyRow | undefined;
      if (!local || row.hlc > local.hlc) {
        await this.db.table(table).put(row);
        if (opts.queue) {
          await this.db.outbox.add({ table, row_id: row.id, hlc: row.hlc, row, queued_at: new Date().toISOString() });
        }
        outcome = "applied";
      } else if (row.hlc === local.hlc) {
        if (row.rev != null && local.rev !== row.rev) await this.db.table(table).update(row.id, { rev: row.rev, user_id: row.user_id });
        outcome = "same";
      }
      await this.db.meta.put({ key: "clock", value: format(this.clock) });
    });
    if (opts.queue && outcome === "applied") this.listeners.forEach((fn) => fn());
    return outcome;
  }

  /** Record the server revision for a row we pushed, if it has not changed since. */
  async confirm(table: TableName, id: string, hlc: string, rev: number, userId: string | null) {
    await this.db.transaction("rw", this.db.table(table), async () => {
      const local = (await this.db.table(table).get(id)) as AnyRow | undefined;
      if (local && local.hlc === hlc) await this.db.table(table).update(id, { rev, user_id: userId ?? local.user_id });
    });
  }

  async pendingCount(): Promise<number> {
    return this.db.outbox.count();
  }

  async getMeta<V>(key: string): Promise<V | undefined> {
    return (await this.db.meta.get(key))?.value as V | undefined;
  }

  async setMeta(key: string, value: unknown) {
    await this.db.meta.put({ key, value });
  }
}
