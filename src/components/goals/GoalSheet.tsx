import { useId, type FormEvent } from 'react';
import { Minus } from 'lucide-react';
import { useFinance } from '@/lib/store';
import { useSheet, useUI } from '@/lib/ui-store';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Field, Input, MoneyInput } from '@/components/ui/field';
import { cn } from '@/lib/utils';
import { useSheetForm } from '@/components/budget/use-sheet-form';
import { applyGoal, checkGoalForm, goalNote, goalPatch, initGoalForm, isProgress, isTakeOut, toggleSign } from './goals.logic';

const close = () => useUI.getState().close();

/** Add to a jar (or take out), set the total, change the target or the name. Same rules as the live page. */
export function GoalSheet({ onAdded }: { onAdded: (goalId: string) => void }) {
  const sheet = useSheet('goal');
  const data = useFinance((s) => s.data)!;
  const commit = useFinance((s) => s.commit);
  const [form, update] = useSheetForm(sheet, (s) => initGoalForm(data, s.id ?? ''));
  const formId = useId();
  const goal = form ? (data.goals ?? []).find((g) => g.id === form.id) : undefined;

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!form || !goal) return close();
    const r = checkGoalForm(goal, form);
    if (!r.ok) return update({ errors: r.errors });
    const note = goalNote(goal, r.values);
    const patch = goalPatch(goal, r.values);
    if (note) commit(note, (d) => applyGoal(d, goal.id, patch));
    close();
    if (note && isProgress(r.values)) onAdded(goal.id);
  };

  const takeOut = form ? isTakeOut(form.add) : false;

  return (
    <Sheet
      open={!!sheet}
      onOpenChange={(o) => !o && close()}
      title={form?.title ?? 'Goal'}
      description={form?.summary || undefined}
      footer={
        <Button variant="primary" type="submit" form={formId} className="ml-auto min-w-28" disabled={!goal}>
          Save
        </Button>
      }
    >
      {form && (
        <form id={formId} onSubmit={save} noValidate>
          <Field label="Add to this jar (use minus to take out)" error={form.errors.add}>
            {(id, describedBy) => (
              <div className="flex gap-2">
                <div className="min-w-0 flex-1">
                  <MoneyInput
                    id={id}
                    aria-describedby={describedBy}
                    aria-invalid={!!form.errors.add}
                    value={form.add}
                    placeholder="200"
                    onChange={(e) => update({ add: e.target.value, errors: { ...form.errors, add: undefined } })}
                    enterKeyHint="done"
                  />
                </div>
                {/* Phone number pads have no minus key, so this flips the sign. */}
                <Button
                  variant="secondary"
                  size="icon"
                  className={cn('size-12 rounded-[var(--radius-md)]', takeOut && 'border-cobalt bg-cobalt-wash text-cobalt')}
                  aria-label="Take out instead"
                  aria-pressed={takeOut}
                  onClick={() => update({ add: toggleSign(form.add), errors: { ...form.errors, add: undefined } })}
                >
                  <Minus aria-hidden />
                </Button>
              </div>
            )}
          </Field>
          <Field label="Or set total saved" hint={form.add.trim() ? 'Add is filled in, so this is ignored.' : undefined} error={form.errors.saved}>
            {(id, describedBy) => (
              <MoneyInput
                id={id}
                aria-describedby={describedBy}
                aria-invalid={!!form.errors.saved}
                value={form.saved}
                onChange={(e) => update({ saved: e.target.value, errors: { ...form.errors, saved: undefined } })}
              />
            )}
          </Field>
          <Field label="Target" error={form.errors.target}>
            {(id, describedBy) => (
              <MoneyInput
                id={id}
                aria-describedby={describedBy}
                aria-invalid={!!form.errors.target}
                value={form.target}
                onChange={(e) => update({ target: e.target.value, errors: { ...form.errors, target: undefined } })}
              />
            )}
          </Field>
          <Field label="Name">
            {(id) => (
              <Input
                id={id}
                value={form.name}
                onChange={(e) => update({ name: e.target.value })}
                autoComplete="off"
                autoCapitalize="sentences"
                maxLength={60}
              />
            )}
          </Field>
        </form>
      )}
    </Sheet>
  );
}
