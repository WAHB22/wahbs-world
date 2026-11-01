/**
 * Merchant normalization, fingerprints and fuzzy matching.
 * Shared by migrate (fp for old transactions), categorize (merchantMap keys)
 * and duplicate detection. Changing normalizeMerchant changes merchantMap keys,
 * so treat its output as part of the saved contract.
 */

const PROVINCES = new Set(['qc', 'on', 'bc', 'ab', 'mb', 'sk', 'ns', 'nb', 'nl', 'pe', 'yt', 'nt', 'nu', 'ca', 'can']);
const CITIES = [
  'montreal', 'ottawa', 'gatineau', 'laval', 'longueuil', 'quebec', 'toronto', 'vancouver', 'brossard',
  'kanata', 'nepean', 'orleans', 'hull', 'aylmer', 'westmount', 'outremont', 'verdun', 'lasalle',
  'st laurent', 'saint laurent', 'mont royal', 'anjou', 'terrebonne', 'boucherville', 'mississauga',
];

/** Prefixes added by card processors and by CIBC chequing descriptions. */
const PREFIXES: RegExp[] = [
  /^point of sale\s*-?\s*(interac|visa debit)?\s*(retail purchase|purchase)?\s*/,
  /^electronic funds transfer\s*(preauthorized debit|pay|deposit)?\s*/,
  /^internet banking\s*/,
  /^retail purchase\s*/,
  /^(sq|tst|pp|iz|sp|dd|ckc|zsk|pos)\s*\*\s*/,
  /^paypal\s*\*\s*/,
];

export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * 'NUAGE CAFE #123 MONTREAL QC' -> 'nuage cafe'
 * 'Point of Sale - Interac RETAIL PURCHASE 000000123456 COSTCO WHOLESALE' -> 'costco wholesale'
 * 'Saveurs Épicerie Urbaine' -> 'saveurs epicerie urbaine'
 */
export function normalizeMerchant(raw: string | null | undefined): string {
  if (!raw) return '';
  let s = stripAccents(String(raw)).toLowerCase().trim();
  for (const p of PREFIXES) s = s.replace(p, '');
  s = s.replace(/https?:\/\//g, ' ').replace(/www\./g, ' ');
  s = s.replace(/#\s*\d+/g, ' ');
  s = s.replace(/[^a-z0-9&]+/g, ' ');
  s = s.replace(/\b\d{3,}\b/g, ' ');
  s = s.replace(/\s+/g, ' ').trim();
  let tokens = s.split(' ').filter(Boolean);
  // Trailing province code, then a known city before it.
  while (tokens.length > 1 && PROVINCES.has(tokens[tokens.length - 1])) tokens.pop();
  const joined = () => tokens.join(' ');
  for (const city of CITIES) {
    if (tokens.length > city.split(' ').length && joined().endsWith(' ' + city)) {
      tokens = tokens.slice(0, tokens.length - city.split(' ').length);
      break;
    }
  }
  tokens = tokens.filter((t, i) => !(i > 0 && ['inc', 'ltd', 'ltee', 'com', 'ca'].includes(t)));
  return tokens.join(' ').trim();
}

/** `${amountInCents}|${normalizedMerchant}`. Sign kept (refunds are negative). */
export function fingerprint(amt: number, merchant: string | null | undefined): string {
  return `${Math.round(amt * 100)}|${normalizeMerchant(merchant)}`;
}

function bigrams(s: string): string[] {
  const t = s.replace(/\s+/g, '');
  const out: string[] = [];
  for (let i = 0; i < t.length - 1; i++) out.push(t.slice(i, i + 2));
  return out;
}

/** Sorensen Dice on character bigrams, 0..1. */
export function dice(a: string, b: string): number {
  const A = bigrams(a);
  const B = bigrams(b);
  if (!A.length || !B.length) return a === b ? 1 : 0;
  const counts = new Map<string, number>();
  for (const g of A) counts.set(g, (counts.get(g) ?? 0) + 1);
  let hit = 0;
  for (const g of B) {
    const c = counts.get(g) ?? 0;
    if (c > 0) {
      hit++;
      counts.set(g, c - 1);
    }
  }
  return (2 * hit) / (A.length + B.length);
}

/**
 * True when two raw merchant strings very likely name the same place.
 * 'COSTCO WHOLESALE #1234 OTTAWA ON' vs 'Costco' -> true
 * 'Nuage Cafe' vs 'NUAGE CAFE MONTREAL QC' -> true
 * 'Netflix' vs 'Spotify' -> false
 * Empty on either side -> false.
 */
export function similarMerchant(a: string | null | undefined, b: string | null | undefined): boolean {
  const na = normalizeMerchant(a);
  const nb = normalizeMerchant(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const ta = na.split(' ');
  const tb = nb.split(' ');
  // One is a prefix of the other on word boundaries ('costco' / 'costco wholesale').
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  if (short.join(' ').length >= 4 && long.slice(0, short.length).join(' ') === short.join(' ')) return true;
  // Same distinctive first word.
  if (ta[0].length >= 5 && ta[0] === tb[0]) return true;
  const setA = new Set(ta);
  const inter = tb.filter((t) => setA.has(t) && t.length >= 3).length;
  const union = new Set([...ta, ...tb]).size;
  if (union > 0 && inter / union >= 0.5) return true;
  return dice(na, nb) >= 0.72;
}
