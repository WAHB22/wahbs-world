import { useId, useRef, useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { useFinance } from '@/lib/store';
import { useSheet, useUI, type OpenSheet } from '@/lib/ui-store';
import { uid } from '@/lib/ids';
import type { Pay } from '@/lib/types';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Choice, Field, Input, MoneyInput } from '@/components/ui/field';
import {
  deletePayRecipe,
  findPay,
  payFormFrom,
  payKind,
  payNote,
  savePayRecipe,
  validatePay,
  type PayForm,
  type PayKind,
} from './pays.logic';

const KINDS: { value: PayKind; label: string }[] = [
  { value: 'pay', label: 'Paycheque' },
  { value: 'other', label: 'Other income' },
];

const close = () => useUI.getState().close();

const EMPTY_FORM: PayForm = { amt: '', date: '', kind: 'pay', hours: '', note: '' };

/**
 * Log or edit a paycheque (or other income). Opened with
 * useUI.getState().open('pay', payId?, month). Saving moves it to the month of its date.
 */
export function PaySheet() {
  const sheet = useSheet('pay');
  const data = useFinance((s) => s.data);
  const month = useFinance((s) => s.month);
  const today = useFinance((s) => s.today);
  const commit = useFinance((s) => s.commit);
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);

  const [seen, setSeen] = useState<OpenSheet | null>(null);
  const [editing, setEditing] = useState<Pay | null>(null);
  const [form, setForm] = useState<PayForm>(EMPTY_FORM);
  const [tried, setTried] = useState(false);

  // Fresh form every time the sheet opens.
  if (sheet !== seen) {
    setSeen(sheet);
    if (sheet && data) {
      const pay = sheet.id ? (findPay(data, sheet.id, sheet.month)?.pay ?? null) : null;
      setEditing(pay);
      setForm(payFormFrom(pay, { month: sheet.month ?? month, today }));
      setTried(false);
    }
  }

  const { errors, value } = validatePay(form);
  const shown = tried ? errors : {};
  const set = <K extends keyof PayForm>(k: K, v: PayForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!value) {
      setTried(true);
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    commit(payNote(editing ? 'changed' : 'logged', value), savePayRecipe(editing?.id ?? uid(), value));
    close();
  };

  const remove = () => {
    if (!editing) return;
    commit(payNote('deleted', { amt: Number(editing.amt) || 0, kind: payKind(editing) }), deletePayRecipe(editing.id));
    close();
  };

  const title = !editing ? 'Log paycheque' : payKind(editing) === 'other' ? 'Edit income' : 'Edit paycheque';

  return (
    <Sheet
      open={!!sheet}
      onOpenChange={(o) => !o && close()}
      title={title}
      footer={
        <>
          {editing && (
            <Button variant="danger" onClick={remove}>
              <Trash2 />
              Delete
            </Button>
          )}
          <Button variant="primary" type="submit" form={formId} className="ml-auto min-w-28">
            Save
          </Button>
        </>
      }
    >
      <form id={formId} ref={formRef} onSubmit={save} noValidate>
        <Field label="Net amount" error={shown.amt}>
          {(id, d) => (
            <MoneyInput
              id={id}
              aria-describedby={d}
              aria-invalid={shown.amt ? true : undefined}
              value={form.amt}
              onChange={(e) => set('amt', e.target.value)}
              placeholder="1300"
            />
          )}
        </Field>
        <Field label="Pay date" error={shown.date}>
          {(id, d) => (
            <Input
              id={id}
              type="date"
              aria-describedby={d}
              aria-invalid={shown.date ? true : undefined}
              value={form.date}
              onChange={(e) => set('date', e.target.value)}
              className="num"
            />
          )}
        </Field>
        <div className="mt-4">
          <p className="mb-1.5 text-sm font-medium text-ink-soft">Type</p>
          <Choice label="Type" value={form.kind} options={KINDS} onChange={(v) => set('kind', v)} />
        </div>
        <Field label="Hours (optional)" error={shown.hours}>
          {(id, d) => (
            <Input
              id={id}
              aria-describedby={d}
              aria-invalid={shown.hours ? true : undefined}
              value={form.hours}
              onChange={(e) => set('hours', e.target.value)}
              inputMode="decimal"
              autoComplete="off"
              placeholder="37.5"
              className="num"
            />
          )}
        </Field>
        <Field label="Note (optional)" hint={form.kind === 'other' ? 'Shown as the name, like Interac from Kylie.' : undefined}>
          {(id, d) => <Input id={id} aria-describedby={d} value={form.note} onChange={(e) => set('note', e.target.value)} autoComplete="off" />}
        </Field>
      </form>
    </Sheet>
  );
}
