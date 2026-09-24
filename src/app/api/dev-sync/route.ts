import { ServerCore } from "@/data/sync/serverCore";

/**
 * In memory sync server for local development and the end to end tests.
 * Refuses to run unless SYNC_MODE=memory is set on the server.
 */
const g = globalThis as unknown as { __wahbServer?: ServerCore };

export async function POST(req: Request) {
  if (process.env.SYNC_MODE !== "memory") return new Response("Not found", { status: 404 });
  const server = (g.__wahbServer ??= new ServerCore());
  const body = await req.json();
  if (body.op === "push") return Response.json(server.push(body.changes));
  if (body.op === "pull") return Response.json(server.pull(Number(body.since) || 0, Math.min(Number(body.limit) || 500, 1000)));
  if (body.op === "reset") {
    g.__wahbServer = new ServerCore();
    return Response.json({ ok: true });
  }
  return new Response("Bad request", { status: 400 });
}
