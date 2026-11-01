/**
 * Bill occurrences. Ported from the live page's occurrences()/billRows(), but
 * pure: the month is passed in instead of read from a global.
 */
import type { Bill, FinanceData, ISODate, MonthKey } from './types';
import { addDays, daysInMonth, monthEnd, monthRange, monthStart, toUTC, fromUTC } from './dates';

export interface Occurrence {
  bill: Bill;
  /** 'YYYY-MM-DD', or 'YYYY-MM-??' when the bill has no day set. */
  date: string;
  /** Paid key: `${bill.id}@${date}`. */
  key: string;
  /** Month the occurrence (and its paid tick) belongs to. */
  month: MonthKey;
  /** false for 'YYYY-MM-??' rows. */
  dated: boolean;
}

/** Dates a bill falls on in one month, exactly like the live page. */
export function occurrenceDates(bill: Bill, month: MonthKey): string[] {
  const last = daysInMonth(month);
  if (bill.freq === 'biweekly' && bill.anchor) {
    const out: string[] = [];
    const a = toUTC(bill.anchor);
    const start = toUTC(monthStart(month));
    const end = toUTC(monthEnd(month));
    const step = 14 * 86400000;
    const k = Math.floor((start - a) / step);
    let d = a + k * step;
    while (d <= end) {
      if (d >= start) out.push(fromUTC(d));
      d += step;
    }
    return out;
  }
  if (!bill.day) return [`${month}-??`];
  return [`${month}-${String(Math.min(bill.day, last)).padStart(2, '0')}`];
}

/** All occurrences in one month, sorted by date (undated rows last). */
export function monthOccurrences(bills: Bill[], month: MonthKey): Occurrence[] {
  const rows: Occurrence[] = [];
  for (const bill of bills) {
    for (const date of occurrenceDates(bill, month)) {
      rows.push({ bill, date, key: `${bill.id}@${date}`, month, dated: !date.endsWith('??') });
    }
  }
  // Dated rows by date; rows with no date ('YYYY-MM-??') go last.
  return rows.sort((x, y) => (x.dated === y.dated ? (x.date < y.date ? -1 : x.date > y.date ? 1 : 0) : x.dated ? -1 : 1));
}

/** Dated occurrences with from <= date <= to, across months. Undated rows are skipped. */
export function occurrencesBetween(bills: Bill[], from: ISODate, to: ISODate): Occurrence[] {
  if (to < from) return [];
  const out: Occurrence[] = [];
  for (const m of monthRange(from.slice(0, 7), to.slice(0, 7))) {
    for (const o of monthOccurrences(bills, m)) {
      if (o.dated && o.date >= from && o.date <= to) out.push(o);
    }
  }
  return out.sort((x, y) => x.date.localeCompare(y.date));
}

export function isPaid(data: FinanceData, o: Occurrence): boolean {
  return !!data.months[o.month]?.paid?.[o.key];
}

/** 'late' if unpaid and before today, 'soon' if unpaid and due within 3 days. */
export function billTag(o: Occurrence, paid: boolean, today: ISODate): 'late' | 'soon' | null {
  if (paid || !o.dated) return null;
  if (o.date < today) return 'late';
  if (o.date <= addDays(today, 3)) return 'soon';
  return null;
}
