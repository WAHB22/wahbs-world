import { isTable, type AnyRow, type TableName } from "../schema";
import type { Change, PullResult, PushResult } from "./types";

/**
 * The server rules in plain TypeScript: the same rules as the sync_push and sync_pull
 * functions in supabase/migrations/0001_init.sql. Used by the memory transport for
 * tests and local development, and as the reference the SQL is tested against.
 */
export class ServerCore {
  private rows = new Map<string, Map<string, AnyRow>>();
  private rev = 0;
  readonly history: { table: TableName; row: AnyRow }[] = [];

  constructor(private userId = "00000000-0000-4000-8000-000000000001") {}

  private tableMap(t: TableName) {
    let m = this.rows.get(t);
    if (!m) this.rows.set(t, (m = new Map()));
    return m;
  }

  push(changes: Change[]): PushResult {
    const out: PushResult = { accepted: [], newer: [] };
    for (const { table, row } of changes) {
      if (!isTable(table)) continue;
      const m = this.tableMap(table);
      const existing = m.get(row.id);
      if (existing && existing.hlc >= row.hlc) {
        if (existing.hlc === row.hlc) out.accepted.push({ table, id: row.id, hlc: row.hlc, rev: existing.rev as number, user_id: this.userId });
        else out.newer.push({ table, row: existing });
        continue;
      }
      if (existing) this.history.push({ table, row: existing });
      const stored = { ...row, user_id: this.userId, rev: ++this.rev };
      m.set(row.id, stored);
      out.accepted.push({ table, id: row.id, hlc: row.hlc, rev: stored.rev, user_id: this.userId });
    }
    return out;
  }

  pull(since: number, limit: number): PullResult {
    const all: Change[] = [];
    for (const [table, m] of this.rows) for (const row of m.values()) if ((row.rev as number) > since) all.push({ table: table as TableName, row });
    all.sort((a, b) => (a.row.rev as number) - (b.row.rev as number));
    const changes = all.slice(0, limit);
    const max_rev = changes.length ? (changes[changes.length - 1].row.rev as number) : since;
    return { changes, max_rev, more: all.length > limit };
  }

  count(table: TableName) {
    return this.tableMap(table).size;
  }
}
