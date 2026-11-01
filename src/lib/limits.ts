/**
 * Spending per budget item, effective limits (base limit plus Cover it moves)
 * and the bar colour. See docs/SPEC.md "Money rules".
 */
import type { BudgetItem, FinanceData, MonthData, MonthKey } from './types';
import { cents } from './format';

const EMPTY: MonthData = { paid: {}, tx: [], pays: [], moves: [] };

/** Read only view of a month; never creates it. */
export function monthData(data: FinanceData, month: MonthKey): MonthData {
  const m = data.months?.[month];
  if (!m) return EMPTY;
  return { ...EMPTY, ...m, paid: m.paid ?? {}, tx: m.tx ?? [], pays: m.pays ?? [], moves: m.moves ?? [] };
}

export function allItems(data: FinanceData): (BudgetItem & { groupId: string; groupName: string })[] {
  return (data.budget ?? []).flatMap((g) => (g.items ?? []).map((i) => ({ ...i, groupId: g.id, groupName: g.name })));
}

export function spentByItem(data: FinanceData, month: MonthKey): Record<string, number> {
  const out: Record<string, number> = {};
  for (const t of monthData(data, month).tx) out[t.item] = cents((out[t.item] ?? 0) + Number(t.amt || 0));
  return out;
}

/** Base limit + moves into the item this month - moves out of it. */
export function effectiveLimits(data: FinanceData, month: MonthKey): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of allItems(data)) out[i.id] = Number(i.limit) || 0;
  for (const mv of monthData(data, month).moves) {
    const amt = Number(mv.amt) || 0;
    if (mv.from in out) out[mv.from] = cents(out[mv.from] - amt);
    if (mv.to in out) out[mv.to] = cents(out[mv.to] + amt);
  }
  return out;
}

export type LimitStatus = 'green' | 'orange' | 'red' | 'none';

/**
 * Limit 0 = no limit. Green under 75%, orange 75 to 100%, red over 100%.
 * Compared in whole cents so 8.10 of 10.80 is exactly 75% (orange), not 74.999...%.
 */
export function limitStatus(limit: number, spent: number): LimitStatus {
  if (!(limit > 0)) return 'none';
  const l = Math.round(limit * 100);
  const s = Math.round(spent * 100);
  if (s > l) return 'red';
  if (4 * s >= 3 * l) return 'orange';
  return 'green';
}

/** Bar fill width in percent, like the live page. */
export function barWidth(limit: number, spent: number): number {
  if (limit > 0) return Math.max(0, Math.min((spent / limit) * 100, 100));
  return spent > 0 ? 100 : 0;
}
