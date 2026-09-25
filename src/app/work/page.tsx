"use client";

import { useState } from "react";
import { dayLabel } from "@/data/dates";
import { useWorld } from "@/data/runtime";
import type { Row } from "@/data/schema";
import { fire, useCountUp } from "@/motion/feedback";
import { EditSheet } from "@/ui/kit/EditSheet";
import { removeWithUndo, toast } from "@/ui/kit/toast";
import { clock, money } from "@/ui/format";
import { Shell } from "@/ui/Shell";
import { planFromRoutine, shiftTimes, useWork, type ShiftView } from "@/worlds/work/data";
import { fmtHours, PassScene } from "@/worlds/work/PassScene";
import { employerSpec, shiftSpec } from "@/worlds/work/specs";

type Editing = { kind: "shift"; row: Partial<ShiftView> } | { kind: "employer"; row: Partial<Row<"employers">> } | null;

export default function Work() {
  const { store } = useWorld();
  const data = useWork();
  const [editing, setEditing] = useState<Editing>(null);
  const [ring, setRing] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const weekPay = useCountUp(data?.week.pay ?? 0);

  async function setStatus(s: ShiftView, status: "worked" | "cancelled", el?: HTMLElement | null) {
    if (!store) return;
    await store.patch("shifts", s.id, { status });
    if (status === "worked") { setRing((r) => r + 1); fire(el ?? null); }
    toast(status === "worked" ? `${s.employer}, ${dayLabel(s.day, data!.today)}: worked.` : `${s.employer}, ${dayLabel(s.day, data!.today)}: marked as not happening.`,
      () => store.patch("shifts", s.id, { status: s.status }).then(() => undefined));
  }

  async function plan() {
    if (!store || !data) return;
    const made = await planFromRoutine(store, data.routine, data.employers, data.shifts, data.today);
    toast(made ? `${made} ${made === 1 ? "shift" : "shifts"} planned from your routine.` : "The next two weeks already have their shifts.");
  }

  async function saveShift(v: Record<string, unknown>) {
    if (!store || editing?.kind !== "shift") return;
    const { day, start, end, ...rest } = v as { day: string; start: string; end: string } & Record<string, unknown>;
    const { id } = editing.row;
    const row = { ...(id ? { id } : {}), ...rest, unpaid_break_min: Number(rest.unpaid_break_min ?? 0) || 0, ...shiftTimes(day, start, end) };
    if (id) await store.patch("shifts", id, row as never); else await store.put("shifts", row as never);
    toast(id ? "Shift updated." : "Shift added.");
  }

  const newShift = (): Partial<ShiftView> => ({ status: "planned", employer_id: data?.employers[0]?.id ?? null, unpaid_break_min: 0 });
  const shiftForm = (s: Partial<ShiftView>) => ({ ...s, day: s.day ?? data?.today ?? "", start: s.starts_at ? clock(s.starts_at) : "", end: s.ends_at ? clock(s.ends_at) : "" });
  const history = data?.worked ?? [];
  const hasPay = !!data && (data.employers.some((e) => e.hourly_cents != null) || data.shifts.some((x) => x.pay_cents != null || x.tips_cents != null));

  return (
    <Shell title="Work" accent="flame">
      <div className="school-top">
        <PassScene days={data?.week.days ?? []} shifts={data?.week.shifts ?? []} worked={data?.week.worked ?? 0} planned={data?.week.planned ?? 0} ring={ring} />
        <section className="glass pane term-card" aria-labelledby="wk">
          <h2 id="wk" className="pane-title">This week</h2>
          <p className="figure">{fmtHours(data?.week.worked ?? 0)}</p>
          <p className="soft">worked of {fmtHours(data?.week.planned ?? 0)} on the rail{hasPay ? `, about ${money(Math.round(weekPay))} earned` : ""}</p>
          <p className="soft">This month: {fmtHours(data?.month.hours ?? 0)}{hasPay ? `, about ${money(data?.month.pay ?? 0)}` : ""}</p>
          {data && !hasPay && <p className="hint">Add your hourly wage under Where you work to see pay.</p>}
          <div className="row-actions">
            <button className="btn btn-primary" data-testid="add-shift" onClick={() => setEditing({ kind: "shift", row: newShift() })}>Add a shift</button>
            {data && data.routine.length > 0 && <button className="btn" data-testid="plan-shifts" onClick={plan}>Plan the next two weeks</button>}
          </div>
        </section>
      </div>

      {data && data.toConfirm.length > 0 && (
        <section className="glass pane confirm-pane" aria-labelledby="cf">
          <h2 id="cf" className="pane-title">Did these happen?</h2>
          <ul className="list" data-testid="to-confirm">
            {data.toConfirm.map((s) => (
              <li key={s.id} className="confirm-row">
                <span><strong>{s.employer}</strong> <span className="soft">{dayLabel(s.day, data.today)}, {clock(s.starts_at)} to {clock(s.ends_at)}</span></span>
                <span className="row-actions">
                  <button className="btn btn-small btn-primary" onClick={(e) => setStatus(s, "worked", e.currentTarget)}>Worked</button>
                  <button className="btn btn-small" onClick={() => setStatus(s, "cancelled")}>It did not happen</button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <h2 className="band-title">On the rail</h2>
      <ul className="ticket-list shift-rail" data-testid="shift-rail">
        {(data?.upcoming ?? []).slice(0, 8).map((s) => (
          <li key={s.id} className="ticket">
            <button className="ticket-btn" onClick={() => setEditing({ kind: "shift", row: s })} aria-label={`Edit ${s.employer} shift, ${dayLabel(s.day, data!.today)}`}>
              <span className="ticket-row"><span>{dayLabel(s.day, data!.today).toUpperCase()}</span><span>{fmtHours(s.hours)}</span></span>
              <span className="ticket-title">{s.employer}</span>
              <span className="ticket-row"><span>{clock(s.starts_at)} to {clock(s.ends_at)}</span>{s.pay != null && <span>{money(s.pay)}</span>}</span>
            </button>
            {s.day === data!.today && <button className="btn btn-small ticket-done" onClick={(e) => setStatus(s, "worked", e.currentTarget)}>Worked</button>}
          </li>
        ))}
        {data && !data.upcoming.length && <li className="empty">Nothing on the rail. Add a shift or plan from your routine.</li>}
      </ul>

      <div className="world-grid school-lower">
        <section className="glass pane" aria-labelledby="hist">
          <h2 id="hist" className="pane-title">Worked</h2>
          <ul className="list" data-testid="worked-list">
            {(showAll ? history : history.slice(0, 8)).map((s) => (
              <li key={s.id}>
                <button className="row-btn" onClick={() => setEditing({ kind: "shift", row: s })}>
                  <span className="row-main">{s.employer}, {dayLabel(s.day, data!.today)}</span>
                  <span className="row-sub">{clock(s.starts_at)} to {clock(s.ends_at)}, {fmtHours(s.hours)}{s.tips_cents ? `, ${money(s.tips_cents)} in tips` : ""}</span>
                  <span className="row-side">{s.pay != null ? money(s.pay) : ""}</span>
                </button>
              </li>
            ))}
            {data && !history.length && <li className="empty">Worked shifts land here with their hours and pay.</li>}
          </ul>
          {history.length > 8 && <button className="btn btn-small" style={{ marginTop: 12 }} onClick={() => setShowAll((v) => !v)}>{showAll ? "Show fewer" : `Show all ${history.length}`}</button>}
        </section>

        <section className="glass pane" aria-labelledby="emp">
          <div className="section-head">
            <h2 id="emp" className="pane-title">Where you work</h2>
            <button className="btn btn-small" onClick={() => setEditing({ kind: "employer", row: {} })}>Add a place</button>
          </div>
          <ul className="list">
            {(data?.employers ?? []).map((e) => (
              <li key={e.id}>
                <button className="row-btn" onClick={() => setEditing({ kind: "employer", row: e })}>
                  <span className="row-main">{e.name}</span>
                  <span className="row-sub">{e.hourly_cents != null ? `${money(e.hourly_cents)} an hour` : "No wage entered yet"}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {editing?.kind === "shift" && data && (
        <EditSheet
          title={editing.row.id ? "Edit shift" : "Add a shift"}
          spec={shiftSpec(data.employers)}
          row={shiftForm(editing.row)}
          onSave={saveShift}
          onDelete={editing.row.id && store ? () => removeWithUndo(store as never, "shifts", editing.row.id!, "Shift") : undefined}
          onClose={() => setEditing(null)}
        />
      )}
      {editing?.kind === "employer" && store && (
        <EditSheet
          title={editing.row.id ? `Edit ${editing.row.name}` : "Add a place"}
          spec={employerSpec()}
          row={editing.row as Record<string, unknown>}
          onSave={async (v) => { const r = editing.row.id ? await store.patch("employers", editing.row.id, v as never) : await store.put("employers", v as never); toast(`${(r as Row<"employers">).name} saved.`); }}
          onDelete={editing.row.id ? () => removeWithUndo(store as never, "employers", editing.row.id!, editing.row.name ?? "Place") : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </Shell>
  );
}
