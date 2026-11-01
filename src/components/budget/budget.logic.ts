/**
 * Spending limits: what each row shows, the item and category forms, and the
 * Cover it sheet text. Pure: no React, no clock (today is passed in).
 */
import { produce, type Draft } from 'immer';
import type { BudgetItem, FinanceData, ISODate, MonthKey } from '@/lib/types';
import { allItems, barWidth, effectiveLimits, limitStatus, monthData, spentByItem, type LimitStatus } from '@/lib/limits';
import { applyCover, coverPlan, raiseNote, raiseSuggestion, type CoverPlan, type RaiseSuggestion } from '@/lib/cover';
import { cents, money, moneyShort, parseAmount, toCents } from '@/lib/format';
import { monthKey, monthLabel } from '@/lib/dates';
import { uid } from '@/lib/ids';

// ---------- shared form helpers ----------

/** A saved number as form text: 400 -> '400', 12.5 -> '12.50', null -> ''. */
export function amountField(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(Number(n))) return '';
  const v = Number(n);
  return Number.isInteger(v) ? String(v) : v.toFixed(2);
}

const same = (a: string, b: string) => a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();

// ---------- rows ----------

export const STATUS_WORDS: Record<LimitStatus, string> = {
  green: 'under 75%',
  orange: '75 to 100%',
  red: 'over',
  none: 'no limit',
};

export type CoverState = { kind: 'plan'; plan: CoverPlan } | { kind: 'no-room' } | null;

export interface LimitRow {
  id: string;
  name: string;
  spent: number;
  /** Effective limit this month (base plus moves in, minus moves out). */
  limit: number;
  status: LimitStatus;
  width: number;
  /** '$248.00' */
  spentText: string;
  /** '/ $400.00' or '· no limit' */
  limitText: string;
  /** '+$40 moved in', '$40 moved out', or both. null when nothing moved. */
  movedText: string | null;
  /** Past month, limit held to month end: real progress, gets a Sparkle. */
  held: boolean;
  cover: CoverState;
  /** Bar's accessible label. */
  barLabel: string;
  /** Whole row's accessible label. */
  label: string;
}

export interface LimitGroup {
  id: string;
  name: string;
  /** '$648.00 / $700.00' */
  totalText: string;
  rows: LimitRow[];
}

/** Moves into and out of an item in a month, in dollars. */
export function movedFor(data: FinanceData, month: MonthKey, itemId: string): { in: number; out: number } {
  let inC = 0;
  let outC = 0;
  for (const mv of monthData(data, month).moves) {
    if (mv.from === mv.to) continue;
    const c = toCents(Number(mv.amt) || 0);
    if (mv.to === itemId) inC += c;
    if (mv.from === itemId) outC += c;
  }
  return { in: inC / 100, out: outC / 100 };
}

export function movedText(moved: { in: number; out: number }): string | null {
  const parts: string[] = [];
  if (moved.in > 0) parts.push(`+${moneyShort(moved.in)} moved in`);
  if (moved.out > 0) parts.push(`${moneyShort(moved.out)} moved out`);
  return parts.length ? parts.join(', ') : null;
}

/**
 * Cover it is offered on orange and red bars of this month and later months.
 * A past month is closed: moving room into it after the fact would rewrite a
 * month that is over (and fake a "limit held" Sparkle).
 */
function coverState(data: FinanceData, month: MonthKey, today: ISODate, itemId: string, status: LimitStatus): CoverState {
  if (status !== 'orange' && status !== 'red') return null;
  if (month < monthKey(today)) return null;
  // Already covered this month and now only orange: do not offer it again (red still gets it).
  if (status === 'orange' && monthData(data, month).moves.some((mv) => mv.to === itemId)) return null;
  const plan = coverPlan(data, month, itemId);
  return plan ? { kind: 'plan', plan } : { kind: 'no-room' };
}

