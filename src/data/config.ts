/** How this build syncs. Decided at build time from public environment variables. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** A readable problem when the server settings are filled in wrong (for example a key pasted into the URL field). */
export const CONFIG_ERROR: string | null =
  SUPABASE_URL && !/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)\/?$/.test(SUPABASE_URL)
    ? "NEXT_PUBLIC_SUPABASE_URL should look like https://yourproject.supabase.co. Fix it in Vercel, then redeploy."
    : SUPABASE_URL && !SUPABASE_ANON_KEY
      ? "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing. Add it in Vercel, then redeploy."
      : null;

export type SyncMode = "supabase" | "memory" | "device";
export const SYNC_MODE: SyncMode =
  SUPABASE_URL && SUPABASE_ANON_KEY && !CONFIG_ERROR ? "supabase" : process.env.NEXT_PUBLIC_SYNC_MODE === "memory" ? "memory" : "device";
