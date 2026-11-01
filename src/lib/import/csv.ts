/**
 * CIBC CSV exports, parsed in the browser. See docs/SPEC.md "Import".
 *
 * CIBC files have no header: `date, description, debit, credit[, card number]`.
 * A 5th column holding a masked card number ('4500********1234') means the Visa;
 * otherwise the line is from chequing. Debit is money out, credit is money in.
 */
import type { ISODate, TxAccount } from '../types';
import { cents } from '../format';
import { daysInMonth } from '../dates';
import type { ReadRow } from './types';

interface CsvRecord {
  fields: string[];
  /** The record's text as it appeared in the file, without the line break. */
  raw: string;
}

/** Splits CSV text into records. Handles quotes, "" escapes, commas and line breaks inside quotes, CRLF. */
export function splitCsv(text: string): CsvRecord[] {
  const out: CsvRecord[] = [];
  let fields: string[] = [];
  let field = '';
  let inQuotes = false;
  let start = 0;
  const endRecord = (end: number) => {
    fields.push(field);
    out.push({ fields, raw: text.slice(start, end) });
    fields = [];
    field = '';
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c !== '"') field += c;
      else if (text[i + 1] === '"') {
        field += '"';
        i++;
      } else inQuotes = false;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') {
      fields.push(field);
      field = '';
    } else if (c === '\r' || c === '\n') {
      endRecord(i);
      if (c === '\r' && text[i + 1] === '\n') i++;
      start = i + 1;
    } else field += c;
  }
  if (field !== '' || fields.length > 0) endRecord(text.length);
  return out.filter((r) => r.fields.some((f) => f.trim() !== ''));
}

const pad = (n: number) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' or 'MM/DD/YYYY' to ISO. null for anything else (a header, a bad date). */
export function parseCsvDate(s: string): ISODate | null {
  const t = s.trim();
  let y: number, m: number, d: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  if (iso) [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (us) [m, d, y] = [Number(us[1]), Number(us[2]), Number(us[3])];
  else return null;
  if (m < 1 || m > 12 || d < 1) return null;
  const key = `${y}-${pad(m)}`;
  if (d > daysInMonth(key)) return null;
  return `${key}-${pad(d)}`;
}

/** '182.40', '$1,024.50', '-12.99', '(12.99)'. null when empty or not a number. */
export function parseCsvAmount(s: string): number | null {
  let t = s.replace(/[$\s ]/g, '');
  if (t === '') return null;
  let negative = false;
  if (/^\(.*\)$/.test(t)) {
    negative = true;
    t = t.slice(1, -1);
  }
  if (/^[-−]/.test(t)) {
    negative = !negative;
    t = t.slice(1);
  }
  if (/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) t = t.replace(/,/g, '');
  else if (/^\d+,\d{1,2}$/.test(t)) t = t.replace(',', '.');
  if (!/^\d*\.?\d+$/.test(t)) return null;
  const n = Number(t);
  return negative ? -n : n;
}

/** A masked card number has some digits and some mask characters. */
function isMaskedCard(s: string | undefined): boolean {
  const t = (s ?? '').trim();
  return /\d{2,}/.test(t) && /[*xX•]/.test(t) && /^[\d*xX•\s-]+$/.test(t);
}

function toRow(rec: CsvRecord): Omit<ReadRow, 'src' | 'fileId' | 'fileName'> | null {
  const [dateText = '', description = '', debitText = '', creditText = '', card] = rec.fields;
  const date = parseCsvDate(dateText);
  if (!date) return null;
  // Positive = money out. A negative debit (some exports) is money in.
  const net = cents((parseCsvAmount(debitText) ?? 0) - (parseCsvAmount(creditText) ?? 0));
  if (net === 0) return null;
  const account: TxAccount = isMaskedCard(card) ? 'visa' : 'chequing';
  return {
    date,
    time: null,
    merchant: description.replace(/\s+/g, ' ').trim(),
    amount: Math.abs(net),
    direction: net > 0 ? 'out' : 'in',
    account,
    raw: rec.raw.trim(),
  };
}

/**
 * Every transaction line of a CIBC CSV export, in file order. A header row and
 * any line without a date or an amount are skipped.
 */
export function parseCibcCsv(text: string, file?: { id?: string; name?: string }): ReadRow[] {
  const body = text.replace(/^﻿/, '');
  const out: ReadRow[] = [];
  for (const rec of splitCsv(body)) {
    const row = toRow(rec);
    if (!row) continue;
    out.push({
      ...row,
      src: 'statement',
      ...(file?.id !== undefined ? { fileId: file.id } : {}),
      ...(file?.name !== undefined ? { fileName: file.name } : {}),
    });
  }
  return out;
}
