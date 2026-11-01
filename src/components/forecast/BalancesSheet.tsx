import { useCallback, useId, useState, type FormEvent } from 'react';
import { useFinance } from '@/lib/store';
import { useSheet, useUI, type OpenSheet } from '@/lib/ui-store';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Field, Input, MoneyInput } from '@/components/ui/field';
import { applyBalances, balancesChanges, balancesNote, checkBalancesForm, initBalancesForm, type BalancesForm } from './balances.logic';

const close = () => useUI.getState().close();

/**
 * Form state that starts fresh each time the sheet opens, set while rendering
 * so the first frame already shows the fresh values. The last values stay
 * while the sheet animates out.
 */
function useFreshForm<T extends object>(sheet: OpenSheet | null, init: () => T) {
  const [seen, setSeen] = useState<OpenSheet | null>(null);
  const [form, setForm] = useState<T | null>(null);
  if (sheet && sheet !== seen) {
    setSeen(sheet);
    setForm(init());
  }
  const update = useCallback((patch: (f: T) => Partial<T>) => setForm((f) => (f ? { ...f, ...patch(f) } : f)), []);
  return [form, update] as const;
}

/** Chequing balance, Visa owing and Visa due day: what the forecast starts from. */
export function BalancesSheet() {
  const sheet = useSheet('balances');
  const data = useFinance((s) => s.data)!;
  const today = useFinance((s) => s.today);
  const commit = useFinance((s) => s.commit);
  const [form, update] = useFreshForm<BalancesForm>(sheet, () => initBalancesForm(data));
  const formId = useId();

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!form) return close();
    const r = checkBalancesForm(form);
    if (!r.ok) return update(() => ({ errors: r.errors }));
    const changes = balancesChanges(data, form, r.values);
    const note = balancesNote(data, changes, r.values);
    const ids = { chequingId: form.chequingId, visaId: form.visaId };
    if (note) commit(note, (d) => applyBalances(d, ids, r.values, changes, today));
    close();
  };

  return (
    <Sheet
      open={!!sheet}
      onOpenChange={(o) => !o && close()}
      title="Balances"
      description="Copy what the bank and card apps show now."
      footer={
        <Button variant="primary" type="submit" form={formId} className="ml-auto min-w-28">
          Save
        </Button>
      }
    >
      {form && (
        <form id={formId} onSubmit={save} noValidate>
          <Field label="Chequing balance now" hint={form.chequingHint ?? 'The forecast starts from this.'} error={form.errors.chequing}>
            {(id, describedBy) => (
              <MoneyInput
                id={id}
                aria-describedby={describedBy}
                aria-invalid={!!form.errors.chequing}
                value={form.chequing}
                placeholder="0.00"
                enterKeyHint="next"
                onChange={(e) => {
                  const v = e.target.value;
                  update((f) => ({ chequing: v, chequingTouched: true, errors: { ...f.errors, chequing: undefined } }));
                }}
              />
            )}
          </Field>
          {form.visaId && (
            <Field label="Visa owing now" hint={form.visaHint ?? undefined} error={form.errors.visa}>
              {(id, describedBy) => (
                <MoneyInput
                  id={id}
                  aria-describedby={describedBy}
                  aria-invalid={!!form.errors.visa}
                  value={form.visa}
                  placeholder="0.00"
                  enterKeyHint="next"
                  onChange={(e) => {
                    const v = e.target.value;
                    update((f) => ({ visa: v, visaTouched: true, errors: { ...f.errors, visa: undefined } }));
                  }}
                />
              )}
            </Field>
          )}
          <Field label="Visa due day" hint="Optional. Day of the month the payment is due, 1 to 31." error={form.errors.dueDay}>
            {(id, describedBy) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={!!form.errors.dueDay}
                value={form.dueDay}
                inputMode="numeric"
                autoComplete="off"
                placeholder="22"
                maxLength={2}
                className="num"
                enterKeyHint="done"
                onChange={(e) => {
                  const v = e.target.value;
                  update((f) => ({ dueDay: v, errors: { ...f.errors, dueDay: undefined } }));
                }}
              />
            )}
          </Field>
        </form>
      )}
    </Sheet>
  );
}
