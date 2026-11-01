/**
 * Turns the files he picked or dropped into read rows, one outcome per file.
 *
 * CSV is parsed here in the browser. Images are shrunk, then sent to /api/read.
 * A PDF is sent as it is when it fits under Vercel's body cap. Every row gets
 * fileId (SHA-256 of the file), fileName and src. Nothing here touches React or
 * the store; the network, the image shrinking and the hash are passed in so the
 * whole path runs in tests.
 */
import { ApiError, readFile, type ReadMeta, type ReadResult } from '@/lib/api';
import { parseCibcCsv } from '@/lib/import/csv';
import { downscaleImage, isHeic, sha256Hex } from '@/lib/import/image';
import type { ReadRow } from '@/lib/import/types';
import type { ISODate } from '@/lib/types';

const MB = 1024 * 1024;
/** The server refuses anything bigger, so refuse it before sending. */
export const MAX_FILE_BYTES = 10 * MB;
/** Vercel caps request bodies near 4.5 MB; PDFs are not shrunk, so stop them here. */
export const MAX_PDF_BYTES = 4 * MB;
/** Files read by the server at the same time. */
export const READ_CONCURRENCY = 3;

export const READ_MESSAGES = {
  tooBig: 'This file is over 10 MB.',
  pdfTooBig: 'This PDF is too big to send. Download the CSV from CIBC instead.',
  heic: 'iPhone HEIC photos are not supported. Use a screenshot instead.',
  other: 'Only screenshots, PDF and CSV files can be imported.',
  empty: 'This file is empty.',
  unopened: 'This file could not be opened.',
  badImage: 'This image could not be opened. Try a screenshot instead.',
  offline: 'No connection. Try again when you are back online.',
  failed: 'Could not read this file. Try again.',
} as const;

export const sameFileMessage = (name: string) => `Same file as ${name}, skipped.`;

export type FileKind = 'csv' | 'pdf' | 'image' | 'heic' | 'other';

/** Images the server accepts as they are; anything else is sent as the JPEG we made. */
const SENDABLE_IMAGES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

/** What kind of file this is, from its name first (phones often send no type), then its type. */
export function fileKind(file: { name: string; type: string }): FileKind {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  if (isHeic(file)) return 'heic';
  if (name.endsWith('.csv')) return 'csv';
  if (name.endsWith('.pdf')) return 'pdf';
  if (/\.(jpe?g|png|webp|gif)$/.test(name)) return 'image';
  // No telling extension: trust the type. Windows labels CSV files as Excel.
  if (type === 'text/csv' || type === 'application/csv' || (type === 'application/vnd.ms-excel' && !/\.xlsx?$/.test(name))) return 'csv';
  if (type === 'application/pdf') return 'pdf';
  if (type.startsWith('image/')) return 'image';
  return 'other';
}

/** Why this file is refused before anything is read, or null when it can go ahead. */
export function refusal(file: { name: string; type: string; size: number }): string | null {
  const kind = fileKind(file);
  if (kind === 'heic') return READ_MESSAGES.heic;
  if (kind === 'other') return READ_MESSAGES.other;
  if (file.size === 0) return READ_MESSAGES.empty;
  if (file.size > MAX_FILE_BYTES) return READ_MESSAGES.tooBig;
  if (kind === 'pdf' && file.size > MAX_PDF_BYTES) return READ_MESSAGES.pdfTooBig;
  return null;
}

/** Only images and PDFs use the server (and its daily limit). */
export const needsServer = (kind: FileKind) => kind === 'image' || kind === 'pdf';

export interface ReadDeps {
  today: ISODate;
  readFile(blob: Blob, meta: ReadMeta): Promise<ReadResult>;
  downscale(file: File): Promise<Blob>;
  hash(buf: ArrayBuffer): Promise<string>;
}

/** The real thing: /api/read with this device's key, canvas shrinking, WebCrypto. */
export function browserReadDeps(today: ISODate): ReadDeps {
  return { today, readFile: (blob, meta) => readFile(blob, meta), downscale: downscaleImage, hash: sha256Hex };
}

export type FileOutcome =
  | { ok: true; fileId: string; rows: ReadRow[]; remaining: number | null }
  | { ok: false; fileId: string | null; message: string; limit?: true };

/** Plain text for a failed read. The daily limit message is the server's, shown as is. */
export function readErrorText(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.kind === 'offline') return READ_MESSAGES.offline;
    return e.message || READ_MESSAGES.failed;
  }
  return READ_MESSAGES.failed;
}

