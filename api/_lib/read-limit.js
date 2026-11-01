/**
 * Daily cap on /api/read calls, counted in finance-meta/read-count-YYYY-MM-DD.json.
 * The meta prefix is shared by production and previews: it guards one API key.
 * Read then overwrite is not atomic, so two calls in the same instant can both
 * pass at 29. That is fine for a cost guard.
 */
import { META_PREFIX } from './http.js';
import { parseObject } from './saves.js';

export const DAILY_READS = 30;
export const LIMIT_MESSAGE = 'You have used all 30 reads for today. It resets at midnight.';

export function countPath(day) {
  return `${META_PREFIX}read-count-${day}.json`;
}

export async function readsUsed(store, day) {
  const prev = parseObject(await store.read(countPath(day)));
  return Number.isInteger(prev?.count) && prev.count > 0 ? prev.count : 0;
}

/** Counts one read. { ok: false } when today's reads are used up. */
export async function takeRead(store, day) {
  const used = await readsUsed(store, day);
  if (used >= DAILY_READS) return { ok: false, remaining: 0 };
  await store.write(countPath(day), JSON.stringify({ day, count: used + 1 }), {
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: 'application/json',
  });
  return { ok: true, remaining: DAILY_READS - used - 1 };
}
