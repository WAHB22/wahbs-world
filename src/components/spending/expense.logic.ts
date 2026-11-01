/**
 * This month's spending list and the expense form (add and edit).
 * Pure: no React, no clock, no storage. Ported from the live page's render()
 * and addExpense(), plus the v2 fields (src, fp, merchant, account).
 */
import type { Draft } from 'immer';
import type { FinanceData, ISODate, MonthData, MonthKey, Tx, TxAccount } from '@/lib/types';
import { isISODate, monthKey, shortDate } from '@/lib/dates';
import { cents, money, parseAmount } from '@/lib/format';
import { allItems, monthData } from '@/lib/limits';
import { fingerprint } from '@/lib/import/normalize';

/* ---------- list ---------- */

export interface TxRow {
  tx: Tx;
  /** Category name, or 'Other' when the item is gone. */
  title: string;
  /** 'Nov 14 · Costco · Visa'. */
  sub: string;
}

const ACCOUNT_LABEL: Record<'visa' | 'chequing', string> = { visa: 'Visa', chequing: 'Chequing' };

function text(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

/** Category names by item id. */
export function itemNames(data: FinanceData): Record<string, string> {
  return Object.fromEntries(allItems(data).map((i) => [i.id, i.name]));
}

/** Transactions of the month, newest first (stable for the same day, like the live page). */
export function txRows(data: FinanceData, month: MonthKey): TxRow[] {
  const names = itemNames(data);
  return [...monthData(data, month).tx]
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((tx) => {
      const parts = [shortDate(tx.date)];
      const label = text(tx.merchant) || text(tx.note);
      if (label) parts.push(label);
      if (tx.account === 'visa' || tx.account === 'chequing') parts.push(ACCOUNT_LABEL[tx.account]);
      return { tx, title: names[tx.item] ?? 'Other', sub: parts.join(' · ') };
    });
}

/** Section hint: '4 logged', nothing when empty. */
export function loggedHint(count: number): string {
  return count > 0 ? `${count} logged` : '';
}

/** Category picker: one optgroup per budget group. */
export function categoryGroups(data: FinanceData): { id: string; name: string; items: { id: string; name: string }[] }[] {
  return (data.budget ?? [])
    .filter((g) => (g.items ?? []).length > 0)
    .map((g) => ({ id: g.id, name: g.name, items: g.items.map((i) => ({ id: i.id, name: i.name })) }));
}

/** Line under the edit sheet title for imported entries: 'From a statement · COSTCO WHOLESALE'. */
export function txOrigin(tx: Pick<Tx, 'src' | 'merchant'>): string {
  const parts: string[] = [];
  if (tx.src === 'statement') parts.push('From a statement');
  if (tx.src === 'screenshot') parts.push('From a screenshot');
  if (text(tx.merchant)) parts.push(text(tx.merchant));
  return parts.join(' · ');
}

/** Where a tx lives: the month it was opened from first, then every month. */
export function findTx(data: FinanceData, id: string, hint?: MonthKey): { tx: Tx; month: MonthKey } | null {
  const months = data.months ?? {};
  const keys = hint && months[hint] ? [hint, ...Object.keys(months).filter((k) => k !== hint)] : Object.keys(months);
  for (const k of keys) {
    const tx = (months[k]?.tx ?? []).find((t) => t.id === id);
    if (tx) return { tx, month: k };
  }
  return null;
}

/* ---------- last account (localStorage 'finance-last-account') ---------- */

export const LAST_ACCOUNT_KEY = 'finance-last-account';

export function readLastAccount(raw: string | null | undefined): TxAccount {
  return raw === 'visa' || raw === 'chequing' ? raw : null;
}

export function storedAccount(a: TxAccount): string {
  return a ?? 'none';
}

/* ---------- form ---------- */

export interface ExpenseForm {
  amt: string;
  item: string;
  date: string;
  account: TxAccount;
  note: string;
}

export type ExpenseErrors = Partial<Record<'amt' | 'item' | 'date', string>>;

export interface ExpenseValue {
  amt: number;
  item: string;
  date: ISODate;
  account: TxAccount;
  note: string;
}

/** Today when the month on screen is this month, else the 1st of that month (live page). */
export function defaultDate(month: MonthKey, today: ISODate): ISODate {
  return month === monthKey(today) ? today : `${month}-01`;
}

export function expenseFormFrom(
  tx: Tx | null | undefined,
  ctx: { month: MonthKey; today: ISODate; lastAccount: TxAccount; firstItem: string },
): ExpenseForm {
  if (!tx) return { amt: '', item: ctx.firstItem, date: defaultDate(ctx.month, ctx.today), account: ctx.lastAccount, note: '' };
  return {
    amt: typeof tx.amt === 'number' && Number.isFinite(tx.amt) ? String(tx.amt) : '',
    item: tx.item ?? '',
    date: tx.date,
    account: tx.account === 'visa' || tx.account === 'chequing' ? tx.account : null,
    note: text(tx.note),
  };
}

/** Refunds are negative, so any amount but zero is fine. */
export function validateExpense(f: ExpenseForm): { errors: ExpenseErrors; value: ExpenseValue | null } {
  const errors: ExpenseErrors = {};
  const amt = parseAmount(f.amt);
  if (amt === null || cents(amt) === 0) errors.amt = 'Enter an amount, like 45.20';
  if (!f.item) errors.item = 'Pick a category';
  if (!isISODate(f.date)) errors.date = 'Pick a date';
  if (Object.keys(errors).length) return { errors, value: null };
  return { errors, value: { amt: cents(amt!), item: f.item, date: f.date, account: f.account, note: f.note.trim() } };
}

function ensureMonth(draft: Draft<FinanceData>, month: MonthKey): Draft<MonthData> {
  draft.months ??= {};
  const m = (draft.months[month] ??= { paid: {}, tx: [], pays: [], moves: [] });
  m.tx ??= [];
  return m;
}

/** Remove a tx by id from whichever month holds it. Returns the removed tx (a draft) or null. */
function takeTx(draft: Draft<FinanceData>, id: string): { tx: Draft<Tx>; month: MonthKey; index: number } | null {
  for (const [k, m] of Object.entries(draft.months ?? {})) {
    const index = (m?.tx ?? []).findIndex((t) => t.id === id);
    if (index >= 0) return { tx: m.tx[index], month: k, index };
  }
  return null;
}

/**
 * Add a new expense (src 'manual', merchant '') with the given id, or change
 * an existing one found by id. The tx goes to the month of its date. When
 * editing, src, merchant and unknown fields are kept, and fp is recomputed.
 */
export function saveExpenseRecipe(id: string, value: ExpenseValue) {
  return (draft: Draft<FinanceData>) => {
    const target = monthKey(value.date);
    const found = takeTx(draft, id);
    if (!found) {
      ensureMonth(draft, target).tx.push({
        id,
        date: value.date,
        item: value.item,
        amt: value.amt,
        note: value.note,
        src: 'manual',
        fp: fingerprint(value.amt, value.note),
        merchant: '',
        account: value.account,
      });
      return;
    }
    const merchant = typeof found.tx.merchant === 'string' ? found.tx.merchant : '';
    const next = {
      ...found.tx,
      date: value.date,
      item: value.item,
      amt: value.amt,
      note: value.note,
      account: value.account,
      fp: fingerprint(value.amt, merchant || value.note),
    };
    if (found.month === target) {
      Object.assign(found.tx, next);
      return;
    }
    draft.months[found.month].tx.splice(found.index, 1);
    ensureMonth(draft, target).tx.push(next);
  };
}

export function deleteExpenseRecipe(id: string) {
  return (draft: Draft<FinanceData>) => {
    const found = takeTx(draft, id);
    if (found) draft.months[found.month].tx.splice(found.index, 1);
  };
}

/** 'Added Groceries $45.20', 'Changed Costco $182.40': merchant or note when present, else the category name. */
export function expenseNote(
  action: 'added' | 'changed' | 'deleted',
  tx: { amt: number; merchant?: unknown; note?: unknown; item: string },
  names: Record<string, string>,
): string {
  const verb = { added: 'Added', changed: 'Changed', deleted: 'Deleted' }[action];
  const label = text(tx.merchant) || text(tx.note) || names[tx.item] || 'Other';
  return `${verb} ${label} ${money(tx.amt)}`;
}
