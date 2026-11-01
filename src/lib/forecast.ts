/**
 * Chequing balance forecast. See docs/SPEC.md "Forecast (chequing)".
 *
 * The balance walks day by day from the date he entered it. Every event carries
 * its signed change to the balance (money in is plus, money out is minus), so a
 * point's bal is the previous day's bal plus the sum of its events.
 * Pure: `today` is passed in, nothing reads the clock.
 */
import type { Account, FinanceData, ISODate, Pay, Tx } from './types';
import {
  addDays,
  daysBetween,
  daysInMonth,
  isISODate,
  listAnd,
  maxDate,
  minDate,
  monthEnd,
  monthKey,
  monthRange,
  shortDate,
} from './dates';
import { isPaid, monthOccurrences, occurrencesBetween, type Occurrence } from './bills';
import { cents, moneyShort, toCents } from './format';
import { allPays, nextPay, paycheques, type NextPay } from './pay';

export type ForecastEvent = {
  kind: 'bill' | 'pay' | 'planned-pay' | 'visa' | 'spend' | 'late-bill';
  /** Plain text without the word "estimate"; show "estimate" when `estimate` is true. */
  label: string;
  /** Signed change to the balance: plus for money in, minus for money out. */
  amt: number;
  estimate: boolean;
};

export type ForecastPoint = {
  date: ISODate;
  /** Balance at the end of the day. */
  bal: number;
  /** true when the day uses the daily spending average or a planned pay. */
  estimate: boolean;
  events: ForecastEvent[];
};

export type Forecast =
  | { status: 'no-balance' }
  | {
      status: 'ok';
      start: { bal: number; asOf: ISODate };
      end: ISODate;
      next: NextPay | null;
      /** One point per day, today to end. */
      points: ForecastPoint[];
      dailySpend: number;
      lowest: { date: ISODate; bal: number; label: string };
      belowZero: null | { firstDate: ISODate; amount: number; text: string };
      /** Visa owing when no due day is set ("Visa owing $X, due date not set"). */
      visaUnscheduled: number | null;
      visaPayment: null | { date: ISODate; amt: number };
    };

export type ForecastOk = Extract<Forecast, { status: 'ok' }>;

const PAY_STEP_DAYS = 14;
const PAY_MATCH_DAYS = 3;
const SPEND_WINDOW_DAYS = 30;

export function forecast(data: FinanceData, today: ISODate): Forecast {
  const start = chequingStart(data);
  if (!start) return { status: 'no-balance' };
  // A balance dated after today is read as today's balance.
  const from = minDate(start.asOf, today);
  const next = nextPay(data, today);
  const end = next ? maxDate(next.date, monthEnd(monthKey(today))) : monthEnd(monthKey(today));
  const dailySpend = averageDailySpend(data, today);
  const visa = visaPlan(data, start.asOf, from, end);

  const ctx: WalkContext = {
    today,
    from,
    end,
    dailySpend,
    paysByDate: groupByDate(allPays(data)),
    txByDate: groupByDate(allTx(data).filter(paidFromChequing)),
    billsByDate: groupByDate(occurrencesBetween(data.bills ?? [], addDays(from, 1), end)),
    planned: plannedPayDates(data, next, today, end),
    plannedAmt: Number(data.settings?.payPlan) || 0,
    lateBills: lateBillEvents(data, today, from),
    visaPayment: visa.payment,
  };
  const points = walk(ctx, start.bal);
  const low = lowestPoint(points);

  return {
    status: 'ok',
    start,
    end,
    next,
    points,
    dailySpend,
    lowest: { date: low.date, bal: low.bal, label: lowestLabel(data, low) },
    belowZero: belowZero(points, low.bal),
    visaUnscheduled: visa.unscheduled,
    visaPayment: visa.payment,
  };
}

