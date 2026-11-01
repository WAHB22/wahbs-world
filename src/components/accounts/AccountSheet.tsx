import { useId, type FormEvent } from 'react';
import { useFinance } from '@/lib/store';
import { useSheet, useUI } from '@/lib/ui-store';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Field, Input, MoneyInput } from '@/components/ui/field';
import { useSheetForm } from '@/components/budget/use-sheet-form';
import { accountChanges, accountNote, applyAccount, checkAccountForm, initAccountForm } from './accounts.logic';

const close = () => useUI.getState().close();

/** Update one account. Asset: balance and goal. Debt: amount owing, card limit and (Visa) due day. */
export function AccountSheet() {
  const sheet = useSheet('account');
  const data = useFinance((s) => s.data)!;
  const today = useFinance((s) => s.today);
  const commit = useFinance((s) => s.commit);
  const [form, update] = useSheetForm(sheet, (s) => initAccountForm(data, s.id ?? ''));
  const formId = useId();
  const exists = !!form && (data.accounts ?? []).some((a) => a.id === form.id);

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!form || !exists) return close();
    const r = checkAccountForm(form);
    if (!r.ok) return update({ errors: r.errors });
    const changes = accountChanges(data, form.id, r.values, form.balTouched);
    const note = accountNote(form.title, form.kind, changes);
    if (note) commit(note, (d) => applyAccount(d, form.id, r.values, changes, today));
    close();
  };

  const debt = form?.kind === 'debt';
  const balHint = [form?.asOfText, form?.chequing ? 'Used for the chequing forecast.' : null].filter(Boolean).join('. ') || undefined;

  return (
    <Sheet
      open={!!sheet}
      onOpenChange={(o) => !o && close()}
      title={form?.title ?? 'Account'}
      description={debt ? 'Copy what the card app shows now.' : 'Copy what the bank app shows now.'}
      footer={
        <Button variant="primary" type="submit" form={formId} className="ml-auto min-w-28" disabled={!exists}>
          Save
        </Button>
      }
    >
      {form && (
        <form id={formId} onSubmit={save} noValidate>
          <Field label={debt ? 'Amount owing now' : 'Balance now'} hint={balHint} error={form.errors.bal}>
            {(id, describedBy) => (
              <MoneyInput
                id={id}
                aria-describedby={describedBy}
                aria-invalid={!!form.errors.bal}
                value={form.bal}
                placeholder="0.00"
                onChange={(e) => update({ bal: e.target.value, balTouched: true, errors: { ...form.errors, bal: undefined } })}
                enterKeyHint="next"
              />
            )}
          </Field>
          <Field label={debt ? 'Card limit' : 'Goal'} error={form.errors.target}>
            {(id, describedBy) => (
              <MoneyInput
                id={id}
                aria-describedby={describedBy}
                aria-invalid={!!form.errors.target}
                value={form.target}
                onChange={(e) => update({ target: e.target.value, errors: { ...form.errors, target: undefined } })}
                enterKeyHint={form.visa ? 'next' : 'done'}
              />
            )}
          </Field>
          {form.visa && (
            <Field label="Visa due day" hint="Day of the month the payment is due, 1 to 31. Leave empty if not set." error={form.errors.dueDay}>
              {(id, describedBy) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  aria-invalid={!!form.errors.dueDay}
                  value={form.dueDay}
                  onChange={(e) => update({ dueDay: e.target.value, errors: { ...form.errors, dueDay: undefined } })}
                  inputMode="numeric"
                  autoComplete="off"
                  placeholder="22"
                  maxLength={2}
                  className="num"
                  enterKeyHint="done"
                />
              )}
            </Field>
          )}
        </form>
      )}
    </Sheet>
  );
}
