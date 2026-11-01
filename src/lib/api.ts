/**
 * Browser client for the server API (docs/SPEC.md "API" and "Client sync").
 * Every request sends the device key in `x-app-key`. Failures become typed
 * errors so the store can tell a bad key, a conflict, the daily read limit and
 * being offline apart. fetch and the key are injectable for tests.
 */
import type { FinanceData, ISODate } from './types';
import type { ReadRow } from './import/types';

export const KEY_STORAGE = 'finance-key';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface LocationLike {
  href: string;
}

export interface HistoryLike {
  readonly state: unknown;
  replaceState(data: unknown, unused: string, url?: string | null): void;
}

/** The part of Response the client reads, so tests can answer with a plain object. */
export interface ResponseLike {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

export type FetchLike = (url: string, init: RequestInit) => Promise<ResponseLike>;

export interface ApiOptions {
  /** Defaults to the browser fetch. */
  fetch?: FetchLike;
  /** Defaults to the key saved on this device. */
  key?: string | null;
}

export interface SaveResult {
  savedAt: string;
  id: string;
}

export interface Version {
  id: string;
  savedAt: string;
  note: string;
  size: number;
  [extra: string]: unknown;
}

export interface ReadResult {
  rows: ReadRow[];
  remaining: number;
}

export interface ReadMeta {
  mediaType: string;
  fileName: string;
  today: ISODate;
}

// ---------- errors ----------

export type ApiErrorKind = 'bad-key' | 'conflict' | 'limit' | 'offline' | 'http';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  /** HTTP status, null when no answer came back. */
  readonly status: number | null;
  constructor(kind: ApiErrorKind, message: string, status: number | null) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }
}

/** 401, or no key on this device. */
export class BadKeyError extends ApiError {
  constructor(message = 'This device is not set up') {
    super('bad-key', message, 401);
  }
}

/** 409: someone saved since our base. `latest` is the newest save, not migrated yet. */
export class ConflictError extends ApiError {
  readonly latest: unknown;
  constructor(latest: unknown) {
    super('conflict', 'Another device saved first', 409);
    this.latest = latest;
  }
}

/** 429: daily read limit. The message is the server's, ready to show. */
export class LimitError extends ApiError {
  constructor(message: string) {
    super('limit', message, 429);
  }
}

/** No answer at all: offline, DNS, the request was cut. */
export class OfflineError extends ApiError {
  constructor() {
    super('offline', 'No connection', null);
  }
}

/** Any other status. `message` is the server's when it sent one. */
export class HttpError extends ApiError {
  readonly body: unknown;
  constructor(status: number, message: string, body?: unknown) {
    super('http', message, status);
    this.body = body;
  }
}

export function isApiError<K extends ApiErrorKind>(e: unknown, kind: K): e is ApiError & { kind: K } {
  return e instanceof ApiError && e.kind === kind;
}

// ---------- device key ----------

export function getKey(storage: Pick<StorageLike, 'getItem'>): string | null {
  try {
    return storage.getItem(KEY_STORAGE) || null;
  } catch {
    return null;
  }
}

function paramName(part: string): string {
  const name = part.split('=')[0].replace(/\+/g, ' ');
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}

/**
 * Reads `?key=` from the address, saves it on this device and takes it out of
 * the address bar. Other params and the hash stay exactly as they were.
 * Returns the key found in the address, or null.
 */
export function setupKeyFromUrl(loc: LocationLike, history: HistoryLike, storage: StorageLike): string | null {
  let url: URL;
  try {
    url = new URL(loc.href);
  } catch {
    return null;
  }
  if (!url.searchParams.has('key')) return null;
  const key = url.searchParams.get('key')?.trim() || null;
  if (key) {
    try {
      storage.setItem(KEY_STORAGE, key);
    } catch {
      // Storage blocked: the key still works for this visit.
    }
  }
  // Edit the raw query so the other params keep their exact encoding.
  const rest = url.search
    .slice(1)
    .split('&')
    .filter((part) => part !== '' && paramName(part) !== 'key');
  const search = rest.length ? `?${rest.join('&')}` : '';
  history.replaceState(history.state, '', url.pathname + search + url.hash);
  return key;
}

// ---------- requests ----------

function browserFetch(): FetchLike {
  return (url, init) => globalThis.fetch(url, init);
}

function browserKey(): string | null {
  try {
    return getKey(globalThis.localStorage);
  } catch {
    return null;
  }
}

/** Parsed JSON, or undefined when the body is empty or not JSON. */
async function readBody(res: ResponseLike): Promise<unknown> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function serverMessage(body: unknown): string | null {
  if (typeof body !== 'object' || body === null) return null;
  const m = (body as { message?: unknown }).message;
  return typeof m === 'string' && m ? m : null;
}