/** 'Phone + Crave/Disney (Bell)' -> 'Phone + Crave'. Cut at '/' or '(' and trim. */
export function shortBillName(name: string): string {
  const cut = name.split(/[/(]/)[0].trim();
  return cut || name.trim();
}

// ---------------------------------------------------------------------------
// Inputs

function chequingStart(data: FinanceData): { bal: number; asOf: ISODate } | null {
  const c = data.settings?.chequing;
  if (!c || !isISODate(c.asOf)) return null;
  const raw: unknown = c.bal;
  if (raw === null || raw === undefined || raw === '') return null;
  const bal = Number(raw);
  return Number.isFinite(bal) ? { bal: cents(bal), asOf: c.asOf } : null;
}

function allTx(data: FinanceData): Tx[] {
  return Object.values(data.months ?? {}).flatMap((m) => m?.tx ?? []);
}

/** Visa purchases reach chequing only through the Visa payment. null counts as chequing. */
function paidFromChequing(t: Tx): boolean {
  return t.account !== 'visa';
}

function sumAmt(list: { amt: unknown }[]): number {
  return cents(list.reduce((s, x) => s + (Number(x.amt) || 0), 0));
}

/** Non bill chequing spending of the 30 days ending today, per day. */
function averageDailySpend(data: FinanceData, today: ISODate): number {
  const first = addDays(today, 1 - SPEND_WINDOW_DAYS);
  const recent = allTx(data).filter((t) => paidFromChequing(t) && t.date >= first && t.date <= today);
  return cents(sumAmt(recent) / SPEND_WINDOW_DAYS);
}

/** Estimated pay dates after today, every 14 days from next pay, unless a paycheque is logged within 3 days. */
function plannedPayDates(data: FinanceData, next: NextPay | null, today: ISODate, end: ISODate): Set<ISODate> {
  const out = new Set<ISODate>();
  if (!next) return out;
  const logged = paycheques(data).map((p) => p.date);
  for (let d = next.date; d <= end; d = addDays(d, PAY_STEP_DAYS)) {
    const nearLogged = logged.some((p) => Math.abs(daysBetween(p, d)) <= PAY_MATCH_DAYS);
    if (d > today && !nearLogged) out.add(d);
  }
  return out;
}

/**
 * Unticked bills of this month dated on or before the balance date. They have not
 * left the account yet, so they come off today.
 */
function lateBillEvents(data: FinanceData, today: ISODate, from: ISODate): ForecastEvent[] {
  return monthOccurrences(data.bills ?? [], monthKey(today))
    .filter((o) => o.dated && o.date <= from && !isPaid(data, o))
    .map((o): ForecastEvent => {
      const name = shortBillName(o.bill.name);
      return { kind: 'late-bill', label: o.date < today ? `${name}, late` : name, amt: out(o.bill.amt), estimate: false };
    });
}

// ---------------------------------------------------------------------------
// Visa

interface VisaPlan {
  payment: { date: ISODate; amt: number } | null;
  unscheduled: number | null;
}

function visaPlan(data: FinanceData, chequingAsOf: ISODate, from: ISODate, end: ISODate): VisaPlan {
  const amount = visaOwing(data, chequingAsOf);
  const dueDay = visaDueDay(data);
  if (dueDay === null) return { payment: null, unscheduled: amount > 0 ? amount : null };
  const date = firstDueDate(dueDay, from, end);
  return { payment: date && amount > 0 ? { date, amt: amount } : null, unscheduled: null };
}

/** Visa owing balance plus Visa purchases dated after it was entered. */
function visaOwing(data: FinanceData, chequingAsOf: ISODate): number {
  const acct = visaAccount(data.accounts ?? []);
  const since = acct && isISODate(acct.asOf) ? acct.asOf : chequingAsOf;
  const owing = Number(acct?.bal) || 0;
  const newer = allTx(data).filter((t) => t.account === 'visa' && t.date > since);
  return cents(owing + sumAmt(newer));
}

function visaAccount(accounts: Account[]): Account | undefined {
  const debts = accounts.filter((a) => a.kind === 'debt');
  return debts.find((a) => /visa/i.test(a.name)) ?? debts[0];
}

function visaDueDay(data: FinanceData): number | null {
  const d = Number(data.settings?.visaDueDay);
  return Number.isInteger(d) && d >= 1 && d <= 31 ? d : null;
}

/** First due date with from < date <= end. Day 31 falls on the last day of shorter months. */
function firstDueDate(day: number, from: ISODate, end: ISODate): ISODate | null {
  for (const m of monthRange(monthKey(from), monthKey(end))) {
    const date = `${m}-${String(Math.min(day, daysInMonth(m))).padStart(2, '0')}`;
    if (date > from && date <= end) return date;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Walk

interface WalkContext {
  today: ISODate;
  /** Balance date (asOf, at most today). Its events are already in the balance. */
  from: ISODate;
  end: ISODate;
  dailySpend: number;
  paysByDate: Map<ISODate, Pay[]>;
  txByDate: Map<ISODate, Tx[]>;
  billsByDate: Map<ISODate, Occurrence[]>;
  planned: Set<ISODate>;
  plannedAmt: number;
  lateBills: ForecastEvent[];
  visaPayment: { date: ISODate; amt: number } | null;
}

function walk(ctx: WalkContext, startBal: number): ForecastPoint[] {
  const points: ForecastPoint[] = [];
  let bal = startBal;
  for (let d = ctx.from; d <= ctx.end; d = addDays(d, 1)) {
    const events = [...(d === ctx.today ? ctx.lateBills : []), ...(d > ctx.from ? dayEvents(ctx, d) : [])];
    bal = cents(bal + events.reduce((s, e) => s + e.amt, 0));
    if (d >= ctx.today) points.push({ date: d, bal, estimate: d > ctx.today, events });
  }
  return points;
}

function dayEvents(ctx: WalkContext, d: ISODate): ForecastEvent[] {
  const events: ForecastEvent[] = (ctx.paysByDate.get(d) ?? []).map(payEvent);
  if (ctx.planned.has(d) && ctx.plannedAmt > 0) {
    events.push({ kind: 'planned-pay', label: 'Planned pay', amt: cents(ctx.plannedAmt), estimate: true });
  }
  for (const o of ctx.billsByDate.get(d) ?? []) {
    events.push({ kind: 'bill', label: shortBillName(o.bill.name), amt: out(o.bill.amt), estimate: false });
  }
  if (ctx.visaPayment?.date === d) {
    events.push({ kind: 'visa', label: 'Visa payment', amt: out(ctx.visaPayment.amt), estimate: false });
  }
  const spend = spendEvent(ctx, d);
  if (spend) events.push(spend);
  return events;
}

function payEvent(p: Pay): ForecastEvent {
  const label = p.kind === 'other' ? p.note?.trim() || 'Other income' : 'Pay';
  return { kind: 'pay', label, amt: cents(Number(p.amt) || 0), estimate: false };
}

/** Actual chequing spending up to today, the daily average after. */
function spendEvent(ctx: WalkContext, d: ISODate): ForecastEvent | null {
  if (d > ctx.today) {
    return ctx.dailySpend ? { kind: 'spend', label: 'Daily spending', amt: out(ctx.dailySpend), estimate: true } : null;
  }
  const tx = ctx.txByDate.get(d);
  return tx?.length ? { kind: 'spend', label: 'Spending', amt: out(sumAmt(tx)), estimate: false } : null;
}

// ---------------------------------------------------------------------------
// Lowest point and below zero

/** Minimum balance, first one on ties. Points are never empty (today <= end). */
function lowestPoint(points: ForecastPoint[]): ForecastPoint {
  return points.reduce((low, p) => (p.bal < low.bal ? p : low));
}

/** 'Lowest: $34 on Nov 19, the day after Phone + Crave'. */
function lowestLabel(data: FinanceData, p: ForecastPoint): string {
  return `Lowest: ${moneyShort(Math.round(p.bal))} on ${shortDate(p.date)}, ${lowestReason(data, p.date)}`;
}

function lowestReason(data: FinanceData, d: ISODate): string {
  const sameDay = billNamesOn(data, d);
  if (sameDay.length) return `the day of ${listAnd(sameDay)}`;
  const dayBefore = billNamesOn(data, addDays(d, -1));
  if (dayBefore.length) return `the day after ${listAnd(dayBefore)}`;
  return 'before payday';
}

/** Short names of the bills dated on d, paid or not. */
function billNamesOn(data: FinanceData, d: ISODate): string[] {
  const names = occurrencesBetween(data.bills ?? [], d, d).map((o) => shortBillName(o.bill.name));
  return [...new Set(names)];
}

function belowZero(points: ForecastPoint[], lowestBal: number): ForecastOk['belowZero'] {
  const first = points.find((p) => p.bal < 0);
  if (!first) return null;
  // Round the shortfall up to the next $10, in whole cents to avoid float noise.
  const amount = Math.ceil(toCents(-lowestBal) / 1000) * 10;
  return { firstDate: first.date, amount, text: `Move ${moneyShort(amount)} from savings before ${shortDate(first.date)}` };
}

// ---------------------------------------------------------------------------
// Small helpers

function groupByDate<T extends { date: string }>(items: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const it of items) {
    const list = map.get(it.date);
    if (list) list.push(it);
    else map.set(it.date, [it]);
  }
  return map;
}

/** Money leaving the account, as a signed amount. Never returns -0. */
function out(amt: unknown): number {
  const v = cents(Number(amt) || 0);
  return v === 0 ? 0 : -v;
}
