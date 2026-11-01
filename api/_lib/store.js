/**
 * Storage behind the API. One small interface, three implementations:
 *
 *   list(prefix)    -> [{ pathname, size, uploadedAt }] (uploadedAt in ms, any order)
 *   read(pathname)  -> string, or null when there is no such blob
 *   write(pathname, body, { allowOverwrite, addRandomSuffix, contentType }) -> { pathname }
 *                      throws a StoreExistsError when allowOverwrite is false and the
 *                      pathname is taken (this is what the save lock relies on)
 *   remove(pathnames)
 *
 * Vercel Blob in production and previews, the local fs under .data/ for dev
 * (FINANCE_STORE=fs), memory for tests (FINANCE_STORE=memory or setStoreForTests).
 */
import { randomBytes } from 'node:crypto';
import { promises as fsp } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { put, list, del, get, head, BlobPreconditionFailedError, BlobNotFoundError } from '@vercel/blob';

export class StoreExistsError extends Error {
  constructor(pathname) {
    super(`Already exists: ${pathname}`);
    this.name = 'StoreExistsError';
    this.code = 'exists';
    this.pathname = pathname;
  }
}

export function isExistsError(e) {
  return Boolean(e && e.code === 'exists');
}

/** Same shape as Vercel's random suffix: name-XXXX.ext */
export function withRandomSuffix(pathname) {
  const suffix = randomBytes(12).toString('base64url').replace(/[-_]/g, '').slice(0, 12) || 'x';
  const slash = pathname.lastIndexOf('/');
  const dot = pathname.lastIndexOf('.');
  if (dot > slash) return `${pathname.slice(0, dot)}-${suffix}${pathname.slice(dot)}`;
  return `${pathname}-${suffix}`;
}

/** Rejects pathnames that could leave the store root. */
export function assertSafePathname(pathname) {
  const ok =
    typeof pathname === 'string' &&
    pathname.length > 0 &&
    pathname.length <= 512 &&
    !pathname.startsWith('/') &&
    !/[\\\0]/.test(pathname) &&
    pathname.split('/').every((part) => part !== '' && part !== '.' && part !== '..');
  if (!ok) throw new Error('Bad pathname');
  return pathname;
}

/** Strictly increasing ms stamps, so two writes in the same ms still sort. */
function monotonicClock() {
  let last = 0;
  return () => {
    last = Math.max(Date.now(), last + 1);
    return last;
  };
}

/* ---------------- memory ---------------- */

export function createMemoryStore() {
  const files = new Map();
  const stamp = monotonicClock();
  const tick = () => new Promise((r) => setImmediate(r));
  return {
    kind: 'memory',
    async list(prefix) {
      await tick();
      return [...files.entries()]
        .filter(([p]) => p.startsWith(prefix))
        .map(([pathname, f]) => ({ pathname, size: f.size, uploadedAt: f.uploadedAt }));
    },
    async read(pathname) {
      await tick();
      const f = files.get(pathname);
      return f ? f.body : null;
    },
    async write(pathname, body, opts = {}) {
      await tick();
      const target = assertSafePathname(opts.addRandomSuffix ? withRandomSuffix(pathname) : pathname);
      // Check and set with no await in between: atomic, like a real conditional put.
      if (!opts.allowOverwrite && files.has(target)) throw new StoreExistsError(target);
      const text = String(body);
      files.set(target, { body: text, size: Buffer.byteLength(text), uploadedAt: stamp() });
      return { pathname: target };
    },
    async remove(pathnames) {
      await tick();
      for (const p of pathnames) files.delete(p);
    },
    /** Tests only: every pathname, sorted. */
    paths() {
      return [...files.keys()].sort();
    },
  };
}

/* ---------------- local fs (.data/) ---------------- */

export const DEFAULT_FS_ROOT = fileURLToPath(new URL('../../.data/', import.meta.url));

export function createFsStore({ root = DEFAULT_FS_ROOT } = {}) {
  const stamp = monotonicClock();
  const abs = (pathname) => path.join(root, ...assertSafePathname(pathname).split('/'));
  const tmpDir = path.join(root, '.tmp');

  async function walk(dir, rel, out) {
    let entries;
    try {
      entries = await fsp.readdir(dir, { withFileTypes: true });
    } catch (e) {
      if (e.code === 'ENOENT') return out;
      throw e;
    }
    for (const ent of entries) {
      if (ent.name.startsWith('.')) continue; // .tmp and other hidden files
      const relPath = rel ? `${rel}/${ent.name}` : ent.name;
      if (ent.isDirectory()) await walk(path.join(dir, ent.name), relPath, out);
      else if (ent.isFile()) out.push(relPath);
    }
    return out;
  }

  async function setStamp(file) {
    const t = new Date(stamp());
    await fsp.utimes(file, t, t);
  }

  return {
    kind: 'fs',
    root,
    async list(prefix) {
      const all = await walk(root, '', []);
      const hits = all.filter((p) => p.startsWith(prefix));
      const rows = await Promise.all(
        hits.map(async (pathname) => {
          try {
            const st = await fsp.stat(abs(pathname));
            return { pathname, size: st.size, uploadedAt: Math.round(st.mtimeMs) };
          } catch (e) {
            if (e.code === 'ENOENT') return null; // removed while listing
            throw e;
          }
        }),
      );
      return rows.filter(Boolean);
    },
    async read(pathname) {
      try {
        return await fsp.readFile(abs(pathname), 'utf8');
      } catch (e) {
        if (e.code === 'ENOENT') return null;
        throw e;
      }
    },
    async write(pathname, body, opts = {}) {
      const target = assertSafePathname(opts.addRandomSuffix ? withRandomSuffix(pathname) : pathname);
      const file = abs(target);
      await fsp.mkdir(path.dirname(file), { recursive: true });
      if (!opts.allowOverwrite) {
        // 'wx' creates the file only if it does not exist: atomic across processes.
        let fh;
        try {
          fh = await fsp.open(file, 'wx');
        } catch (e) {
          if (e.code === 'EEXIST') throw new StoreExistsError(target);
          throw e;
        }
        try {
          await fh.writeFile(String(body), 'utf8');
        } finally {
          await fh.close();
        }
      } else {
        // Write then rename, so a reader never sees half a file.
        await fsp.mkdir(tmpDir, { recursive: true });
        const tmp = path.join(tmpDir, `${Date.now()}-${randomBytes(6).toString('hex')}`);
        await fsp.writeFile(tmp, String(body), 'utf8');
        await fsp.rename(tmp, file);
      }
      await setStamp(file);
      return { pathname: target };
    },
    async remove(pathnames) {
      await Promise.all(pathnames.map((p) => fsp.rm(abs(p), { force: true })));
    },
  };
}

