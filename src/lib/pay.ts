/**
 * Next pay and pay period. See docs/SPEC.md "Pay period and next pay".
 */
import type { FinanceData, ISODate, Pay } from './types';
import { addDays, daysBetween } from './dates';

export interface NextPay {
  date: ISODate;
  amount: number;
  /** true when the date and amount are guessed (not logged yet). */
  estimate: boolean;
  /** Last logged paycheque on or before today, if any. */
  last: ISODate | null;
}

/** Every pay in every month, oldest first. */
export function allPays(data: FinanceData): Pay[] {
  return Object.values(data.months ?? {})
    .flatMap((m) => m?.pays ?? [])
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Paycheques only (Interac and other income excluded). */
export function paycheques(data: FinanceData): Pay[] {
  return allPays(data).filter((p) => p.kind !== 'other');
}

export function nextPay(data: FinanceData, today: ISODate): NextPay | null {
  const pays = paycheques(data);
  const past = pays.filter((p) => p.date <= today);
  const last = past.length ? past[past.length - 1].date : null;
  const future = pays.find((p) => p.date > today);
  if (future) return { date: future.date, amount: Number(future.amt) || 0, estimate: false, last };
  if (!last) return null;
  let next = addDays(last, 14);
  while (next < today) next = addDays(next, 14);
  return { date: next, amount: Number(data.settings?.payPlan) || 0, estimate: true, last };
}

/** Days left in the pay period: today included, payday excluded, at least 1. */
export function daysLeft(today: ISODate, next: ISODate): number {
  return Math.max(1, daysBetween(today, next));
}

/** 'payday in 6 days', 'payday tomorrow', 'payday today'. */
export function paydayText(today: ISODate, next: ISODate): string {
  const n = daysBetween(today, next);
  if (n <= 0) return 'payday today';
  if (n === 1) return 'payday tomorrow';
  return `payday in ${n} days`;
}
