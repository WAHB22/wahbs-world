#!/usr/bin/env node
/**
 * Copies his newest 10 saves (finance/data-*) from the old public Blob store to
 * the new private one, oldest first so uploadedAt keeps the same order, then
 * reads back the newest copy and checks it opens. Dry run unless --write.
 * Never deletes anything. Prints file names and sizes only, never the data.
 *
 *   OLD_BLOB_TOKEN=<old public store> NEW_BLOB_TOKEN=<new private store> \
 *     node scripts/copy-to-private-store.mjs [--write]
 */
import { pathToFileURL } from 'node:url';
import { createVercelStore, isExistsError } from '../api/_lib/store.js';
import { KEEP, listSaves, newestSave, parseObject } from '../api/_lib/saves.js';
import { LIVE_PREFIX } from '../api/_lib/http.js';

function opensAsData(data) {
  return Boolean(data && Array.isArray(data.bills));
}

/**
 * @returns {Promise<{ planned: number, copied: number, skipped: number, ok: boolean, newest?: string }>}
 */
export async function copySaves({ from, to, write = false, log = console.log, pfx = LIVE_PREFIX }) {
  const saves = (await listSaves(from, pfx)).slice(0, KEEP).reverse();
  if (!saves.length) {
    log('No saves found in the old store.');
    return { planned: 0, copied: 0, skipped: 0, ok: false };
  }
  const already = new Set((await to.list(pfx)).map((b) => b.pathname));
  const todo = saves.filter((b) => !already.has(b.pathname));
  for (const b of saves) {
    if (already.has(b.pathname)) log(`skip   ${b.pathname} (already in the new store)`);
  }

  if (!write) {
    for (const b of todo) log(`would copy ${b.pathname}  ${new Date(b.uploadedAt).toISOString()}  ${b.size} bytes`);
    const newest = await newestSave(from, pfx);
    const ok = opensAsData(newest?.data);
    log(ok ? `Newest old save opens (${newest.data.bills.length} bills).` : 'The newest old save does not open as finance data.');
    log(`Dry run: ${todo.length} to copy. Run again with --write to copy them.`);
    return { planned: todo.length, copied: 0, skipped: saves.length - todo.length, ok };
  }

  let copied = 0;
  let skipped = saves.length - todo.length;
  for (const b of todo) {
    const text = await from.read(b.pathname);
    if (text == null || !parseObject(text)) throw new Error(`Could not read ${b.pathname} from the old store.`);
    try {
      await to.write(b.pathname, text, { allowOverwrite: false, addRandomSuffix: false, contentType: 'application/json' });
      copied += 1;
      log(`copied ${b.pathname}`);
    } catch (e) {
      if (!isExistsError(e)) throw e;
      skipped += 1;
      log(`skip   ${b.pathname} (already in the new store)`);
    }
  }

  const newest = await newestSave(to, pfx);
  const expected = saves[saves.length - 1].pathname;
  const ok = opensAsData(newest?.data) && newest.blob.pathname === expected;
  if (ok) {
    log(`Check passed: the newest save in the new store opens (${newest.data.bills.length} bills, saved ${newest.data.savedAt}).`);
  } else {
    log(`Check failed: expected ${expected} to be the newest save in the new store and to open, got ${newest?.blob.pathname ?? 'nothing'}.`);
  }
  return { planned: todo.length, copied, skipped, ok, newest: newest?.blob.pathname };
}

async function main() {
  const write = process.argv.includes('--write');
  const oldToken = process.env.OLD_BLOB_TOKEN;
  const newToken = process.env.NEW_BLOB_TOKEN;
  if (!oldToken || !newToken) {
    console.error('Set OLD_BLOB_TOKEN (the old public store) and NEW_BLOB_TOKEN (the new private store).');
    process.exit(2);
  }
  if (oldToken === newToken) {
    console.error('OLD_BLOB_TOKEN and NEW_BLOB_TOKEN are the same store.');
    process.exit(2);
  }
  const from = createVercelStore({ token: oldToken, access: 'public' });
  const to = createVercelStore({ token: newToken, access: 'private' });
  const result = await copySaves({ from, to, write });
  process.exit(result.ok ? 0 : 1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(e?.message ?? e);
    process.exit(1);
  });
}
