import type { AnyRow, TableName } from "../schema";

export type Change = { table: TableName; row: AnyRow };
export type PushResult = {
  /** rows the server stored, with the revision it assigned */
  accepted: { table: TableName; id: string; hlc: string; rev: number; user_id: string | null }[];
  /** rows where the server already had a newer version; that version is returned */
  newer: Change[];
};
export type PullResult = { changes: Change[]; max_rev: number; more: boolean };

/** How the device talks to the meeting point. Supabase in production, memory in tests. */
export interface Transport {
  readonly name: string;
  push(changes: Change[]): Promise<PushResult>;
  pull(sinceRev: number, limit: number): Promise<PullResult>;
}
