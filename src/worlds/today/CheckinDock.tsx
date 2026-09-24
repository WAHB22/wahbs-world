"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef, useState } from "react";
import { useWorld } from "@/data/runtime";
import type { Row } from "@/data/schema";

export type Kind = Row<"checkins">["kind"];

export const DOCK: { kind: Kind; label: string; done: string; ask?: "amount" | "text" | "task" }[] = [
  { kind: "task_done", label: "Task done", done: "Task done", ask: "task" },
  { kind: "shift_worked", label: "Shift worked", done: "Shift worked" },
  { kind: "gym_done", label: "Gym done", done: "Gym done" },
  { kind: "spent", label: "Spent", done: "Spent", ask: "amount" },
  { kind: "moment", label: "A moment", done: "Moment kept", ask: "text" },
];

const ICON: Record<Kind, string> = {
  task_done: "M5 12.5l4.5 4.5L19 7.5",
  shift_worked: "M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z",
  gym_done: "M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10",
  spent: "M12 3v18M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3 2 2.6 4.5 3 4.5 1.3 4.5 3-2 3-4.5 3-4.5-1.3-4.5-3",
  moment: "M12 3l2.4 5.6L20 11l-5.6 2.4L12 19l-2.4-5.6L4 11l5.6-2.4z",
};

export function describe(c: Row<"checkins">): string {
  const p = c.payload as Record<string, unknown>;
  if (c.kind === "spent") return `Spent ${(Number(p.cents ?? 0) / 100).toFixed(2)} dollars${p.note ? `, ${p.note}` : ""}`;
  if (c.kind === "moment") return String(p.text ?? "A moment");
  if (c.kind === "task_done") return p.title ? `Done: ${p.title}` : "Task done";
  return DOCK.find((d) => d.kind === c.kind)!.done;
}


type DockItem = (typeof DOCK)[number];

/**
 * The check in dock: one tap saves (with no connection too); the three that need a detail open a
 * short sheet. After every check in, an Undo stays for five seconds.
 */
export function CheckinDock({ today }: { today: string }) {
  const { store } = useWorld();
  const [asking, setAsking] = useState<DockItem | null>(null);
  const [undo, setUndo] = useState<{ id: string; text: string } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const openTasks = useLiveQuery(async () => (store ? (await store.all("tasks")).filter((t) => !t.done_at).slice(0, 12) : []), [store]);

  useEffect(() => () => clearTimeout(undoTimer.current), []);
  useEffect(() => {
    const open = (e: Event) => setAsking(DOCK.find((d) => d.kind === (e as CustomEvent<Kind>).detail) ?? null);
    const now = (e: Event) => void save((e as CustomEvent<Kind>).detail);
    window.addEventListener("wahb:checkin", open);
    window.addEventListener("wahb:checkin-now", now);
    return () => { window.removeEventListener("wahb:checkin", open); window.removeEventListener("wahb:checkin-now", now); };
  });

  async function save(kind: Kind, payload: Record<string, unknown> = {}, taskId?: string) {
    if (!store) return;
    const row = await store.put("checkins", {
      kind,
      occurred_at: new Date().toISOString(),
      local_day: today,
      payload,
      ref_table: taskId ? "tasks" : null,
      ref_id: taskId ?? null,
    });
    if (taskId) await store.patch("tasks", taskId, { done_at: new Date().toISOString() });
    setAsking(null);
    clearTimeout(undoTimer.current);
    setUndo({ id: row.id, text: `${describe(row)}. Saved.` });
    undoTimer.current = setTimeout(() => setUndo(null), 5000);
  }

  async function undoLast() {
    if (!store || !undo) return;
    const row = await store.get("checkins", undo.id);
    await store.remove("checkins", undo.id);
    if (row?.ref_table === "tasks" && row.ref_id) await store.patch("tasks", row.ref_id, { done_at: null });
    setUndo(null);
  }

  return (
    <>
      {asking && <div className="sheet-scrim" onClick={() => setAsking(null)} aria-hidden="true" />}
      {asking && <AskSheet item={asking} tasks={openTasks ?? []} onCancel={() => setAsking(null)} onSave={(payload, taskId) => save(asking.kind, payload, taskId)} />}
      <div className="undo-slot" aria-live="polite">
        {undo && (
          <div className="undo glass" role="status">
            <span>{undo.text}</span>
            <button className="btn" onClick={undoLast}>Undo</button>
          </div>
        )}
      </div>
      <nav className="dock glass" aria-label="Check in">
        {DOCK.map((d) => (
          <button key={d.kind} className="dock-btn" data-testid={`checkin-${d.kind}`} onClick={() => (d.ask ? setAsking(d) : save(d.kind))} disabled={!store}>
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <path d={ICON[d.kind]} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{d.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}

/** Other parts of Today can open a check in sheet (for example the evening prompt). */
export const askCheckin = (kind: Kind) => window.dispatchEvent(new CustomEvent("wahb:checkin", { detail: kind }));
/** Save a one tap check in from elsewhere on the page, with the same Undo. */
export const checkinNow = (kind: Kind) => window.dispatchEvent(new CustomEvent("wahb:checkin-now", { detail: kind }));

function AskSheet({
  item,
  tasks,
  onCancel,
  onSave,
}: {
  item: (typeof DOCK)[number];
  tasks: Row<"tasks">[];
  onCancel: () => void;
  onSave: (payload: Record<string, unknown>, taskId?: string) => void;
}) {
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [taskId, setTaskId] = useState("");
  const first = useRef<HTMLInputElement & HTMLSelectElement>(null);
  useEffect(() => first.current?.focus(), []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (item.ask === "amount") {
      const cents = Math.round(parseFloat(value.replace(",", ".")) * 100);
      if (!Number.isFinite(cents) || cents <= 0) return;
      onSave({ cents, note: note.trim() || null });
    } else if (item.ask === "text") {
      if (!value.trim()) return;
      onSave({ text: value.trim() });
    } else {
      const task = tasks.find((t) => t.id === taskId);
      onSave({ title: task?.title ?? (value.trim() || null) }, task?.id);
    }
  }

  return (
    <form className="sheet glass" onSubmit={submit} onKeyDown={(e) => e.key === "Escape" && onCancel()} aria-label={item.label}>
      <h2 className="pane-title">{item.label}</h2>
      {item.ask === "amount" && (
        <>
          <div className="field">
            <label htmlFor="amt">Amount in dollars</label>
            <input id="amt" ref={first} inputMode="decimal" enterKeyHint="next" value={value} onChange={(e) => setValue(e.target.value)} placeholder="12.50" />
          </div>
          <div className="field">
            <label htmlFor="note">What for (optional)</label>
            <input id="note" enterKeyHint="done" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
        </>
      )}
      {item.ask === "text" && (
        <div className="field">
          <label htmlFor="moment">What happened</label>
          <input id="moment" ref={first} enterKeyHint="done" value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
      )}
      {item.ask === "task" && (
        <>
          {tasks.length > 0 && (
            <div className="field">
              <label htmlFor="task">Which task</label>
              <select id="task" ref={first} value={taskId} onChange={(e) => setTaskId(e.target.value)}>
                <option value="">Something else</option>
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          )}
          {!taskId && (
            <div className="field">
              <label htmlFor="what">What you finished (optional)</label>
              <input id="what" enterKeyHint="done" value={value} onChange={(e) => setValue(e.target.value)} />
            </div>
          )}
        </>
      )}
      <div className="sheet-actions">
        <button type="submit" className="btn btn-primary">Add</button>
        <button type="button" className="btn" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
