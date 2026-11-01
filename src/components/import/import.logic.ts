/**
 * Pure helpers for the import sheet: text for each file and each review row,
 * the category list, the save recipe, and the "imported before" memory.
 * No React, no clock, no storage: callers pass today and the stored text in.
 */
import type { Recipe } from '@/lib/store-api';
import type { FinanceData, ISODate } from '@/lib/types';
import { shortDate } from '@/lib/dates';
import { money } from '@/lib/format';
import { tidyMerchant } from '@/lib/import/categorize';
import { applyImport, counts } from '@/lib/import/review';
import type { ReadRow, ReviewRow } from '@/lib/import/types';
import type { FileKind, FileOutcome } from './readFiles';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/* ---------- files ---------- */

export interface FileEntry {
  /** React key: position in the batch plus the name. */
  key: string;
  name: string;
  kind: FileKind;
  state: 'reading' | 'done' | 'error';
  rows: ReadRow[];
  fileId: string | null;
  message: string | null;
  /** Reads left today, when the server said. */
  remaining: number | null;
}

export function fileEntry(file: { name: string }, kind: FileKind, index: number): FileEntry {
  const name = file.name.trim() || 'Untitled file';
  return { key: `${index}:${name}`, name, kind, state: 'reading', rows: [], fileId: null, message: null, remaining: null };
}

export function withOutcome(entry: FileEntry, outcome: FileOutcome): FileEntry {
  if (outcome.ok) return { ...entry, state: 'done', rows: outcome.rows, fileId: outcome.fileId, message: null, remaining: outcome.remaining };
  return { ...entry, state: 'error', rows: [], fileId: outcome.fileId, message: outcome.message };
}

/** 'Reading', 'Read 6 lines', 'Read 1 line', 'No lines found', or the plain error. */
export function fileLine(entry: FileEntry): string {
  if (entry.state === 'reading') return 'Reading';
  if (entry.state === 'error') return entry.message ?? 'Could not read this file.';
  return entry.rows.length ? `Read ${plural(entry.rows.length, 'line', 'lines')}` : 'No lines found';
}

/** Every row read, in file order. */
export function allRows(files: FileEntry[]): ReadRow[] {
  return files.flatMap((f) => (f.state === 'done' ? f.rows : []));
}

export const stillReading = (files: FileEntry[]) => files.some((f) => f.state === 'reading');

/** '6 lines from 2 files'. */
export function readSummary(files: FileEntry[]): string {
  const read = files.filter((f) => f.state === 'done' && f.rows.length > 0);
  return `${plural(allRows(files).length, 'line', 'lines')} from ${plural(read.length, 'file', 'files')}`;
}

/** Only worth saying when few are left: '3 reads left today'. */
export function readsLeft(files: FileEntry[]): string | null {
  const known = files.map((f) => f.remaining).filter((n): n is number => n !== null);
  if (!known.length) return null;
  const n = Math.min(...known);
  if (n > 5) return null;
  if (n <= 0) return 'No reads left today. It resets at midnight.';
  return `${plural(n, 'read', 'reads')} left today`;
}

/* ---------- files imported before (localStorage 'finance-imported-files') ---------- */

export const IMPORTED_FILES_KEY = 'finance-imported-files';
/** Oldest hashes are forgotten past this many. */
export const IMPORTED_FILES_MAX = 300;

const SHA = /^[0-9a-f]{64}$/;
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/** The stored map of file hash to the date it was imported. Anything unreadable counts as empty. */
export function parseImportedFiles(raw: string | null): Record<string, ISODate> {
  if (!raw) return {};
  try {
    const v: unknown = JSON.parse(raw);
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
    const out: Record<string, ISODate> = {};
    for (const [k, d] of Object.entries(v as Record<string, unknown>)) if (SHA.test(k) && typeof d === 'string' && ISO.test(d)) out[k] = d;
    return out;
  } catch {
    return {};
  }
}

/** The map with these hashes set to today, newest last, trimmed to the newest `max`. */
export function recordImported(map: Record<string, ISODate>, fileIds: string[], today: ISODate, max = IMPORTED_FILES_MAX): Record<string, ISODate> {
  const fresh = new Set(fileIds.filter((id) => SHA.test(id)));
  const kept = Object.entries(map).filter(([k]) => !fresh.has(k));
  const all = [...kept, ...[...fresh].map((k) => [k, today] as [string, ISODate])];
  return Object.fromEntries(all.slice(Math.max(0, all.length - max)));
}

export interface PriorImport {
  name: string;
  date: ISODate;
}

/** Files in this batch that were imported before. */
export function priorImports(files: FileEntry[], map: Record<string, ISODate>): PriorImport[] {
  return files.flatMap((f) => (f.state === 'done' && f.fileId && map[f.fileId] ? [{ name: f.name, date: map[f.fileId] }] : []));
}

/** 'You imported this file on Nov 1' (one file), or with its name when there are several. */
export function priorText(p: PriorImport, filesInBatch: number): string {
  return filesInBatch === 1 ? `You imported this file on ${shortDate(p.date)}` : `You imported ${p.name} on ${shortDate(p.date)}`;
}

