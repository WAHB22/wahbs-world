/**
 * Saved data versions in the store: `${prefix}data-<ms>-<suffix>.json`, newest
 * by uploadedAt, the newest 10 kept. A save from a stale base gets a 409, and a
 * lock blob per base makes two saves from the same base race safely.
 */
import { createHash } from 'node:crypto';
import { isExistsError } from './store.js';
import { LIVE_PREFIX, PREVIEW_PREFIX } from './http.js';

export const KEEP = 10;
export const NOTE_MAX = 120;
export const SEED_NOTE = 'Copy of live data for previews';
/** A lock this old belongs to a save that died half way, so it may be taken over. */
export const LOCK_STALE_MS = 60_000;
const JSON_TYPE = 'application/json';

export function parseObject(text) {
  if (typeof text !== 'string') return null;
  try {
    const v = JSON.parse(text);
    return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
  } catch {
    return null;
  }
}

/** A data blob directly under the prefix (not under locks/ or anywhere else). */
export function isDataPath(pathname, pfx) {
  if (typeof pathname !== 'string') return false;
  if (!pathname.startsWith(`${pfx}data-`) || !pathname.endsWith('.json')) return false;
  const rest = pathname.slice(pfx.length);
  return !rest.includes('/') && !rest.includes('..');
}

function newestFirst(a, b) {
  if (b.uploadedAt !== a.uploadedAt) return b.uploadedAt - a.uploadedAt;
  return a.pathname < b.pathname ? 1 : a.pathname > b.pathname ? -1 : 0;
}

export async function listSaves(store, pfx) {
  const blobs = await store.list(`${pfx}data-`);
  return blobs.filter((b) => isDataPath(b.pathname, pfx)).sort(newestFirst);
}

/** The newest save that can still be read: { blob, text, data }, or null. */
export async function newestSave(store, pfx) {
  for (const blob of await listSaves(store, pfx)) {
    const text = await store.read(blob.pathname);
    if (text != null) return { blob, text, data: parseObject(text) };
  }
  return null;
}

function savedAtOf(save) {
  const s = save?.data?.savedAt;
  return typeof s === 'string' ? s : undefined;
}

export function trimNote(note) {
  return Array.from(note.trim()).slice(0, NOTE_MAX).join('').trim();
}

export function lockPath(pfx, base) {
  const hash = createHash('sha1')
    .update(base ?? '', 'utf8')
    .digest('hex');
  return `${pfx}locks/${hash}.json`;
}

/** Now as ISO, but always after the previous savedAt so equal stamps never hide a conflict. */
export function nextSavedAt(previous, nowMs) {
  const prev = Date.parse(previous ?? '');
  return new Date(Number.isFinite(prev) ? Math.max(nowMs, prev + 1) : nowMs).toISOString();
}

const sleepMs = (ms) => new Promise((r) => setTimeout(r, ms));

async function takeLock(store, lock, now) {
  const body = JSON.stringify({ at: new Date(now()).toISOString() });
  try {
    await store.write(lock, body, { allowOverwrite: false, contentType: JSON_TYPE });
    return true;
  } catch (e) {
    if (!isExistsError(e)) throw e;
  }
  const held = (await store.list(lock)).find((b) => b.pathname === lock);
  if (!held || now() - held.uploadedAt <= LOCK_STALE_MS) return false;
  await store.remove([lock]);
  try {
    await store.write(lock, body, { allowOverwrite: false, contentType: JSON_TYPE });
    return true;
  } catch (e) {
    if (isExistsError(e)) return false;
    throw e;
  }
}

/** After losing the lock, wait a moment for the winner's save so the 409 carries it. */
async function latestAfterLoss(store, pfx, base, fallback, sleep) {
  let fresh = null;
  for (let i = 0; i < 4; i++) {
    fresh = await newestSave(store, pfx);
    if (fresh && savedAtOf(fresh) !== base) return fresh.data;
    await sleep(150);
  }
  return fresh?.data ?? fallback ?? null;
}

/**
 * Keeps the newest KEEP saves. Removes the older ones and the lock taken from
 * each of them (the lock name comes from the savedAt it was based on).
 */
export async function prune(store, pfx) {
  const old = (await listSaves(store, pfx)).slice(KEEP);
  if (!old.length) return [];
  const existingLocks = new Set((await store.list(`${pfx}locks/`)).map((b) => b.pathname));
  const locks = [];
  for (const b of old) {
    const lock = lockPath(pfx, savedAtOf({ data: parseObject(await store.read(b.pathname)) }));
    if (existingLocks.has(lock)) locks.push(lock);
  }
  const gone = [...old.map((b) => b.pathname), ...locks];
  await store.remove(gone);
  return gone;
}

/**
 * Writes a new version. `base` is the savedAt the client started from
 * (undefined when it started from nothing).
 * Returns { status: 200, savedAt, id } or { status: 409, latest }.
 */
export async function saveData(store, pfx, data, base, { now = Date.now, sleep = sleepMs } = {}) {
  const latest = await newestSave(store, pfx);
  if (latest && savedAtOf(latest) !== base) return { status: 409, latest: latest.data };

  const lock = lockPath(pfx, base);
  if (!(await takeLock(store, lock, now))) {
    return { status: 409, latest: await latestAfterLoss(store, pfx, base, latest?.data, sleep) };
  }

  const savedAt = nextSavedAt(savedAtOf(latest), now());
  const doc = { ...data, savedAt };
  if (typeof data.note === 'string') doc.note = trimNote(data.note);
  let written;
  try {
    written = await store.write(`${pfx}data-${now()}.json`, JSON.stringify(doc), {
      addRandomSuffix: true,
      allowOverwrite: false,
      contentType: JSON_TYPE,
    });
  } catch (e) {
    // Free the base again, or every later save from it would get a 409.
    await store.remove([lock]).catch(() => {});
    throw e;
  }
  try {
    await prune(store, pfx);
  } catch (e) {
    console.error('prune failed:', e?.message);
  }
  return { status: 200, savedAt, id: written.pathname };
}

/** History list: newest first, at most KEEP. */
export async function history(store, pfx) {
  const saves = (await listSaves(store, pfx)).slice(0, KEEP);
  const rows = await Promise.all(
    saves.map(async (b) => {
      const text = await store.read(b.pathname);
      if (text == null) return null;
      const d = parseObject(text);
      return {
        id: b.pathname,
        savedAt: typeof d?.savedAt === 'string' ? d.savedAt : new Date(b.uploadedAt).toISOString(),
        note: typeof d?.note === 'string' ? d.note : '',
        size: b.size,
      };
    }),
  );
  return rows.filter(Boolean);
}

/** One version's JSON text, or null when missing or outside the prefix. */
export async function readVersion(store, pfx, id) {
  if (!isDataPath(id, pfx)) return null;
  return store.read(id);
}

/**
 * Previews start from a copy of the newest live save. The copy keeps the live
 * file name, so two first visits at once cannot make two copies.
 * Returns true when preview data exists afterwards.
 */
export async function seedPreview(store, source = store) {
  const src = await newestSave(source, LIVE_PREFIX);
  if (!src?.data) return false;
  const name = src.blob.pathname.slice(LIVE_PREFIX.length);
  const copy = { ...src.data, note: SEED_NOTE };
  try {
    await store.write(`${PREVIEW_PREFIX}${name}`, JSON.stringify(copy), {
      allowOverwrite: false,
      addRandomSuffix: false,
      contentType: JSON_TYPE,
    });
  } catch (e) {
    if (!isExistsError(e)) throw e;
  }
  return true;
}
