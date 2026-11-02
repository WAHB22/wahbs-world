/**
 * Month totals (header cards) and Safe to spend today.
 * See docs/SPEC.md "Money rules" and "Safe to spend today".
 */
import type { FinanceData, ISODate, MonthKey } from './types';
import { addDays } from './dates';
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
      /** First day of the pay period (the last paycheque's date). */
      periodStart: ISODate;
      /** Pays and other income logged from periodStart to today. */
      income: number;
      /** Spending (tx) dated in the pay period. */
      spending: number;
      /** Every bill due in the pay period, paid or not. */
      billsInPeriod: number;
      billsInPeriodList: Occurrence[];
      /** Bills due before the pay period that are still unpaid. */
      olderUnpaid: number;
      olderUnpaidList: Occurrence[];
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

/** A month counts as in use once it has a paid tick, an expense or a pay. */
function monthInUse(data: FinanceData, month: MonthKey): boolean {
  const m = data.months?.[month];
  if (!m) return false;
  return Object.values(m.paid ?? {}).some(Boolean) || (m.tx ?? []).length > 0 || (m.pays ?? []).length > 0;
}

/**
 * Safe to spend today (docs/BRIEF-B.md "Money rules"). It follows the pay
 * period, never the calendar month:
 *   max(0, pays logged in this pay period
 *          - spending in this pay period
 *          - every bill due in this pay period, paid or not
 *          - older bills still unpaid) / days left, rounded down to the dollar.
 * Pay period: from the last logged paycheque to the day before the next pay
 * (when pays were missed and the next pay is rolled forward, from next - 14).
 * Days left: today to the day before the next pay, today included (at least 1).
 *
 * Reading of "older bills still unpaid": unpaid dated bills in the previous pay
 * period (the 14 days before this one), in months he has started using (a
 * paid tick, an expense or a pay). Without that bound, months from before he
 * started ticking bills in this app would read as unpaid forever.
 * Undated bills ('no date set') are never counted.
 */
export function safeToSpend(data: FinanceData, today: ISODate): SafeToSpend {
  const next = nextPay(data, today);
  if (!next) return { status: 'no-pay' };

  const rolledStart = addDays(next.date, -14);
  const periodStart = next.last && next.last > rolledStart ? next.last : rolledStart;
  const periodEnd = addDays(next.date, -1);

  const months = Object.values(data.months ?? {});
  const income = sum(months.flatMap((m) => m?.pays ?? []).filter((p) => p.date >= periodStart && p.date <= today).map((p) => p.amt));
  const spending = sum(months.flatMap((m) => m?.tx ?? []).filter((t) => t.date >= periodStart && t.date <= periodEnd).map((t) => t.amt));

  const billsInPeriodList = occurrencesBetween(data.bills ?? [], periodStart, periodEnd);
  const billsInPeriod = sum(billsInPeriodList.map((o) => o.bill.amt));

  const olderUnpaidList = occurrencesBetween(data.bills ?? [], addDays(periodStart, -14), addDays(periodStart, -1)).filter(
    (o) => !isPaid(data, o) && monthInUse(data, o.month),
  );
  const olderUnpaid = sum(olderUnpaidList.map((o) => o.bill.amt));

  const available = cents(income - spending - billsInPeriod - olderUnpaid);
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
    periodStart,
    income,
    spending,
    billsInPeriod,
    billsInPeriodList,
    olderUnpaid,
    olderUnpaidList,
    headline,
    detail,
    line: `${headline} · ${detail}`,
  };
}