/* ---------------- Vercel Blob ---------------- */

export function blobAccess(env = process.env) {
  return env.FINANCE_BLOB_ACCESS === 'public' ? 'public' : 'private';
}

function isBlobExistsError(e) {
  return e instanceof BlobPreconditionFailedError || /already exists/i.test(String(e && e.message));
}

/**
 * @param {{ access?: 'public'|'private', token?: string, fetchImpl?: typeof fetch }} [opts]
 * token defaults to BLOB_READ_WRITE_TOKEN (read by the SDK).
 */
export function createVercelStore({ access = blobAccess(), token, fetchImpl = fetch } = {}) {
  const auth = token ? { token } : {};
  /** Public reads need the blob url; remember the ones list() has seen. */
  const urls = new Map();

  async function readPublic(pathname) {
    let url = urls.get(pathname);
    if (!url) {
      try {
        url = (await head(pathname, auth)).url;
      } catch (e) {
        if (e instanceof BlobNotFoundError) return null;
        throw e;
      }
    }
    const r = await fetchImpl(url, { cache: 'no-store' });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`Blob read failed: ${r.status}`);
    return r.text();
  }

  async function readPrivate(pathname) {
    const r = await get(pathname, { access: 'private', useCache: false, ...auth });
    if (!r || r.statusCode !== 200) return null;
    return new Response(r.stream).text();
  }

  return {
    kind: 'vercel',
    access,
    async list(prefix) {
      const out = [];
      let cursor;
      do {
        const page = await list({ prefix, limit: 1000, cursor, ...auth });
        for (const b of page.blobs) {
          urls.set(b.pathname, b.url);
          out.push({ pathname: b.pathname, size: b.size, uploadedAt: new Date(b.uploadedAt).getTime() });
        }
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
      return out;
    },
    read(pathname) {
      return access === 'public' ? readPublic(pathname) : readPrivate(pathname);
    },
    async write(pathname, body, opts = {}) {
      try {
        const blob = await put(pathname, String(body), {
          access,
          addRandomSuffix: Boolean(opts.addRandomSuffix),
          allowOverwrite: Boolean(opts.allowOverwrite),
          contentType: opts.contentType || 'application/json',
          // Public blobs sit behind a CDN; keep overwritten ones (the read counter) fresh.
          ...(access === 'public' && opts.allowOverwrite ? { cacheControlMaxAge: 60 } : {}),
          ...auth,
        });
        urls.set(blob.pathname, blob.url);
        return { pathname: blob.pathname };
      } catch (e) {
        if (!opts.allowOverwrite && isBlobExistsError(e)) throw new StoreExistsError(pathname);
        throw e;
      }
    },
    async remove(pathnames) {
      if (!pathnames.length) return;
      await del(pathnames, auth);
      for (const p of pathnames) urls.delete(p);
    },
  };
}

/* ---------------- selection ---------------- */

let testStore = null;
const cached = {};

/** Tests: use this store for every request. Pass null to go back to the env choice. */
export function setStoreForTests(store) {
  testStore = store;
}

export function getStore(env = process.env) {
  if (testStore) return testStore;
  const kind = env.FINANCE_STORE === 'fs' || env.FINANCE_STORE === 'memory' ? env.FINANCE_STORE : 'vercel';
  if (kind === 'fs') return (cached.fs ??= createFsStore());
  if (kind === 'memory') return (cached.memory ??= createMemoryStore());
  const access = blobAccess(env);
  const key = `vercel-${access}`;
  // FINANCE_BLOB_TOKEN (or FINANCE_PRIVATE_READ_WRITE_TOKEN, made by connecting the store
  // with prefix FINANCE_PRIVATE) points at the private store; without it the SDK uses BLOB_READ_WRITE_TOKEN.
  return (cached[key] ??= createVercelStore({ access, token: env.FINANCE_BLOB_TOKEN || env.FINANCE_PRIVATE_READ_WRITE_TOKEN || undefined }));
}

/**
 * Where a preview copies the live data from the first time it opens.
 * While the live data still sits in the old public store, set
 * FINANCE_SEED_ACCESS=public (token from FINANCE_SEED_TOKEN, else
 * BLOB_READ_WRITE_TOKEN). It is only ever read, never written.
 */
export function getSeedStore(env = process.env) {
  if (testStore) return testStore;
  if (env.FINANCE_SEED_ACCESS !== 'public' && env.FINANCE_SEED_ACCESS !== 'private') return getStore(env);
  const token = env.FINANCE_SEED_TOKEN || env.BLOB_READ_WRITE_TOKEN || undefined;
  return (cached[`seed-${env.FINANCE_SEED_ACCESS}`] ??= createVercelStore({ access: env.FINANCE_SEED_ACCESS, token }));
}
