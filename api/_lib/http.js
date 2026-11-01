/**
 * Small HTTP helpers shared by the API handlers. They only use plain Node
 * response methods (statusCode, setHeader, end), so they work on Vercel, in
 * scripts/dev-api.ts and with the test doubles.
 */
import { createHash, timingSafeEqual } from 'node:crypto';

export const LIVE_PREFIX = 'finance/';
export const PREVIEW_PREFIX = 'finance-preview/';
export const META_PREFIX = 'finance-meta/';

/** Production uses finance/; previews, dev and tests use finance-preview/. */
export function prefix(env = process.env) {
  return env.VERCEL_ENV === 'production' ? LIVE_PREFIX : PREVIEW_PREFIX;
}

export function noStore(res) {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
}

/** Sends a JSON body. `body` may be an already serialised JSON string. */
export function sendJson(res, status, body) {
  noStore(res);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

export function sendError(res, status, error, message, extra = {}) {
  sendJson(res, status, { error, ...(message ? { message } : {}), ...extra });
}

/** First value of a request header, or undefined. Node lowercases header names. */
export function header(req, name) {
  const v = req.headers?.[name.toLowerCase()];
  if (Array.isArray(v)) return v[0];
  return v == null ? undefined : String(v);
}

/** req.query from Vercel or dev-api, else parsed from req.url. */
export function query(req) {
  if (req.query && typeof req.query === 'object') return req.query;
  try {
    return Object.fromEntries(new URL(req.url ?? '/', 'http://localhost').searchParams);
  } catch {
    return {};
  }
}

function digest(s) {
  return createHash('sha256').update(String(s), 'utf8').digest();
}

/** Constant time compare: both sides are hashed first, so the buffers always match in length. */
export function sameSecret(a, b) {
  const x = digest(a);
  const y = digest(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/**
 * Device key check. Returns null when the request may go on, else the
 * response to send: 503 when APP_KEY is not set on the server, 401 otherwise.
 */
export function keyProblem(req, env = process.env) {
  const expected = env.APP_KEY;
  if (!expected) return { status: 503, body: { error: 'server-key-missing', message: 'The server is not set up yet.' } };
  const given = header(req, 'x-app-key');
  if (!given || !sameSecret(given, expected)) {
    return { status: 401, body: { error: 'no-key', message: 'This device is not set up.' } };
  }
  return null;
}

/** Sends the key error and returns true when the request has to stop. */
export function rejectWithoutKey(req, res, env = process.env) {
  const problem = keyProblem(req, env);
  if (!problem) return false;
  sendJson(res, problem.status, problem.body);
  return true;
}

export class BodyTooBig extends Error {
  constructor() {
    super('Body too big');
    this.code = 'too-big';
  }
}

/** Declared content-length, or null when missing or not a number. */
export function declaredLength(req) {
  const n = Number(header(req, 'content-length'));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Reads the request stream into a Buffer, stopping once it passes `limit` bytes. */
export async function readStream(req, limit) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buf.length;
    if (total > limit) throw new BodyTooBig();
    chunks.push(buf);
  }
  return Buffer.concat(chunks);
}

/** True when the request can still be read as a stream (body not parsed by a helper). */
export function hasStream(req) {
  return typeof req?.[Symbol.asyncIterator] === 'function' && req.readableEnded !== true;
}
