import { createClient } from "@supabase/supabase-js";
import { TABLES } from "@/data/schema";
import { EXPORT_SCHEMA } from "@/data/backup";

/**
 * Daily backup, called by Vercel Cron (vercel.json). Writes a JSON snapshot of every table
 * to the private "backups" bucket and keeps the last 14. The query also counts as database
 * activity, which keeps a free Supabase project from pausing during a week away.
 */
export const dynamic = "force-dynamic";
const KEEP = 14;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) return new Response("Unauthorized", { status: 401 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return new Response("Backup not configured", { status: 503 });

  const db = createClient(url, key, { auth: { persistSession: false } });
  const tables: Record<string, unknown[]> = {};
  for (const t of TABLES) {
    const rows: unknown[] = [];
    for (let from = 0; ; from += 1000) {
      const { data, error } = await db.from(t).select("*").order("rev").range(from, from + 999);
      if (error) return new Response(`Backup failed on ${t}: ${error.message}`, { status: 500 });
      rows.push(...data);
      if (data.length < 1000) break;
    }
    if (rows.length) tables[t] = rows;
  }
  const now = new Date();
  const body = JSON.stringify({ app: "wahbs-world", schema: EXPORT_SCHEMA, exported_at: now.toISOString(), device_id: "server-backup", tables });
  const name = `${now.toISOString().slice(0, 10)}.json`;
  const up = await db.storage.from("backups").upload(name, body, { contentType: "application/json", upsert: true });
  if (up.error) return new Response(`Upload failed: ${up.error.message}`, { status: 500 });

  const { data: files } = await db.storage.from("backups").list("", { sortBy: { column: "name", order: "desc" }, limit: 100 });
  const old = (files ?? []).filter((f) => f.name.endsWith(".json")).slice(KEEP).map((f) => f.name);
  if (old.length) await db.storage.from("backups").remove(old);
  return Response.json({ ok: true, file: name, bytes: body.length, removed: old.length });
}
