"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef, useState } from "react";
import { dayLabel, localDay, timeLabel } from "@/data/dates";
import { useWorld } from "@/data/runtime";
import type { Row } from "@/data/schema";
import { Shell } from "@/ui/Shell";

type Kind = Row<"checkins">["kind"];

const DOCK: { kind: Kind; label: string; done: string; ask?: "amount" | "text" | "task" }[] = [
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

function describe(c: Row<"checkins">): string {
  const p = c.payload as Record<string, unknown>;
  if (c.kind === "spent") return `Spent ${(Number(p.cents ?? 0) / 100).toFixed(2)} dollars${p.note ? `, ${p.note}` : ""}`;
  if (c.kind === "moment") return String(p.text ?? "A moment");
  if (c.kind === "task_done") return p.title ? `Done: ${p.title}` : "Task done";
  return DOCK.find((d) => d.kind === c.kind)!.done;
}

export default function Today() {
  const { store } = useWorld();
  const today = localDay();
  const [asking, setAsking] = useState<(typeof DOCK)[number] | null>(null);
  const [undo, setUndo] = useState<{ id: string; text: string } | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const checkins = useLiveQuery(
    async () => (store ? (await store.db.rows("checkins").where("local_day").equals(today).toArray()).filter((c) => !c.deleted_at) : []),
    [store, today],
  );
  const oneThing = useLiveQuery(async () => {
    if (!store) return undefined;
    const open = (await store.all("assessments")).filter((a) => a.status === "open" && a.due_on && a.due_on >= today);
    open.sort((a, b) => a.due_on!.localeCompare(b.due_on!) || (b.weight ?? 0) - (a.weight ?? 0));
    const next = open.slice(0, 6).sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))[0];
    if (!next) return null;
    const course = next.course_id ? await store.get("courses", next.course_id) : undefined;
    return { ...next, code: course?.code };
  }, [store, today]);
  const openTasks = useLiveQuery(async () => (store ? (await store.all("tasks")).filter((t) => !t.done_at).slice(0, 8) : []), [store]);

  useEffect(() => () => clearTimeout(undoTimer.current), []);

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
    <Shell title="Today" accent="ember">
      <div className="today-grid">
        <section className="glass pane one-thing" aria-labelledby="one">
          <h2 id="one" className="pane-title">The one thing</h2>
          {oneThing === undefined ? null : oneThing ? (
            <>
              <p className="big-line">{oneThing.code} {oneThing.title}</p>
              <p className="soft">
                Due {dayLabel(oneThing.due_on!, today)}
                {oneThing.weight != null ? `, worth ${oneThing.weight} percent` : ""}
                {oneThing.covers.length ? `. Covers ${oneThing.covers.join(", ")}.` : "."}
              </p>
            </>
          ) : (
            <p className="soft">Nothing is due. A good day to get ahead, or to rest.</p>
          )}
        </section>

        <section className="glass pane log" aria-labelledby="log">
          <h2 id="log" className="pane-title">Checked in today</h2>
          {checkins && checkins.length ? (
            <ul className="log-list" data-testid="today-log">
              {[...checkins].sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)).map((c) => (
                <li key={c.id}>
                  <span className="ticket-font log-time">{timeLabel(c.occurred_at)}</span>
                  <span>{describe(c)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="soft">Nothing yet. One tap below saves it, even with no connection.</p>
          )}
        </section>
      </div>

      {asking && <div className="sheet-scrim" onClick={() => setAsking(null)} aria-hidden="true" />}
      {asking && (
        <AskSheet
          item={asking}
          tasks={openTasks ?? []}
          onCancel={() => setAsking(null)}
          onSave={(payload, taskId) => save(asking.kind, payload, taskId)}
        />
      )}

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
          <button
            key={d.kind}
            className="dock-btn"
            data-testid={`checkin-${d.kind}`}
            onClick={() => (d.ask ? setAsking(d) : save(d.kind))}
            disabled={!store}
          >
            <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
              <path d={ICON[d.kind]} fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{d.label}</span>
          </button>
        ))}
      </nav>
    </Shell>
  );
}

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