/** Hashes to remember once the import is saved: every file that gave rows. */
export function importedFileIds(files: FileEntry[]): string[] {
  return files.flatMap((f) => (f.state === 'done' && f.fileId && f.rows.length ? [f.fileId] : []));
}

/* ---------- review rows ---------- */

export interface CategoryGroup {
  id: string;
  name: string;
  items: { id: string; name: string }[];
}

/** Budget groups and their items, for the category chip (groups with no items left out). */
export function categoryGroups(data: FinanceData): CategoryGroup[] {
  return (data.budget ?? [])
    .map((g) => ({ id: g.id, name: g.name, items: (g.items ?? []).map((i) => ({ id: i.id, name: i.name })) }))
    .filter((g) => g.items.length > 0);
}

export function itemNames(data: FinanceData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const g of data.budget ?? []) for (const i of g.items ?? []) out[i.id] = i.name;
  return out;
}

/** Card processor and bank prefixes that say nothing about where the money went. */
const DISPLAY_PREFIXES: RegExp[] = [
  /^point of sale\s*-?\s*(interac|visa debit)?\s*(retail purchase|purchase)?\s*/i,
  /^electronic funds transfer\s*(preauthorized debit|pay|deposit)?\s*/i,
  /^preauthorized debit\s*/i,
  /^internet banking\s*/i,
  /^retail purchase\s*/i,
];

/** 'Point of Sale - Interac RETAIL PURCHASE 000000123456 COSTCO WHOLESALE' -> 'Costco Wholesale'. */
export function rowTitle(r: ReviewRow): string {
  let s = String(r.row.merchant ?? '').replace(/\s+/g, ' ').trim();
  for (const p of DISPLAY_PREFIXES) s = s.replace(p, '');
  s = s.replace(/\b\d{6,}\b/g, ' ').replace(/\s+/g, ' ').trim();
  // 'TIM HORTONS #1234 MONTREAL, QC': drop a trailing country code, then tidyMerchant cuts the city and province.
  s = s.replace(/[\s,]+CA$/, '').replace(/,\s*([A-Z]{2})$/, ' $1');
  return tidyMerchant(s) || tidyMerchant(r.row.merchant) || 'No name';
}

/** '$6.58'; a refund shows the minus sign: '−$12.99'. */
export function rowAmount(r: ReviewRow): string {
  return money(r.kind === 'refund' ? -r.row.amount : r.row.amount);
}

/** 'Oct 31, 9:14 AM'. A screenshot whose time is cut off says so; statement lines have no time. */
export function rowWhen(r: ReviewRow): string {
  const day = shortDate(r.row.date);
  const time = (r.row.time ?? '').trim();
  if (time) return `${day}, ${time}`;
  return r.row.src === 'screenshot' ? `${day}, time cut off` : day;
}

export type Tone = 'good' | 'attention' | 'quiet' | 'plain';

/** The status line under a row and how loud it is. */
export function statusLine(r: ReviewRow): { text: string; tone: Tone } {
  if (r.status === 'duplicate') return { text: r.match ? `Possible duplicate of ${r.match.label}` : (r.hint ?? 'Possible duplicate'), tone: 'attention' };
  if (r.kind === 'not-spending') return { text: r.hint ?? 'Not spending', tone: 'quiet' };
  if (r.kind === 'pay') return { text: 'Paycheque', tone: 'good' };
  if (r.kind === 'income') return { text: 'Income', tone: 'good' };
  if (r.kind === 'bill') {
    const name = r.billName ? r.billName.split(/[/(]/)[0].trim() : 'the bill';
    const text = r.hint ?? `Marks ${name} paid`;
    return { text, tone: text.startsWith('Marks ') ? 'plain' : 'attention' };
  }
  if (r.status === 'pick' || !r.itemId) return { text: 'Pick a category', tone: 'attention' };
  if (r.kind === 'refund') return { text: 'Refund', tone: 'plain' };
  return { text: 'New', tone: 'good' };
}

/** Purchases (and refunds) carry a category chip. */
export const isPurchase = (r: ReviewRow) => r.kind === 'expense' || r.kind === 'refund';

/** Not spending rows never save, and a purchase needs a category before it can be ticked. */
export function canTick(r: ReviewRow): boolean {
  if (r.kind === 'not-spending') return false;
  return r.ticked || !isPurchase(r) || !!r.itemId;
}

/** Name for the one tap switch chip: 'Dates with Kylie', or null when there is no switch. */
export function altLabel(r: ReviewRow, names: Record<string, string>): string | null {
  return r.altItemId ? (names[r.altItemId] ?? null) : null;
}

/** Something ticked will be written. */
export function canSave(rows: ReviewRow[]): boolean {
  const c = counts(rows);
  return c.expenses + c.pays + c.bills > 0;
}

/** The whole import as one change, so one Undo reverses it. */
export function importRecipe(rows: ReviewRow[], today: ISODate, makeId?: () => string): Recipe {
  return (draft) => {
    applyImport(draft as FinanceData, rows, today, makeId);
  };
}
