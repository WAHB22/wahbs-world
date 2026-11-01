/**
 * Reads transactions out of one CIBC screenshot, app screen or statement with
 * the Claude API. The API key stays on the server; errors come back as plain
 * messages that never include upstream text.
 */
import Anthropic from '@anthropic-ai/sdk';
import { cleanRows, weekday } from './rows.js';

// Sonnet reads receipts and statements well at a fraction of Opus cost; override with READ_MODEL.
export const DEFAULT_MODEL = 'claude-sonnet-5-5';
/** Models that take the server side refusal fallback (fallbacks: 'default'). */
const FALLBACK_MODELS = new Set(['claude-opus-5-5', 'claude-opus-5', 'claude-fable-5-1', 'claude-sonnet-5-5']);
const FALLBACK_BETA = 'server-side-fallback-2026-07-01';
// Rows are short. This leaves room for thinking on a long statement and still
// bounds what one read can cost against his monthly spend limit.
const MAX_TOKENS = 32000;

let testClient = null;

/** Tests: use this object instead of a real Anthropic client. Pass null to undo. */
export function setAnthropicForTests(client) {
  testClient = client;
}

function client(apiKey) {
  return testClient ?? new Anthropic({ apiKey });
}

export class ReadError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const SYSTEM_PROMPT = `You read banking files for one person in Canada who banks at CIBC. A file is one of these:
1. Screenshots of CIBC phone notifications. Each notification is one transaction, for example a purchase at Nuage Cafe for $6.58 on the CIBC Visa.
2. Screens from the CIBC app, such as the activity list of the chequing account or of the CIBC Visa card.
3. A CIBC statement for chequing or for a CIBC Visa card, as a PDF or a photo.

Return only transactions. Leave out balances, totals, limits, interest summaries, headings, ads and anything else that is not one transaction.

For each transaction:
- date: YYYY-MM-DD. The message gives today's date. "Today" means that date and "Yesterday" means the day before it. When the year is not shown, use the latest year that does not put the date after today.
- time: the time as shown, like "3:42 PM", or null when there is none. When the time is cut off or hidden, still return the transaction with time null.
- merchant: the merchant or description as written, without the amount.
- amount: a positive number with no currency sign.
- direction: "out" for purchases, bill payments, transfers out and withdrawals; "in" for refunds, deposits, transfers in, e-Transfers received and payments received.
- account: "visa" for the CIBC Visa credit card, "chequing" for the chequing account, null when you cannot tell.
- raw: the text of the transaction as shown, on one line.

A payment made to the CIBC Visa card (for example "PAYMENT THANK YOU", "PAIEMENT MERCI" or a notification that a Visa payment was received) is a transaction with merchant "Payment", direction "in" and account "visa".
When the same transaction appears twice in the file, return it twice. Never guess an amount you cannot read; leave that transaction out. If there are no transactions, return an empty list.`;

export const ROWS_SCHEMA = {
  type: 'object',
  properties: {
    rows: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          date: { type: 'string', format: 'date' },
          time: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          merchant: { type: 'string' },
          amount: { type: 'number' },
          direction: { type: 'string', enum: ['out', 'in'] },
          account: { anyOf: [{ type: 'string', enum: ['visa', 'chequing'] }, { type: 'null' }] },
          raw: { type: 'string' },
        },
        required: ['date', 'time', 'merchant', 'amount', 'direction', 'account', 'raw'],
        additionalProperties: false,
      },
    },
  },
  required: ['rows'],
  additionalProperties: false,
};

function dayBefore(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function userText(today, fileName) {
  const name = fileName ? ` The file is named "${fileName}".` : '';
  return `Today is ${weekday(today)} ${today}. "Today" in the file means ${today} and "Yesterday" means ${dayBefore(today)}.${name} List every transaction in this file.`;
}

function fileBlock(mediaType, base64) {
  const source = { type: 'base64', media_type: mediaType, data: base64 };
  return mediaType === 'application/pdf' ? { type: 'document', source } : { type: 'image', source };
}

export function buildRequest({ bytes, mediaType, fileName, today, model }) {
  const params = {
    model,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [fileBlock(mediaType, Buffer.from(bytes).toString('base64')), { type: 'text', text: userText(today, fileName) }],
      },
    ],
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: ROWS_SCHEMA } },
  };
  if (FALLBACK_MODELS.has(model)) {
    params.betas = [FALLBACK_BETA];
    params.fallbacks = 'default';
  }
  return params;
}

export function rowsFromMessage(message) {
  if (message?.stop_reason === 'refusal') throw new ReadError(422, 'unreadable', 'This file could not be read.');
  const text = (message?.content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('');
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    if (message?.stop_reason === 'max_tokens') {
      throw new ReadError(422, 'too-long', 'This file has too many lines to read at once. Try fewer pages.');
    }
    throw new ReadError(502, 'read-failed', 'The reader gave an answer that made no sense. Try again.');
  }
  return cleanRows(parsed?.rows);
}

/** Maps SDK errors to plain messages. Upstream error text is never passed on. */
export function toReadError(e) {
  if (e instanceof ReadError) return e;
  if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) {
    return new ReadError(503, 'reader-setup', 'Reading is not set up right on the server.');
  }
  if (e instanceof Anthropic.RateLimitError) {
    return new ReadError(503, 'busy', 'Reading is busy right now. Try again in a minute.');
  }
  if (e instanceof Anthropic.BadRequestError) {
    return new ReadError(422, 'unreadable', 'This file could not be read. Try a clearer screenshot or a smaller file.');
  }
  if (e instanceof Anthropic.APIConnectionError) {
    return new ReadError(502, 'read-failed', 'Could not reach the reader. Try again.');
  }
  if (e instanceof Anthropic.APIError) {
    return new ReadError(502, 'read-failed', 'The reader is having trouble. Try again soon.');
  }
  return null;
}

/** Calls Claude and returns clean ReadRows. Throws ReadError for anything it can explain. */
export async function readRows({ bytes, mediaType, fileName, today, apiKey, model = DEFAULT_MODEL }) {
  const params = buildRequest({ bytes, mediaType, fileName, today, model });
  try {
    const message = await client(apiKey).beta.messages.stream(params).finalMessage();
    return rowsFromMessage(message);
  } catch (e) {
    const mapped = toReadError(e);
    if (mapped) {
      if (!(e instanceof ReadError)) console.error('read failed:', e?.constructor?.name, e?.status ?? '');
      throw mapped;
    }
    throw e;
  }
}
