"use client";

import { Check } from "@phosphor-icons/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { dayLabel, localDay } from "@/data/dates";
import { useWorld } from "@/data/runtime";
import type { Row } from "@/data/schema";
import { playSound } from "@/living/sound";
import { EditSheet } from "@/ui/kit/EditSheet";
import { removeWithUndo, toast } from "@/ui/kit/toast";
import { Shell } from "@/ui/Shell";
import { cap, hoursLabel, STAGES, useProject } from "@/worlds/projects/data";
import { logSpec, projectSpec, sessionSpec, taskSpec } from "@/worlds/projects/specs";

type Editing =
  | { kind: "project" }
  | { kind: "task"; row: Partial<Row<"project_tasks">> }
  | { kind: "session"; row: Partial<Row<"project_sessions">> & { day?: string } }
  | { kind: "log"; row: Partial<Row<"project_logs">> }
  | null;

export default function ProjectPage() {
  return <Suspense><Project /></Suspense>;
}

function Project() {
  const id = useSearchParams().get("id");
  const router = useRouter();
  const { store } = useWorld();
  const data = useProject(id);
  const [editing, setEditing] = useState<Editing>(null);
  const p = data?.project;

  if (data && !p) {
    return <Shell title="Project" world="projects" back={{ href: "/projects", label: "Projects" }}><p className="soft">This project is not here any more.</p></Shell>;
  }

  const byId = new Map((p?.tasks ?? []).map((t) => [t.id, t]));
  const groups = new Map<string, Row<"project_tasks">[]>();
  for (const t of [...(p?.tasks ?? [])].sort((a, b) => (a.status === "done" ? 1 : 0) - (b.status === "done" ? 1 : 0) || (a.due_on ?? "9999").localeCompare(b.due_on ?? "9999"))) {
    const k = t.deliverable || "Other tasks";
    groups.set(k, [...(groups.get(k) ?? []), t]);
  }
  const blockedBy = (t: Row<"project_tasks">) => t.depends_on.map((d) => byId.get(d)).filter((d): d is Row<"project_tasks"> => !!d && d.status !== "done");

  async function toggle(t: Row<"project_tasks">) {
    if (!store) return;
    const status = t.status === "done" ? "todo" : "done";
    await store.patch("project_tasks", t.id, { status, done_at: status === "done" ? new Date().toISOString() : null });
    if (status === "done") playSound("done");
    toast(status === "done" ? `${t.title} done.` : `${t.title} reopened.`, () => store.patch("project_tasks", t.id, { status: t.status, done_at: t.done_at }).then(() => undefined));
  }

  const pct = p && p.total ? Math.round((p.done / p.total) * 100) : 0;
  return (
    <Shell title={p?.title ?? "Project"} world="projects" back={{ href: "/projects", label: "Projects" }}
      lede={p ? <>{STAGES.find((s) => s.id === p.stage)?.name}, {cap(p.type).toLowerCase()}{p.course ? `, ${p.course}` : ""}{p.deadline ? `, due ${dayLabel(p.deadline, data!.today)}` : ""}</> : undefined}
      actions={p && <><button className="btn" onClick={() => setEditing({ kind: "project" })}>Edit project</button><button className="btn btn-primary" data-testid="add-task" onClick={() => setEditing({ kind: "task", row: { kind: "build", priority: "medium", status: "todo", depends_on: [] } })}>Add a task</button></>}>
      {p && (
        <>
          <section className="hero-figures" aria-label="Where it stands">
            <div className="figure-block figure-main">
              <span className="figure-label">Tasks done</span>
              <span className="figure-xl">{pct}<small>%</small></span>
              <span className="figure-note">{p.done} of {p.total}</span>
              <span className="meter meter-lg" aria-hidden="true"><i style={{ width: `${pct}%` }} /></span>
            </div>
            <div className="figure-block">
              <span className="figure-label">Does it fit your hours?</span>
              {p.fit ? (
                <>
                  <span className="figure-lg">{p.fit.need > p.fit.have ? `Over by ${Math.ceil(p.fit.need - p.fit.have)} h` : "Yes"}</span>
                  <span className="figure-note">{Math.round(p.fit.need)} h of estimated work left, {p.fit.have} h available at {p.weekly_hours} h a week for {p.fit.weeks} {p.fit.weeks === 1 ? "week" : "weeks"}.</span>
                </>
              ) : <span className="figure-note">Give it a deadline and weekly hours to check.</span>}
            </div>
            <div className="figure-actions">
              <button className="btn" data-testid="log-time" onClick={() => setEditing({ kind: "session", row: { kind: "work", day: localDay() } })}>Log time</button>
              <button className="btn" onClick={() => setEditing({ kind: "log", row: { kind: "progress", occurred_on: localDay() } })}>Add to the log</button>
            </div>
          </section>

          {(p.objective || p.success) && (
            <section className="panel brief" aria-label="Brief">
              {p.objective && <div><h2 className="panel-title">Objective</h2><p className="soft">{p.objective}</p></div>}
              {p.success && <div><h2 className="panel-title">Success looks like</h2><p className="soft">{p.success}</p></div>}
            </section>
          )}

          <div className="world-grid two">
            <section className="panel" aria-labelledby="tasks-h">
              <h2 id="tasks-h" className="panel-title">Tasks</h2>
              {[...groups.entries()].map(([name, list]) => (
                <div key={name} className="task-group">
                  <h3 className="group-name">{name}</h3>
                  <ul className="list" data-testid="task-list">
                    {list.map((t) => {
                      const waits = blockedBy(t);
                      return (
                        <li key={t.id} className="deadline" data-status={t.status === "done" ? "done" : "open"}>
                          <button className="check" aria-label={t.status === "done" ? `Reopen ${t.title}` : `Mark ${t.title} done`} aria-pressed={t.status === "done"} onClick={() => toggle(t)}><Check size={16} weight="bold" aria-hidden="true" /></button>
                          <button className="row-btn" onClick={() => setEditing({ kind: "task", row: t })}>
                            <span className="row-main">{t.title}</span>
                            <span className="row-sub">
                              {waits.length ? `Waits on ${waits.map((w) => w.title).join(", ")}` : t.due_on ? `Due ${dayLabel(t.due_on, data!.today)}` : "No date"}
                              {t.estimate_hours ? `, ${t.estimate_hours} h` : ""}
                            </span>
                            <span className="row-side">{t.priority === "high" ? <span className="chip hot">High</span> : t.status === "doing" ? <span className="chip">Doing</span> : null}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              {!p.tasks.length && <p className="empty">Break the project into tasks; each one can wait on others.</p>}
            </section>

            <div className="stack">
              <section className="panel" aria-labelledby="time-h">
                <div className="section-head"><h2 id="time-h" className="panel-title">Time</h2><span className="mono">{hoursLabel(p.minutesAll)}</span></div>
                <ul className="list">
                  {(data!.sessions ?? []).slice(0, 8).map((s) => (
                    <li key={s.id}><button className="row-btn" onClick={() => setEditing({ kind: "session", row: { ...s, day: localDay(new Date(s.started_at)) } })}>
                      <span className="row-main">{s.note || (s.kind === "rehearsal" ? "Rehearsal" : "Work")}</span>
                      <span className="row-sub">{dayLabel(localDay(new Date(s.started_at)), data!.today)}</span>
                      <span className="row-side">{s.minutes} min</span>
                    </button></li>
                  ))}
                  {!data!.sessions?.length && <li className="empty">No time logged yet.</li>}
                </ul>
              </section>
              <section className="panel" aria-labelledby="log-h">
                <h2 id="log-h" className="panel-title">Log</h2>
                <ol className="timeline">
                  {(data!.logs ?? []).slice(0, 10).map((l) => (
                    <li key={l.id}>
                      <button className="linkless" onClick={() => setEditing({ kind: "log", row: l })}>
                        <span className="timeline-date">{dayLabel(l.occurred_on, data!.today)}, {l.kind}</span>
                        <span className="log-body">{l.body}</span>
                      </button>
                    </li>
                  ))}
                  {!data!.logs?.length && <li className="empty">Progress, risks, lessons and decisions land here.</li>}
                </ol>
              </section>
            </div>
          </div>
        </>
      )}

      {editing?.kind === "project" && p && store && (
        <EditSheet title="Edit project" spec={projectSpec(data!.courses ?? [])} row={p as unknown as Record<string, unknown>}
          onSave={async (v) => { await store.patch("projects", p.id, v as never); toast("Project saved."); }}
          onDelete={async () => { await removeWithUndo(store as never, "projects", p.id, p.title); router.push("/projects"); }}
          onClose={() => setEditing(null)} />
      )}
      {editing?.kind === "task" && p && store && (
        <EditSheet title={editing.row.id ? "Edit task" : "Add a task"} spec={taskSpec(p.tasks.filter((t) => t.id !== editing.row.id))} row={editing.row as Record<string, unknown>}
          onSave={async (v) => {
            const values = { ...editing.row, ...v, project_id: p.id } as Record<string, unknown>;
            if (values.status === "done" && !editing.row.done_at) values.done_at = new Date().toISOString();
            if (values.status !== "done") values.done_at = null;
            const r = await store.put("project_tasks", values as never);
            toast(editing.row.id ? `${r.title} saved.` : `${r.title} added.`);
          }}
          onDelete={editing.row.id ? () => removeWithUndo(store as never, "project_tasks", editing.row.id!, editing.row.title ?? "Task") : undefined}
          onClose={() => setEditing(null)} />
      )}
      {editing?.kind === "session" && p && store && (
        <EditSheet title={editing.row.id ? "Edit time" : "Log time"} spec={sessionSpec()} row={editing.row as Record<string, unknown>}
          onSave={async (v) => {
            const { day, ...rest } = v as { day: string } & Record<string, unknown>;
            await store.put("project_sessions", { ...editing.row, ...rest, day: undefined, project_id: p.id, minutes: Math.max(0, Math.round(Number(rest.minutes) || 0)), started_at: new Date(`${day}T12:00:00`).toISOString() } as never);
            toast("Time logged.");
          }}
          onDelete={editing.row.id ? () => removeWithUndo(store as never, "project_sessions", editing.row.id!, "Time") : undefined}
          onClose={() => setEditing(null)} />
      )}
      {editing?.kind === "log" && p && store && (
        <EditSheet title={editing.row.id ? "Edit entry" : "Add to the log"} spec={logSpec()} row={editing.row as Record<string, unknown>}
          onSave={async (v) => { await store.put("project_logs", { ...editing.row, ...v, project_id: p.id } as never); toast("Saved to the log."); }}
          onDelete={editing.row.id ? () => removeWithUndo(store as never, "project_logs", editing.row.id!, "Entry") : undefined}
          onClose={() => setEditing(null)} />
      )}
    </Shell>
  );
}