/** CIBC exports are UTF-8 or, from older Windows tools, Windows-1252 (accents in French names). */
export function decodeText(buf: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf);
  } catch {
    return new TextDecoder('windows-1252').decode(buf);
  }
}

/** Rows from the server, tagged with the file they came from. Lines without a usable amount are dropped. */
function tagRows(rows: ReadRow[], fileId: string, fileName: string, src: 'screenshot' | 'statement'): ReadRow[] {
  return rows
    .filter((r) => !!r && typeof r === 'object' && Number.isFinite(Number(r.amount)))
    .map((r) => ({ ...r, merchant: String(r.merchant ?? ''), amount: Math.abs(Number(r.amount)), account: r.account ?? null, fileId, fileName, src }));
}

const fail = (fileId: string | null, message: string): FileOutcome => ({ ok: false, fileId, message });

async function viaServer(file: File, kind: 'image' | 'pdf', fileId: string, deps: ReadDeps): Promise<FileOutcome> {
  let blob: Blob = file;
  let mediaType = 'application/pdf';
  if (kind === 'image') {
    try {
      blob = await deps.downscale(file);
    } catch {
      return fail(fileId, READ_MESSAGES.badImage);
    }
    // A small screenshot comes back untouched (often a PNG); everything we shrank is JPEG.
    mediaType = SENDABLE_IMAGES.has(blob.type) ? blob.type : 'image/jpeg';
  }
  try {
    const res = await deps.readFile(blob, { mediaType, fileName: file.name, today: deps.today });
    const src = kind === 'image' ? 'screenshot' : 'statement';
    return { ok: true, fileId, rows: tagRows(res.rows, fileId, file.name, src), remaining: Number.isFinite(res.remaining) ? res.remaining : null };
  } catch (e) {
    const out: FileOutcome = { ok: false, fileId, message: readErrorText(e) };
    if (e instanceof ApiError && e.kind === 'limit') out.limit = true;
    return out;
  }
}

interface Job {
  index: number;
  file: File;
  kind: 'csv' | 'pdf' | 'image';
  fileId: string;
  /** Kept only for CSV, which is decoded from the bytes already read for the hash. */
  buf: ArrayBuffer | null;
}

/**
 * Reads every file. Outcomes come back in file order (so duplicate checks flag
 * the later file), and onEach reports each one as soon as it is known.
 * Refusals and same file twice are settled first, without any network call.
 * After the daily limit is hit, the files still waiting are not sent.
 */
export async function readFiles(
  files: File[],
  deps: ReadDeps,
  onEach?: (index: number, outcome: FileOutcome) => void,
  concurrency = READ_CONCURRENCY,
): Promise<FileOutcome[]> {
  const outcomes: FileOutcome[] = new Array(files.length);
  const finish = (index: number, outcome: FileOutcome) => {
    outcomes[index] = outcome;
    onEach?.(index, outcome);
  };

  const jobs: Job[] = [];
  const seen = new Map<string, string>();
  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    const refused = refusal(file);
    if (refused) {
      finish(index, fail(null, refused));
      continue;
    }
    let buf: ArrayBuffer;
    let fileId: string;
    try {
      buf = await file.arrayBuffer();
      fileId = await deps.hash(buf);
    } catch {
      finish(index, fail(null, READ_MESSAGES.unopened));
      continue;
    }
    const twin = seen.get(fileId);
    if (twin !== undefined) {
      finish(index, fail(fileId, sameFileMessage(twin)));
      continue;
    }
    seen.set(fileId, file.name);
    const kind = fileKind(file) as Job['kind'];
    jobs.push({ index, file, kind, fileId, buf: kind === 'csv' ? buf : null });
  }

  let limitMessage: string | null = null;
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const job = jobs[next++];
      if (job.kind === 'csv') {
        finish(job.index, { ok: true, fileId: job.fileId, rows: parseCibcCsv(decodeText(job.buf!), { id: job.fileId, name: job.file.name }), remaining: null });
        continue;
      }
      if (limitMessage) {
        finish(job.index, { ok: false, fileId: job.fileId, message: limitMessage, limit: true });
        continue;
      }
      const outcome = await viaServer(job.file, job.kind, job.fileId, deps);
      if (!outcome.ok && outcome.limit) limitMessage = outcome.message;
      finish(job.index, outcome);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(concurrency, jobs.length)) }, worker));
  return outcomes;
}