const STATUS_TEXT: Record<number, string> = {
  400: 'The server could not read that',
  403: 'The server refused this request',
  404: 'Not found',
  413: 'That is too big to send',
  503: 'The server is not set up yet',
};

function errorFor(status: number, body: unknown): ApiError {
  if (status === 401) return new BadKeyError('This device key was refused');
  if (status === 409) return new ConflictError((body as { latest?: unknown } | null)?.latest);
  if (status === 429) return new LimitError(serverMessage(body) ?? 'You have used all reads for today. It resets at midnight.');
  return new HttpError(status, serverMessage(body) ?? STATUS_TEXT[status] ?? `The server answered ${status}`, body);
}

async function request(path: string, init: RequestInit, opts: ApiOptions = {}): Promise<unknown> {
  const key = opts.key === undefined ? browserKey() : opts.key;
  if (!key) throw new BadKeyError();
  const doFetch = opts.fetch ?? browserFetch();
  const headers = { ...(init.headers as Record<string, string> | undefined), 'x-app-key': key };
  let res: ResponseLike;
  let body: unknown;
  try {
    res = await doFetch(path, { ...init, headers });
    body = await readBody(res);
  } catch {
    throw new OfflineError();
  }
  if (!res.ok) throw errorFor(res.status, body);
  // A 2xx that is not JSON (a captive portal page, a proxy) is a bad gateway, not data.
  if (body === undefined) throw new HttpError(502, 'The server sent something unexpected');
  return body;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Newest save as the server has it (not migrated), or null when nothing is saved yet. */
export async function getData(opts?: ApiOptions): Promise<unknown | null> {
  const body = await request('/api/data', { method: 'GET', cache: 'no-store' }, opts);
  if (isObj(body) && body.empty === true) return null;
  return body;
}

/**
 * Saves the full data. `baseSavedAt` is the savedAt this change started from
 * (null when starting from nothing); the server answers 409 if someone saved since.
 */
export async function putData(data: FinanceData, baseSavedAt: string | null | undefined, opts?: ApiOptions): Promise<SaveResult> {
  const { savedAt: _old, ...rest } = data;
  const body = baseSavedAt ? { ...rest, savedAt: baseSavedAt } : rest;
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (baseSavedAt) headers['x-base-saved-at'] = baseSavedAt;
  const res = await request('/api/data', { method: 'PUT', headers, body: JSON.stringify(body) }, opts);
  const r = (isObj(res) ? res : {}) as Partial<SaveResult>;
  if (typeof r.savedAt !== 'string') throw new HttpError(502, 'The server did not confirm the save');
  return { ...r, savedAt: r.savedAt, id: typeof r.id === 'string' ? r.id : '' };
}

/** The last saves kept on the server, newest first. */
export async function getHistory(opts?: ApiOptions): Promise<Version[]> {
  const body = await request('/api/data?history=1', { method: 'GET', cache: 'no-store' }, opts);
  const versions = isObj(body) ? body.versions : null;
  return Array.isArray(versions) ? (versions.filter(isObj) as Version[]) : [];
}

/** One saved version (not migrated). 404 becomes an HttpError with status 404. */
export async function getVersion(id: string, opts?: ApiOptions): Promise<unknown> {
  return request(`/api/data?id=${encodeURIComponent(id)}`, { method: 'GET', cache: 'no-store' }, opts);
}

/** Sends one image or PDF to be read. 429 becomes a LimitError with the server's message. */
export async function readFile(blob: Blob, meta: ReadMeta, opts?: ApiOptions): Promise<ReadResult> {
  const headers: Record<string, string> = {
    'content-type': 'application/octet-stream',
    'x-media-type': meta.mediaType,
    'x-file-name': encodeURIComponent(meta.fileName),
    'x-today': meta.today,
  };
  const body = await request('/api/read', { method: 'POST', headers, body: blob }, opts);
  const r = isObj(body) ? body : {};
  return {
    ...r,
    rows: Array.isArray(r.rows) ? (r.rows as ReadRow[]) : [],
    remaining: typeof r.remaining === 'number' ? r.remaining : 0,
  };
}

/** The calls above bound to one fetch and one key, as the store uses them. */
export interface Api {
  getData(): Promise<unknown | null>;
  putData(data: FinanceData, baseSavedAt: string | null | undefined): Promise<SaveResult>;
  getHistory(): Promise<Version[]>;
  getVersion(id: string): Promise<unknown>;
  readFile(blob: Blob, meta: ReadMeta): Promise<ReadResult>;
}

export function createApi(opts: { fetch: FetchLike; key: () => string | null }): Api {
  const o = (): ApiOptions => ({ fetch: opts.fetch, key: opts.key() });
  return {
    getData: () => getData(o()),
    putData: (data, base) => putData(data, base, o()),
    getHistory: () => getHistory(o()),
    getVersion: (id) => getVersion(id, o()),
    readFile: (blob, meta) => readFile(blob, meta, o()),
  };
}
