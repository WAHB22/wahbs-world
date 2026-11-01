/**
 * Dev only: serves api/*.js through the Vite dev server with the small part of
 * Vercel's Node helpers the handlers use (req.query, req.body, res.status/json/send).
 * Storage is the local fs store (FINANCE_STORE=fs, files under .data/).
 * Never used in production builds.
 */
import type { Plugin, ViteDevServer } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

type Req = IncomingMessage & { query: Record<string, string>; body: unknown };
type Res = ServerResponse & {
  status(code: number): Res;
  json(v: unknown): Res;
  send(v: unknown): Res;
};

async function readBody(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  return Buffer.concat(chunks);
}

export function adapt(req: IncomingMessage, res: ServerResponse, raw: Buffer): { req: Req; res: Res } {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const r = req as Req;
  r.query = Object.fromEntries(url.searchParams);
  const type = String(req.headers['content-type'] ?? '');
  if (!raw.length) r.body = undefined;
  else if (type.includes('application/json')) {
    try {
      r.body = JSON.parse(raw.toString('utf8'));
    } catch {
      r.body = raw.toString('utf8');
    }
  } else if (type.startsWith('text/')) r.body = raw.toString('utf8');
  else r.body = raw;
  const s = res as Res;
  s.status = (code: number) => {
    s.statusCode = code;
    return s;
  };
  s.json = (v: unknown) => {
    if (!s.getHeader('content-type')) s.setHeader('content-type', 'application/json; charset=utf-8');
    s.end(JSON.stringify(v));
    return s;
  };
  s.send = (v: unknown) => {
    if (typeof v === 'object' && v !== null && !Buffer.isBuffer(v)) return s.json(v);
    s.end(v as string | Buffer);
    return s;
  };
  return { req: r, res: s };
}

export function devApi(): Plugin {
  return {
    name: 'wahb-dev-api',
    apply: 'serve',
    configureServer(server: ViteDevServer) {
      process.env.FINANCE_STORE ??= 'fs';
      process.env.APP_KEY ??= 'dev-key';
      server.middlewares.use(async (req, res, next) => {
        const m = /^\/api\/([a-z0-9_-]+)(?:\?|$)/i.exec(req.url ?? '');
        if (!m || m[1].startsWith('_')) return next();
        try {
          const mod = await server.ssrLoadModule(`/api/${m[1]}.js`);
          const raw = await readBody(req);
          const { req: r, res: s } = adapt(req, res, raw);
          await mod.default(r, s);
        } catch (e) {
          res.statusCode = 500;
          res.setHeader('content-type', 'application/json');
          res.end(JSON.stringify({ error: String((e as Error)?.message ?? e) }));
        }
      });
    },
  };
}
