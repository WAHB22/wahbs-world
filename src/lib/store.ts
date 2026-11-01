/**
 * The app store: loads Wahb's data, applies changes, saves them and makes them
 * undoable. Contract: src/lib/store-api.ts. Rules: docs/SPEC.md "Client sync (store)".
 *
 * How a change travels. commit() runs the recipe with immer and keeps, per
 * change: the recipe (replayed when another device saved first, 409), patches
 * (replayed after a reload, when the recipe is gone) and inverse patches (undo).
 * Changes wait in `pending`, mirrored in localStorage 'finance-pending', until a
 * PUT carrying them succeeds. The latest data is mirrored in 'finance-cache'.
 *
 * Patches are id aware: a row in a list is addressed by its id, not its
 * position. immer's own array patches are positional (deleting one row is
 * "replace every later row, remove the last"), which replayed on newer data from
 * the other device would overwrite the wrong rows.
 */
import { freeze, produce, type Draft } from 'immer';
import { createStore, type StoreApi } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import {
  ApiError,
  ConflictError,
  createApi,
  getKey,
  isApiError,
  setupKeyFromUrl,
  type FetchLike,
  type HistoryLike,
  type LocationLike,
  type StorageLike,
} from './api';
import { monthKey, todayISO } from './dates';
import { defaults } from './defaults';
import { uid } from './ids';
import { comparable, looksLikeFinanceData, migrate } from './migrate';
import { joinNotes } from './notes';
import type { FinanceStore, Recipe, SyncState, UndoEntry } from './store-api';
import type { FinanceData, ISODate } from './types';

export const CACHE_KEY = 'finance-cache';
export const PENDING_KEY = 'finance-pending';
export const SAVE_DELAY_MS = 700;
/** Wait before each retry when offline or the server fails; the last one repeats. */
export const RETRY_MS = [5000, 10000, 30000, 60000];
export const MAX_CONFLICT_RETRIES = 3;

const MSG = {
  unreachable: 'Could not reach the server. Check the connection and try again.',
  keyRefused: 'This device key was refused. Open your private link again.',
  busy: 'Not synced yet, another device keeps saving. Will retry.',
};

