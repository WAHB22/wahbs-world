/**
 * Calendar date helpers. All dates are 'YYYY-MM-DD' strings in the user's
 * local calendar. Arithmetic is done in UTC so daylight saving never shifts a day.
 * Pure functions only: pass `today` in, never read the clock here (except todayISO).
 */
import type { ISODate, MonthKey } from './types';

const pad = (n: number) => String(n).padStart(2, '0');

/** Today in the local time zone. The only clock read in this module. */
export function todayISO(now: Date = new Date()): ISODate {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function isISODate(s: unknown): s is ISODate {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/** 'YYYY-MM-DD' -> UTC midnight ms. */
export function toUTC(d: ISODate): number {
  const [y, m, day] = d.split('-').map(Number);
  return Date.UTC(y, m - 1, day);
}

export function fromUTC(ms: number): ISODate {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDays(d: ISODate, n: number): ISODate {
  return fromUTC(toUTC(d) + n * 86400000);
}

/** Whole days from a to b (b minus a). */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(b) - toUTC(a)) / 86400000);
}

export function monthKey(d: ISODate): MonthKey {
  return d.slice(0, 7);
}

export function daysInMonth(key: MonthKey): number {
  const [y, m] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function monthStart(key: MonthKey): ISODate {
  return `${key}-01`;
}

export function monthEnd(key: MonthKey): ISODate {
  return `${key}-${pad(daysInMonth(key))}`;
}

export function addMonths(key: MonthKey, n: number): MonthKey {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`;
}

/** Inclusive list of month keys from a to b. */
export function monthRange(a: MonthKey, b: MonthKey): MonthKey[] {
  const out: MonthKey[] = [];
  for (let k = a; k <= b; k = addMonths(k, 1)) out.push(k);
  return out;
}

export function minDate(a: ISODate, b: ISODate): ISODate {
  return a < b ? a : b;
}

export function maxDate(a: ISODate, b: ISODate): ISODate {
  return a > b ? a : b;
}

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** 'Nov 14'. Deterministic, no locale punctuation. */
export function shortDate(d: ISODate): string {
  const [, m, day] = d.split('-').map(Number);
  return `${MONTHS_SHORT[m - 1]} ${day}`;
}

/** 'November 2026'. */
export function monthLabel(key: MonthKey): string {
  const [y, m] = key.split('-').map(Number);
  return `${MONTHS_LONG[m - 1]} ${y}`;
}

/** 'Sep' for a month key. */
export function shortMonth(key: MonthKey): string {
  return MONTHS_SHORT[Number(key.slice(5, 7)) - 1];
}

/** Natural list: 'Sep, Oct and Nov'. */
export function listAnd(parts: string[]): string {
  if (parts.length <= 1) return parts.join('');
  return parts.slice(0, -1).join(', ') + ' and ' + parts[parts.length - 1];
}
