/**
 * The import review sheet: classify read rows, flag duplicates, and save the
 * ticked ones. See docs/SPEC.md "Import" for the order of the rules.
 */
import type { FinanceData, ISODate, MonthData, Pay, Tx, TxSource } from '../types';
import { daysBetween, isISODate, listAnd, monthKey, shortDate, shortMonth } from '../dates';
import { cents, money, toCents } from '../format';
import { uid } from '../ids';
import { allPays } from '../pay';
import { categorize, looseText, matchBill, shortBillName, tidyMerchant } from './categorize';
import type { BillMatch } from './categorize';
import { fingerprint, normalizeMerchant, similarMerchant } from './normalize';
import type { ReadRow, ReviewKind, ReviewMatch, ReviewRow } from './types';

/* ---------- classification ---------- */

const INTERAC = /\b(interac|e ?transfer|etransfer|e ?trf)\b/;
const OWN_TRANSFER = /\b(internet transfer|transfer to|transfer from|tfr|virement)\b/;

function isVisaPayment(row: ReadRow, text: string): boolean {
  if (/\bpayment\b.*\bthank ?you\b/.test(text) || /\bpaiement\b.*\bmerci\b/.test(text)) return true;
  // A row named just "Payment" coming into the Visa (account not read counts as the Visa).
  if (text === 'payment' && row.direction === 'in' && row.account !== 'chequing') return true;
  return row.direction === 'out' && row.account !== 'visa' && /\b(cibc visa|visa payment)\b/.test(text);
}

function notSpendingHint(row: ReadRow): string | null {
  const text = looseText(row.merchant);
  if (isVisaPayment(row, text)) return 'Visa payment, not spending';
  // 'Virement Interac' and 'Interac e-Transfer from X' are Interac, not his own accounts.
  if (!INTERAC.test(text) && OWN_TRANSFER.test(text)) return 'Transfer between your accounts, not spending';
  return null;
}

/** Payroll never lands on the Visa, so a Visa credit from Bobino Bagel stays a refund. */
function isPayroll(row: ReadRow): boolean {
  return row.direction === 'in' && row.account !== 'visa' && /\bbobino\b/.test(looseText(row.merchant));
}

function isIncome(row: ReadRow): boolean {
  return row.direction === 'in' && (INTERAC.test(looseText(row.merchant)) || row.account === 'chequing');
}

const INTERAC_NOISE =
  /\b(internet|banking|interac|e-?\s?transfer|etransfer|e-?\s?trf|transfer|virement|autodeposit|auto\s?deposit|deposit|d[eé]p[oô]t|received|re[cç]u|from|de|money|sent|request)\b/giu;

