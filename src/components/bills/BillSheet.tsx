import { useId, useRef, useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { useFinance } from '@/lib/store';
import { useSheet, useUI, type OpenSheet } from '@/lib/ui-store';
import { uid } from '@/lib/ids';
import type { Bill, Freq } from '@/lib/types';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Choice, Field, Input, MoneyInput } from '@/components/ui/field';
import { billFormFrom, billNote, deleteBillRecipe, saveBillRecipe, validateBill, type BillForm } from './bills.logic';

const FREQS: { value: Freq; label: string }[] = [
  { value: 'monthly', label: 'Every month' },
  { value: 'biweekly', label: 'Every 2 weeks' },
];

const close = () => useUI.getState().close();

/** Add or edit a fixed bill. Opened with useUI.getState().open('bill', billId?). */
export function BillSheet() {
  const sheet = useSheet('bill');
  const data = useFinance((s) => s.data);
  const commit = useFinance((s) => s.commit);
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);

  const [seen, setSeen] = useState<OpenSheet | null>(null);
  const [editing, setEditing] = useState<Bill | null>(null);
  const [form, setForm] = useState<BillForm>(() => billFormFrom());
  const [tried, setTried] = useState(false);

  // Fresh form every time the sheet opens (also when it reopens on the same bill).
  if (sheet !== seen) {
    setSeen(sheet);
    if (sheet) {
      const b = (sheet.id && data?.bills.find((x: Bill) => x.id === sheet.id)) || null;
      setEditing(b);
      setForm(billFormFrom(b));
      setTried(false);
    }
  }

  const { errors, value } = validateBill(form);
  const shown = tried ? errors : {};
  const set = <K extends keyof BillForm>(k: K, v: BillForm[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!value) {
      setTried(true);
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    commit(billNote(editing ? 'changed' : 'added', value.name), saveBillRecipe(editing?.id ?? uid(), value));
    close();
  };

  const remove = () => {
    if (!editing) return;
    commit(billNote('deleted', editing.name), deleteBillRecipe(editing.id));
    close();
  };

  return (
    <Sheet
      open={!!sheet}
      onOpenChange={(o) => !o && close()}
      title={editing ? 'Edit bill' : 'Add bill'}
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
        <Field label="Name" error={shown.name}>
          {(id, d) => (
            <Input
              id={id}
              aria-describedby={d}
              aria-invalid={shown.name ? true : undefined}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              autoComplete="off"
              placeholder="Netflix"
            />
          )}
        </Field>
        <Field label="Amount" error={shown.amt}>
          {(id, d) => (
            <MoneyInput
              id={id}
              aria-describedby={d}
              aria-invalid={shown.amt ? true : undefined}
              value={form.amt}
              onChange={(e) => set('amt', e.target.value)}
              placeholder="27.11"
            />
          )}
        </Field>
        <div className="mt-4">
          <p className="mb-1.5 text-sm font-medium text-ink-soft">How often</p>
          <Choice label="How often" value={form.freq} options={FREQS} onChange={(v) => set('freq', v)} />
        </div>
        {form.freq === 'monthly' ? (
          <Field label="Due day" hint="Day of the month, 1 to 31. Leave it empty if there is no set date." error={shown.day}>
            {(id, d) => (
              <Input
                id={id}
                aria-describedby={d}
                aria-invalid={shown.day ? true : undefined}
                value={form.day}
                onChange={(e) => set('day', e.target.value)}
                inputMode="numeric"
                autoComplete="off"
                placeholder="1 to 31"
                className="num"
              />
            )}
          </Field>
        ) : (
          <Field label="One past charge date" hint="Any day it was charged. It repeats every 2 weeks from there." error={shown.anchor}>
            {(id, d) => (
              <Input
                id={id}
                type="date"
                aria-describedby={d}
                aria-invalid={shown.anchor ? true : undefined}
                value={form.anchor}
                onChange={(e) => set('anchor', e.target.value)}
                className="num"
              />
            )}
          </Field>
        )}
        <Field label="Note (optional)">
          {(id) => <Input id={id} value={form.note} onChange={(e) => set('note', e.target.value)} autoComplete="off" />}
        </Field>
      </form>
    </Sheet>
  );
}
