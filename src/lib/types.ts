/**
 * Saved data model, schema version 2.
 *
 * This is the shared contract with the plain HTML build (prompt A). Field names
 * and meanings must not change. Every object may carry extra fields written by
 * the other build; code must keep them (spread the original object, never
 * rebuild it from a whitelist).
 */

/** Local calendar date, 'YYYY-MM-DD'. Never a Date object in saved data. */
export type ISODate = string;
/** Month key, 'YYYY-MM'. */
export type MonthKey = string;

export type Freq = 'monthly' | 'biweekly';

export interface Bill {
  id: string;
  name: string;
  amt: number;
  freq: Freq;
  /** Day of month for monthly bills. null or missing = no date set. */
  day?: number | null;
  /** One past charge date, for biweekly bills. */
  anchor?: string | null;
  note?: string;
  [extra: string]: unknown;
}

export interface BudgetItem {
  id: string;
  name: string;
  /** Monthly limit. 0 = no limit (shown grey, "no limit"). */
  limit: number;
  [extra: string]: unknown;
}

export interface BudgetGroup {
  id: string;
  name: string;
  items: BudgetItem[];
  [extra: string]: unknown;
}

export interface Account {
  id: string;
  name: string;
  bal: number | null;
  /** Asset accounts have a goal. */
  goal?: number | null;
  /** Debt accounts (Visa owing) have a limit. */
  limit?: number | null;
  kind: 'asset' | 'debt';
  /** B build extra: date the balance was entered. Optional, may be missing. */
  asOf?: ISODate | null;
  [extra: string]: unknown;
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  [extra: string]: unknown;
}

export type TxSource = 'manual' | 'screenshot' | 'statement';
export type TxAccount = 'visa' | 'chequing' | null;

export interface Tx {
  id: string;
  date: ISODate;
  /** Budget item id. */
  item: string;
  amt: number;
  note?: string;
  /** v2. Default 'manual'. */
  src: TxSource;
  /** v2. Fingerprint: `${amountInCents}|${normalizedMerchant}`. */
  fp: string;
  /** v2. Raw merchant text as read ('' for manual entries without one). */
  merchant: string;
  /** v2. Which account paid. null = not known. */
  account: TxAccount;
  [extra: string]: unknown;
}

export interface Pay {
  id: string;
  date: ISODate;
  amt: number;
  hours?: number | null;
  note?: string;
  /** B build extra: 'pay' = a paycheque (default), 'other' = other income such as Interac in. */
  kind?: 'pay' | 'other';
  [extra: string]: unknown;
}

/** Cover it: room moved from one budget item to another, for one month only. */
export interface Move {
  id: string;
  date: ISODate;
  /** Budget item id giving room. */
  from: string;
  /** Budget item id receiving room. */
  to: string;
  amt: number;
  [extra: string]: unknown;
}

export interface MonthData {
  /** Keys are `${billId}@${occurrenceDate}`; occurrenceDate may be 'YYYY-MM-??' for bills with no day. */
  paid: Record<string, boolean>;
  tx: Tx[];
  pays: Pay[];
  /** v2. Default []. */
  moves: Move[];
  [extra: string]: unknown;
}

export interface Settings {
  payPlan: number;
  /** v2. Day of month the Visa payment is due. null/missing = not set. */
  visaDueDay?: number | null;
  /** v2. Chequing balance and the date it was entered, used by the forecast. */
  chequing?: { bal: number; asOf: ISODate } | null;
  [extra: string]: unknown;
}

export interface FinanceData {
  version: 2;
  settings: Settings;
  bills: Bill[];
  budget: BudgetGroup[];
  accounts: Account[];
  goals: Goal[];
  months: Record<MonthKey, MonthData>;
  /** v2. normalizedMerchant -> budget item id. */
  merchantMap: Record<string, string>;
  /** v2. Short plain description of the change in this save (History screen). */
  note?: string;
  /** Set by the server on every save. */
  savedAt?: string;
  [extra: string]: unknown;
}

/** Any older save, before migration. Loosely typed on purpose. */
export type AnyData = Record<string, unknown> & { version?: number };
