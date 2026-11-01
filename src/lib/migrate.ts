/**
 * migrate(v1 or v2) -> v2. Idempotent. Never drops unknown fields, never
 * changes ids, never renames fields. Defaults per docs/SPEC.md "Data contract v2".
 * Returns a new tree: the input is never mutated and no object is shared with it.
 */
import type { Account, Bill, BudgetGroup, FinanceData, Goal, MonthData, Move, Pay, Settings, Tx, TxAccount, TxSource } from './types';
import { fingerprint } from './import/normalize';
import { PAY_PLAN } from './defaults';

type Obj = Record<string, unknown>;

const SOURCES: TxSource[] = ['manual', 'screenshot', 'statement'];
const ACCOUNTS: TxAccount[] = ['visa', 'chequing', null];

const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

export function looksLikeFinanceData(raw: unknown): boolean {
  return isObj(raw) && Array.isArray(raw.bills);
}

/** Deep copy of JSON data. Own keys only, so a '__proto__' key stays a plain key. */
function copy(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(copy);
  if (isObj(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, copy(x)]));
  return v;
}

/** Object entries of a list. Anything else in the list (null, a string) is dropped: neither page can show it. */
function records(v: unknown): Obj[] {
  return Array.isArray(v) ? v.filter(isObj) : [];
}

/** A finite number from a number or a numeric string. null, '', booleans and the rest give null. */
function toNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v !== 'string' || v.trim() === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toDayOfMonth(v: unknown): number | null {
  const n = toNumber(v);
  return n !== null && Number.isInteger(n) && n >= 1 && n <= 31 ? n : null;
}

/** A balance without a number or a date cannot drive the forecast, so it reads as not entered. */
function toChequing(v: unknown): Settings['chequing'] {
  if (!isObj(v)) return null;
  const bal = toNumber(v.bal);
  const asOf = v.asOf;
  if (bal === null || typeof asOf !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(asOf)) return null;
  return { ...v, bal, asOf };
}

function migrateSettings(v: unknown): Settings {
  const s = isObj(v) ? v : {};
  return {
    ...s,
    payPlan: toNumber(s.payPlan) ?? PAY_PLAN,
    visaDueDay: toDayOfMonth(s.visaDueDay),
    chequing: toChequing(s.chequing),
  };
}

function migrateTx(t: Obj): Tx {
  const amt = toNumber(t.amt) ?? 0;
  const merchant = typeof t.merchant === 'string' ? t.merchant : '';
  const note = typeof t.note === 'string' ? t.note : '';
  return {
    ...t,
    amt,
    src: SOURCES.includes(t.src as TxSource) ? t.src : 'manual',
    merchant,
    account: ACCOUNTS.includes(t.account as TxAccount) ? t.account : null,
    // A saved fingerprint is kept as is, even if this build would compute another one.
    fp: typeof t.fp === 'string' && t.fp ? t.fp : fingerprint(amt, merchant || note),
  } as Tx;
}

function migrateMonth(m: unknown): MonthData {
  const src = isObj(m) ? m : {};
  return {
    ...src,
    paid: isObj(src.paid) ? (src.paid as MonthData['paid']) : {},
    tx: records(src.tx).map(migrateTx),
    pays: records(src.pays) as Pay[],
    moves: records(src.moves) as Move[],
  };
}

function migrateMonths(v: unknown): Record<string, MonthData> {
  if (!isObj(v)) return {};
  return Object.fromEntries(Object.entries(v).map(([k, m]) => [k, migrateMonth(m)]));
}

function migrateGroup(g: Obj): BudgetGroup {
  return { ...g, items: records(g.items) } as BudgetGroup;
}

export function migrate(raw: unknown): FinanceData {
  if (!looksLikeFinanceData(raw)) throw new Error('Not a finance backup');
  const d = copy(raw) as Obj;
  return {
    ...d,
    version: 2,
    settings: migrateSettings(d.settings),
    bills: records(d.bills) as Bill[],
    budget: records(d.budget).map(migrateGroup),
    accounts: records(d.accounts) as Account[],
    goals: records(d.goals) as Goal[],
    months: migrateMonths(d.months),
    merchantMap: isObj(d.merchantMap) ? (d.merchantMap as Record<string, string>) : {},
  };
}

/** Stable JSON for comparing two saves, ignoring savedAt and note. */
export function comparable(d: unknown): string {
  const sort = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(sort);
    if (isObj(v)) return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sort(v[k])]));
    return v;
  };
  const { savedAt: _s, note: _n, ...rest } = (isObj(d) ? d : {}) as Record<string, unknown>;
  return JSON.stringify(sort(rest));
}
