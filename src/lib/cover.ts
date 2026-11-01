/**
 * Cover it: move room from other limits into an orange or red one, for one
 * month only, and suggest a real raise after three months in a row of top ups.
 * See docs/SPEC.md "Cover it". All money math is done in whole cents.
 */
import type { Draft } from 'immer';
import type { FinanceData, ISODate, MonthData, MonthKey } from './types';
import { allItems, effectiveLimits, limitStatus, monthData, spentByItem, type LimitStatus } from './limits';
import { moneyShort, toCents } from './format';
import { addMonths, listAnd, shortDate, shortMonth } from './dates';
import { uid } from './ids';

export type CoverPlan = {
  itemId: string;
  /** Room the item needs, a multiple of $5. */
  need: number;
  /** Most room first. Each amt is at most that donor's room. */
  donors: { itemId: string; amt: number }[];
  /** Sum of donor amounts. Less than need when the donors ran out of room. */
  covered: number;
  /** Button text: 'Move $40 from Volleyball and $10 from School'. */
  text: string;
};

export type RaiseSuggestion = { months: MonthKey[]; newLimit: number; text: string };

const STEP = 500; // $5 in cents

/**
 * Room a donor can give, in cents. Its limit never drops below what is
 * already spent in it, and never below 0 when refunds make spent negative
 * (a negative limit would read as "no limit").
 */
function roomCents(limit: number | undefined, spent: number): number {
  if (limit === undefined || !(limit > 0)) return 0;
  return Math.max(0, toCents(limit) - Math.max(0, toCents(spent)));
}

/**
 * Red: back to 100%, ceil5(spent - limit).
 * Orange: ceil5(spent / 0.75 - limit), taken strictly past the line so the
 * bar really ends under 75% (at exactly 75% it would still be orange).
 */
function needCents(status: 'orange' | 'red', limitC: number, spentC: number): number {
  if (status === 'red') return Math.max(STEP, Math.ceil((spentC - limitC) / STEP) * STEP);
  // Under 75% means 3 * (limit + need) > 4 * spent.
  const over = 4 * spentC - 3 * limitC;
  return Math.max(STEP, (Math.floor(over / (3 * STEP)) + 1) * STEP);
}

function isCoverable(status: LimitStatus): status is 'orange' | 'red' {
  return status === 'orange' || status === 'red';
}

function itemName(data: FinanceData, id: string): string {
  return String(allItems(data).find((i) => i.id === id)?.name ?? '');
}

/** Other items with room this month, most room first (budget order on ties). */
function rankDonors(data: FinanceData, month: MonthKey, itemId: string): { itemId: string; room: number }[] {
  const limits = effectiveLimits(data, month);
  const spent = spentByItem(data, month);
  const seen = new Set<string>([itemId]);
  const donors: { itemId: string; room: number }[] = [];
  for (const i of allItems(data)) {
    if (seen.has(i.id)) continue;
    seen.add(i.id);
    const room = roomCents(limits[i.id], spent[i.id] ?? 0);
    if (room > 0) donors.push({ itemId: i.id, room });
  }
  return donors.sort((a, b) => b.room - a.room);
}

/** null when the bar is not orange or red, has no limit, or no other limit has room. */
export function coverPlan(data: FinanceData, month: MonthKey, itemId: string): CoverPlan | null {
  const limit = effectiveLimits(data, month)[itemId];
  if (limit === undefined) return null;
  const spent = spentByItem(data, month)[itemId] ?? 0;
  const status = limitStatus(limit, spent);
  if (!isCoverable(status)) return null;

  const needC = needCents(status, toCents(limit), toCents(spent));
  let left = needC;
  const donors: CoverPlan['donors'] = [];
  for (const d of rankDonors(data, month, itemId)) {
    if (left <= 0) break;
    const take = Math.min(d.room, left);
    donors.push({ itemId: d.itemId, amt: take / 100 });
    left -= take;
  }
  if (donors.length === 0) return null;

  const parts = donors.map((d) => `${moneyShort(d.amt)} from ${itemName(data, d.itemId)}`);
  return { itemId, need: needC / 100, donors, covered: (needC - left) / 100, text: `Move ${listAnd(parts)}` };
}

function monthDraft(draft: Draft<FinanceData>, month: MonthKey): Draft<MonthData> {
  const m = (draft.months[month] ??= { paid: {}, tx: [], pays: [], moves: [] });
  m.moves ??= [];
  return m;
}

/**
 * Pushes one Move per donor, dated today. Amounts are checked again against
 * the draft so a plan replayed on newer data (save conflict) still never takes
 * a donor below what is spent in it, and never moves room to a deleted item.
 */
export function applyCover(
  draft: Draft<FinanceData>,
  month: MonthKey,
  plan: CoverPlan,
  today: ISODate,
  makeId: () => string = uid,
): void {
  const limits = effectiveLimits(draft, month);
  if (limits[plan.itemId] === undefined) return;
  const spent = spentByItem(draft, month);
  const moves = plan.donors
    .filter((d) => d.itemId !== plan.itemId)
    .map((d) => ({ from: d.itemId, amt: Math.min(toCents(d.amt), roomCents(limits[d.itemId], spent[d.itemId] ?? 0)) }))
    .filter((d) => d.amt > 0);
  if (moves.length === 0) return;
  const m = monthDraft(draft, month);
  for (const mv of moves) m.moves.push({ id: makeId(), date: today, from: mv.from, to: plan.itemId, amt: mv.amt / 100 });
}

/** Undo bar and History note: 'Moved $40 Volleyball and $10 School → Groceries, Nov 14'. */
export function coverNote(data: FinanceData, plan: CoverPlan, today: ISODate): string {
  const parts = plan.donors.map((d) => `${moneyShort(d.amt)} ${itemName(data, d.itemId)}`);
  return `Moved ${listAnd(parts)} → ${itemName(data, plan.itemId)}, ${shortDate(today)}`;
}

/** Room moved into the item in a month, in cents. */
function topUpCents(data: FinanceData, month: MonthKey, itemId: string): number {
  let sum = 0;
  for (const mv of monthData(data, month).moves) {
    if (mv.to === itemId && mv.from !== itemId) sum += toCents(Number(mv.amt) || 0);
  }
  return sum;
}

/**
 * When the item got room moved in this month and in each of the two months
 * before, suggest base limit + the biggest monthly top up, rounded up to $10.
 * Items with no limit (base 0) get no suggestion: raising them would add a limit.
 */
export function raiseSuggestion(data: FinanceData, month: MonthKey, itemId: string): RaiseSuggestion | null {
  const item = allItems(data).find((i) => i.id === itemId);
  const base = Number(item?.limit) || 0;
  if (!item || !(base > 0)) return null;
  const months = [addMonths(month, -2), addMonths(month, -1), month];
  const topUps = months.map((m) => topUpCents(data, m, itemId));
  if (topUps.some((c) => c <= 0)) return null;
  const newLimit = Math.ceil((toCents(base) + Math.max(...topUps)) / 1000) * 10;
  const text = `${item.name} topped up ${listAnd(months.map(shortMonth))}. Make it ${moneyShort(newLimit)}?`;
  return { months, newLimit, text };
}

/** Sets the base limit for every month. */
export function applyRaise(draft: Draft<FinanceData>, itemId: string, newLimit: number): void {
  for (const g of draft.budget ?? []) {
    for (const i of g.items ?? []) if (i.id === itemId) i.limit = newLimit;
  }
}

/** 'Changed Groceries limit to $480'. */
export function raiseNote(name: string, newLimit: number): string {
  return `Changed ${name} limit to ${moneyShort(newLimit)}`;
}
