/**
 * Tuition jars: jar text, the goal form (same rules as the live page) and its
 * recipe. Pure, no clock.
 */
import type { Draft } from 'immer';
import type { FinanceData, Goal } from '@/lib/types';
import { cents, money, moneyShort, parseAmount, toCents } from '@/lib/format';
import { listAnd } from '@/lib/dates';
import { amountField } from '@/components/budget/budget.logic';

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

// ---------- jars ----------

export interface JarView {
  id: string;
  name: string;
  /** 0 to 1 for the amphora fill. */
  pct: number;
  saved: string;
  /** 'of $10,043' */
  of: string;
  label: string;
}

export function jarView(g: Goal): JarView {
  const saved = num(g.saved);
  const target = num(g.target);
  const pct = target > 0 ? Math.max(0, Math.min(1, saved / target)) : 0;
  const name = String(g.name ?? '');
  return {
    id: g.id,
    name,
    pct,
    saved: moneyShort(saved),
    of: `of ${moneyShort(target)}`,
    label: `${name}, ${moneyShort(saved)} saved of ${moneyShort(target)}, ${Math.floor(pct * 100)}%`,
  };
}

export const jars = (data: FinanceData): JarView[] => (data.goals ?? []).map(jarView);

// ---------- form ----------

export interface GoalForm {
  id: string;
  title: string;
  /** '$2,000 saved of $10,043' */
  summary: string;
  add: string;
  saved: string;
  target: string;
  name: string;
  errors: { add?: string; saved?: string; target?: string };
}

export function initGoalForm(data: FinanceData, id: string): GoalForm {
  const g = (data.goals ?? []).find((x) => x.id === id);
  return {
    id,
    title: String(g?.name ?? 'Goal'),
    summary: g ? `${moneyShort(num(g.saved))} saved of ${moneyShort(num(g.target))}` : '',
    add: '',
    saved: amountField(g ? num(g.saved) : null),
    target: amountField(g ? num(g.target) : null),
    name: String(g?.name ?? ''),
    errors: {},
  };
}

/** The minus key is missing on phone number pads, so a button flips the sign: '200' <-> '−200'. */
export function toggleSign(text: string): string {
  const t = text.trim();
  if (/^[-−]/.test(t)) return t.slice(1);
  return `−${t}`;
}

export const isTakeOut = (text: string) => /^\s*[-−]/.test(text);

export type GoalValues = { saved: number; target: number; name: string; added: number | null };

/**
 * Live page rules: a number in Add wins (saved + add, to the cent); else
 * "set total saved"; else saved stays. Target and name keep their old value
 * when left empty.
 */
export function checkGoalForm(
  goal: Pick<Goal, 'saved' | 'target' | 'name'>,
  form: Pick<GoalForm, 'add' | 'saved' | 'target' | 'name'>,
): { ok: true; values: GoalValues } | { ok: false; errors: GoalForm['errors'] } {
  const errors: GoalForm['errors'] = {};
  const before = num(goal.saved);
  let saved = before;
  let added: number | null = null;

  const addText = form.add.trim();
  if (addText !== '' && addText !== '-' && addText !== '−') {
    const n = parseAmount(addText);
    if (n === null) errors.add = 'Enter an amount like 200, or use minus to take out.';
    else {
      added = cents(n);
      saved = cents(before + added);
      if (saved < 0) errors.add = `That is more than the jar holds (${money(before)}).`;
    }
  } else if (form.saved.trim() !== '') {
    const n = parseAmount(form.saved);
    if (n === null) errors.saved = 'Enter an amount like 2000.';
    else if (n < 0) errors.saved = 'Saved cannot be below zero.';
    else saved = cents(n);
  }

  let target = num(goal.target);
  if (form.target.trim() !== '') {
    const n = parseAmount(form.target);
    if (n === null) errors.target = 'Enter an amount like 10043.';
    else if (n < 0) errors.target = 'The target cannot be below zero.';
    else target = cents(n);
  }

  if (errors.add || errors.saved || errors.target) return { ok: false, errors };
  const name = form.name.trim() || String(goal.name ?? '');
  return { ok: true, values: { saved, target, name, added } };
}

/**
 * 'Added $200 to Automne 2026 gap', 'Took $50 out of Automne 2026 gap',
 * 'Set Automne 2026 gap saved to $2,000', with 'changed target to $11,000' and
 * 'renamed it Fall gap' joined on. null when nothing changed.
 */
export function goalNote(goal: Pick<Goal, 'saved' | 'target' | 'name'>, v: GoalValues): string | null {
  const name = String(goal.name ?? '');
  const parts: string[] = [];
  const savedChanged = toCents(num(goal.saved)) !== toCents(v.saved);
  if (v.added !== null && v.added > 0) parts.push(`Added ${moneyShort(v.added)} to ${name}`);
  else if (v.added !== null && v.added < 0) parts.push(`Took ${moneyShort(-v.added)} out of ${name}`);
  else if (v.added === null && savedChanged) parts.push(`Set ${name} saved to ${moneyShort(v.saved)}`);
  const targetChanged = toCents(num(goal.target)) !== toCents(v.target);
  const renamed = v.name !== name;
  if (!parts.length) {
    if (targetChanged) parts.push(`Changed ${name} target to ${moneyShort(v.target)}`);
    if (renamed) parts.push(parts.length ? `renamed it ${v.name}` : `Renamed ${name} to ${v.name}`);
  } else {
    if (targetChanged) parts.push(`changed target to ${moneyShort(v.target)}`);
    if (renamed) parts.push(`renamed it ${v.name}`);
  }
  return parts.length ? listAnd(parts) : null;
}

/** Real progress: money went into the jar through Add. */
export const isProgress = (v: GoalValues) => v.added !== null && v.added > 0;

/** Only what changed, so a save replayed on newer data (conflict) keeps changes made elsewhere. */
export type GoalPatch = { added?: number; saved?: number; target?: number; name?: string };

export function goalPatch(goal: Pick<Goal, 'saved' | 'target' | 'name'>, v: GoalValues): GoalPatch {
  const p: GoalPatch = {};
  if (v.added !== null && v.added !== 0) p.added = v.added;
  else if (v.added === null && toCents(num(goal.saved)) !== toCents(v.saved)) p.saved = v.saved;
  if (toCents(num(goal.target)) !== toCents(v.target)) p.target = v.target;
  if (v.name !== String(goal.name ?? '')) p.name = v.name;
  return p;
}

/**
 * Writes the goal in place, by id, so extra fields stay. An Add is applied to
 * the jar as it is now (never below zero), not as it was when the sheet opened.
 */
export function applyGoal(draft: Draft<FinanceData>, id: string, p: GoalPatch): void {
  const g = (draft.goals ?? []).find((x) => x.id === id);
  if (!g) return;
  if (p.added !== undefined) g.saved = Math.max(0, cents(num(g.saved) + p.added));
  if (p.saved !== undefined) g.saved = p.saved;
  if (p.target !== undefined) g.target = p.target;
  if (p.name !== undefined) g.name = p.name;
}
