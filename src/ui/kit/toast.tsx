"use client";

import { useEffect, useState } from "react";

type Toast = { id: number; text: string; undo?: () => void | Promise<void> };
let push: ((t: Toast) => void) | null = null;
let n = 0;

/** Say what changed, with Undo for five seconds when the change can be taken back. */
export function toast(text: string, undo?: Toast["undo"]) {
  push?.({ id: ++n, text, undo });
}

export function Toaster() {
  const [t, setT] = useState<Toast | null>(null);
  useEffect(() => {
    push = (x) => setT(x);
    return () => { push = null; };
  }, []);
  useEffect(() => {
    if (!t) return;
    const id = setTimeout(() => setT((cur) => (cur?.id === t.id ? null : cur)), 5000);
    return () => clearTimeout(id);
  }, [t]);
  return (
    <div className="toast-slot" aria-live="polite">
      {t && (
        <div className="undo glass" role="status" key={t.id}>
          <span>{t.text}</span>
          {t.undo && <button className="btn" onClick={async () => { await t.undo!(); setT(null); }}>Undo</button>}
        </div>
      )}
    </div>
  );
}

/** Soft delete with a five second Undo. */
export async function removeWithUndo(
  store: { remove: (t: never, id: string) => Promise<void>; restore: (t: never, id: string) => Promise<void> },
  table: string,
  id: string,
  label: string,
) {
  await store.remove(table as never, id);
  toast(`${label} deleted.`, () => store.restore(table as never, id));
}
