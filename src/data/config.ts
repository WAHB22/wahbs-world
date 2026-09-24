/** How this build syncs. Decided at build time from public environment variables. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export type SyncMode = "supabase" | "memory" | "device";
export const SYNC_MODE: SyncMode =
  SUPABASE_URL && SUPABASE_ANON_KEY ? "supabase" : process.env.NEXT_PUBLIC_SYNC_MODE === "memory" ? "memory" : "device";
