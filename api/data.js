/**
 * /api/data: his saved finance data, kept as versions in the store.
 *
 *   GET              newest save as stored (the client migrates it), or { empty: true }
 *   GET ?history=1   { versions: [{ id, savedAt, note, size }] } newest first, at most 10
 *   GET ?id=<id>     that version, 404 when missing or outside this prefix
 *   PUT              full data; 409 { error: 'conflict', latest } when someone saved since
 *                    the base; else 200 { ok: true, savedAt, id }
 *
 * Every request needs x-app-key. Production uses finance/, everything else
 * finance-preview/ (seeded once from the newest live save).
 */
import { getSeedStore, getStore } from './_lib/store.js';
import {
  BodyTooBig,
  PREVIEW_PREFIX,
  declaredLength,
  hasStream,
  header,
  noStore,
  prefix,
  query,
  readStream,
  rejectWithoutKey,
  sendError,
  sendJson,
} from './_lib/http.js';
import { history, newestSave, readVersion, saveData, seedPreview } from './_lib/saves.js';

export const MAX_BODY = 1024 * 1024;

function flag(v) {
  return v != null && v !== '' && v !== '0' && v !== 'false';
}

async function getData(req, res) {
  const store = getStore();
  const pfx = prefix();
  const q = query(req);

  if (flag(q.history)) return sendJson(res, 200, { versions: await history(store, pfx) });

  if (q.id != null) {
    const text = await readVersion(store, pfx, String(q.id));
    if (text == null) return sendError(res, 404, 'not-found', 'That version was not found.');
    return sendJson(res, 200, text);
  }

  let latest = await newestSave(store, pfx);
  if (!latest && pfx === PREVIEW_PREFIX && (await seedPreview(store, getSeedStore()))) {
    latest = await newestSave(store, pfx);
  }
  if (!latest) return sendJson(res, 200, { empty: true });
  return sendJson(res, 200, latest.text);
}

const TOO_BIG = { status: 413, error: 'too-big', message: 'This save is over 1 MB.' };
const NOT_DATA = { status: 400, error: 'bad-data', message: 'This is not finance data.' };

/** The PUT body as an object, or the error to send. */
async function readData(req) {
  const len = declaredLength(req);
  if (len != null && len > MAX_BODY) return { fail: TOO_BIG };

  let body;
  try {
    body = req.body; // Vercel parses JSON lazily and throws on bad JSON
  } catch {
    return { fail: NOT_DATA };
  }
  if (body === undefined && hasStream(req)) {
    try {
      body = await readStream(req, MAX_BODY);
    } catch (e) {
      if (e instanceof BodyTooBig) return { fail: TOO_BIG };
      throw e;
    }
  }
  if (body instanceof Uint8Array) body = Buffer.from(body).toString('utf8');
  if (typeof body === 'string') {
    if (Buffer.byteLength(body) > MAX_BODY) return { fail: TOO_BIG };
    try {
      body = JSON.parse(body);
    } catch {
      return { fail: NOT_DATA };
    }
  } else if (body && typeof body === 'object' && Buffer.byteLength(JSON.stringify(body)) > MAX_BODY) {
    return { fail: TOO_BIG };
  }
  if (!body || typeof body !== 'object' || Array.isArray(body) || !Array.isArray(body.bills)) {
    return { fail: NOT_DATA };
  }
  return { data: body };
}

async function putData(req, res) {
  const { data, fail } = await readData(req);
  if (fail) return sendError(res, fail.status, fail.error, fail.message);

  const fromHeader = header(req, 'x-base-saved-at');
  const base = fromHeader !== undefined ? fromHeader : typeof data.savedAt === 'string' ? data.savedAt : undefined;

  const result = await saveData(getStore(), prefix(), data, base);
  if (result.status === 409) return sendJson(res, 409, { error: 'conflict', latest: result.latest });
  return sendJson(res, 200, { ok: true, savedAt: result.savedAt, id: result.id });
}

export default async function handler(req, res) {
  noStore(res);
  try {
    if (rejectWithoutKey(req, res)) return;
    if (req.method === 'GET') return await getData(req, res);
    if (req.method === 'PUT') return await putData(req, res);
    res.setHeader('Allow', 'GET, PUT');
    return sendError(res, 405, 'method', 'Use GET or PUT.');
  } catch (e) {
    console.error('api/data failed:', e?.message);
    return sendError(res, 500, 'server', 'Something went wrong on the server. Try again.');
  }
}