export function budgetView(data: FinanceData, month: MonthKey, today: ISODate): LimitGroup[] {
  const limits = effectiveLimits(data, month);
  const spentMap = spentByItem(data, month);
  const past = month < monthKey(today);
  const hasSpending = monthData(data, month).tx.length > 0;

  return (data.budget ?? []).map((g) => {
    let spentC = 0;
    let limitC = 0;
    const rows = (g.items ?? []).map((i): LimitRow => {
      const name = String(i.name ?? '');
      const spent = spentMap[i.id] ?? 0;
      const limit = limits[i.id] ?? (Number(i.limit) || 0);
      const status = limitStatus(limit, spent);
      spentC += toCents(spent);
      if (limit > 0) limitC += toCents(limit);
      const spentText = money(spent);
      const limitText = limit > 0 ? `/ ${money(limit)}` : '· no limit';
      const moved = movedText(movedFor(data, month, i.id));
      // A month with nothing logged earns nothing: no data is not a held limit.
      const held = past && hasSpending && limit > 0 && status !== 'red';
      const amount = limit > 0 ? `${spentText} of ${money(limit)}` : `${spentText}, no limit`;
      const barLabel = `${amount}, ${STATUS_WORDS[status]}`;
      const label = [name, barLabel, moved, held ? 'limit held' : null].filter(Boolean).join(', ');
      return {
        id: i.id,
        name,
        spent,
        limit,
        status,
        width: barWidth(limit, spent),
        spentText,
        limitText,
        movedText: moved,
        held,
        cover: coverState(data, month, today, i.id, status),
        barLabel,
        label,
      };
    });
    return { id: g.id, name: String(g.name ?? ''), totalText: `${money(spentC / 100)} / ${money(limitC / 100)}`, rows };
  });
}

// ---------- find by id ----------

export function findItem(data: FinanceData, itemId: string): (BudgetItem & { groupId: string; groupName: string }) | null {
  return allItems(data).find((i) => i.id === itemId) ?? null;
}

function draftItem(draft: Draft<FinanceData>, itemId: string): Draft<BudgetItem> | null {
  for (const g of draft.budget ?? []) {
    for (const i of g.items ?? []) if (i.id === itemId) return i;
  }
  return null;
}

// ---------- limit field ----------

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

/** Monthly limit: empty means 0 (no limit). */
export function parseLimit(text: string): Parsed<number> {
  if (text.trim() === '') return { ok: true, value: 0 };
  const n = parseAmount(text);
  if (n === null) return { ok: false, error: 'Enter an amount like 400, or 0 for no limit.' };
  if (n < 0) return { ok: false, error: 'A limit cannot be below zero. Use 0 for no limit.' };
  return { ok: true, value: cents(n) };
}

function nameTaken(data: FinanceData, name: string, exceptId?: string): BudgetItem | null {
  return allItems(data).find((i) => i.id !== exceptId && same(String(i.name ?? ''), name)) ?? null;
}

// ---------- edit item ----------

export interface ItemForm {
  id: string;
  /** Title kept while the sheet closes, even if the item is gone. */
  title: string;
  groupName: string;
  name: string;
  limit: string;
  errors: { name?: string; limit?: string };
}

export function initItemForm(data: FinanceData, itemId: string): ItemForm {
  const i = findItem(data, itemId);
  return {
    id: itemId,
    title: String(i?.name ?? 'Category'),
    groupName: i?.groupName ?? '',
    name: String(i?.name ?? ''),
    limit: i ? amountField(Number(i.limit) || 0) : '',
    errors: {},
  };
}

export type ItemValues = { name: string; limit: number };

export function checkItemForm(
  data: FinanceData,
  form: Pick<ItemForm, 'id' | 'name' | 'limit'>,
): { ok: true; values: ItemValues } | { ok: false; errors: ItemForm['errors'] } {
  const errors: ItemForm['errors'] = {};
  const name = form.name.trim();
  if (!name) errors.name = 'Enter a name.';
  else if (nameTaken(data, name, form.id)) errors.name = `There is already a category named ${name}.`;
  const limit = parseLimit(form.limit);
  if (!limit.ok) errors.limit = limit.error;
  if (errors.name || errors.limit || !limit.ok) return { ok: false, errors };
  return { ok: true, values: { name, limit: limit.value } };
}

/**
 * 'Changed Groceries limit to $480', 'Renamed Errors to Oops',
 * 'Removed the Alcohol limit'. null when nothing changed.
 */
