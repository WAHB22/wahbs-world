/**
 * Dates and the cleaning of rows read from a file. The model is asked for
 * strict JSON, but nothing it returns is trusted: rows with a bad date, amount,
 * direction or account are dropped, text is trimmed to one short line.
 */

export const MAX_ROWS = 500;

export function isIsoDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** The calendar date in Toronto at `nowMs`, as YYYY-MM-DD. */
export function torontoToday(nowMs) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Toronto',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(nowMs));
  const get = (type) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

function daysApart(a, b) {
  return Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);
}

/**
 * Today for this request: the x-today header when it is a real date within one
 * day of the server's Toronto date (any time zone on earth fits), else the
 * server's Toronto date. The bound keeps the daily read count honest.
 */
export function pickToday(headerValue, nowMs) {
  const server = torontoToday(nowMs);
  if (isIsoDate(headerValue) && Math.abs(daysApart(headerValue, server)) <= 1) return headerValue;
  return server;
}

export function weekday(iso) {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
}

function oneLine(v, max) {
  if (typeof v !== 'string') return '';
  return Array.from(v.replace(/\s+/g, ' ').trim()).slice(0, max).join('').trim();
}

/** Positive amount rounded to cents, or null. Accepts '1,234.56' and '$6.58' too. */
function toAmount(v) {
  let n = v;
  if (typeof v === 'string') {
    const s = v.replace(/[$,\s]/g, '');
    n = /^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
  }
  if (typeof n !== 'number' || !Number.isFinite(n)) return null;
  const cents = Math.round(n * 100);
  return cents > 0 && cents < 100_000_000 ? cents / 100 : null;
}

const TIME = /^\d{1,2}:\d{2}(\s?[ap]\.?m\.?)?$/i;

function toTime(v) {
  const s = oneLine(v, 12);
  return TIME.test(s) ? s : null;
}

/** 'visa', 'chequing' or null; undefined when the value is not one of those. */
function toAccount(v) {
  if (v == null || v === '') return null;
  if (typeof v !== 'string') return undefined;
  const s = v.trim().toLowerCase();
  if (s === 'visa' || s === 'chequing') return s;
  if (s === 'null' || s === 'unknown') return null;
  return undefined;
}

/** A clean ReadRow, or null when the row cannot be trusted. */
export function cleanRow(r) {
  if (!r || typeof r !== 'object' || Array.isArray(r)) return null;
  const date = typeof r.date === 'string' ? r.date.trim() : '';
  if (!isIsoDate(date)) return null;
  const amount = toAmount(r.amount);
  if (amount == null) return null;
  const direction = typeof r.direction === 'string' ? r.direction.trim().toLowerCase() : '';
  if (direction !== 'in' && direction !== 'out') return null;
  const account = toAccount(r.account);
  if (account === undefined) return null;
  const merchant = oneLine(r.merchant, 120);
  if (!merchant) return null;
  return { date, time: toTime(r.time), merchant, amount, direction, account, raw: oneLine(r.raw, 300) };
}

export function cleanRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.slice(0, MAX_ROWS).map(cleanRow).filter(Boolean);
}
