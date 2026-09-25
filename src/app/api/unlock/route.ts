import { createClient } from "@supabase/supabase-js";
import { createHash, timingSafeEqual } from "node:crypto";

/**
 * One password per device, no email. The owner's email and the access password live only in
 * server environment variables (OWNER_EMAIL, ACCESS_PASSWORD). On the right password this route
 * makes sure the single account exists with that password, signs in, and hands the session to
 * the device, which keeps it: the next visits open straight into the world.
 */
export const dynamic = "force-dynamic";

const same = (a: string, b: string) => timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.OWNER_EMAIL;
  const password = process.env.ACCESS_PASSWORD;
  if (!url || !anon || !service || !email || !password) {
    return Response.json({ error: "setup", message: "The access password is not set up yet. Add OWNER_EMAIL and ACCESS_PASSWORD in Vercel, then redeploy." }, { status: 503 });
  }
  const body = (await req.json().catch(() => ({}))) as { password?: unknown };
  if (typeof body.password !== "string" || !same(body.password, password)) {
    await wait(800); // slows down guessing
    return Response.json({ error: "wrong", message: "That password is not right." }, { status: 401 });
  }

  const client = createClient(url, anon, { auth: { persistSession: false } });
  let res = await client.auth.signInWithPassword({ email, password });
  if (res.error) {
    // First time, or the password was changed in Vercel: create or update the one account.
    const admin = createClient(url, service, { auth: { persistSession: false } }).auth.admin;
    const { data: list, error: listError } = await admin.listUsers({ perPage: 100 });
    if (listError) return Response.json({ error: "server", message: listError.message }, { status: 500 });
    const existing = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    const done = existing
      ? await admin.updateUserById(existing.id, { password, email_confirm: true })
      : await admin.createUser({ email, password, email_confirm: true });
    if (done.error) return Response.json({ error: "server", message: done.error.message }, { status: 500 });
    res = await client.auth.signInWithPassword({ email, password });
    if (res.error) return Response.json({ error: "server", message: res.error.message }, { status: 500 });
  }
  const s = res.data.session!;
  return Response.json({ access_token: s.access_token, refresh_token: s.refresh_token });
}