export function itemEditNote(before: { name: string; limit: number }, after: ItemValues): string | null {
  const renamed = before.name !== after.name;
  const relimited = toCents(Number(before.limit) || 0) !== toCents(after.limit);
  const limitPart = after.limit > 0 ? `limit to ${moneyShort(after.limit)}` : 'to no limit';
  if (renamed && relimited) return `Renamed ${before.name} to ${after.name} and changed its ${limitPart}`;
  if (renamed) return `Renamed ${before.name} to ${after.name}`;
  if (relimited) return after.limit > 0 ? raiseNote(after.name, after.limit) : `Changed ${after.name} to no limit`;
  return null;
}

/** Only what changed, so a save replayed on newer data (conflict) keeps changes made elsewhere. */
export function itemPatch(before: { name: string; limit: number }, after: ItemValues): Partial<ItemValues> {
  const p: Partial<ItemValues> = {};
  if (before.name !== after.name) p.name = after.name;
  if (toCents(Number(before.limit) || 0) !== toCents(after.limit)) p.limit = after.limit;
  return p;
}

/** Edits in place, by id, so any extra fields on the item stay. */
export function applyItemEdit(draft: Draft<FinanceData>, itemId: string, patch: Partial<ItemValues>): void {
  const i = draftItem(draft, itemId);
  if (!i) return;
  if (patch.name !== undefined) i.name = patch.name;
  if (patch.limit !== undefined) i.limit = patch.limit;
}

export const deleteItemNote = (name: string) => `Deleted category ${name}`;

/**
 * Removes the item from its group. Its expenses, moves and remembered
 * merchants stay as they are (Undo brings the item straight back, and the
 * importer already ignores a remembered item that no longer exists).
 */
export function applyDeleteItem(draft: Draft<FinanceData>, itemId: string): void {
  for (const g of draft.budget ?? []) {
    const at = (g.items ?? []).findIndex((i) => i.id === itemId);
    if (at >= 0) {
      g.items.splice(at, 1);
      return;
    }
  }
}

// ---------- add item ----------

export const NEW_GROUP = '__new';

export interface AddItemForm {
  group: string;
  newGroup: string;
  name: string;
  limit: string;
  errors: { newGroup?: string; name?: string; limit?: string };
}

export function initAddItemForm(data: FinanceData, groupId?: string): AddItemForm {
  const groups = data.budget ?? [];
  const group = groupId && groups.some((g) => g.id === groupId) ? groupId : (groups[0]?.id ?? NEW_GROUP);
  return { group, newGroup: '', name: '', limit: '', errors: {} };
}

export type AddItemValues = {
  /** Existing group id, or null for a new group. */
  groupId: string | null;
  groupName: string;
  name: string;
  limit: number;
};

export function checkAddItemForm(
  data: FinanceData,
  form: Pick<AddItemForm, 'group' | 'newGroup' | 'name' | 'limit'>,
): { ok: true; values: AddItemValues } | { ok: false; errors: AddItemForm['errors'] } {
  const errors: AddItemForm['errors'] = {};
  const groups = data.budget ?? [];
  const existing = form.group === NEW_GROUP ? null : groups.find((g) => g.id === form.group);
  let groupName = String(existing?.name ?? '');
  if (!existing) {
    groupName = form.newGroup.trim();
    if (!groupName) errors.newGroup = 'Enter a name for the new group.';
    else {
      const clash = groups.find((g) => same(String(g.name ?? ''), groupName));
      if (clash) errors.newGroup = `${clash.name} is already a group. Pick it above.`;
    }
  }
  const name = form.name.trim();
  if (!name) errors.name = 'Enter a category name.';
  else {
    const taken = nameTaken(data, name);
    if (taken) errors.name = `There is already a category named ${taken.name}.`;
  }
  const limit = parseLimit(form.limit);
  if (!limit.ok) errors.limit = limit.error;
  if (errors.newGroup || errors.name || errors.limit || !limit.ok) return { ok: false, errors };
  return { ok: true, values: { groupId: existing?.id ?? null, groupName, name, limit: limit.value } };
}

export const addItemNote = (name: string) => `Added category ${name}`;

