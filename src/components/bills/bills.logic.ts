/**
 * Fixed bills: rows for the month on screen, the paid tick, and the bill form.
 * Pure: no React, no clock. Ported from the live page's render(), the bills
 * click handler and editBill().
 */
import type { Draft } from 'immer';
import type { Bill, FinanceData, Freq, ISODate, MonthData, MonthKey } from '@/lib/types';
import { billTag, isPaid, monthOccurrences, type Occurrence } from '@/lib/bills';
import { isISODate, shortDate } from '@/lib/dates';
import { cents, parseAmount } from '@/lib/format';

export interface BillRow {
  o: Occurrence;
  paid: boolean;
  tag: 'late' | 'soon' | null;
  /** Second line: 'Nov 16', 'every 2 weeks · Nov 12' or 'no date set', then the note. */
  sub: string;
}

/** 'Nov 16', 'every 2 weeks · Nov 12' or 'no date set' (live page wording). */
export function billWhen(o: Occurrence): string {
  if (!o.dated) return 'no date set';
  return (o.bill.freq === 'biweekly' ? 'every 2 weeks · ' : '') + shortDate(o.date);
}

/** Every occurrence in the month, dated by date, undated last. */
export function billRows(data: FinanceData, month: MonthKey, today: ISODate): BillRow[] {
  return monthOccurrences(data.bills ?? [], month).map((o) => {
    const paid = isPaid(data, o);
    const note = typeof o.bill.note === 'string' ? o.bill.note.trim() : '';
    return { o, paid, tag: billTag(o, paid, today), sub: note ? `${billWhen(o)} · ${note}` : billWhen(o) };
  });
}

/** Ticked on or before the due date: real progress, worth a sparkle. Undated bills have no due date. */
export function paidOnTime(o: Occurrence, today: ISODate): boolean {
  return o.dated && today <= o.date;
}

function ensureMonth(draft: Draft<FinanceData>, month: MonthKey): Draft<MonthData> {
  draft.months ??= {};
  const m = (draft.months[month] ??= { paid: {}, tx: [], pays: [], moves: [] });
  m.paid ??= {};
  return m;
}

/** Flip the paid tick of one occurrence. Unticking removes the key, like the live page. */
export function toggleTickRecipe(month: MonthKey, key: string) {
  return (draft: Draft<FinanceData>) => {
    const m = ensureMonth(draft, month);
    if (m.paid[key]) delete m.paid[key];
    else m.paid[key] = true;
  };
}

export function tickNote(name: string, nowPaid: boolean): string {
  return nowPaid ? `Ticked ${name} paid` : `Unticked ${name}`;
}

/* ---------- form ---------- */

export interface BillForm {
  name: string;
  amt: string;
  freq: Freq;
  /** Due day for monthly bills, as typed. Empty = no date set. */
  day: string;
  /** One past charge date for every 2 weeks bills. */
  anchor: string;
  note: string;
}

export type BillErrors = Partial<Record<'name' | 'amt' | 'day' | 'anchor', string>>;

/** What a bill save writes. Unknown fields of the bill are kept by the recipe. */
export interface BillValue {
  name: string;
  amt: number;
  freq: Freq;
  day: number | null;
  anchor: string | null;
  note: string;
}

const amountText = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? String(n) : '');

export function billFormFrom(b?: Bill | null): BillForm {
  return {
    name: b?.name ?? '',
    amt: amountText(b?.amt),
    freq: b?.freq === 'biweekly' ? 'biweekly' : 'monthly',
    day: b?.day ? String(b.day) : '',
    anchor: typeof b?.anchor === 'string' ? b.anchor : '',
    note: typeof b?.note === 'string' ? b.note : '',
  };
}

/** A whole day 1 to 31, null when empty, undefined when not a valid day. */
function parseDay(s: string): number | null | undefined {
  if (s.trim() === '') return null;
  const n = parseAmount(s);
  return n !== null && Number.isInteger(n) && n >= 1 && n <= 31 ? n : undefined;
}

/** Inline errors, or the value to save. Only the date field shown for the chosen frequency is checked. */
export function validateBill(f: BillForm): { errors: BillErrors; value: BillValue | null } {
  const errors: BillErrors = {};
  const name = f.name.trim();
  if (!name) errors.name = 'Add a name';
  const amt = parseAmount(f.amt);
  if (amt === null || !(amt > 0)) errors.amt = 'Enter an amount, like 27.11';
  const day = parseDay(f.day);
  if (f.freq === 'monthly' && day === undefined) errors.day = 'Pick a day from 1 to 31';
  if (f.freq === 'biweekly' && !isISODate(f.anchor)) errors.anchor = 'Pick one past charge date';
  if (Object.keys(errors).length) return { errors, value: null };
  return {
    errors,
    value: {
      name,
      amt: cents(amt!),
      freq: f.freq,
      day: day ?? null,
      anchor: isISODate(f.anchor) ? f.anchor : null,
      note: f.note.trim(),
    },
  };
}

/** Add (id not in the list yet) or change a bill, found by id. Unknown fields are kept. */
export function saveBillRecipe(id: string, value: BillValue) {
  return (draft: Draft<FinanceData>) => {
    draft.bills ??= [];
    const b = draft.bills.find((x) => x.id === id);
    if (b) Object.assign(b, value);
    else draft.bills.push({ id, ...value });
  };
}

export function deleteBillRecipe(id: string) {
  return (draft: Draft<FinanceData>) => {
    const i = (draft.bills ?? []).findIndex((x) => x.id === id);
    if (i >= 0) draft.bills.splice(i, 1);
  };
}

export function billNote(action: 'added' | 'changed' | 'deleted', name: string): string {
  const verb = { added: 'Added', changed: 'Changed', deleted: 'Deleted' }[action];
  return `${verb} bill ${name}`;
}
