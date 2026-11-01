/**
 * POST /api/read: raw bytes of one image or PDF in, transactions out.
 *
 * Headers: x-app-key, x-media-type, x-file-name (URI encoded), x-today (YYYY-MM-DD).
 * Returns { rows: ReadRow[], remaining }. The file is sent to Claude and never stored.
 */
import { getStore } from './_lib/store.js';
import {
  BodyTooBig,
  declaredLength,
  hasStream,
  header,
  noStore,
  readStream,
  rejectWithoutKey,
  sendError,
  sendJson,
} from './_lib/http.js';
import { DEFAULT_MODEL, ReadError, readRows } from './_lib/claude.js';
import { LIMIT_MESSAGE, takeRead } from './_lib/read-limit.js';
import { pickToday } from './_lib/rows.js';

export const MAX_FILE = 10 * 1024 * 1024;
export const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

const TYPE_MESSAGE = 'This file type cannot be read. Use a JPEG, PNG, WebP, GIF or PDF.';
const TOO_BIG = { status: 413, error: 'too-big', message: 'This file is over 10 MB. Try a smaller one.' };

/** Origin (or else Referer) must name this host. Requests with neither are allowed. */
export function sameOrigin(req) {
  const source = header(req, 'origin') ?? header(req, 'referer');
  if (source === undefined) return true;
  const host = (header(req, 'host') ?? '').toLowerCase();
  try {
    return host !== '' && new URL(source).host.toLowerCase() === host;
  } catch {
    return false; // 'null' or junk
  }
}

/** First bytes match the claimed type, so a mislabelled file never costs a read. */
export function looksLike(mediaType, buf) {
  const ascii = (start, end) => buf.subarray(start, end).toString('latin1');
  switch (mediaType) {
    case 'image/jpeg':
      return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    case 'image/png':
      return ascii(0, 8) === '\x89PNG\r\n\x1a\n';
    case 'image/gif':
      return ascii(0, 4) === 'GIF8';
    case 'image/webp':
      return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';
    case 'application/pdf':
      return ascii(0, 1024).includes('%PDF-');
    default:
      return false;
  }
}

function fileName(req) {
  const raw = header(req, 'x-file-name');
  if (!raw) return '';
  let name;
  try {
    name = decodeURIComponent(raw);
  } catch {
    name = raw;
  }
  return Array.from(name.replace(/[\u0000-\u001f\u007f"]/g, ' ').trim()).slice(0, 120).join('');
}

/** The file bytes, or the error to send. */
async function readFile(req) {
  const len = declaredLength(req);
  if (len != null && len > MAX_FILE) return { fail: TOO_BIG };
  let body;
  try {
    body = req.body;
  } catch {
    body = undefined;
  }
  if (body instanceof Uint8Array) body = Buffer.from(body.buffer, body.byteOffset, body.byteLength);
  else if (body == null && hasStream(req)) {
    try {
      body = await readStream(req, MAX_FILE);
    } catch (e) {
      if (e instanceof BodyTooBig) return { fail: TOO_BIG };
      throw e;
    }
  } else if (body != null) {
    // A string or object body means it was not sent as raw bytes.
    return { fail: { status: 415, error: 'type', message: 'Send the file as raw bytes.' } };
  }
  if (!body || !body.length) return { fail: { status: 400, error: 'empty', message: 'The file is empty.' } };
  if (body.length > MAX_FILE) return { fail: TOO_BIG };
  return { bytes: body };
}

async function handleRead(req, res) {
  if (!sameOrigin(req)) return sendError(res, 403, 'origin', 'Reading only works from this page.');

  const mediaType = (header(req, 'x-media-type') ?? '').split(';')[0].trim().toLowerCase();
  if (!MEDIA_TYPES.includes(mediaType)) return sendError(res, 415, 'type', TYPE_MESSAGE);

  const { bytes, fail } = await readFile(req);
  if (fail) return sendError(res, fail.status, fail.error, fail.message);
  if (!looksLike(mediaType, bytes)) return sendError(res, 415, 'type', TYPE_MESSAGE);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return sendError(res, 503, 'reader-missing', 'Reading is not set up on the server yet.');

  const today = pickToday(header(req, 'x-today'), Date.now());
  const slot = await takeRead(getStore(), today);
  if (!slot.ok) return sendJson(res, 429, { error: 'limit', message: LIMIT_MESSAGE });

  try {
    const rows = await readRows({
      bytes,
      mediaType,
      fileName: fileName(req),
      today,
      apiKey,
      model: process.env.READ_MODEL || DEFAULT_MODEL,
    });
    return sendJson(res, 200, { rows, remaining: slot.remaining });
  } catch (e) {
    if (e instanceof ReadError) return sendError(res, e.status, e.code, e.message, { remaining: slot.remaining });
    throw e;
  }
}

export default async function handler(req, res) {
  noStore(res);
  try {
    if (rejectWithoutKey(req, res)) return;
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return sendError(res, 405, 'method', 'Use POST.');
    }
    return await handleRead(req, res);
  } catch (e) {
    console.error('api/read failed:', e?.constructor?.name);
    return sendError(res, 500, 'server', 'Something went wrong on the server. Try again.');
  }
}
