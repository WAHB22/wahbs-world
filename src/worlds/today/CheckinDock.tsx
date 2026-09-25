"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef, useState } from "react";
import { localDay } from "@/data/dates";
import { useWorld } from "@/data/runtime";
import { fire } from "@/motion/feedback";
import { Barbell, CameraPlus, ClipboardText, Alarm, Receipt, type Icon } from "@phosphor-icons/react";
import { playSound } from "@/living/sound";
import type { Row } from "@/data/schema";

export type Kind = Row<"checkins">["kind"];

export const DOCK: { kind: Kind; label: string; done: string; ask?: "amount" | "text" | "task" }[] = [
  { kind: "task_done", label: "Task done", done: "Task done", ask: "task" },
  { kind: "shift_worked", label: "Shift worked", done: "Shift worked" },
  { kind: "gym_done", label: "Gym done", done: "Gym done" },
  { kind: "spent", label: "Spent", done: "Spent", ask: "amount" },
  { kind: "moment", label: "A moment", done: "Moment kept", ask: "text" },
];

/** Each check in is a real object: the clipboard, the alarm clock, the barbell, the receipt, the camera. */
const OBJECT: Record<Kind, Icon> = {
  task_done: ClipboardText,
  shift_worked: Alarm,
  gym_done: Barbell,
  spent: Receipt,
  moment: CameraPlus,
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
    // Spending is also an entry on the month's bill in Money; the check in points at it.
    let ref: { table: string; id: string } | null = taskId ? { table: "tasks", id: taskId } : null;
    if (kind === "spent" && Number(payload.cents) > 0) {
      const t = await store.put("transactions", { occurred_on: today, amount_cents: Number(payload.cents), direction: "out", note: (payload.note as string) || null, merchant: null });
      ref = { table: "transactions", id: t.id };
    }
    // Gym done is a training session; a moment is a memory in Life. The check in points at what it made.
    if (kind === "gym_done") {
      const t = await store.put("training_sessions", { occurred_on: today, kind: "strength" });
      ref = { table: "training_sessions", id: t.id };
    }
    if (kind === "moment" && String(payload.text ?? "").trim()) {
      const m = await store.put("memories", { occurred_on: today, title: String(payload.text).trim().slice(0, 140), kind: "spontaneous" });
      ref = { table: "memories", id: m.id };
    }
    const row = await store.put("checkins", {
      kind,
      occurred_at: new Date().toISOString(),
      local_day: today,
      payload,
      ref_table: ref?.table ?? null,
      ref_id: ref?.id ?? null,
    });
    if (taskId) await store.patch("tasks", taskId, { done_at: new Date().toISOString() });
    // A worked shift confirms today's planned shift in Work.
    if (kind === "shift_worked") {
      const planned = (await store.all("shifts")).filter((x) => x.status === "planned" && localDay(new Date(x.starts_at)) === today);
      for (const x of planned) await store.patch("shifts", x.id, { status: "worked" });
      if (planned.length) row.payload = { ...row.payload, shifts: planned.map((x) => x.id) };
      if (planned.length) await store.patch("checkins", row.id, { payload: row.payload });
    }
    setAsking(null);
    playSound("check");
    fire(document.querySelector<HTMLElement>(`[data-testid="checkin-${kind}"]`));
    clearTimeout(undoTimer.current);
    setUndo({ id: row.id, text: `${describe(row)}. Saved.` });
    undoTimer.current = setTimeout(() => setUndo(null), 5000);
  }

  async function undoLast() {
    if (!store || !undo) return;
    const row = await store.get("checkins", undo.id);
    await store.remove("checkins", undo.id);
    if (row?.ref_table === "tasks" && row.ref_id) await store.patch("tasks", row.ref_id, { done_at: null });
    if (row?.ref_table && ["transactions", "training_sessions", "memories"].includes(row.ref_table) && row.ref_id) await store.remove(row.ref_table as "transactions", row.ref_id);
    playSound("undo");
    for (const id of ((row?.payload as { shifts?: string[] })?.shifts ?? [])) await store.patch("shifts", id, { status: "planned" });
    setUndo(null);
  }

  return (
    <>
      {asking && <div className="sheet-scrim" onClick={() => setAsking(null)} aria-hidden="true" />}
      {asking && <AskSheet item={asking} tasks={openTasks ?? []} onCancel={() => setAsking(null)} onSave={(payload, taskId) => save(asking.kind, payload, taskId)} />}
      <div className="undo-slot" aria-live="polite">
        {undo && (
          <div className="undo" role="status">
            <span>{undo.text}</span>
            <button className="btn" onClick={undoLast}>Undo</button>
          </div>
        )}
      </div>
      <nav className="dock" aria-label="Check in">
        {DOCK.map((d) => (
          <button key={d.kind} className="dock-btn" data-testid={`checkin-${d.kind}`} onClick={(e) => { if (d.ask) setAsking(d); else { fire(e.currentTarget); void save(d.kind); } }} disabled={!store}>
            {(() => { const I = OBJECT[d.kind]; return <I size={24} aria-hidden="true" />; })()}
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
    <form className="sheet panel" onSubmit={submit} onKeyDown={(e) => e.key === "Escape" && onCancel()} aria-label={item.label}>
      <h2 className="panel-title">{item.label}</h2>
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
