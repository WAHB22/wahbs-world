import { useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { useFinance } from '@/lib/store';
import { useSheet, useUI, type OpenSheet } from '@/lib/ui-store';
import { uid } from '@/lib/ids';
import type { Tx, TxAccount } from '@/lib/types';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Choice, Field, Input, MoneyInput, Select } from '@/components/ui/field';
import {
  LAST_ACCOUNT_KEY,
  categoryGroups,
  deleteExpenseRecipe,
  expenseFormFrom,
  expenseNote,
  findTx,
  itemNames,
  readLastAccount,
  saveExpenseRecipe,
  storedAccount,
  txOrigin,
  validateExpense,
  type ExpenseForm,
} from './expense.logic';

const PAID_WITH: { value: TxAccount; label: string }[] = [
  { value: 'visa', label: 'Visa' },
  { value: 'chequing', label: 'Chequing' },
  { value: null, label: 'Not sure' },
];

const close = () => useUI.getState().close();

function loadLastAccount(): TxAccount {
  try {
    return readLastAccount(localStorage.getItem(LAST_ACCOUNT_KEY));
  } catch {
    return null;
  }
}

function rememberAccount(a: TxAccount) {
  try {
    localStorage.setItem(LAST_ACCOUNT_KEY, storedAccount(a));
  } catch {
    // Private mode or storage blocked: the choice is just not remembered.
  }
}

const EMPTY_FORM: ExpenseForm = { amt: '', item: '', date: '', account: null, note: '' };

/**
 * Add or edit one expense. Opened with useUI.getState().open('expense', txId?, month):
 * no id adds, an id edits. Saving moves the expense to the month of its date.
 */
export function ExpenseSheet() {
  const sheet = useSheet('expense');
  const data = useFinance((s) => s.data);
  const month = useFinance((s) => s.month);
  const today = useFinance((s) => s.today);
  const commit = useFinance((s) => s.commit);
  const formId = useId();
  const formRef = useRef<HTMLFormElement>(null);

  const groups = useMemo(() => (data ? categoryGroups(data) : []), [data]);
  const names = useMemo(() => (data ? itemNames(data) : {}), [data]);

  const [seen, setSeen] = useState<OpenSheet | null>(null);
  const [editing, setEditing] = useState<Tx | null>(null);
  const [form, setForm] = useState<ExpenseForm>(EMPTY_FORM);
  const [tried, setTried] = useState(false);

  // Fresh form every time the sheet opens.
  if (sheet !== seen) {
    setSeen(sheet);
    if (sheet && data) {
      const tx = sheet.id ? (findTx(data, sheet.id, sheet.month)?.tx ?? null) : null;
      setEditing(tx);
      setForm(
        expenseFormFrom(tx, {
          month: sheet.month ?? month,
          today,
          lastAccount: loadLastAccount(),
          firstItem: groups[0]?.items[0]?.id ?? '',
        }),
      );
      setTried(false);
    }
  }

  const { errors, value } = validateExpense(form);
  const shown = tried ? errors : {};
  const set = <K extends keyof ExpenseForm>(k: K, v: ExpenseForm[K]) => setForm((f) => ({ ...f, [k]: v }));
  // An expense whose category was deleted keeps it until he picks another.
  const orphan = form.item !== '' && !(form.item in names);

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!value) {
      setTried(true);
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    const note = editing ? expenseNote('changed', { ...editing, ...value }, names) : expenseNote('added', value, names);
    commit(note, saveExpenseRecipe(editing?.id ?? uid(), value));
    rememberAccount(value.account);
    close();
  };

  const remove = () => {
    if (!editing) return;
    commit(expenseNote('deleted', editing, names), deleteExpenseRecipe(editing.id));
    close();
  };

  return (
    <Sheet
      open={!!sheet}
      onOpenChange={(o) => !o && close()}
      title={editing ? 'Edit expense' : 'Add expense'}
      description={(editing && txOrigin(editing)) || undefined}
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
        <Field label="Amount" error={shown.amt}>
          {(id, d) => (
            <MoneyInput
              id={id}
              aria-describedby={d}
              aria-invalid={shown.amt ? true : undefined}
              value={form.amt}
              onChange={(e) => set('amt', e.target.value)}
              placeholder="12.50"
            />
          )}
        </Field>
        <Field label="Category" error={shown.item}>
          {(id, d) => (
            <Select
              id={id}
              aria-describedby={d}
              aria-invalid={shown.item ? true : undefined}
              value={form.item}
              onChange={(e) => set('item', e.target.value)}
            >
              {form.item === '' && (
                <option value="" disabled>
                  Pick a category
                </option>
              )}
              {orphan && <option value={form.item}>Other</option>}
              {groups.map((g) => (
                <optgroup key={g.id} label={g.name}>
                  {g.items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Date" error={shown.date}>
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
          <p className="mb-1.5 text-sm font-medium text-ink-soft">Paid with</p>
          <Choice label="Paid with" value={form.account} options={PAID_WITH} onChange={(v) => set('account', v)} />
        </div>
        <Field label="Note (optional)">
          {(id) => <Input id={id} value={form.note} onChange={(e) => set('note', e.target.value)} autoComplete="off" placeholder="Costco" />}
        </Field>
      </form>
    </Sheet>
  );
}
