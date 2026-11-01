/**
 * Money formatting. UI text rule: no dashes. Negative numbers use the minus
 * sign (U+2212), never a hyphen or dash.
 */
const nf2 = new Intl.NumberFormat('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const nf0 = new Intl.NumberFormat('en-CA', { maximumFractionDigits: 0 });

/** '$1,234.50' or '−$12.00'. */
export function money(n: number): string {
  const v = Math.round(n * 100) / 100;
  return (v < 0 ? '−' : '') + '$' + nf2.format(Math.abs(v));
}

/** Drops '.00': '$1,300' but '$6.58'. */
export function moneyShort(n: number): string {
  const v = Math.round(n * 100) / 100;
  if (Number.isInteger(v)) return (v < 0 ? '−' : '') + '$' + nf0.format(Math.abs(v));
  return money(v);
}

/** Whole dollars, rounded down: '$14'. */
export function dollars(n: number): string {
  const v = Math.floor(n);
  return (v < 0 ? '−' : '') + '$' + nf0.format(Math.abs(v));
}

/** Round to cents to kill float noise. */
export function cents(n: number): number {
  return Math.round(n * 100) / 100;
}

export function toCents(n: number): number {
  return Math.round(n * 100);
}

/** Parse what people type: '12,50', '$1 300.00', '12.5'. null if empty or not a number. */
export function parseAmount(v: unknown): number | null {
  if (v === '' || v == null) return null;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/[$\s ]/g, '').replace(',', '.');
  if (s === '' || !/^[+−-]?\d*\.?\d+$/.test(s)) return null;
  const n = Number(s.replace('−', '-'));
  return Number.isFinite(n) ? n : null;
}
