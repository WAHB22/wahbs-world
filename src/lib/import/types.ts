import type { ISODate, TxAccount, TxSource } from '../types';

/** One transaction as read from a CSV line, a screenshot or a PDF statement. */
export interface ReadRow {
  date: ISODate;
  /** '3:42 PM' when visible. Missing or null when cut off: the row is still shown. */
  time?: string | null;
  merchant: string;
  /** Always positive. Direction says which way the money went. */
  amount: number;
  direction: 'out' | 'in';
  account: TxAccount;
  /** The original text of the line, for the review sheet and for debugging. */
  raw: string;
  /** Set by the client: which file this came from (for same file twice checks). */
  fileId?: string;
  fileName?: string;
  /** Set by the client from the file type. */
  src?: Exclude<TxSource, 'manual'>;
}

export type ReviewKind =
  | 'expense' // a purchase: becomes a Tx
  | 'refund' // money back from a merchant: becomes a negative Tx
  | 'not-spending' // Visa payment or transfer between his own accounts: never saved
  | 'pay' // Bobino payroll: becomes a Pay (kind 'pay')
  | 'income' // Interac in and other money in: becomes a Pay (kind 'other') with a note
  | 'bill'; // matches a bill: ticks that bill paid instead of adding an expense

export type ReviewStatus =
  | 'new' // ticked
  | 'pick' // unknown merchant: unticked, chip says "Pick a category"; picking a category ticks it
  | 'not-spending' // unticked, label "not spending"
  | 'income' // ticked, goes to Paycheques
  | 'bill' // ticked when amount within 5% of the bill, else unticked with a note
  | 'duplicate'; // unticked, shows the entry it matches; he can tick it to keep a real repeat

export interface ReviewMatch {
  /** Plain description of what it matches: 'Costco $182.40 on Oct 30 (already saved)'. */
  label: string;
  where: 'saved' | 'this-import' | 'bill-paid';
  txId?: string;
}

export interface ReviewRow {
  /** Stable id for React keys and edits. */
  id: string;
  row: ReadRow;
  kind: ReviewKind;
  status: ReviewStatus;
  ticked: boolean;
  /** Budget item for expense/refund rows. null = Pick a category. */
  itemId: string | null;
  /** One tap switch, e.g. Activities <-> Dates with Kylie. */
  altItemId?: string | null;
  /** How the category was chosen. */
  catSource?: 'memory' | 'rule' | 'picked' | null;
  /** Bill rows: which occurrence gets ticked. */
  billKey?: string;
  billMonth?: string;
  billName?: string;
  /** Possible duplicate rows. */
  match?: ReviewMatch;
  /** Short plain note shown under the row, e.g. 'Visa payment, not spending'. */
  hint?: string;
}
