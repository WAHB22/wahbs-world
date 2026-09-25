"use client";

import Link from "next/link";
import { useState } from "react";
import { dayLabel } from "@/data/dates";
import { useWorld } from "@/data/runtime";
import type { Row } from "@/data/schema";
import { EditSheet } from "@/ui/kit/EditSheet";
import { removeWithUndo, toast } from "@/ui/kit/toast";
import { Shell } from "@/ui/Shell";
import { useSchool, type CourseView } from "@/worlds/school/data";
import { assessmentSpec, blockSpec, DAYS } from "@/worlds/school/specs";

type Editing =
  | { kind: "assessment"; row: Partial<Row<"assessments">> }
  | { kind: "block"; row: Partial<Row<"schedule_blocks">> }
  | null;

export default function School() {
  const { store } = useWorld();
  const data = useSchool();
  const [editing, setEditing] = useState<Editing>(null);
  const [filter, setFilter] = useState<"open" | "done" | "all">("open");
  const [showAll, setShowAll] = useState(false);
  const courses = data?.courses ?? [];

  const deadlines = courses
    .flatMap((c) => c.assessments.map((a) => ({ ...a, code: c.code })))
    .filter((a) => (filter === "all" ? true : a.status === filter))
    .sort((a, b) => (a.due_on ?? "9999").localeCompare(b.due_on ?? "9999") * (filter === "done" ? -1 : 1));

  async function saveAssessment(values: Record<string, unknown>) {
    if (!store || editing?.kind !== "assessment") return;
    const was = editing.row;
    const row = await store.put("assessments", { ...was, ...values } as never);
    toast(was.id ? `${row.title} updated.` : `${row.title} added.`);
  }
  async function saveBlock(values: Record<string, unknown>) {
    if (!store || editing?.kind !== "block") return;
    const row = await store.put("schedule_blocks", { ...editing.row, ...values, weekday: Number(values.weekday), term_id: data?.term?.id ?? null } as never);
    toast(`${row.title} saved.`);
  }
  async function toggleDone(a: Row<"assessments">) {
    if (!store) return;
    const next = a.status === "done" ? "open" : "done";
    await store.patch("assessments", a.id, { status: next });
    toast(next === "done" ? `${a.title} marked done.` : `${a.title} reopened.`, () => store.patch("assessments", a.id, { status: a.status }).then(() => undefined));
  }

  return (
    <Shell title="School" world="school">
      <section className="hero-figures" aria-label="The term">
        <div className="figure-block figure-main">
          <span className="figure-label">{data?.term?.name ?? "No current term"}</span>
          <span className="figure-xl">{Math.round((data?.conversion ?? 0) * 100)}<small>%</small></span>
          <span className="figure-note">of the term&apos;s graded work is done</span>
          <span className="meter meter-lg" aria-hidden="true"><i style={{ width: `${Math.round((data?.conversion ?? 0) * 100)}%` }} /></span>
        </div>
        <div className="figure-block">
          <span className="figure-label">Open deadlines</span>
          <span className="figure-lg">{courses.reduce((n, c) => n + c.assessments.filter((a) => a.status === "open").length, 0)}</span>
          <span className="figure-note">{data?.term ? `${data.term.starts_on} to ${data.term.ends_on}` : ""}</span>
        </div>
        <div className="figure-actions">
          <button className="btn btn-primary" onClick={() => setEditing({ kind: "assessment", row: { status: "open", kind: "assignment", course_id: courses[0]?.id } })} data-testid="add-deadline">Add a deadline</button>
          <Link className="btn" href="/school/new-term" data-testid="new-term">Start a new term</Link>
        </div>
      </section>

      <h2 className="band-title">Units</h2>
      <div className="units">
        {courses.map((c) => <Unit key={c.id} c={c} today={data!.today} />)}
        {!courses.length && data && <p className="empty">No courses in this term yet. Start a new term to add them.</p>}
      </div>

      <div className="world-grid school-lower">
        <section className="panel" aria-labelledby="dl-h">
          <div className="section-head">
            <h2 id="dl-h" className="panel-title">Deadlines</h2>
            <div className="tabs" role="tablist" aria-label="Show">
              {(["open", "done", "all"] as const).map((f) => (
                <button key={f} role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}>{f === "open" ? "Open" : f === "done" ? "Done" : "All"}</button>
              ))}
            </div>
          </div>
          <ul className="list" data-testid="deadline-list">
            {(showAll ? deadlines : deadlines.slice(0, 10)).map((a) => (
              <li key={a.id} className="deadline" data-status={a.status} data-overdue={(a.status === "open" && a.due_on && a.due_on < data!.today) || undefined}>
                <button className="check" aria-label={a.status === "done" ? `Reopen ${a.title}` : `Mark ${a.title} done`} aria-pressed={a.status === "done"} onClick={() => toggleDone(a)}>
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
                <button className="row-btn" onClick={() => setEditing({ kind: "assessment", row: a })}>
                  <span className="row-main">{a.code} {a.title}</span>
                  <span className="row-sub">{a.due_on ? (a.status === "open" && a.due_on < data!.today ? `Overdue since ${dayLabel(a.due_on, data!.today)}` : `Due ${dayLabel(a.due_on, data!.today)}`) : "Date not posted yet"}{a.weight != null ? `, ${a.weight} percent` : ""}{a.grade != null && a.grade_out_of ? `, graded ${a.grade} of ${a.grade_out_of}` : ""}</span>
                </button>
              </li>
            ))}
            {!deadlines.length && <li className="empty">Nothing here.</li>}
          </ul>
          {deadlines.length > 10 && (
            <button className="btn btn-small" style={{ marginTop: 12 }} onClick={() => setShowAll((v) => !v)}>{showAll ? "Show the next ten" : `Show all ${deadlines.length}`}</button>
          )}
        </section>

        <section className="panel" aria-labelledby="wk-h">
          <div className="section-head">
            <h2 id="wk-h" className="panel-title">The week</h2>
            <button className="btn btn-small" onClick={() => setEditing({ kind: "block", row: { kind: "lecture", weekday: new Date().getDay() } })}>Add a block</button>
          </div>
          <div className="week">
            {[1, 2, 3, 4, 5, 6, 0].map((d) => {
              const blocks = (data?.blocks ?? []).filter((b) => b.weekday === d).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
              return (
                <div key={d} className="week-day-col" data-today={d === new Date().getDay() || undefined}>
                  <h3 className="week-day-name">{DAYS[d].slice(0, 3)}</h3>
                  {blocks.map((b) => (
                    <button key={b.id} className="week-block" data-kind={b.kind} onClick={() => setEditing({ kind: "block", row: b })}>
                      <span className="ticket-font">{b.starts_at.slice(0, 5)}</span> {b.title}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {editing?.kind === "assessment" && (
        <EditSheet
          title={editing.row.id ? "Edit deadline" : "Add a deadline"}
          spec={assessmentSpec(courses)}
          row={editing.row as Record<string, unknown>}
          onSave={saveAssessment}
          onDelete={editing.row.id && store ? () => removeWithUndo(store as never, "assessments", editing.row.id!, editing.row.title ?? "Deadline") : undefined}
          onClose={() => setEditing(null)}
        />
      )}
      {editing?.kind === "block" && (
        <EditSheet
          title={editing.row.id ? "Edit block" : "Add a block"}
          spec={blockSpec(courses)}
          row={{ ...editing.row, weekday: String(editing.row.weekday ?? 1) }}
          onSave={saveBlock}
          onDelete={editing.row.id && store ? () => removeWithUndo(store as never, "schedule_blocks", editing.row.id!, editing.row.title ?? "Block") : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </Shell>
  );
}

function Unit({ c, today }: { c: CourseView; today: string }) {
  return (
    <Link href={`/school/course?id=${c.id}`} className="unit panel" data-testid="unit">
      <span className="unit-code">{c.code}</span>
      <span className="unit-name" lang={c.language}>{c.name}</span>
      <span className="unit-meter" aria-label={`${Math.round(c.conversion * 100)} percent done`}>
        <span className="meter"><i style={{ width: `${Math.round(c.conversion * 100)}%` }} /></span>
        <span className="soft">{Math.round(c.conversion * 100)}% done{c.grade != null ? `, average ${Math.round(c.grade)}` : ""}</span>
      </span>
      <span className="unit-next">{c.next ? `Next: ${c.next.title}, ${dayLabel(c.next.due_on!, today)}` : "Nothing dated ahead"}</span>
    </Link>
  );
}
