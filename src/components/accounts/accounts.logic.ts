/**
 * Accounts: row text, the account form and its recipe. Pure, no clock.
 */
import type { Draft } from 'immer';
import type { Account, FinanceData, ISODate } from '@/lib/types';
import { cents, money, moneyShort, parseAmount, toCents } from '@/lib/format';
import { listAnd, shortDate } from '@/lib/dates';
import { amountField } from '@/components/budget/budget.logic';

export const isChequing = (a: Pick<Account, 'kind' | 'name'>) => a.kind === 'asset' && /chequing/i.test(String(a.name ?? ''));

/** Same rule as the forecast: the debt account named Visa, else the first debt account. */
export function isVisaAccount(data: FinanceData, a: Pick<Account, 'id' | 'kind'>): boolean {
  if (a.kind !== 'debt') return false;
  const debts = (data.accounts ?? []).filter((x) => x.kind === 'debt');
  const visa = debts.find((x) => /visa/i.test(String(x.name ?? ''))) ?? debts[0];
  return visa?.id === a.id;
}

const hasNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

// ---------- rows ----------

export interface AccountRow {
  id: string;
  name: string;
  tag: { tone: 'good' | 'soon'; text: string } | null;
  /** 'goal $400' or 'limit $2,500', plus ' · updated Nov 14' when known. */
  sub: string;
  /** '$1,250.40' or 'tap to enter'. */
  value: string;
  empty: boolean;
  label: string;
}

export function accountRows(data: FinanceData): AccountRow[] {
  return (data.accounts ?? []).map((a) => {
    const name = String(a.name ?? '');
    const bal = hasNumber(a.bal) ? a.bal : null;
    let tag: AccountRow['tag'] = null;
    if (bal !== null && a.kind === 'asset' && hasNumber(a.goal) && a.goal > 0) {
      tag = bal >= a.goal ? { tone: 'good', text: 'on goal' } : { tone: 'soon', text: 'below goal' };
    }
    const target =
      a.kind === 'debt'
        ? hasNumber(a.limit) && a.limit > 0
          ? `limit ${moneyShort(a.limit)}`
          : 'no limit set'
        : hasNumber(a.goal) && a.goal > 0
          ? `goal ${moneyShort(a.goal)}`
          : 'no goal set';
    const when = bal !== null && typeof a.asOf === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(a.asOf) ? ` · updated ${shortDate(a.asOf)}` : '';
    const value = bal === null ? 'tap to enter' : money(bal);
    return {
      id: a.id,
      name,
      tag,
      sub: target + when,
      value,
      empty: bal === null,
      label: [name, tag?.text, target, value].filter(Boolean).join(', '),
    };
  });
}

// ---------- form ----------

export interface AccountForm {
  id: string;
  title: string;
  kind: 'asset' | 'debt';
  visa: boolean;
  chequing: boolean;
  /** 'Last updated Nov 1' or null. */
  asOfText: string | null;
  bal: string;
  /** Goal (asset) or card limit (debt). */
  target: string;
  dueDay: string;
  /** He typed in the balance field, so the balance is confirmed as of today even if unchanged. */
  balTouched: boolean;
  errors: { bal?: string; target?: string; dueDay?: string };
}

export function initAccountForm(data: FinanceData, id: string): AccountForm {
  const a = (data.accounts ?? []).find((x) => x.id === id);
  const kind = a?.kind === 'debt' ? 'debt' : 'asset';
  const due = data.settings?.visaDueDay;
  return {
    id,
    title: String(a?.name ?? 'Account'),
    kind,
    visa: a ? isVisaAccount(data, a) : false,
    chequing: a ? isChequing(a) : false,
    asOfText: a && hasNumber(a.bal) && typeof a.asOf === 'string' && a.asOf ? `Last updated ${shortDate(a.asOf)}` : null,
    bal: amountField(hasNumber(a?.bal) ? a.bal : null),
    target: amountField(kind === 'debt' ? (a?.limit ?? null) : (a?.goal ?? null)),
    dueDay: hasNumber(due) ? String(due) : '',
    balTouched: false,
    errors: {},
  };
}

