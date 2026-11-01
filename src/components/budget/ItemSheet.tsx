import { useId, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { useFinance } from '@/lib/store';
import { useSheet, useUI } from '@/lib/ui-store';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Field, Input, MoneyInput } from '@/components/ui/field';
import { applyDeleteItem, applyItemEdit, checkItemForm, deleteItemNote, findItem, initItemForm, itemEditNote, itemPatch } from './budget.logic';
import { useSheetForm } from './use-sheet-form';

const close = () => useUI.getState().close();

/** Edit a category: name and monthly limit, or delete it. */
export function ItemSheet() {
  const sheet = useSheet('item');
  const data = useFinance((s) => s.data)!;
  const commit = useFinance((s) => s.commit);
  const [form, update] = useSheetForm(sheet, (s) => initItemForm(data, s.id ?? ''));
  const formId = useId();
  const item = form ? findItem(data, form.id) : null;

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!form || !item) return close();
    const r = checkItemForm(data, form);
    if (!r.ok) return update({ errors: r.errors });
    const before = { name: String(item.name ?? ''), limit: Number(item.limit) || 0 };
    const note = itemEditNote(before, r.values);
    const patch = itemPatch(before, r.values);
    if (note) commit(note, (d) => applyItemEdit(d, item.id, patch));
    close();
  };

  const remove = () => {
    if (!item) return close();
    commit(deleteItemNote(String(item.name ?? '')), (d) => applyDeleteItem(d, item.id));
    close();
  };

  return (
    <Sheet
      open={!!sheet}
      onOpenChange={(o) => !o && close()}
      title={form?.title ?? 'Category'}
      description={form?.groupName ? `In ${form.groupName}` : undefined}
      footer={
        <>
          <Button variant="danger" onClick={remove} disabled={!item}>
            <Trash2 aria-hidden />
            Delete
          </Button>
          <Button variant="primary" type="submit" form={formId} className="ml-auto min-w-28" disabled={!item}>
            Save
          </Button>
        </>
      }
    >
      {form && (
        <form id={formId} onSubmit={save} noValidate>
          {!item && <p className="mt-1 text-sm text-ink-mute">This category is no longer in your budget.</p>}
          <Field label="Name" error={form.errors.name}>
            {(id, describedBy) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={!!form.errors.name}
                value={form.name}
                onChange={(e) => update({ name: e.target.value, errors: { ...form.errors, name: undefined } })}
                autoComplete="off"
                autoCapitalize="sentences"
                enterKeyHint="next"
                maxLength={60}
              />
            )}
          </Field>
          <Field label="Monthly limit" hint="0 means no limit" error={form.errors.limit}>
            {(id, describedBy) => (
              <MoneyInput
                id={id}
                aria-describedby={describedBy}
                aria-invalid={!!form.errors.limit}
                value={form.limit}
                placeholder="0"
                onChange={(e) => update({ limit: e.target.value, errors: { ...form.errors, limit: undefined } })}
                enterKeyHint="done"
              />
            )}
          </Field>
        </form>
      )}
    </Sheet>
  );
}
