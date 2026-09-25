"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type FieldSpec = {
  name: string;
  label: string;
  type: "text" | "textarea" | "number" | "money" | "date" | "time" | "select" | "checkbox" | "list";
  options?: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
  placeholder?: string;
  step?: number;
};

type Values = Record<string, unknown>;

/** Turn a stored row into what the form shows (money is cents in storage, dollars on screen). */
function toForm(spec: FieldSpec[], row: Values): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const f of spec) {
    const v = row[f.name];
    if (f.type === "checkbox") out[f.name] = Boolean(v);
    else if (f.type === "money") out[f.name] = v == null ? "" : (Number(v) / 100).toFixed(2);
    else if (f.type === "list") out[f.name] = Array.isArray(v) ? v.join(", ") : "";
    else if (f.type === "time") out[f.name] = v == null ? "" : String(v).slice(0, 5);
    else out[f.name] = v == null ? "" : String(v);
  }
  return out;
}

function fromForm(spec: FieldSpec[], form: Record<string, string | boolean>): Values {
  const out: Values = {};
  for (const f of spec) {
    const v = form[f.name];
    if (f.type === "checkbox") out[f.name] = Boolean(v);
    else if (f.type === "money") out[f.name] = v === "" ? null : Math.round(parseFloat(String(v).replace(",", ".")) * 100);
    else if (f.type === "number") out[f.name] = v === "" ? null : Number(String(v).replace(",", "."));
    else if (f.type === "list") out[f.name] = String(v).split(",").map((x) => x.trim()).filter(Boolean);
    else out[f.name] = v === "" ? null : String(v).trim();
  }
  return out;
}

/**
 * One sheet for adding or editing anything. Saving writes to the device at once; the sheet
 * closes and a toast says what happened. Deleting is soft and can be undone.
 */
export function EditSheet({
  title, spec, row, onSave, onDelete, onClose, extra,
}: {
  title: string;
  spec: FieldSpec[];
  row: Values;
  onSave: (values: Values) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
  onClose: () => void;
  extra?: ReactNode;
}) {
  const [form, setForm] = useState(() => toForm(spec, row));
  const [error, setError] = useState<string | null>(null);
  const first = useRef<HTMLElement | null>(null);
  useEffect(() => { first.current?.focus(); }, []);
  const set = (k: string, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    for (const f of spec) if (f.required && (form[f.name] === "" || form[f.name] == null)) return setError(`${f.label} is needed.`);
    const values = fromForm(spec, form);
    for (const f of spec) if (f.type === "money" && values[f.name] != null && !Number.isFinite(values[f.name] as number)) return setError(`${f.label} should be an amount, like 12.50.`);
    try {
      await onSave(values);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message.split("\n")[0] : "That did not save.");
    }
  }

  return (
    <>
      <div className="sheet-scrim" onClick={onClose} aria-hidden="true" />
      <form className="sheet edit-sheet glass" onSubmit={submit} onKeyDown={(e) => e.key === "Escape" && onClose()} aria-label={title} role="dialog">
        <h2 className="pane-title">{title}</h2>
        <div className="edit-fields">
          {spec.map((f, i) => {
            const id = `f-${f.name}`;
            const ref = i === 0 ? (n: HTMLElement | null) => { first.current = n; } : undefined;
            const common = { id, name: f.name, placeholder: f.placeholder };
            return (
              <div key={f.name} className={`field${f.type === "textarea" || f.type === "list" ? " wide" : ""}${f.type === "checkbox" ? " check" : ""}`}>
                {f.type === "checkbox" ? (
                  <label className="tappable check-row">
                    <input type="checkbox" ref={ref as never} checked={Boolean(form[f.name])} onChange={(e) => set(f.name, e.target.checked)} {...common} />
                    <span>{f.label}</span>
                  </label>
                ) : (
                  <label htmlFor={id}>{f.label}</label>
                )}
                {f.type === "textarea" && <textarea ref={ref as never} rows={3} value={String(form[f.name])} onChange={(e) => set(f.name, e.target.value)} {...common} />}
                {f.type === "select" && (
                  <select ref={ref as never} value={String(form[f.name])} onChange={(e) => set(f.name, e.target.value)} {...common}>
                    {!f.required && <option value="">None</option>}
                    {f.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                )}
                {["text", "list", "date", "time", "number", "money"].includes(f.type) && (
                  <input
                    ref={ref as never}
                    type={f.type === "date" || f.type === "time" ? f.type : "text"}
                    inputMode={f.type === "number" ? "decimal" : f.type === "money" ? "decimal" : undefined}
                    value={String(form[f.name])}
                    onChange={(e) => set(f.name, e.target.value)}
                    {...common}
                  />
                )}
                {f.hint && <p className="hint">{f.hint}</p>}
              </div>
            );
          })}
        </div>
        {extra}
        {error && <p className="warn" role="alert">{error}</p>}
        <div className="sheet-actions">
          <button type="submit" className="btn btn-primary">Save</button>
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          {onDelete && <button type="button" className="btn btn-danger" onClick={async () => { await onDelete(); onClose(); }}>Delete</button>}
        </div>
      </form>
    </>
  );
}
