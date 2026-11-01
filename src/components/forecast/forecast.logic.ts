/**
 * Text for the forecast section: the lines under the chart, the panel for a
 * tapped day, and what a screen reader hears. Pure, no clock: `today` is passed in.
 *
 * Event labels from src/lib/forecast.ts never contain the word "estimate";
 * it is added here from the `estimate` flags.
 */
import type { ForecastOk, ForecastPoint } from '@/lib/forecast';
import type { ISODate } from '@/lib/types';
import { money, moneyShort } from '@/lib/format';
import { shortDate } from '@/lib/dates';
import { hasDot } from './chart.logic';

/** 'Today to Nov 30 · dashed line is an estimate'. */
export function forecastHint(f: Pick<ForecastOk, 'end'>): string {
  return `Today to ${shortDate(f.end)} · dashed line is an estimate`;
}

/** 'Visa owing $345.50, due date not set', or null when a due day is set (or nothing is owed). */
export function visaLine(f: Pick<ForecastOk, 'visaUnscheduled'>): string | null {
  return f.visaUnscheduled === null ? null : `Visa owing ${moneyShort(f.visaUnscheduled)}, due date not set`;
}

/** 'Daily spending $23.40, estimate from the last 30 days'. */
export function dailyLine(f: Pick<ForecastOk, 'dailySpend'>): string {
  return `Daily spending ${money(f.dailySpend)}, estimate from the last 30 days`;
}

/** 'Balance $900 entered Nov 14'. */
export function balanceLine(f: Pick<ForecastOk, 'start'>): string {
  return `Balance ${moneyShort(f.start.bal)} entered ${shortDate(f.start.asOf)}`;
}

/** '+$1,300.00' for money in, '−$90.83' for money out (minus sign from money()). */
export function signedMoney(n: number): string {
  const v = Math.round(n * 100) / 100;
  return v > 0 ? `+${money(v)}` : money(v);
}

export function dayName(date: ISODate, today: ISODate): string {
  return date === today ? 'Today' : shortDate(date);
}

export interface DayView {
  date: ISODate;
  /** 'Today' or 'Nov 18'. */
  title: string;
  /** Balance at the end of the day, '$659.62'. */
  balance: string;
  estimate: boolean;
  events: { key: string; label: string; amount: string; estimate: boolean; inflow: boolean }[];
}

/** The small panel under the chart for a tapped day. */
export function dayView(p: ForecastPoint, today: ISODate): DayView {
  return {
    date: p.date,
    title: dayName(p.date, today),
    balance: money(p.bal),
    estimate: p.estimate,
    events: p.events.map((e, k) => ({
      key: `${e.kind}-${k}`,
      label: e.label,
      amount: signedMoney(e.amt),
      estimate: e.estimate,
      inflow: e.amt > 0,
    })),
  };
}

/** The chart's aria-label: start, lowest and end, and below zero when it is. */
export function chartSummary(f: Pick<ForecastOk, 'points' | 'lowest' | 'belowZero'>, today: ISODate): string {
  const first = f.points[0];
  const last = f.points[f.points.length - 1];
  const low = f.lowest.date === today ? `lowest ${money(f.lowest.bal)} today` : `lowest ${money(f.lowest.bal)} on ${shortDate(f.lowest.date)}`;
  const parts = [`today ${money(first.bal)}`, low];
  if (last.date !== first.date) parts.push(`${shortDate(last.date)} ${money(last.bal)}`);
  const below = f.belowZero ? ` Below zero from ${shortDate(f.belowZero.firstDate)}.` : '';
  return `Chequing balance forecast, estimate: ${parts.join(', ')}.${below}`;
}

/** One day read aloud: 'Nov 18: $659.62 at end of day, estimate. Phone + Crave −$90.83. Daily spending −$27.00, estimate.' */
export function dayReadout(p: ForecastPoint, today: ISODate): string {
  const head = `${dayName(p.date, today)}: ${money(p.bal)} at end of day${p.estimate ? ', estimate' : ''}.`;
  const events = p.events.map((e) => ` ${e.label} ${signedMoney(e.amt)}${e.estimate ? ', estimate' : ''}.`).join('');
  return head + events;
}

/** The visually hidden list: every day with a bill, a pay, a planned pay or the Visa payment. */
export function readoutDays(f: Pick<ForecastOk, 'points'>, today: ISODate): { date: ISODate; text: string }[] {
  return f.points.filter(hasDot).map((p) => ({ date: p.date, text: dayReadout(p, today) }));
}

const MONEY_RE = /([+−]?\$[\d,]+(?:\.\d+)?)/;

/** Splits a sentence around its money figures, so each figure can be kept on one line. */
export function splitMoney(text: string): { text: string; money: boolean }[] {
  return text
    .split(MONEY_RE)
    .map((t, k) => ({ text: t, money: k % 2 === 1 }))
    .filter((p) => p.text !== '');
}