export type AccountValues = {
  bal: number | null;
  target: number | null;
  /** Only for the Visa account; undefined leaves settings.visaDueDay alone. */
  dueDay?: number | null;
};

export function checkAccountForm(
  form: Pick<AccountForm, 'kind' | 'visa' | 'bal' | 'target' | 'dueDay'>,
): { ok: true; values: AccountValues } | { ok: false; errors: AccountForm['errors'] } {
  const errors: AccountForm['errors'] = {};
  let bal: number | null = null;
  if (form.bal.trim() !== '') {
    const n = parseAmount(form.bal);
    if (n === null) errors.bal = 'Enter an amount like 1250.40.';
    else bal = cents(n);
  }
  let target: number | null = null;
  if (form.target.trim() !== '') {
    const n = parseAmount(form.target);
    if (n === null) errors.target = `Enter an amount like ${form.kind === 'debt' ? '2500' : '400'}.`;
    else if (n < 0) errors.target = 'Use an amount of zero or more.';
    else target = cents(n);
  }
  let dueDay: number | null | undefined;
  if (form.visa) {
    const t = form.dueDay.trim();
    if (t === '') dueDay = null;
    else if (/^\d{1,2}$/.test(t) && Number(t) >= 1 && Number(t) <= 31) dueDay = Number(t);
    else errors.dueDay = 'Enter a day from 1 to 31, or leave it empty.';
  }
  if (errors.bal || errors.target || errors.dueDay) return { ok: false, errors };
  return { ok: true, values: form.visa ? { bal, target, dueDay } : { bal, target } };
}

export interface AccountChanges {
  bal: boolean;
  target: boolean;
  dueDay: boolean;
}

const sameMoney = (a: unknown, b: number | null) => (hasNumber(a) ? toCents(a) : null) === (b === null ? null : toCents(b));

export function accountChanges(data: FinanceData, id: string, values: AccountValues, balTouched: boolean): AccountChanges {
  const a = (data.accounts ?? []).find((x) => x.id === id);
  const due = data.settings?.visaDueDay;
  return {
    bal: balTouched || !sameMoney(a?.bal, values.bal),
    target: !sameMoney(a?.kind === 'debt' ? a?.limit : a?.goal, values.target),
    dueDay: values.dueDay !== undefined && (hasNumber(due) ? due : null) !== values.dueDay,
  };
}

/** 'Updated Chequing balance', 'Updated Visa owing card limit and due day'. null when nothing changed. */
export function accountNote(name: string, kind: 'asset' | 'debt', c: AccountChanges): string | null {
  const parts: string[] = [];
  if (c.bal) parts.push('balance');
  if (c.target) parts.push(kind === 'debt' ? 'card limit' : 'goal');
  if (c.dueDay) parts.push('due day');
  return parts.length ? `Updated ${name} ${listAnd(parts)}` : null;
}

/**
 * Writes the account in place (extra fields stay). A balance he typed is dated
 * today (account.asOf), and for Chequing it also becomes the forecast's start
 * (settings.chequing). Saving only a goal or a due day leaves the balance date
 * alone, so an old balance is never passed off as today's.
 */
export function applyAccount(draft: Draft<FinanceData>, id: string, values: AccountValues, changes: AccountChanges, today: ISODate): void {
  const a = (draft.accounts ?? []).find((x) => x.id === id);
  if (!a) return;
  if (changes.bal) {
    a.bal = values.bal;
    a.asOf = values.bal === null ? null : today;
    if (isChequing(a)) {
      draft.settings.chequing = values.bal === null ? null : { ...(draft.settings.chequing ?? {}), bal: values.bal, asOf: today };
    }
  }
  if (changes.target) {
    if (a.kind === 'debt') a.limit = values.target;
    else a.goal = values.target;
  }
  if (changes.dueDay && values.dueDay !== undefined) {
    draft.settings.visaDueDay = values.dueDay;
  }
}
