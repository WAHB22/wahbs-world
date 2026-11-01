/**
 * Paycheques list, the pay form and the planned pay.
 * Pure: no React, no clock. Ported from the live page's render(), editPay()
 * and the payPlan dialog, plus the B extra pay.kind ('pay' | 'other').
 */
import type { Draft } from 'immer';
import type { FinanceData, ISODate, MonthData, MonthKey, Pay } from '@/lib/types';
import { isISODate, monthKey, shortDate } from '@/lib/dates';
import { cents, moneyShort, parseAmount } from '@/lib/format';
import { monthData } from '@/lib/limits';

export type PayKind = 'pay' | 'other';

function text(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export function payKind(p: Pick<Pay, 'kind'>): PayKind {
  return p.kind === 'other' ? 'other' : 'pay';
}

/* ---------- list ---------- */

export interface PayRow {
  pay: Pay;
  /** 'Bobino pay', or the note (else 'Other income') for other income. */
  title: string;
  /** 'Nov 6 · 37.5 h · note'. The note is left out when it is already the title. */
  sub: string;
}

/** Pays of the month, oldest first (live page order). */
export function payRows(data: FinanceData, month: MonthKey): PayRow[] {
  return [...monthData(data, month).pays]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((pay) => {
      const note = text(pay.note);
      const other = payKind(pay) === 'other';
      const parts = [shortDate(pay.date)];
      if (pay.hours) parts.push(`${pay.hours} h`);
      if (note && !other) parts.push(note);
      return { pay, title: other ? note || 'Other income' : 'Bobino pay', sub: parts.join(' · ') };
    });
}

/** Section hint button: 'planning about $1,300 each'. */
export function planHint(payPlan: number): string {
  return `planning about ${moneyShort(Number(payPlan) || 0)} each`;
}

/** Where a pay lives: the month it was opened from first, then every month. */
export function findPay(data: FinanceData, id: string, hint?: MonthKey): { pay: Pay; month: MonthKey } | null {
  const months = data.months ?? {};
  const keys = hint && months[hint] ? [hint, ...Object.keys(months).filter((k) => k !== hint)] : Object.keys(months);
  for (const k of keys) {
    const pay = (months[k]?.pays ?? []).find((p) => p.id === id);
    if (pay) return { pay, month: k };
  }
  return null;
}

/* ---------- pay form ---------- */

export interface PayForm {
  amt: string;
  date: string;
  kind: PayKind;
  hours: string;
  note: string;
}

export type PayErrors = Partial<Record<'amt' | 'date' | 'hours', string>>;

export interface PayValue {
  amt: number;
  date: ISODate;
  kind: PayKind;
  hours: number | null;
  note: string;
}

/** Today when the month on screen is this month, else the 1st of that month (live page). */
export function defaultPayDate(month: MonthKey, today: ISODate): ISODate {
  return month === monthKey(today) ? today : `${month}-01`;
}

export function payFormFrom(p: Pay | null | undefined, ctx: { month: MonthKey; today: ISODate }): PayForm {
  if (!p) return { amt: '', date: defaultPayDate(ctx.month, ctx.today), kind: 'pay', hours: '', note: '' };
  return {
    amt: typeof p.amt === 'number' && Number.isFinite(p.amt) ? String(p.amt) : '',
    date: p.date,
    kind: payKind(p),
    hours: typeof p.hours === 'number' && Number.isFinite(p.hours) ? String(p.hours) : '',
    note: text(p.note),
  };
}

export function validatePay(f: PayForm): { errors: PayErrors; value: PayValue | null } {
  const errors: PayErrors = {};
  const amt = parseAmount(f.amt);
  if (amt === null || !(cents(amt) > 0)) errors.amt = 'Enter an amount, like 1300';
  if (!isISODate(f.date)) errors.date = 'Pick a date';
  const hours = f.hours.trim() === '' ? null : parseAmount(f.hours);
  if (f.hours.trim() !== '' && (hours === null || hours < 0)) errors.hours = 'Hours must be a number, like 37.5';
  if (Object.keys(errors).length) return { errors, value: null };
  return { errors, value: { amt: cents(amt!), date: f.date, kind: f.kind, hours, note: f.note.trim() } };
}

function ensureMonth(draft: Draft<FinanceData>, month: MonthKey): Draft<MonthData> {
  draft.months ??= {};
  const m = (draft.months[month] ??= { paid: {}, tx: [], pays: [], moves: [] });
  m.pays ??= [];
  return m;
}

function takePay(draft: Draft<FinanceData>, id: string): { pay: Draft<Pay>; month: MonthKey; index: number } | null {
  for (const [k, m] of Object.entries(draft.months ?? {})) {
    const index = (m?.pays ?? []).findIndex((p) => p.id === id);
    if (index >= 0) return { pay: m.pays[index], month: k, index };
  }
  return null;
}

/**
 * Log a new pay with the given id, or change one found by id. The pay goes
 * to the month of its date, like the live page. Unknown fields are kept; an
 * old pay with no kind stays without one while it is still a paycheque.
 */
export function savePayRecipe(id: string, value: PayValue) {
  return (draft: Draft<FinanceData>) => {
    const target = monthKey(value.date);
    const found = takePay(draft, id);
    if (!found) {
      ensureMonth(draft, target).pays.push({ id, amt: value.amt, date: value.date, hours: value.hours, note: value.note, kind: value.kind });
      return;
    }
    const next: Pay = { ...found.pay, amt: value.amt, date: value.date, hours: value.hours, note: value.note };
    if (found.pay.kind !== undefined || value.kind === 'other') next.kind = value.kind;
    if (found.month === target) {
      Object.assign(found.pay, next);
      return;
    }
    draft.months[found.month].pays.splice(found.index, 1);
    ensureMonth(draft, target).pays.push(next);
  };
}

export function deletePayRecipe(id: string) {
  return (draft: Draft<FinanceData>) => {
    const found = takePay(draft, id);
    if (found) draft.months[found.month].pays.splice(found.index, 1);
  };
}

/** 'Logged pay $1,300', 'Changed pay $1,300', 'Deleted pay $1,300' ('income' for other income). */
export function payNote(action: 'logged' | 'changed' | 'deleted', p: { amt: number; kind?: unknown }): string {
  const verb = { logged: 'Logged', changed: 'Changed', deleted: 'Deleted' }[action];
  return `${verb} ${p.kind === 'other' ? 'income' : 'pay'} ${moneyShort(p.amt)}`;
}

/* ---------- planned pay ---------- */

export function validatePlan(s: string): { error: string | null; value: number | null } {
  const n = parseAmount(s);
  if (n === null || n < 0) return { error: 'Enter an amount, like 1300', value: null };
  return { error: null, value: cents(n) };
}

export function planRecipe(value: number) {
  return (draft: Draft<FinanceData>) => {
    draft.settings ??= { payPlan: value };
    draft.settings.payPlan = value;
  };
}

export function planNote(value: number): string {
  return `Changed planned pay to ${moneyShort(value)}`;
}
