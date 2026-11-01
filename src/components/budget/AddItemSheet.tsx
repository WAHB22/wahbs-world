import { useId, type FormEvent } from 'react';
import { useFinance } from '@/lib/store';
import { useSheet, useUI } from '@/lib/ui-store';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Field, Input, MoneyInput, Select } from '@/components/ui/field';
import { NEW_GROUP, addItemNote, applyAddItem, checkAddItemForm, initAddItemForm } from './budget.logic';
import { useSheetForm } from './use-sheet-form';

const close = () => useUI.getState().close();

/** Add a category to a group, or to a new group. Opened with open('add-item', groupId?). */
export function AddItemSheet() {
  const sheet = useSheet('add-item');
  const data = useFinance((s) => s.data)!;
  const commit = useFinance((s) => s.commit);
  const [form, update] = useSheetForm(sheet, (s) => initAddItemForm(data, s.id));
  const formId = useId();
  const groups = data.budget ?? [];

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    const r = checkAddItemForm(data, form);
    if (!r.ok) return update({ errors: r.errors });
    commit(addItemNote(r.values.name), (d) => applyAddItem(d, r.values));
    close();
  };

  return (
    <Sheet
      open={!!sheet}
      onOpenChange={(o) => !o && close()}
      title="Add category"
      description="Set a monthly limit, or leave it at 0 for no limit."
      footer={
        <Button variant="primary" type="submit" form={formId} className="ml-auto">
          Add category
        </Button>
      }
    >
      {form && (
        <form id={formId} onSubmit={save} noValidate>
          <Field label="Group">
            {(id) => (
              <Select id={id} value={form.group} onChange={(e) => update({ group: e.target.value, errors: { ...form.errors, newGroup: undefined } })}>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {String(g.name ?? '')}
                  </option>
                ))}
                <option value={NEW_GROUP}>New group</option>
              </Select>
            )}
          </Field>
          {form.group === NEW_GROUP && (
            <Field label="New group name" error={form.errors.newGroup}>
              {(id, describedBy) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  aria-invalid={!!form.errors.newGroup}
                  value={form.newGroup}
                  onChange={(e) => update({ newGroup: e.target.value, errors: { ...form.errors, newGroup: undefined } })}
                  placeholder="Reading"
                  autoComplete="off"
                  autoCapitalize="sentences"
                  enterKeyHint="next"
                  maxLength={40}
                />
              )}
            </Field>
          )}
          <Field label="Category name" error={form.errors.name}>
            {(id, describedBy) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                aria-invalid={!!form.errors.name}
                value={form.name}
                onChange={(e) => update({ name: e.target.value, errors: { ...form.errors, name: undefined } })}
                placeholder="Books"
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
