/**
 * History sheet logic: when each save happened in plain words, the note
 * fallback, which row is the current version, the restore note, and reading a
 * saved version back into today's data shape. No React, no clock reads: `now`
 * is passed in. Times are the phone's local time.
 */
import { ApiError, type Version } from '@/lib/api';
import { daysBetween, shortDate, todayISO } from '@/lib/dates';
import { comparable, looksLikeFinanceData, migrate } from '@/lib/migrate';
import type { FinanceData } from '@/lib/types';

export const HISTORY_COPY = {
  title: 'History',
  description: 'The last 10 saves, newest first. Restoring one is a new save, so you can undo it.',
  loading: 'Loading history',
  loadError: 'History did not load. Check your connection.',
  retry: 'Try again',
  empty: 'Nothing saved yet. Your changes show here once they are saved.',
  onlyCurrent: 'Older versions show here after your next changes.',
  current: 'Current version',
  restore: 'Restore this version',
  restoring: 'Restoring',
  sameAsNow: 'This version is the same as what you have now.',
} as const;

export const RESTORE_ERRORS = {
  gone: 'That version is no longer kept.',
  unreadable: 'That version could not be read.',
  badKey: 'This device key was refused. Open your private link again.',
  offline: 'That version did not load. Check your connection.',
} as const;

const pad = (n: number) => String(n).padStart(2, '0');

/** A savedAt string as a Date, or null when it is missing or not a date. */
export function parseSavedAt(savedAt: unknown): Date | null {
  if (typeof savedAt !== 'string' || !savedAt) return null;
  const d = new Date(savedAt);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** '3:02 PM', '12:05 AM'. Built by hand so every phone shows the same thing. */
export function clockTime(d: Date): string {
  const h = d.getHours();
  return `${h % 12 || 12}:${pad(d.getMinutes())} ${h < 12 ? 'AM' : 'PM'}`;
}

/** 'Nov 14, 3:02 PM'. The year is added only when it is not this year: 'Dec 30, 2025, 9:15 AM'. */
export function stampText(d: Date, now: Date): string {
  const day = shortDate(todayISO(d));
  const year = d.getFullYear() === now.getFullYear() ? '' : `, ${d.getFullYear()}`;
  return `${day}${year}, ${clockTime(d)}`;
}

/** 'Today, 3:02 PM', 'Yesterday, 9:15 AM', else 'Nov 14, 3:02 PM'. Empty when the time is unknown. */
export function whenText(savedAt: unknown, now: Date): string {
  const d = parseSavedAt(savedAt);
  if (!d) return '';
  const days = daysBetween(todayISO(d), todayISO(now));
  if (days === 0) return `Today, ${clockTime(d)}`;
  if (days === 1) return `Yesterday, ${clockTime(d)}`;
  return stampText(d, now);
}

/** The save's note, or 'Saved' when it has none. */
export function noteText(note: unknown): string {
  const n = typeof note === 'string' ? note.trim() : '';
  return n || 'Saved';
}

/**
 * The undo bar and History note for a restore. Always the date itself, never
 * 'Today', because the note is read again later.
 */
export function restoreNote(savedAt: unknown, now: Date): string {
  const d = parseSavedAt(savedAt);
  return d ? `Restored the version from ${stampText(d, now)}` : 'Restored an earlier version';
}

export interface HistoryRow {
  id: string;
  /** Note to show, never empty. */
  note: string;
  /** 'Today, 3:02 PM'; empty when unknown. */
  when: string;
  savedAt: string;
  /** The newest save: shows 'Current version', no restore button. */
  current: boolean;
  /** Note for replaceAll when this row is restored. */
  restoreNote: string;
}

/**
 * Rows for the list, newest first. The server already sends them newest first;
 * this keeps that order safe if it ever does not. Versions without an id
 * cannot be restored, so they are left out.
 */
export function historyRows(versions: readonly Version[], now: Date): HistoryRow[] {
  const time = (v: Version) => parseSavedAt(v.savedAt)?.getTime() ?? Number.NEGATIVE_INFINITY;
  return versions
    .filter((v) => typeof v.id === 'string' && v.id !== '')
    .map((v, i) => ({ v, i }))
    .sort((a, b) => time(b.v) - time(a.v) || a.i - b.i)
    .map(({ v }, i) => ({
      id: v.id,
      note: noteText(v.note),
      when: whenText(v.savedAt, now),
      savedAt: typeof v.savedAt === 'string' ? v.savedAt : '',
      current: i === 0,
      restoreNote: restoreNote(v.savedAt, now),
    }));
}

/** A saved version in today's shape (v1 or v2 in, v2 out, unknown fields kept), or null when it is not finance data. */
export function readVersion(raw: unknown): FinanceData | null {
  if (!looksLikeFinanceData(raw)) return null;
  try {
    return migrate(raw);
  } catch {
    return null;
  }
}

/** True when restoring would change nothing (savedAt and note aside). */
export function sameAsNow(next: FinanceData, current: FinanceData | null): boolean {
  return current !== null && comparable(next) === comparable(current);
}

/** Plain line for a restore that failed to load. */
export function restoreErrorText(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.kind === 'bad-key') return RESTORE_ERRORS.badKey;
    if (e.kind === 'http' && e.status === 404) return RESTORE_ERRORS.gone;
  }
  return RESTORE_ERRORS.offline;
}

export type RestorePlan =
  | { kind: 'restore'; next: FinanceData; note: string }
  | { kind: 'same'; message: string }
  | { kind: 'unreadable'; message: string };

/** What a tap on 'Restore this version' does once the version has loaded. */
export function planRestore(raw: unknown, row: Pick<HistoryRow, 'restoreNote'>, current: FinanceData | null): RestorePlan {
  const next = readVersion(raw);
  if (!next) return { kind: 'unreadable', message: RESTORE_ERRORS.unreadable };
  if (sameAsNow(next, current)) return { kind: 'same', message: HISTORY_COPY.sameAsNow };
  return { kind: 'restore', next, note: row.restoreNote };
}
