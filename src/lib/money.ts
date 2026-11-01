/**
 * Month totals (header cards) and Safe to spend today.
 * See docs/SPEC.md "Money rules" and "Safe to spend today".
 */
import type { FinanceData, ISODate, MonthKey } from './types';
import { addDays, monthKey, monthStart } from './dates';
import { monthOccurrences, occurrencesBetween, isPaid, type Occurrence } from './bills';
import { monthData } from './limits';
import { cents, dollars, toCents } from './format';
import { daysLeft, nextPay, paydayText, type NextPay } from './pay';

export interface MonthTotals {
  earned: number;
  bills: number;
  billsPaid: number;
  spent: number;
  left: number;
}

export type SafeToSpend =
  | { status: 'no-pay' }
  | {
      status: 'ok';
      perDay: number;
      available: number;
      daysLeft: number;
      next: NextPay;
      income: number;
      spending: number;
      billsPaid: number;
      unpaidBeforePay: number;
      unpaid: Occurrence[];
      headline: string;
      detail: string;
      line: string;
    };

/** Sum in whole cents so float noise never adds up. */
function sum(values: unknown[]): number {
  return values.reduce<number>((s, v) => s + toCents(Number(v) || 0), 0) / 100;
}

/** Header cards for the month on screen, exactly like the live page's render(). */
export function monthTotals(data: FinanceData, month: MonthKey): MonthTotals {
  const m = monthData(data, month);
  const rows = monthOccurrences(data.bills ?? [], month);
  const bills = sum(rows.map((r) => r.bill.amt));
  const billsPaid = sum(rows.filter((r) => m.paid[r.key]).map((r) => r.bill.amt));
  const spent = sum(m.tx.map((t) => t.amt));
  const earned = sum(m.pays.map((p) => p.amt));
  return { earned, bills, billsPaid, spent, left: cents(earned - bills - spent) };
}

/**
 * Ticked occurrences that count as already paid: every dated tick of this
 * month, plus ticks in later months that fall before the next pay.
 */
function paidBills(data: FinanceData, month: MonthKey, period: Occurrence[]): Occurrence[] {
  const seen = new Set<string>();
  const out: Occurrence[] = [];
  const thisMonth = monthOccurrences(data.bills ?? [], month).filter((o) => o.dated);
  for (const o of [...thisMonth, ...period]) {
    if (seen.has(o.key) || !isPaid(data, o)) continue;
    seen.add(o.key);
    out.push(o);
  }
  return out;
}

/**
 * Safe to spend today, see docs/SPEC.md.
 *
 * Deliberate reading of the brief: unpaid bills from months before this
 * month (late bills) are not counted. Only occurrences from the first of
 * this month up to the day before the next pay count as unpaid. Undated
 * bills ('no date set') are never counted, paid or not.
 */
export function safeToSpend(data: FinanceData, today: ISODate): SafeToSpend {
  const next = nextPay(data, today);
  if (!next) return { status: 'no-pay' };

  const month = monthKey(today);
  const m = monthData(data, month);
  // Any kind of income counts (Interac too), but only once it has arrived.
  const income = sum(m.pays.filter((p) => p.date <= today).map((p) => p.amt));
  const spending = sum(m.tx.map((t) => t.amt));

  const period = occurrencesBetween(data.bills ?? [], monthStart(month), addDays(next.date, -1));
  const billsPaid = sum(paidBills(data, month, period).map((o) => o.bill.amt));
  const unpaid = period.filter((o) => !isPaid(data, o));
  const unpaidBeforePay = sum(unpaid.map((o) => o.bill.amt));

  const available = cents(income - spending - billsPaid - unpaidBeforePay);
  const days = daysLeft(today, next.date);
  // Integer cents divided by integer cents: exact, so floor never slips a dollar.
  const perDay = Math.floor(Math.max(0, toCents(available)) / (days * 100));

  const headline = `${dollars(perDay)} today`;
  const detail = paydayText(today, next.date);
  return {
    status: 'ok',
    perDay,
    available,
    daysLeft: days,
    next,
    income,
    spending,
    billsPaid,
    unpaidBeforePay,
    unpaid,
    headline,
    detail,
    line: `${headline} · ${detail}`,
  };
}
