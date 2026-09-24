import type { SupabaseClient } from "@supabase/supabase-js";
import type { Change, PullResult, PushResult, Transport } from "./types";

/** Talks to the development and test server route (/api/dev-sync), which holds rows in memory. */
export class HttpMemoryTransport implements Transport {
  readonly name = "memory";
  constructor(private base = "/api/dev-sync") {}
  private async call<R>(body: unknown): Promise<R> {
    const res = await fetch(this.base, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`sync server answered ${res.status}`);
    return res.json() as Promise<R>;
  }
  push(changes: Change[]) {
    return this.call<PushResult>({ op: "push", changes });
  }
  pull(since: number, limit: number) {
    return this.call<PullResult>({ op: "pull", since, limit });
  }
}

/** Production: two Postgres functions, protected by row level security. */
export class SupabaseTransport implements Transport {
  readonly name = "supabase";
  constructor(private client: SupabaseClient) {}
  async push(changes: Change[]): Promise<PushResult> {
    const { data, error } = await this.client.rpc("sync_push", { changes });
    if (error) throw new Error(error.message);
    return data as PushResult;
  }
  async pull(since: number, limit: number): Promise<PullResult> {
    const { data, error } = await this.client.rpc("sync_pull", { since, max_rows: limit });
    if (error) throw new Error(error.message);
    return data as PullResult;
  }
}