/** Adds the item to its group by id; a group that was deleted meanwhile is made again by name. */
export function applyAddItem(draft: Draft<FinanceData>, values: AddItemValues, makeId: () => string = uid): void {
  draft.budget ??= [];
  const group = values.groupId ? draft.budget.find((g) => g.id === values.groupId) : undefined;
  if (!group) {
    const groupId = makeId();
    draft.budget.push({ id: groupId, name: values.groupName, items: [{ id: makeId(), name: values.name, limit: values.limit }] });
    return;
  }
  group.items ??= [];
  group.items.push({ id: makeId(), name: values.name, limit: values.limit });
}

// ---------- Cover it sheet ----------

export interface CoverView {
  name: string;
  /** 'Groceries is $37.50 over its $400.00 limit.' */
  situation: string;
  /** 'Move $40 from Dates with Kylie' */
  lead: string;
  donors: { id: string; name: string; amt: string; after: string }[];
  /** 'This brings it back to its limit.' */
  effect: string;
  /** Set when other limits did not have enough room. */
  partial: string | null;
  /** 'For November only. Your monthly limits stay the same.' */
  scope: string;
  after: { spentText: string; limitText: string; status: LimitStatus; width: number; label: string };
  /** 'Move $40' */
  button: string;
}

export function coverView(data: FinanceData, month: MonthKey, plan: CoverPlan): CoverView {
  const limits = effectiveLimits(data, month);
  const spentMap = spentByItem(data, month);
  const name = String(findItem(data, plan.itemId)?.name ?? '');
  const limit = limits[plan.itemId] ?? 0;
  const spent = spentMap[plan.itemId] ?? 0;
  const status = limitStatus(limit, spent);
  const situation =
    status === 'red'
      ? `${name} is ${money(spent - limit)} over its ${money(limit)} limit.`
      : `${name} has used ${Math.floor((spent / limit) * 100)}% of its ${money(limit)} limit.`;

  const donors = plan.donors.map((d) => {
    const dl = limits[d.itemId] ?? 0;
    const ds = Math.max(0, spentMap[d.itemId] ?? 0);
    const roomAfter = cents(dl - ds - d.amt);
    return {
      id: d.itemId,
      name: String(findItem(data, d.itemId)?.name ?? ''),
      amt: moneyShort(d.amt),
      after: roomAfter > 0 ? `${money(roomAfter)} of room left after` : 'No room left after',
    };
  });

  const newLimit = cents(limit + plan.covered);
  const afterStatus = limitStatus(newLimit, spent);
  const full = toCents(plan.covered) >= toCents(plan.need);
  const effect = !full
    ? 'This brings it closer to its limit.'
    : status === 'red'
      ? 'This brings it back to its limit.'
      : 'This brings it back under 75%.';
  const partial = full
    ? null
    : `Other limits only have ${moneyShort(plan.covered)} of room, so this covers part of the ${moneyShort(plan.need)} needed.`;
  const scope = `For ${monthLabel(month).split(' ')[0]} only. Your monthly limits stay the same.`;

  return {
    name,
    situation,
    lead: plan.text,
    donors,
    effect,
    partial,
    scope,
    after: {
      spentText: money(spent),
      limitText: `/ ${money(newLimit)}`,
      status: afterStatus,
      width: barWidth(newLimit, spent),
      label: `After the move: ${money(spent)} of ${money(newLimit)}, ${STATUS_WORDS[afterStatus]}`,
    },
    button: `Move ${moneyShort(plan.covered)}`,
  };
}

/** The raise suggestion as it will be once this cover is applied (moves dated today in `month`). */
export function suggestAfterCover(data: FinanceData, month: MonthKey, plan: CoverPlan, today: ISODate): RaiseSuggestion | null {
  const after = produce(data, (d) => applyCover(d, month, plan, today, () => 'preview'));
  return raiseSuggestion(after, month, plan.itemId);
}

/** 'Make it $480' */
export const raiseButton = (s: RaiseSuggestion) => `Make it ${moneyShort(s.newLimit)}`;

/** 'Moved $40 into Groceries.' Shown above the raise suggestion. */
export function movedIntoText(data: FinanceData, plan: CoverPlan): string {
  return `Moved ${moneyShort(plan.covered)} into ${String(findItem(data, plan.itemId)?.name ?? '')}.`;
}
