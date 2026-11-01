import { useId, useRef, useState, type FormEvent } from 'react';
import { useFinance } from '@/lib/store';
import { useSheet, useUI, type OpenSheet } from '@/lib/ui-store';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Field, MoneyInput } from '@/components/ui/field';
import { planNote, planRecipe, validatePlan } from './pays.logic';

const close = () => useUI.getState().close();

/** The planned paycheque, used for paydays not logged yet. Opened with useUI.getState().open('pay-plan'). */
export function PayPlanSheet() {
  const sheet = useSheet('pay-plan');
  const payPlan = useFinance((s) => s.data?.settings?.payPlan);
  const commit = useFinance((s) => s.commit);
  const formId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [seen, setSeen] = useState<OpenSheet | null>(null);
  const [text, setText] = useState('');
  const [tried, setTried] = useState(false);

  // Fresh form every time the sheet opens.
  if (sheet !== seen) {
    setSeen(sheet);
    if (sheet) {
      setText(typeof payPlan === 'number' && Number.isFinite(payPlan) ? String(payPlan) : '');
      setTried(false);
    }
  }

  const { error, value } = validatePlan(text);
  const shown = tried ? error : null;

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (value === null) {
      setTried(true);
      requestAnimationFrame(() => inputRef.current?.focus());
      return;
    }
    if (value !== payPlan) commit(planNote(value), planRecipe(value));
    close();
  };

  return (
    <Sheet
      open={!!sheet}
      onOpenChange={(o) => !o && close()}
      title="Planned paycheque"
      footer={
        <Button variant="primary" type="submit" form={formId} className="ml-auto min-w-28">
          Save
        </Button>
      }
    >
      <form id={formId} onSubmit={save} noValidate>
        <Field label="Plan with this amount per pay" hint="Used as the estimate for paydays you have not logged yet." error={shown}>
          {(id, d) => (
            <MoneyInput
              ref={inputRef}
              id={id}
              aria-describedby={d}
              aria-invalid={shown ? true : undefined}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="1300"
            />
          )}
        </Field>
      </form>
    </Sheet>
  );
}
