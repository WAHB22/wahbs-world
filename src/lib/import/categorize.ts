/**
 * Categories and bills for imported rows. See docs/SPEC.md "Import".
 * Merchant memory (merchantMap) first, then the seed rules, else no category
 * ("Pick a category"; never guess silently).
 */
import type { Bill, BudgetItem, FinanceData, ISODate, MonthKey } from '../types';
import { occurrenceDates } from '../bills';
import { daysBetween, monthKey } from '../dates';
import { toCents } from '../format';
import { normalizeMerchant, similarMerchant, stripAccents } from './normalize';
import type { ReadRow } from './types';

/**
 * Text for keyword rules: lowercase, no accents, no apostrophes, other
 * punctuation to spaces. Unlike normalizeMerchant it keeps numbers ('abc 3843').
 */
export function looseText(s: string | null | undefined): string {
  return stripAccents(String(s ?? ''))
    .toLowerCase()
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9&]+/g, ' ')
    .trim();
}

/** 'NUAGE CAFE  #123' -> 'Nuage Cafe #123'. Text that already has lowercase letters keeps its case. */
/** Trailing ' MONTREAL QC' / ' OTTAWA ON' / ' #1234' on statement lines: noise in a name. */
const PLACE_TAIL =
  /(?:\s+#?\d{3,})?(?:\s+(?:montr[eé]al|ottawa|gatineau|laval|longueuil|qu[eé]bec|toronto|vancouver|brossard|kanata|nepean|orleans|westmount|outremont|verdun|lasalle))?\s+(?:qc|on|bc|ab|mb|sk|ns|nb|nl|pe)$/i;

export function tidyMerchant(raw: string | null | undefined): string {
  const full = String(raw ?? '').replace(/\s+/g, ' ').trim();
  const cut = full.replace(PLACE_TAIL, '').trim();
  const s = cut || full;
  if (!/\p{Lu}/u.test(s) || /\p{Ll}/u.test(s)) return s;
  return s.toLowerCase().replace(/(^|[^\p{L}\p{N}'’.])(\p{L})/gu, (_m, pre: string, ch: string) => pre + ch.toUpperCase());
}

const nameKey = (s: string) => stripAccents(String(s ?? '')).toLowerCase().replace(/\s+/g, ' ').trim();

function allItems(data: FinanceData): BudgetItem[] {
  return (data.budget ?? []).flatMap((g) => g.items ?? []);
}

/**
 * Budget item by name, case and accent insensitive. With `prefix`, an item whose
 * name starts with the word(s) also counts ('Takeout' finds 'Takeout and delivery').
 */
export function findItem(data: FinanceData, name: string, opts?: { prefix?: boolean }): BudgetItem | null {
  const want = nameKey(name);
  const items = allItems(data);
  const exact = items.find((i) => nameKey(i.name) === want);
  if (exact || !opts?.prefix) return exact ?? null;
  return items.find((i) => nameKey(i.name).startsWith(want + ' ')) ?? null;
}

type Target = string | ((data: FinanceData) => BudgetItem | null);

interface SeedRule {
  to: Target;
  /** looseText keywords, matched as whole words (a plural 's' is allowed). */
  keys: string[];
  /** One tap switch, by item name. */
  alt?: string;
  /** Only for rows in this direction. */
  dir?: 'out' | 'in';
}

const takeout: Target = (d) => findItem(d, 'Takeout and delivery') ?? findItem(d, 'Takeout', { prefix: true });
// Separate Lyft and Uber items win; a single 'Lyft or Uber' item is used when they are missing.
const lyft: Target = (d) => findItem(d, 'Lyft') ?? findItem(d, 'Lyft or Uber');
const uber: Target = (d) => findItem(d, 'Uber') ?? findItem(d, 'Lyft or Uber');

const ACTIVITY_PLACES = ['biodome', 'eplv', 'espace pour la vie', 'planetarium', 'insectarium', 'jardin botanique', 'cineplex', 'ticketmaster'];
const ACTIVITY_WORDS = ['billetterie', 'ticket', 'museum', 'musee', 'festival', 'cinema', 'theatre', 'concert', 'zoo', 'aquarium'];
const FOOD_WORDS = [
  'restaurant', 'resto', 'bistro', 'brasserie', 'grill', 'pizza', 'sushi', 'ramen', 'pho', 'dumpling', 'soupe',
  'burger', 'taco', 'shawarma', 'kitchen', 'cuisine', 'diner', 'poutine',
];

/**
 * Brand names come before generic words, so 'DOORDASH PIZZA PIZZA' is takeout,
 * not eating out. The first rule that matches decides, even when its budget item
 * is missing (then the row asks him to pick).
 */
const SEED_RULES: SeedRule[] = [
  { to: 'Groceries', keys: ['costco', 'walmart', 'saveurs epicerie urbaine', 'iga', 'metro', 'maxi', 'provigo', 'loblaws', 'super c', 'adonis'] },
  { to: 'Eating out', keys: ['bobino bagel'], dir: 'out' },
  { to: 'Eating out', keys: ['mcdonald', 'maclaren', 'koichi ramen'] },
  { to: 'Coffee and snacks', keys: ['tim horton', 'beau biscuit', 'little victories', 'nuage', 'starbucks', 'second cup'] },
  { to: takeout, keys: ['uber eats', 'ubereats', 'doordash', 'door dash', 'skipthedishes', 'skip the dishes'] },
  { to: 'Gas', keys: ['petro canada', 'petrocanada', 'esso', 'shell', 'ultramar', 'pioneer'] },
  { to: lyft, keys: ['lyft'] },
  { to: uber, keys: ['uber'] },
  { to: 'Cat food', keys: ['pet valu', 'mondou'] },
  { to: 'Activities', alt: 'Dates with Kylie', keys: ACTIVITY_PLACES },
  { to: 'Groceries', keys: ['epicerie'] },
  { to: 'Eating out', keys: FOOD_WORDS },
  { to: 'Coffee and snacks', keys: ['cafe', 'coffee', 'boulangerie', 'patisserie'] },
  { to: 'Activities', alt: 'Dates with Kylie', keys: ACTIVITY_WORDS },
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function hasWord(text: string, key: string): boolean {
  return new RegExp(`(?:^| )${escapeRe(key)}s?(?= |$)`).test(text);
}

function findRule(merchant: string, direction: 'out' | 'in'): SeedRule | null {
  const text = looseText(merchant);
  if (!text) return null;
  return SEED_RULES.find((r) => (!r.dir || r.dir === direction) && r.keys.some((k) => hasWord(text, k))) ?? null;
}

function resolve(data: FinanceData, to: Target): BudgetItem | null {
  return typeof to === 'string' ? findItem(data, to) : to(data);
}

export interface Category {
  itemId: string | null;
  altItemId: string | null;
  catSource: 'memory' | 'rule' | null;
}

const NO_CATEGORY: Category = { itemId: null, altItemId: null, catSource: null };

/** The other item of a rule's switch pair, when `itemId` is one of the pair. */
function altFor(data: FinanceData, rule: SeedRule | null, itemId: string): string | null {
  if (!rule?.alt) return null;
  const main = resolve(data, rule.to);
  const alt = findItem(data, rule.alt);
  if (!main || !alt || main.id === alt.id) return null;
  if (itemId === main.id) return alt.id;
  if (itemId === alt.id) return main.id;
  return null;
}

/** Category for a purchase or refund. Memory (exact normalized key) beats the seed rules. */
export function categorize(data: FinanceData, merchant: string, direction: 'out' | 'in'): Category {
  const rule = findRule(merchant, direction);
  const key = normalizeMerchant(merchant);
  const remembered = key ? data.merchantMap?.[key] : undefined;
  // A remembered item that was deleted since is ignored.
  if (remembered && allItems(data).some((i) => i.id === remembered)) {
    return { itemId: remembered, altItemId: altFor(data, rule, remembered), catSource: 'memory' };
  }
  if (!rule) return NO_CATEGORY;
  const item = resolve(data, rule.to);
  if (!item) return NO_CATEGORY;
  return { itemId: item.id, altItemId: altFor(data, rule, item.id), catSource: 'rule' };
}

/** 'Phone + Crave/Disney (Bell)' -> 'Phone + Crave'. */
export function shortBillName(name: string): string {
  return name.split(/[/(]/)[0].trim() || name.trim();
}

/** Merchant keyword -> which bills it can pay (tested on looseText of the bill name). */
const BILL_KEYWORDS: { merchant: RegExp; bill: RegExp }[] = [
  { merchant: /(?<!taco )\bbell\b/, bill: /\bbell\b/ },
  { merchant: /\bnetflix\b/, bill: /\bnetflix\b/ },
  { merchant: /\bspotify\b/, bill: /\bspotify\b/ },
  { merchant: /\b(apple|icloud)\b/, bill: /\bicloud\b/ },
  { merchant: /\b(anthropic|claude)\b/, bill: /\bclaude\b/ },
  { merchant: /\babc ?3843\b/, bill: /\b(abc|gym)\b/ },
];

export interface BillMatch {
  bill: Bill;
  /** Paid key `${bill.id}@${date}`. */
  key: string;
  month: MonthKey;
  /** Occurrence date, 'YYYY-MM-??' for a bill with no day set. */
  date: string;
  /** Amount within 5% of the bill. */
  within: boolean;
  /** Already ticked paid. */
  paid: boolean;
}

/** The bill's occurrence in the row's month; for a biweekly bill the one nearest the row's date. */
function nearestOccurrence(bill: Bill, month: MonthKey, date: ISODate): string {
  const dates = occurrenceDates(bill, month);
  const dated = dates.filter((d) => !d.endsWith('??'));
  if (!dated.length) return dates[0] ?? `${month}-??`;
  const gap = (d: string) => Math.abs(daysBetween(d, date));
  return dated.reduce((best, d) => (gap(d) < gap(best) ? d : best));
}

function isWithin(amount: number, bill: Bill): boolean {
  return Math.abs(toCents(amount) - toCents(bill.amt)) <= Math.abs(bill.amt) * 5 + 1e-9;
}

/** Among candidate bills, the occurrence with the nearest amount (then the nearest date). */
function bestOccurrence(data: FinanceData, row: ReadRow, bills: Bill[]): BillMatch | null {
  const month = monthKey(row.date);
  const options = bills.map((bill) => {
    const date = nearestOccurrence(bill, month, row.date);
    const dayGap = date.endsWith('??') ? 0 : Math.abs(daysBetween(date, row.date));
    return { bill, date, amountGap: Math.abs(toCents(row.amount) - toCents(bill.amt)), dayGap };
  });
  options.sort((a, b) => a.amountGap - b.amountGap || a.dayGap - b.dayGap);
  const best = options[0];
  if (!best) return null;
  const key = `${best.bill.id}@${best.date}`;
  return {
    bill: best.bill,
    key,
    month,
    date: best.date,
    within: isWithin(row.amount, best.bill),
    paid: !!data.months?.[month]?.paid?.[key],
  };
}

/**
 * The bill a money out row pays, or null. A keyword match (Bell, Netflix, Apple...)
 * is returned even when the amount is off (the review row then says so). Any other
 * merchant similar to a bill name counts only when the amount is within 5%.
 */
export function matchBill(data: FinanceData, row: ReadRow): BillMatch | null {
  if (row.direction !== 'out') return null;
  const bills = data.bills ?? [];
  const text = looseText(row.merchant);
  const keyword = BILL_KEYWORDS.find((k) => k.merchant.test(text));
  if (keyword) {
    const named = bills.filter((b) => keyword.bill.test(looseText(b.name)));
    if (named.length) return bestOccurrence(data, row, named);
  }
  const similar = bills.filter((b) => similarMerchant(row.merchant, b.name) || similarMerchant(row.merchant, shortBillName(b.name)));
  const hit = similar.length ? bestOccurrence(data, row, similar) : null;
  return hit?.within ? hit : null;
}