/** The sender's name in an Interac line, or null when none is visible. */
export function interacName(merchant: string): string | null {
  const s = merchant
    .replace(INTERAC_NOISE, ' ')
    .replace(/[#*:|_]/g, ' ')
    .replace(/\b\d+\b/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[^\p{L}]+|[^\p{L}.]+$/gu, '')
    .trim();
  return /\p{L}.*\p{L}/u.test(s) ? tidyMerchant(s) : null;
}

/** Note for money in: 'Interac from Alex Martin', or the tidied line. */
export function incomeNote(row: ReadRow): string {
  if (INTERAC.test(looseText(row.merchant))) {
    const name = interacName(row.merchant);
    return name ? `Interac from ${name}` : 'Interac transfer';
  }
  return tidyMerchant(row.merchant) || 'Money in';
}

function billRow(base: ReviewRow, m: BillMatch, row: ReadRow): ReviewRow {
  const name = shortBillName(m.bill.name);
  const bill: ReviewRow = { ...base, kind: 'bill', billKey: m.key, billMonth: m.month, billName: m.bill.name };
  if (m.paid) {
    const when = m.date.endsWith('??') ? `in ${shortMonth(m.month)}` : `on ${shortDate(m.date)}`;
    const match: ReviewMatch = { label: `${name} ${money(m.bill.amt)} ${when} (already marked paid)`, where: 'bill-paid' };
    return { ...bill, status: 'duplicate', ticked: false, match, hint: `${name} already marked paid` };
  }
  if (m.within) return { ...bill, status: 'bill', ticked: true, hint: `Marks ${name} paid` };
  return { ...bill, status: 'bill', ticked: false, hint: `${name} bill is ${money(m.bill.amt)}, this is ${money(row.amount)}` };
}

function classify(data: FinanceData, row: ReadRow, id: string): ReviewRow {
  const base: ReviewRow = { id, row, kind: 'expense', status: 'new', ticked: false, itemId: null, altItemId: null, catSource: null };
  const notSpending = notSpendingHint(row);
  if (notSpending) return { ...base, kind: 'not-spending', status: 'not-spending', hint: notSpending };
  if (isPayroll(row)) return { ...base, kind: 'pay', status: 'income', ticked: true, hint: 'Goes to Paycheques' };
  if (isIncome(row)) return { ...base, kind: 'income', status: 'income', ticked: true, hint: incomeNote(row) };
  const bill = matchBill(data, row);
  if (bill) return billRow(base, bill, row);
  // Money in that is not a payment, pay or income: a refund on the Visa.
  const kind: ReviewKind = row.direction === 'in' ? 'refund' : 'expense';
  const cat = categorize(data, row.merchant, row.direction);
  if (!cat.itemId) return { ...base, kind, status: 'pick', hint: 'Pick a category' };
  return { ...base, kind, status: 'new', ticked: true, ...cat, ...(kind === 'refund' ? { hint: 'Refund' } : {}) };
}

/* ---------- duplicates ---------- */

function allTx(data: FinanceData): Tx[] {
  return Object.values(data.months ?? {}).flatMap((m) => m?.tx ?? []);
}

/** Whole days apart, or Infinity when either date is unreadable. */
function gapDays(a: string, b: string): number {
  const n = Math.abs(daysBetween(a, b));
  return Number.isFinite(n) ? n : Infinity;
}

function signedAmount(r: ReviewRow): number {
  return r.kind === 'refund' ? -r.row.amount : r.row.amount;
}

function txName(data: FinanceData, tx: Tx): string {
  const item = (data.budget ?? []).flatMap((g) => g.items ?? []).find((i) => i.id === tx.item);
  return tx.note || tidyMerchant(tx.merchant) || item?.name || 'Expense';
}

/** Same amount and a similar merchant within 3 days; a blank manual entry with the same amount also counts. */
function savedTxMatch(data: FinanceData, r: ReviewRow, saved: Tx[]): ReviewMatch | null {
  const amount = toCents(signedAmount(r));
  let best: { tx: Tx; gap: number } | null = null;
  for (const tx of saved) {
    const gap = gapDays(tx.date, r.row.date);
    if (toCents(Number(tx.amt) || 0) !== amount || gap > 3) continue;
    const blankManual = (tx.src ?? 'manual') === 'manual' && !tx.merchant && !tx.note;
    if (!blankManual && !similarMerchant(r.row.merchant, tx.merchant || tx.note)) continue;
    if (!best || gap < best.gap) best = { tx, gap };
  }
  if (!best) return null;
  const { tx } = best;
  return { label: `${txName(data, tx)} ${money(tx.amt)} on ${shortDate(tx.date)} (already saved)`, where: 'saved', txId: tx.id };
}

function savedPayMatch(r: ReviewRow, saved: Pay[]): ReviewMatch | null {
  const amount = toCents(r.row.amount);
  const pay = saved.find((p) => toCents(Number(p.amt) || 0) === amount && gapDays(p.date, r.row.date) <= 3);
  if (!pay) return null;
  const name = pay.note || (pay.kind === 'other' ? 'Income' : 'Pay');
  return { label: `${name} ${money(pay.amt)} on ${shortDate(pay.date)} (already saved)`, where: 'saved' };
}

const fileOf = (row: ReadRow) => row.fileId ?? row.fileName ?? '';
const timeOf = (row: ReadRow) => (row.time ?? '').replace(/\s+/g, '').toLowerCase();

function sameLine(a: ReadRow, b: ReadRow): boolean {
  if (fileOf(a) === fileOf(b)) return false; // two equal lines in one file are real repeats
  if (a.date !== b.date || a.direction !== b.direction || toCents(a.amount) !== toCents(b.amount)) return false;
  if (timeOf(a) && timeOf(b) && timeOf(a) !== timeOf(b)) return false;
  return normalizeMerchant(a.merchant) === normalizeMerchant(b.merchant) || similarMerchant(a.merchant, b.merchant);
}

/** The same line read from another file earlier in this import (or the same bill ticked twice). */
function importMatch(r: ReviewRow, earlier: ReviewRow[]): ReviewMatch | null {
  const hit = earlier.find(
    (e) => e.kind !== 'not-spending' && (sameLine(r.row, e.row) || (r.kind === 'bill' && e.kind === 'bill' && !!r.billKey && e.billKey === r.billKey)),
  );
  if (!hit) return null;
  const b = hit.row;
  return { label: `${tidyMerchant(b.merchant)} ${money(b.amount)} on ${shortDate(b.date)} (also in this import)`, where: 'this-import' };
}

function duplicateOf(data: FinanceData, r: ReviewRow, earlier: ReviewRow[], saved: { tx: Tx[]; pays: Pay[] }): ReviewMatch | null {
  if (r.kind === 'not-spending' || r.status === 'duplicate') return null;
  if (r.kind === 'pay' || r.kind === 'income') return savedPayMatch(r, saved.pays) ?? importMatch(r, earlier);
  if (r.kind === 'bill') return importMatch(r, earlier);
  return savedTxMatch(data, r, saved.tx) ?? importMatch(r, earlier);
}

/* ---------- review sheet ---------- */

/** One review row per read row, in the same order. Every row is shown, none dropped. */
export function buildReview(data: FinanceData, rows: ReadRow[], opts: { today: ISODate; makeId?: () => string }): ReviewRow[] {
  const makeId = opts.makeId ?? uid;
  const saved = { tx: allTx(data), pays: allPays(data) };
  const out: ReviewRow[] = [];
  for (const read of rows) {
    // A line whose date could not be read is shown on today rather than dropped.
    const row = isISODate(read.date) ? read : { ...read, date: opts.today };
    const r = classify(data, row, makeId());
    const match = duplicateOf(data, r, out, saved);
    out.push(match ? { ...r, status: 'duplicate', ticked: false, match, hint: 'Possible duplicate' } : r);
  }
  return out;
}

function update(rows: ReviewRow[], rowId: string, change: (r: ReviewRow) => ReviewRow): ReviewRow[] {
  return rows.map((r) => (r.id === rowId ? change(r) : r));
}

const isPurchase = (r: ReviewRow) => r.kind === 'expense' || r.kind === 'refund';

/**
 * He picked a category: tick the row and remember the choice on save. Picking
 * one on a bill, pay or not spending row turns it into an expense (or a refund
 * for money in), since that is what he is saying it is.
 */
export function pickCategory(rows: ReviewRow[], rowId: string, itemId: string): ReviewRow[] {
  return update(rows, rowId, (r) => {
    const picked: ReviewRow = { ...r, itemId, altItemId: null, catSource: 'picked', ticked: true };
    if (isPurchase(r)) {
      if (r.status !== 'pick') return picked;
      const { hint: _hint, ...rest } = picked;
      return { ...rest, status: 'new' };
    }
    const { billKey: _k, billMonth: _m, billName: _n, match: _x, hint: _h, ...rest } = picked;
    return { ...rest, kind: r.row.direction === 'in' ? 'refund' : 'expense', status: 'new' };
  });
}

/** One tap switch (Activities <-> Dates with Kylie). Not a correction: merchantMap is not written. */
export function switchAlt(rows: ReviewRow[], rowId: string): ReviewRow[] {
  return update(rows, rowId, (r) => (r.altItemId ? { ...r, itemId: r.altItemId, altItemId: r.itemId } : r));
}

/**
 * Tick or untick. Not spending rows never save, and a purchase with no category
 * cannot be ticked (pickCategory ticks it); those are left as they are.
 */
export function toggle(rows: ReviewRow[], rowId: string): ReviewRow[] {
  return update(rows, rowId, (r) => {
    if (r.kind === 'not-spending') return r;
    if (!r.ticked && isPurchase(r) && !r.itemId) return r;
    return { ...r, ticked: !r.ticked };
  });
}

/** Rows that applyImport will write. */
function willSave(r: ReviewRow): 'expense' | 'pay' | 'bill' | null {
  if (!r.ticked) return null;
  if (isPurchase(r)) return r.itemId ? 'expense' : null;
  if (r.kind === 'pay' || r.kind === 'income') return 'pay';
  if (r.kind === 'bill') return r.billKey && r.billMonth ? 'bill' : null;
  return null;
}

/** Ticked rows that will be saved. Refunds count as expenses; Interac income counts as a pay. */
export function counts(rows: ReviewRow[]): { expenses: number; pays: number; bills: number } {
  const c = { expenses: 0, pays: 0, bills: 0 };
  for (const r of rows) {
    const what = willSave(r);
    if (what === 'expense') c.expenses++;
    else if (what === 'pay') c.pays++;
    else if (what === 'bill') c.bills++;
  }
  return c;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function summary(rows: ReviewRow[], verbs: { add: string; mark: string }): string | null {
  const c = counts(rows);
  const added = [c.expenses && plural(c.expenses, 'expense', 'expenses'), c.pays && plural(c.pays, 'pay', 'pays')].filter(
    (s): s is string => !!s,
  );
  const marked = c.bills ? `${plural(c.bills, 'bill', 'bills')} paid` : null;
  if (!added.length && !marked) return null;
  if (!added.length) return `${verbs.mark[0].toUpperCase()}${verbs.mark.slice(1)} ${marked}`;
  const parts = marked ? [...added, `${verbs.mark} ${marked}`] : added;
  return `${verbs.add} ${listAnd(parts)}`;
}

/** 'Add 4 expenses', 'Add 4 expenses and 1 pay', 'Add 3 expenses and mark 1 bill paid', 'Nothing to add'. */
export function saveLabel(rows: ReviewRow[]): string {
  return summary(rows, { add: 'Add', mark: 'mark' }) ?? 'Nothing to add';
}

/** History note: 'Imported 4 expenses', 'Imported 3 expenses and marked 1 bill paid'. */
export function importNote(rows: ReviewRow[]): string {
  return summary(rows, { add: 'Imported', mark: 'marked' }) ?? 'Imported nothing';
}

/* ---------- save ---------- */

function monthOf(draft: FinanceData, key: string): MonthData {
  draft.months ??= {};
  const m = (draft.months[key] ??= { paid: {}, tx: [], pays: [], moves: [] });
  m.paid ??= {};
  m.tx ??= [];
  m.pays ??= [];
  m.moves ??= [];
  return m;
}

/** src from the row; a row without one is a statement line when its file is a CSV or PDF. */
function sourceOf(row: ReadRow): Exclude<TxSource, 'manual'> {
  if (row.src) return row.src;
  return /\.(csv|pdf)$/i.test(row.fileName ?? '') ? 'statement' : 'screenshot';
}

function toTx(r: ReviewRow, itemId: string, date: ISODate, id: string): Tx {
  const amt = cents(signedAmount(r));
  return {
    id,
    date,
    item: itemId,
    amt,
    note: tidyMerchant(r.row.merchant),
    src: sourceOf(r.row),
    fp: fingerprint(amt, r.row.merchant),
    merchant: r.row.merchant,
    account: r.row.account ?? null,
  };
}

function toPay(r: ReviewRow, date: ISODate, id: string): Pay {
  const kind = r.kind === 'pay' ? 'pay' : 'other';
  const note = kind === 'pay' ? tidyMerchant(r.row.merchant) : incomeNote(r.row);
  return { id, date, amt: cents(r.row.amount), hours: null, note, kind };
}

/**
 * Writes the ticked rows into the data (works on an immer draft): expenses and
 * refunds become tx in the month of their date, pay and income become pays, bill
 * rows tick their occurrence paid. Every picked category is remembered in
 * merchantMap, ticked or not.
 */
export function applyImport(draft: FinanceData, rows: ReviewRow[], today: ISODate, makeId: () => string = uid): void {
  for (const r of rows) {
    if (r.catSource === 'picked' && r.itemId) {
      const key = normalizeMerchant(r.row.merchant);
      if (key) (draft.merchantMap ??= {})[key] = r.itemId;
    }
    const what = willSave(r);
    const date = isISODate(r.row.date) ? r.row.date : today;
    if (what === 'expense' && r.itemId) monthOf(draft, monthKey(date)).tx.push(toTx(r, r.itemId, date, makeId()));
    else if (what === 'pay') monthOf(draft, monthKey(date)).pays.push(toPay(r, date, makeId()));
    else if (what === 'bill' && r.billKey && r.billMonth) monthOf(draft, r.billMonth).paid[r.billKey] = true;
  }
}
