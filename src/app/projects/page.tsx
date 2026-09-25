"use client";

import Link from "next/link";
import { useState } from "react";
import { dayLabel } from "@/data/dates";
import { useWorld } from "@/data/runtime";
import type { Row } from "@/data/schema";
import { EditSheet } from "@/ui/kit/EditSheet";
import { toast } from "@/ui/kit/toast";
import { Shell } from "@/ui/Shell";
import { cap, hoursLabel, STAGES, useProjects, type ProjectView } from "@/worlds/projects/data";
import { projectSpec } from "@/worlds/projects/specs";

export default function Projects() {
  const { store } = useWorld();
  const data = useProjects();
  const [adding, setAdding] = useState<Partial<Row<"projects">> | null>(null);
  const [showClosed, setShowClosed] = useState(false);
  const shown = STAGES.filter((s) => showClosed || !["paused", "dropped"].includes(s.id));
  const active = (data?.projects ?? []).filter((p) => !["done", "paused", "dropped"].includes(p.stage));

  return (
    <Shell title="Projects" world="projects" lede={data ? `${active.length} in motion, ${data.openTasks} open tasks, ${hoursLabel(data.minutesWeek)} logged this week.` : undefined}
      actions={<button className="btn btn-primary" data-testid="add-project" onClick={() => setAdding({ type: "personal", stage: "idea" })}>New project</button>}>
      <section className="hero-figures" aria-label="Projects at a glance">
        <div className="figure-block figure-main">
          <span className="figure-label">Due in the next seven days</span>
          <span className="figure-xl">{data?.dueSoon ?? 0}</span>
          <span className="figure-note">{data?.dueSoon === 1 ? "task" : "tasks"} across every project</span>
        </div>
        <div className="figure-block">
          <span className="figure-label">Open tasks</span>
          <span className="figure-lg">{data?.openTasks ?? 0}</span>
          <span className="figure-note">{hoursLabel(data?.minutesWeek ?? 0)} of work logged this week</span>
        </div>
      </section>

      <div className="section-head" style={{ marginTop: 28 }}>
        <h2 className="band-title" style={{ margin: 0 }}>By stage</h2>
        <button className="btn btn-small btn-ghost" onClick={() => setShowClosed((v) => !v)}>{showClosed ? "Hide paused and dropped" : "Show paused and dropped"}</button>
      </div>
      <div className="board" data-testid="project-board">
        {shown.map((s) => {
          const list = (data?.projects ?? []).filter((p) => p.stage === s.id).sort((a, b) => (a.deadline ?? "9999").localeCompare(b.deadline ?? "9999"));
          return (
            <section key={s.id} className="board-col" aria-label={s.name}>
              <div className="board-col-head"><span>{s.name}</span><span className="mono">{list.length}</span></div>
              {list.map((p) => <ProjectCard key={p.id} p={p} today={data!.today} />)}
              {!list.length && <p className="hint" style={{ padding: "4px 6px" }}>Nothing here.</p>}
            </section>
          );
        })}
      </div>

      {adding && store && data && (
        <EditSheet title="New project" spec={projectSpec(data.courses)} row={adding as Record<string, unknown>}
          onSave={async (v) => { const r = await store.put("projects", v as never); toast(`${r.title} added.`); }}
          onClose={() => setAdding(null)} />
      )}
    </Shell>
  );
}

function ProjectCard({ p, today }: { p: ProjectView; today: string }) {
  const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
  return (
    <Link href={`/projects/p?id=${p.id}`} className="card" data-testid="project-card">
      <span className="card-title">{p.title}</span>
      <span className="card-meta"><span className="chip">{cap(p.type)}</span>{p.course && <span className="mono">{p.course}</span>}{p.deadline && <span>By {dayLabel(p.deadline, today)}</span>}</span>
      {p.total > 0 && <span className="meter" aria-label={`${pct} percent of tasks done`}><i style={{ width: `${pct}%` }} /></span>}
      <span className="card-meta">
        {p.total ? `${p.done} of ${p.total} tasks` : "No tasks yet"}
        {p.fit && <span className={`chip ${p.fit.need > p.fit.have ? "alarm" : "done"}`}>{p.fit.need > p.fit.have ? `Over by ${Math.ceil(p.fit.need - p.fit.have)} h` : "Fits your hours"}</span>}
      </span>
      {p.next && <span className="card-meta">Next: {p.next.title}{p.next.due_on ? `, ${dayLabel(p.next.due_on, today)}` : ""}</span>}
    </Link>
  );
}
