/**
 * The Balances sheet (the forecast prompt): chequing balance now, Visa owing now
 * and the Visa due day, saved in one commit. Pure, no clock: `today` is passed in.
 */
import type { Draft } from 'immer';
import type { Account, FinanceData, ISODate } from '@/lib/types';
import { cents, parseAmount, toCents } from '@/lib/format';
import { isISODate, shortDate } from '@/lib/dates';

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** The asset account named Chequing (any case). */
export function chequingAccount(data: FinanceData): Account | undefined {
  return (data.accounts ?? []).find((a) => a.kind === 'asset' && /chequing/i.test(String(a.name ?? '')));
}

/** Same rule as the forecast: the debt account named Visa, else the first debt account. */
export function visaAccount(data: FinanceData): Account | undefined {
  const debts = (data.accounts ?? []).filter((a) => a.kind === 'debt');
  return debts.find((a) => /visa/i.test(String(a.name ?? ''))) ?? debts[0];
}

/** A saved Visa due day, or null when it is not set (or not a day of the month). */
export function savedDueDay(data: FinanceData): number | null {
  const d = data.settings?.visaDueDay;
  return isNum(d) && Number.isInteger(d) && d >= 1 && d <= 31 ? d : null;
}

/** 900 -> '900', 345.5 -> '345.50', null -> ''. */
export function fieldValue(n: unknown): string {
  if (!isNum(n)) return '';
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

export interface BalancesForm {
  /** Accounts found when the sheet opened; the recipe finds them again by id. */
  chequingId: string | null;
  visaId: string | null;
  chequing: string;
  visa: string;
  dueDay: string;
  /** He typed in the field, so the balance is confirmed as of today even if unchanged. */
  chequingTouched: boolean;
  visaTouched: boolean;
  /** 'Last entered Nov 14' or null. */
  chequingHint: string | null;
  visaHint: string | null;
  errors: { chequing?: string; visa?: string; dueDay?: string };
}

/** Prefilled from what is saved: the forecast balance first, else the Chequing account. */
export function initBalancesForm(data: FinanceData): BalancesForm {
  const chq = chequingAccount(data);
  const visa = visaAccount(data);
  const set = data.settings?.chequing;
  const fromSettings = set && isNum(set.bal) ? set.bal : null;
  const bal = fromSettings ?? (isNum(chq?.bal) ? chq.bal : null);
  const asOf = fromSettings !== null ? set?.asOf : chq?.asOf;
  const due = savedDueDay(data);
  return {
    chequingId: chq?.id ?? null,
    visaId: visa?.id ?? null,
    chequing: fieldValue(bal),
    visa: fieldValue(visa?.bal),
    dueDay: due === null ? '' : String(due),
    chequingTouched: false,
    visaTouched: false,
    chequingHint: bal !== null && isISODate(asOf) ? `Last entered ${shortDate(asOf)}` : null,
    visaHint: visa && isNum(visa.bal) && isISODate(visa.asOf) ? `Last entered ${shortDate(visa.asOf)}` : null,
    errors: {},
  };
}

export type BalancesValues = {
  chequing: number;
  /** null = not known (empty field). */
  visa: number | null;
  dueDay: number | null;
};

export type BalancesCheck = { ok: true; values: BalancesValues } | { ok: false; errors: BalancesForm['errors'] };

export function checkBalancesForm(form: Pick<BalancesForm, 'chequing' | 'visa' | 'dueDay' | 'visaId'>): BalancesCheck {
  const errors: BalancesForm['errors'] = {};

  let chequing = 0;
  const c = form.chequing.trim();
  if (c === '') errors.chequing = 'Enter your chequing balance, like 900.';
  else {
    const n = parseAmount(c);
    if (n === null) errors.chequing = 'Enter an amount like 900 or 1250.40.';
    else chequing = cents(n);
  }

  let visa: number | null = null;
  if (form.visaId && form.visa.trim() !== '') {
    const n = parseAmount(form.visa);
    if (n === null) errors.visa = 'Enter an amount like 345.50, or leave it empty.';
    else visa = cents(n);
  }

  let dueDay: number | null = null;
  const t = form.dueDay.trim();
  if (t !== '') {
    if (/^\d{1,2}$/.test(t) && Number(t) >= 1 && Number(t) <= 31) dueDay = Number(t);
    else errors.dueDay = 'Enter a day from 1 to 31, or leave it empty.';
  }

  if (errors.chequing || errors.visa || errors.dueDay) return { ok: false, errors };
  return { ok: true, values: { chequing, visa, dueDay } };
}

export interface BalancesChanges {
  chequing: boolean;
  visa: boolean;
  dueDay: boolean;
}

const sameMoney = (a: unknown, b: number | null) => (isNum(a) ? toCents(a) : null) === (b === null ? null : toCents(b));

/**
 * What the save changes. An untouched, unchanged balance keeps its old date, so
 * saving only a due day never passes an old balance off as today's.
 */
export function balancesChanges(
  data: FinanceData,
  form: Pick<BalancesForm, 'visaId' | 'chequingTouched' | 'visaTouched'>,
  values: BalancesValues,
): BalancesChanges {
  const set = data.settings?.chequing;
  const saved = !!set && isNum(set.bal) && isISODate(set.asOf);
  const visa = form.visaId ? (data.accounts ?? []).find((a) => a.id === form.visaId) : undefined;
  return {
    chequing: form.chequingTouched || !saved || !sameMoney(set?.bal, values.chequing),
    visa: !!visa && (form.visaTouched || !sameMoney(visa.bal, values.visa)),
    dueDay: savedDueDay(data) !== values.dueDay,
  };
}

/** 'Updated balances'; for a due day alone 'Set Visa due day to 25', 'Changed ...', 'Cleared ...'. null when nothing changed. */
export function balancesNote(data: FinanceData, changes: BalancesChanges, values: BalancesValues): string | null {
  if (changes.chequing || changes.visa) return 'Updated balances';
  if (!changes.dueDay) return null;
  if (values.dueDay === null) return 'Cleared Visa due day';
  return savedDueDay(data) === null ? `Set Visa due day to ${values.dueDay}` : `Changed Visa due day to ${values.dueDay}`;
}

/**
 * One commit for the whole sheet. Objects are changed in place, so fields this
 * build does not know stay. A typed balance is dated today: settings.chequing
 * (the forecast start) and the Chequing account together; the Visa account
 * with its own date.
 */
export function applyBalances(
  draft: Draft<FinanceData>,
  ids: Pick<BalancesForm, 'chequingId' | 'visaId'>,
  values: BalancesValues,
  changes: BalancesChanges,
  today: ISODate,
): void {
  const accounts = draft.accounts ?? [];
  if (changes.chequing) {
    draft.settings.chequing = { ...(draft.settings.chequing ?? {}), bal: values.chequing, asOf: today };
    const a = ids.chequingId ? accounts.find((x) => x.id === ids.chequingId) : undefined;
    if (a) {
      a.bal = values.chequing;
      a.asOf = today;
    }
  }
  if (changes.visa && ids.visaId) {
    const v = accounts.find((x) => x.id === ids.visaId);
    if (v) {
      v.bal = values.visa;
      v.asOf = values.visa === null ? null : today;
    }
  }
  if (changes.dueDay) draft.settings.visaDueDay = values.dueDay;
}
