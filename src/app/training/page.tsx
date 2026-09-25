"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { dayLabel, localDay } from "@/data/dates";
import { useWorld } from "@/data/runtime";
import type { Row } from "@/data/schema";
import { playSound } from "@/living/sound";
import { EditSheet, type FieldSpec } from "@/ui/kit/EditSheet";
import { removeWithUndo, toast } from "@/ui/kit/toast";
import { Shell } from "@/ui/Shell";
import { addDays, weekStart } from "@/worlds/useWorldStatus";

const KINDS = ["strength", "cardio", "sport", "mobility", "other"] as const;
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const DAY3 = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const spec: FieldSpec[] = [
  { name: "occurred_on", label: "Day", type: "date", required: true },
  { name: "kind", label: "Kind", type: "select", required: true, options: KINDS.map((k) => ({ value: k, label: cap(k) })) },
  { name: "minutes", label: "Minutes", type: "number" },
  { name: "notes", label: "Notes", type: "textarea" },
];

function useTraining() {
  const { store } = useWorld();
  return useLiveQuery(async () => {
    if (!store) return undefined;
    const today = localDay();
    const [sessions, blocks, terms, checkins] = await Promise.all([store.all("training_sessions"), store.all("schedule_blocks"), store.all("terms"), store.all("checkins")]);
    // Gym check ins saved before sessions existed still count, as sessions without details.
    const legacy = checkins.filter((c) => c.kind === "gym_done" && !c.ref_id).map((c) => c.local_day);
    const days = [...sessions.map((s) => s.occurred_on), ...legacy];
    const current = terms.find((t) => t.status === "current");
    const planned = [...new Set(blocks.filter((b) => b.kind === "gym" && (!current || !b.term_id || b.term_id === current.id)).map((b) => b.weekday))].sort();
    const ws = weekStart(today);
    const week = days.filter((d) => d >= ws && d <= today).length;
    const month = days.filter((d) => d.startsWith(today.slice(0, 7))).length;
    // The streak: weeks in a row, ending with this one or the last, with at least one session.
    let streak = 0;
    let w = days.some((d) => d >= ws) ? ws : addDays(ws, -7);
    while (days.some((d) => d >= w && d < addDays(w, 7))) { streak++; w = addDays(w, -7); }
    return { today, ws, sessions: sessions.sort((a, b) => b.occurred_on.localeCompare(a.occurred_on) || b.created_at.localeCompare(a.created_at)), days: new Set(days), planned, week, month, streak };
  }, [store]);
}

export default function Training() {
  const { store } = useWorld();
  const data = useTraining();
  const [editing, setEditing] = useState<Partial<Row<"training_sessions">> | null>(null);
  const weeks = 16;
  const start = data ? addDays(data.ws, -7 * (weeks - 1)) : "";

  return (
    <Shell title="Training" world="training" lede={data ? (data.planned.length ? `Planned on ${data.planned.map((d) => DAY3[d]).join(", ")}. Showing up is what counts.` : "Showing up is what counts.") : undefined}
      actions={<button className="btn btn-primary" data-testid="log-session" onClick={() => setEditing({ occurred_on: localDay(), kind: "strength" })}>Log a session</button>}>
      <section className="hero-figures" aria-label="Sessions">
        <div className="figure-block figure-main">
          <span className="figure-label">This week</span>
          <span className="figure-xl" data-testid="week-sessions">{data?.week ?? 0}{data?.planned.length ? <small> of {data.planned.length}</small> : null}</span>
          <span className="figure-note">{data?.week ? "sessions so far" : "No session yet this week"}</span>
        </div>
        <div className="figure-block">
          <span className="figure-label">In a row</span>
          <span className="figure-lg">{data?.streak ?? 0} {data?.streak === 1 ? "week" : "weeks"}</span>
          <span className="figure-note">{data?.month ?? 0} sessions this month</span>
        </div>
      </section>

      <div className="world-grid two">
      <section className="panel" aria-labelledby="grid-h">
        <h2 id="grid-h" className="panel-title">The last sixteen weeks</h2>
        <div className="heat" role="img" aria-label={`${data ? [...data.days].filter((d) => d >= start).length : 0} sessions in the last sixteen weeks`}>
          <div className="heat-days" aria-hidden="true">{[1, 2, 3, 4, 5, 6, 0].map((d) => <span key={d}>{DAY3[d]}</span>)}</div>
          <div className="heat-grid">
            {data && Array.from({ length: weeks }, (_, w) => (
              <div key={w} className="heat-week">
                {Array.from({ length: 7 }, (_, i) => {
                  const d = addDays(start, w * 7 + i);
                  return <i key={d} data-on={data.days.has(d) || undefined} data-future={d > data.today || undefined} data-today={d === data.today || undefined} title={d} />;
                })}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel" aria-labelledby="list-h">
        <h2 id="list-h" className="panel-title">Sessions</h2>
        <ul className="list" data-testid="session-list">
          {(data?.sessions ?? []).slice(0, 30).map((s) => (
            <li key={s.id}><button className="row-btn" onClick={() => setEditing(s)}>
              <span className="row-main">{cap(s.kind)}{s.notes ? `: ${s.notes}` : ""}</span>
              <span className="row-sub">{dayLabel(s.occurred_on, data!.today)}</span>
              <span className="row-side">{s.minutes ? `${s.minutes} min` : ""}</span>
            </button></li>
          ))}
          {data && !data.sessions.length && <li className="empty">Log a session here, or tap Gym done on Today.</li>}
        </ul>
      </section>
      </div>

      {editing && store && (
        <EditSheet title={editing.id ? "Edit session" : "Log a session"} spec={spec} row={editing as Record<string, unknown>}
          onSave={async (v) => {
            const minutes = v.minutes == null ? null : Math.max(0, Math.round(Number(v.minutes)));
            await store.put("training_sessions", { ...editing, ...v, minutes } as never);
            if (!editing.id) playSound("done");
            toast(editing.id ? "Session saved." : "Session logged.");
          }}
          onDelete={editing.id ? () => removeWithUndo(store as never, "training_sessions", editing.id!, "Session") : undefined}
          onClose={() => setEditing(null)} />
      )}
    </Shell>
  );
}
