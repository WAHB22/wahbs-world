import type { Store } from "../store";
import type { OutboxEntry } from "../store";
import type { Transport } from "./types";

export type SyncState = "idle" | "syncing" | "offline" | "error" | "device-only";
export type SyncStatus = { state: SyncState; pending: number; lastSyncedAt: string | null; error: string | null };

const BATCH = 200;
const PULL_LIMIT = 500;

/**
 * Drains the outbox to the server and pulls what the other device wrote.
 * Pushing first means our own edits reach the server before we compare against it.
 * An outbox entry is deleted only after the server confirms the batch.
 */
export class SyncEngine {
  private running: Promise<void> | null = null;
  private again = false;
  private listeners = new Set<(s: SyncStatus) => void>();
  private timers: (() => void)[] = [];
  private failures = 0;
  status: SyncStatus = { state: "idle", pending: 0, lastSyncedAt: null, error: null };

  constructor(
    private store: Store,
    private transport: Transport | null,
    private isOnline: () => boolean = () => (typeof navigator === "undefined" ? true : navigator.onLine),
  ) {
    if (!transport) this.status.state = "device-only";
  }

  subscribe(fn: (s: SyncStatus) => void): () => void {
    this.listeners.add(fn);
    fn(this.status);
    return () => this.listeners.delete(fn);
  }

  private async set(patch: Partial<SyncStatus>) {
    const pending = await this.store.pendingCount();
    this.status = { ...this.status, ...patch, pending };
    this.listeners.forEach((fn) => fn(this.status));
  }

  /** Run one full cycle. Concurrent calls coalesce into one extra cycle. */
  sync(): Promise<void> {
    if (this.running) {
      this.again = true;
      return this.running;
    }
    this.running = (async () => {
      try {
        do {
          this.again = false;
          await this.cycle();
        } while (this.again);
      } finally {
        this.running = null;
      }
    })();
    return this.running;
  }

  private async cycle() {
    if (!this.transport) return this.set({ state: "device-only" });
    if (!this.isOnline()) return this.set({ state: "offline" });
    await this.set({ state: "syncing", error: null });
    try {
      await this.pushAll();
      await this.pullAll();
      this.failures = 0;
      await this.store.setMeta("lastSyncedAt", new Date().toISOString());
      await this.set({ state: "idle", lastSyncedAt: new Date().toISOString() });
    } catch (e) {
      this.failures++;
      const offline = !this.isOnline() || (e instanceof TypeError && /fetch|network/i.test(e.message));
      await this.set({ state: offline ? "offline" : "error", error: e instanceof Error ? e.message : String(e) });
    }
  }

  private async pushAll() {
    const transport = this.transport!;
    for (;;) {
      const batch: OutboxEntry[] = await this.store.db.outbox.orderBy("seq").limit(BATCH).toArray();
      if (!batch.length) return;
      // Several edits to one row in a batch: only the latest needs sending.
      const latest = new Map<string, OutboxEntry>();
      for (const e of batch) latest.set(`${e.table}/${e.row_id}`, e);
      const result = await transport.push([...latest.values()].map((e) => ({ table: e.table, row: e.row })));
      for (const a of result.accepted) await this.store.confirm(a.table, a.id, a.hlc, a.rev, a.user_id);
      for (const n of result.newer) await this.store.applyRemote(n.table, n.row);
      await this.store.db.outbox.bulkDelete(batch.map((e) => e.seq!));
    }
  }

  private async pullAll() {
    const transport = this.transport!;
    for (;;) {
      const since = (await this.store.getMeta<number>("lastRev")) ?? 0;
      const { changes, max_rev, more } = await transport.pull(since, PULL_LIMIT);
      for (const c of changes) await this.store.applyRemote(c.table, c.row);
      await this.store.setMeta("lastRev", max_rev);
      if (!more) return;
    }
  }

  /** Browser wiring: sync on start, on reconnect, on focus, after local writes, every minute while visible. */
  start() {
    if (typeof window === "undefined") return;
    const kick = () => void this.sync();
    let debounce: ReturnType<typeof setTimeout> | undefined;
    const soon = () => {
      clearTimeout(debounce);
      debounce = setTimeout(kick, 400);
    };
    const onVisible = () => document.visibilityState === "visible" && kick();
    const onOffline = () => void this.set({ state: "offline" });
    window.addEventListener("online", kick);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);
    // Show the waiting count the moment something is saved, then sync shortly after.
    const off = this.store.onLocalWrite(() => {
      void this.set({});
      soon();
    });
    const every = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      // back off after repeated errors: 1, 2, 4, 8 minutes
      if (this.failures && Date.now() % (60_000 * 2 ** Math.min(this.failures, 3)) > 60_000) return;
      kick();
    }, 60_000);
    this.timers.push(() => {
      window.removeEventListener("online", kick);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
      off();
      clearInterval(every);
      clearTimeout(debounce);
    });
    void this.set({});
    kick();
  }

  stop() {
    this.timers.forEach((f) => f());
    this.timers = [];
  }

  /** Let the interface refresh the waiting count after a local write. */
  refresh() {
    return this.set({});
  }
}