export interface StoreDeps {
  fetch: FetchLike;
  storage: StorageLike;
  location: LocationLike;
  history: HistoryLike;
  now(): number;
  today(): ISODate;
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
  /** Where 'online' and 'visibilitychange' are heard. Missing: no automatic retry or refresh. */
  addEventListener?(type: 'online' | 'visibilitychange', fn: () => void): void;
  /** Is the tab visible now. Missing: always visible. */
  isVisible?(): boolean;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const hasOwn = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

// ---------- id aware patches ----------

type Id = string | number;
/** A row of a list, found by its id. */
type Anchor = { id: Id };
/** Insert after the row with this id; null = at the start. */
type After = { after: Id | null };
/** A key of an object, a row anchor, an insert position, or '-' to append. */
export type Seg = string | Anchor | After;

export interface SyncPatch {
  op: 'add' | 'remove' | 'replace';
  path: Seg[];
  value?: unknown;
}

type Row = Record<string, unknown> & { id: Id };

const isRow = (v: unknown): v is Row => isObj(v) && (typeof v.id === 'string' || typeof v.id === 'number');
const isAnchor = (s: unknown): s is Anchor => isObj(s) && 'id' in s;
const isAfter = (s: unknown): s is After => isObj(s) && 'after' in s;

/** A list whose entries all have their own id (bills, items, tx, pays, moves...). */
function isRowList(v: unknown): v is Row[] {
  if (!Array.isArray(v) || !v.every(isRow)) return false;
  return new Set(v.map((r) => r.id)).size === v.length;
}

function indexOfId(list: unknown[], id: Id): number {
  return list.findIndex((r) => isObj(r) && r.id === id);
}

function sameIds(a: Id[], b: Id[]): boolean {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

/**
 * Patches that turn a into b. Unchanged parts are skipped by reference, so this
 * is cheap for immer results. Lists of rows are compared by id.
 */
export function syncDiff(a: unknown, b: unknown, path: Seg[] = [], out: SyncPatch[] = []): SyncPatch[] {
  if (Object.is(a, b)) return out;
  if (isObj(a) && isObj(b)) {
    for (const k of Object.keys(a)) if (!hasOwn(b, k)) out.push({ op: 'remove', path: [...path, k] });
    for (const k of Object.keys(b)) {
      if (!hasOwn(a, k)) out.push({ op: 'add', path: [...path, k], value: b[k] });
      else syncDiff(a[k], b[k], [...path, k], out);
    }
  } else if (isRowList(a) && isRowList(b)) {
    diffRows(a, b, path, out);
  } else {
    out.push({ op: 'replace', path, value: b });
  }
  return out;
}

function diffRows(a: Row[], b: Row[], path: Seg[], out: SyncPatch[]): void {
  const before = new Map(a.map((r) => [r.id, r]));
  const after = new Set(b.map((r) => r.id));
  // Rows were reordered: positions matter, so send the whole list.
  const keptA = a.filter((r) => after.has(r.id)).map((r) => r.id);
  const keptB = b.filter((r) => before.has(r.id)).map((r) => r.id);
  if (!sameIds(keptA, keptB)) {
    out.push({ op: 'replace', path, value: b });
    return;
  }
  for (const r of a) if (!after.has(r.id)) out.push({ op: 'remove', path: [...path, { id: r.id }] });
  const lastKept = b.findLastIndex((r) => before.has(r.id));
  b.forEach((r, i) => {
    const old = before.get(r.id);
    if (old) syncDiff(old, r, [...path, { id: r.id }], out);
    else out.push({ op: 'add', path: [...path, i > lastKept ? '-' : { after: i ? b[i - 1].id : null }], value: r });
  });
}

function isPatch(p: unknown): p is SyncPatch {
  return isObj(p) && (p.op === 'add' || p.op === 'remove' || p.op === 'replace') && Array.isArray(p.path) && p.path.length > 0;
}

/** Key of `seg` in `node` when it is there, else null. */
function locate(node: unknown, seg: Seg): string | number | null {
  if (Array.isArray(node)) {
    if (!isAnchor(seg)) return null;
    const i = indexOfId(node, seg.id);
    return i < 0 ? null : i;
  }
  if (isObj(node) && typeof seg === 'string' && seg !== '__proto__' && hasOwn(node, seg)) return seg;
  return null;
}

function changeRow(list: unknown[], seg: Seg, p: SyncPatch): void {
  const at = isAnchor(seg) ? indexOfId(list, seg.id) : -1;
  if (p.op === 'remove') {
    if (at >= 0) list.splice(at, 1);
    return;
  }
  if (p.op === 'replace') {
    if (at >= 0) list[at] = p.value;
    return;
  }
  // A row with this id is already here (the same change replayed twice): replace, never double.
  const dup = isRow(p.value) ? indexOfId(list, p.value.id) : -1;
  if (dup >= 0) list[dup] = p.value;
  else if (seg === '-') list.push(p.value);
  else if (isAfter(seg) && seg.after === null) list.unshift(p.value);
  else if (isAfter(seg)) {
    const prev = indexOfId(list, seg.after as Id);
    // The row it followed is gone: put it at the end.
    if (prev < 0) list.push(p.value);
    else list.splice(prev + 1, 0, p.value);
  }
}

/** A key added here while the other device added it too (a new month on both): keep both sides. */
function mergeInto(target: Record<string, unknown>, extra: Record<string, unknown>): void {
  for (const [k, v] of Object.entries(extra)) {
    if (k === '__proto__') continue;
    const cur = target[k];
    if (!hasOwn(target, k)) target[k] = v;
    else if (isObj(cur) && isObj(v)) mergeInto(cur, v);
    else if (isRowList(cur) && isRowList(v)) for (const r of v) changeRow(cur, '-', { op: 'add', path: ['-'], value: r });
    else target[k] = v;
  }
}

function changeKey(obj: Record<string, unknown>, key: string, p: SyncPatch): void {
  if (p.op === 'remove') {
    delete obj[key];
    return;
  }
  const cur = obj[key];
  if (p.op === 'add' && hasOwn(obj, key) && isObj(cur) && isObj(p.value)) mergeInto(cur, p.value);
  else obj[key] = p.value;
}

function applyOne(root: unknown, p: SyncPatch): void {
  let node = root;
  for (const seg of p.path.slice(0, -1)) {
    const k = locate(node, seg);
    // That part of the data is gone (deleted on the other device): nothing left to change.
    if (k === null) return;
    node = (node as Record<string | number, unknown>)[k];
  }
  const last = p.path[p.path.length - 1];
  if (Array.isArray(node)) changeRow(node, last, p);
  else if (isObj(node) && typeof last === 'string' && last !== '__proto__') changeKey(node, last, p);
}

/** Applies patches to an immer draft (or any plain mutable tree). */
export function applyToDraft(root: unknown, patches: readonly unknown[]): void {
  for (const p of patches) if (isPatch(p)) applyOne(root, p);
}

/** New state with the patches applied. Patches whose target is gone are skipped. */
export function applySync<T extends object>(state: T, patches: readonly unknown[]): T {
  return produce(state as object, (d) => {
    applyToDraft(d, patches);
  }) as T;
}

// ---------- store ----------

interface UndoInfo {
  entry: UndoEntry;
  /** Updated when the change is replayed on newer data, so undo always fits. */
  inverse: SyncPatch[];
}

interface Change {
  id: string;
  note: string;
  /** Gone after a reload: the patches are replayed instead. */
  recipe?: Recipe;
  patches: SyncPatch[];
  /** Set when this is the change the undo bar would reverse. */
  undo?: UndoInfo;
}

/** localStorage 'finance-pending'. patches[i] and notes[i] belong to the same change. */
interface StoredPending {
  baseSavedAt: string | null;
  patches: SyncPatch[][];
  notes: string[];
}

function run(base: FinanceData, recipe: Recipe): FinanceData {
  return produce(base, (d: Draft<FinanceData>) => recipe(d) as Draft<FinanceData> | void) as FinanceData;
}

/** The incoming data with the savedAt and note of the data it replaces, so only real content differs. */
function keepMeta(incoming: FinanceData, current: { savedAt?: string; note?: string }): FinanceData {
  const { savedAt: _s, note: _n, ...rest } = incoming;
  return {
    ...rest,
    ...(current.savedAt !== undefined ? { savedAt: current.savedAt } : {}),
    ...(current.note !== undefined ? { note: current.note } : {}),
  } as FinanceData;
}

const ready = (d: FinanceData): FinanceData => freeze(d, true);

export function createFinanceStore(deps: StoreDeps): StoreApi<FinanceStore> {
  let key: string | null = null;
  const api = createApi({ fetch: deps.fetch, key: () => key });
  /** savedAt of the server version our data is built on. null = nothing saved yet. */
  let baseSavedAt: string | null = null;
  /** That server version, when we have it (not after starting offline). */
  let baseData: FinanceData | null = null;
  let pending: Change[] = [];
  let undoInfo: UndoInfo | null = null;
  let timer: unknown = null;
  let saving: Promise<void> | null = null;
  let loading: Promise<void> | null = null;
  let refreshing = false;
  let failures = 0;
  let listening = false;

  const startDay = deps.today();
  const store = createStore<FinanceStore>()(() => ({
    boot: 'loading',
    sync: { kind: 'idle' },
    data: null,
    month: monthKey(startDay),
    today: startDay,
    lastUndo: null,
    init,
    commit,
    undo,
    dismissUndo,
    setMonth: (month) => store.setState({ month }),
    replaceAll,
    flush,
  }));
  const get = () => store.getState();
  const set = (patch: Partial<FinanceStore>) => store.setState(patch);

  // ----- device storage -----

  function read(name: string): unknown {
    try {
      const s = deps.storage.getItem(name);
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  }

  function write(name: string, v: unknown): void {
    try {
      deps.storage.setItem(name, JSON.stringify(v));
    } catch {
      // Full or blocked: the copy in memory still gets saved to the server.
    }
  }

  function forget(name: string): void {
    try {
      deps.storage.removeItem(name);
    } catch {
      // Blocked storage: nothing to forget.
    }
  }

  function readCache(): FinanceData | null {
    const raw = read(CACHE_KEY);
    try {
      return looksLikeFinanceData(raw) ? ready(migrate(raw)) : null;
    } catch {
      return null;
    }
  }

  function readPending(): { baseSavedAt: string | null; changes: Change[] } | null {
    const v = read(PENDING_KEY);
    if (!isObj(v) || !Array.isArray(v.patches) || !v.patches.length) return null;
    const notes = Array.isArray(v.notes) ? v.notes : [];
    return {
      baseSavedAt: typeof v.baseSavedAt === 'string' ? v.baseSavedAt : null,
      changes: v.patches.map((p, i) => ({
        id: uid(),
        note: typeof notes[i] === 'string' ? notes[i] : '',
        patches: Array.isArray(p) ? p.filter(isPatch) : [],
      })),
    };
  }

  function keepPending(): void {
    if (!pending.length) return forget(PENDING_KEY);
    const v: StoredPending = { baseSavedAt, patches: pending.map((c) => c.patches), notes: pending.map((c) => c.note) };
    write(PENDING_KEY, v);
  }

  function show(data: FinanceData): void {
    set({ data });
    write(CACHE_KEY, data);
  }

  const idle = (): SyncState => (baseSavedAt ? { kind: 'idle', savedAt: baseSavedAt } : { kind: 'idle' });

  // ----- loading -----

  function init(): Promise<void> {
    if (get().boot === 'ready') return Promise.resolve();
    loading ??= load().finally(() => {
      loading = null;
    });
    return loading;
  }

  async function load(): Promise<void> {
    listen();
    key = setupKeyFromUrl(deps.location, deps.history, deps.storage) ?? getKey(deps.storage);
    if (!key) return set({ boot: 'no-key' });
    set({ boot: 'loading' });
    const stored = readPending();
    let raw: unknown;
    try {
      raw = await api.getData();
    } catch (e) {
      if (isApiError(e, 'bad-key')) return set({ boot: 'bad-key' });
      return startOffline(stored);
    }
    if (raw === null) return startEmpty(stored);
    if (!looksLikeFinanceData(raw)) return startOffline(stored);
    startOnline(ready(migrate(raw)), stored);
  }

  /** Server data, with changes left from the last visit replayed on it. */
  function startOnline(latest: FinanceData, stored: ReturnType<typeof readPending>): void {
    baseData = latest;
    baseSavedAt = latest.savedAt ?? null;
    pending = stored?.changes ?? [];
    show(pending.length ? rebuild(latest) : latest);
    keepPending();
    set({ boot: 'ready', sync: pending.length ? { kind: 'saving' } : idle() });
    if (pending.length) void flush();
  }

  /**
   * Nothing on the server yet. This device's copy is uploaded when there is one
   * (as the live page does), else the defaults: "Started fresh".
   */
  function startEmpty(stored: ReturnType<typeof readPending>): void {
    baseData = null;
    baseSavedAt = null;
    const cache = readCache();
    if (cache && stored) pending = stored.changes;
    else pending = [noteOnly(cache ? "Saved this device's copy" : 'Started fresh')];
    show(cache ?? ready(defaults()));
    keepPending();
    set({ boot: 'ready', sync: { kind: 'saving' } });
    void flush();
  }

  /** No answer from the server: show this device's copy and keep its pending changes. */
  function startOffline(stored: ReturnType<typeof readPending>): void {
    const cache = readCache();
    if (!cache) return set({ boot: 'error', sync: { kind: 'error', message: MSG.unreachable } });
    baseData = null;
    baseSavedAt = stored ? stored.baseSavedAt : (cache.savedAt ?? null);
    pending = stored?.changes ?? [];
    show(cache);
    set({ boot: 'ready', sync: { kind: 'offline-copy' } });
    if (pending.length) retryLater();
  }

  /** A save that changes nothing by itself, so the data as it is gets uploaded. */
  function noteOnly(note: string): Change {
    return { id: uid(), note, recipe: () => {}, patches: [] };
  }

  // ----- changes -----

  function commit(note: string, recipe: Recipe, opts?: { undoable?: boolean }): UndoEntry | null {
    const before = get().data;
    if (!before) return null;
    const after = run(before, recipe);
    const patches = syncDiff(before, after);
    if (!patches.length) return null;
    const entry: UndoEntry = { id: uid(), note, at: deps.now() };
    // Not undoable: the older undo no longer fits on top of this change, so it goes too.
    undoInfo = opts?.undoable === false ? null : { entry, inverse: syncDiff(after, before) };
    pending.push({ id: entry.id, note, recipe, patches, undo: undoInfo ?? undefined });
    show(after);
    keepPending();
    set({ lastUndo: undoInfo?.entry ?? null, sync: { kind: 'saving' } });
    schedule(SAVE_DELAY_MS);
    return entry;
  }

  function undo(id?: string): void {
    const info = undoInfo;
    if (!info || (id !== undefined && id !== info.entry.id)) return;
    // Reads info.inverse when it runs, so a replay after a 409 uses the refreshed inverse.
    commit(`Undid: ${info.entry.note}`, (d) => {
      applyToDraft(d, info.inverse);
    }, { undoable: false });
    undoInfo = null;
    set({ lastUndo: null });
  }

  function dismissUndo(): void {
    undoInfo = null;
    set({ lastUndo: null });
  }

  function replaceAll(next: FinanceData, note: string): void {
    const incoming = ready(migrate(next));
    commit(note, (d) => keepMeta(incoming, d));
  }

  /** Pending changes on top of newer data: recipes when we still have them, else their patches. */
  function rebuild(from: FinanceData): FinanceData {
    let state = from;
    for (const c of pending) state = replay(state, c);
    return state;
  }

  function replay(state: FinanceData, c: Change): FinanceData {
    if (c.recipe) {
      try {
        const next = run(state, c.recipe);
        c.patches = syncDiff(state, next);
        if (c.undo) c.undo.inverse = syncDiff(next, state);
        return next;
      } catch {
        // The recipe does not fit the newer data: fall back to its patches.
      }
    }
    try {
      return applySync(state, c.patches);
    } catch {
      return state;
    }
  }

  // ----- saving -----

  function schedule(ms: number): void {
    stopTimer();
    timer = deps.setTimeout(() => {
      timer = null;
      void flush();
    }, ms);
  }

  function stopTimer(): void {
    if (timer === null) return;
    deps.clearTimeout(timer);
    timer = null;
  }

  function retryLater(): void {
    schedule(RETRY_MS[Math.min(failures, RETRY_MS.length - 1)]);
    failures++;
  }

  function flush(): Promise<void> {
    stopTimer();
    if (saving) return saving;
    if (!pending.length || !get().data) return Promise.resolve();
    saving = saveAll()
      .catch(failed)
      .finally(() => {
        saving = null;
      });
    return saving;
  }

  /** One PUT of everything pending, rebuilt and sent again after a 409, up to 3 times. */
  async function saveAll(): Promise<void> {
    for (let attempt = 0; ; attempt++) {
      const sent = pending.slice();
      const snapshot = get().data;
      if (!sent.length || !snapshot) return;
      if (baseData && comparable(snapshot) === comparable(baseData)) return nothingToSave(sent);
      const note = joinNotes(sent.map((c) => c.note));
      set({ sync: { kind: 'saving' } });
      try {
        const res = await api.putData({ ...snapshot, note }, baseSavedAt);
        return saved(sent, snapshot, note, res.savedAt);
      } catch (e) {
        if (e instanceof ConflictError && attempt < MAX_CONFLICT_RETRIES && (await rebase(e.latest))) continue;
        return failed(e);
      }
    }
  }

  function dropSent(sent: Change[]): void {
    pending = pending.filter((c) => !sent.includes(c));
    keepPending();
  }

  /** The changes cancel out (a change and its undo, both unsent): no new version. */
  function nothingToSave(sent: Change[]): void {
    dropSent(sent);
    if (pending.length) return schedule(SAVE_DELAY_MS);
    if (baseData) show(baseData);
    set({ sync: idle() });
  }

  function saved(sent: Change[], snapshot: FinanceData, note: string, savedAt: string): void {
    failures = 0;
    baseSavedAt = savedAt;
    baseData = produce(snapshot, (d) => {
      d.note = note;
      d.savedAt = savedAt;
    });
    dropSent(sent);
    if (!pending.length) {
      show(baseData);
      return set({ sync: idle() });
    }
    // Changes made while this PUT was out go in the next one.
    show(produce(get().data!, (d) => {
      d.savedAt = savedAt;
    }));
    schedule(SAVE_DELAY_MS);
  }

  /** 409: the newest save becomes our base and pending changes are replayed on it. */
  async function rebase(latestRaw: unknown): Promise<boolean> {
    let raw = latestRaw;
    if (!looksLikeFinanceData(raw)) {
      try {
        raw = await api.getData();
      } catch {
        return false;
      }
      if (!looksLikeFinanceData(raw)) return false;
    }
    const latest = ready(migrate(raw));
    baseData = latest;
    baseSavedAt = latest.savedAt ?? null;
    show(rebuild(latest));
    keepPending();
    return true;
  }

  function failed(e: unknown): void {
    if (isApiError(e, 'bad-key')) return set({ sync: { kind: 'error', message: MSG.keyRefused } });
    if (isApiError(e, 'conflict')) {
      set({ sync: { kind: 'error', message: MSG.busy } });
      return retryLater();
    }
    if (isApiError(e, 'offline') || (e instanceof ApiError && (e.status ?? 0) >= 500)) {
      set({ sync: { kind: 'offline' } });
      return retryLater();
    }
    // 400, 413 and the like: trying again will not help, so wait for a tap.
    const why = e instanceof ApiError ? e.message.replace(/\.$/, '') : 'Something went wrong';
    set({ sync: { kind: 'error', message: `Not synced yet. ${why}.` } });
  }

  // ----- coming back -----

  function listen(): void {
    if (listening || !deps.addEventListener) return;
    listening = true;
    deps.addEventListener('online', wake);
    deps.addEventListener('visibilitychange', () => {
      if (deps.isVisible && !deps.isVisible()) return;
      refreshToday();
      wake();
    });
  }

  function wake(): void {
    const boot = get().boot;
    if (boot === 'error') return void init();
    if (boot !== 'ready') return;
    if (pending.length) return void flush();
    void refresh();
  }

  function refreshToday(): void {
    const today = deps.today();
    const s = get();
    if (today === s.today) return;
    // Follow the calendar when the current month was on screen.
    const month = s.month === monthKey(s.today) ? monthKey(today) : s.month;
    set({ today, month });
  }

  /** Nothing pending: take the newest save if another device made one. */
  async function refresh(): Promise<void> {
    if (refreshing || saving || pending.length) return;
    refreshing = true;
    try {
      const raw = await api.getData();
      // He changed something while we asked: that save sorts it out (409 and replay).
      if (saving || pending.length || !looksLikeFinanceData(raw)) return;
      const latest = ready(migrate(raw));
      const changed = latest.savedAt !== baseSavedAt;
      baseData = latest;
      baseSavedAt = latest.savedAt ?? null;
      if (changed) {
        undoInfo = null;
        show(latest);
        set({ lastUndo: null });
      }
      set({ sync: idle() });
    } catch (e) {
      // Offline: keep showing what we have.
      if (isApiError(e, 'bad-key')) set({ sync: { kind: 'error', message: MSG.keyRefused } });
    } finally {
      refreshing = false;
    }
  }

  return store;
}

// ---------- the app's store and hooks ----------

function memoryStorage(): StorageLike {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
  };
}

function browserStorage(): StorageLike {
  try {
    return window.localStorage;
  } catch {
    return memoryStorage();
  }
}

export function browserDeps(): StoreDeps {
  return {
    fetch: (url, init) => window.fetch(url, init),
    storage: browserStorage(),
    location: window.location,
    history: window.history,
    now: () => Date.now(),
    today: () => todayISO(),
    setTimeout: (fn, ms) => window.setTimeout(fn, ms),
    clearTimeout: (h) => window.clearTimeout(h as number),
    addEventListener: (type, fn) => {
      if (type === 'visibilitychange') document.addEventListener(type, fn);
      else window.addEventListener(type, fn);
    },
    isVisible: () => document.visibilityState === 'visible',
  };
}

let shared: StoreApi<FinanceStore> | null = null;

/** The app's store, created on first use with the browser's fetch, storage and timers. */
export function getFinanceStore(): StoreApi<FinanceStore> {
  shared ??= createFinanceStore(browserDeps());
  return shared;
}

/** Swap the app's store (component tests, previews). null: make a fresh one on next use. */
export function setFinanceStore(store: StoreApi<FinanceStore> | null): void {
  shared = store;
}

interface UseFinance {
  (): FinanceStore;
  <T>(selector: (s: FinanceStore) => T): T;
  getState(): FinanceStore;
  subscribe(listener: (s: FinanceStore, prev: FinanceStore) => void): () => void;
}

const whole = (s: FinanceStore) => s;

/** React hook on the app's store: useFinance((s) => s.month). Also has getState() and subscribe(). */
export const useFinance: UseFinance = Object.assign(
  <T>(selector?: (s: FinanceStore) => T): T => useStore(getFinanceStore(), (selector ?? whole) as (s: FinanceStore) => T),
  {
    getState: () => getFinanceStore().getState(),
    subscribe: (listener: (s: FinanceStore, prev: FinanceStore) => void) => getFinanceStore().subscribe(listener),
  },
);

/** For selectors that build an object or list: re-renders only when a part changes. */
export function useFinanceShallow<T>(selector: (s: FinanceStore) => T): T {
  return useStore(getFinanceStore(), useShallow(selector));
}
