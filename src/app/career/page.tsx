"use client";

import { ArrowUpRight, Check } from "@phosphor-icons/react";
import { useState } from "react";
import { dayLabel } from "@/data/dates";
import { useWorld } from "@/data/runtime";
import type { Row } from "@/data/schema";
import { playSound } from "@/living/sound";
import { EditSheet } from "@/ui/kit/EditSheet";
import { removeWithUndo, toast } from "@/ui/kit/toast";
import { Shell } from "@/ui/Shell";
import { APP_COLUMNS, useCareer } from "@/worlds/career/data";
import { applicationSpec, evidenceSpec, planSpec, stepSpec, storySpec } from "@/worlds/career/specs";

type Editing =
  | { kind: "application"; row: Partial<Row<"applications">> }
  | { kind: "evidence"; row: Partial<Row<"evidence">> & { skill_ids?: string[] } }
  | { kind: "story"; row: Partial<Row<"stories">> }
  | { kind: "step"; row: Partial<Row<"tasks">> }
  | { kind: "plan"; row: Partial<Row<"term_plans">> }
  | { kind: "skill" }
  | null;

export default function Career() {
  const { store } = useWorld();
  const data = useCareer();
  const [editing, setEditing] = useState<Editing>(null);
  const open = (data?.steps ?? []).filter((t) => !t.done_at);
  const inPlay = (data?.applications ?? []).filter((a) => ["applied", "interview", "offer"].includes(a.status)).length;

  async function toggleStep(t: Row<"tasks">) {
    if (!store) return;
    const done = !t.done_at;
    await store.patch("tasks", t.id, { done_at: done ? new Date().toISOString() : null });
    if (done) playSound("done");
    toast(done ? `${t.title}: done.` : `${t.title}: reopened.`, () => store.patch("tasks", t.id, { done_at: t.done_at }).then(() => undefined));
  }

  async function saveEvidence(v: Record<string, unknown>) {
    if (!store || editing?.kind !== "evidence" || !data) return;
    const { skill_ids, ...rest } = v as { skill_ids: string[] } & Record<string, unknown>;
    const e = await store.put("evidence", { ...editing.row, ...rest, skill_ids: undefined } as never);
    // Keep the evidence to skill links in step with what was ticked.
    const have = data.links.filter((l) => l.evidence_id === e.id);
    for (const l of have) if (!skill_ids.includes(l.skill_id)) await store.remove("evidence_skills", l.id);
    for (const s of skill_ids) if (!have.some((l) => l.skill_id === s)) await store.put("evidence_skills", { evidence_id: e.id, skill_id: s });
    toast(`${e.title} saved.`);
  }

  return (
    <Shell title="Career" world="career" lede={data ? `Toward summer 2027: ${open.length} steps left, ${inPlay} ${inPlay === 1 ? "application" : "applications"} in play.` : undefined}
      actions={<><button className="btn" onClick={() => setEditing({ kind: "evidence", row: { kind: "project", skill_ids: [] } })} data-testid="add-evidence">Add evidence</button>
        <button className="btn btn-primary" onClick={() => setEditing({ kind: "application", row: { status: "researching" } })} data-testid="add-application">Add an application</button></>}>

      <div className="world-grid two">
        <section className="panel" aria-labelledby="steps-h">
          <div className="section-head"><h2 id="steps-h" className="panel-title">Next steps</h2><button className="btn btn-small" onClick={() => setEditing({ kind: "step", row: { priority: "medium", area: "career" } })}>Add a step</button></div>
          <ul className="list" data-testid="career-steps">
            {(data?.steps ?? []).map((t) => {
              const src = data!.resourceOf(t.resource_id);
              return (
                <li key={t.id} className="deadline" data-status={t.done_at ? "done" : "open"}>
                  <button className="check" aria-pressed={!!t.done_at} aria-label={t.done_at ? `Reopen ${t.title}` : `Mark ${t.title} done`} onClick={() => toggleStep(t)}><Check size={16} weight="bold" aria-hidden="true" /></button>
                  <div className="row-btn step-row">
                    <button className="linkless" onClick={() => setEditing({ kind: "step", row: t })}>
                      <span className="row-main">{t.title}</span>
                      {t.notes && <span className="row-sub">{t.notes}</span>}
                    </button>
                    {src && <a className="source" href={src.url} target="_blank" rel="noreferrer">{src.publisher} <ArrowUpRight size={14} aria-hidden="true" /></a>}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="panel" aria-labelledby="map-h">
          <div className="section-head"><h2 id="map-h" className="panel-title">The two year map</h2><button className="btn btn-small" onClick={() => setEditing({ kind: "plan", row: {} })}>Add an option</button></div>
          <p className="hint" style={{ marginBottom: 12 }}>Your own odds for each option, term by term. Change them as things firm up.</p>
          <div className="terms">
            {(data?.terms ?? []).map((t) => {
              const total = t.options.reduce((n, o) => n + (o.probability ?? 0), 0);
              return (
                <div key={t.label} className="term-plan">
                  <div className="term-plan-head"><span className="row-main">{t.label}</span>{total > 0 && <span className={`mono ${total !== 100 ? "hint" : ""}`}>{total}%</span>}</div>
                  <div className="odds">
                    {t.options.map((o) => (
                      <button key={o.id} className="odd" onClick={() => setEditing({ kind: "plan", row: o })} style={{ ["--p" as string]: `${o.probability ?? 0}%` }}>
                        <span>{o.option}</span><span className="mono">{o.probability != null ? `${o.probability}%` : "set odds"}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <h2 className="band-title">Applications</h2>
      <div className="board" data-testid="application-board">
        {APP_COLUMNS.map((c) => {
          const list = (data?.applications ?? []).filter((a) => c.statuses.includes(a.status));
          return (
            <section key={c.id} className="board-col" aria-label={c.name}>
              <div className="board-col-head"><span>{c.name}</span><span className="mono">{list.length}</span></div>
              {list.map((a) => (
                <button key={a.id} className="card" onClick={() => setEditing({ kind: "application", row: a })}>
                  <span className="card-title">{a.role}</span>
                  <span className="card-meta">{a.organization}{a.season ? `, ${a.season}` : ""}</span>
                  {a.next_step && <span className="card-meta">Next: {a.next_step}{a.next_step_on ? `, ${dayLabel(a.next_step_on, data!.today)}` : ""}</span>}
                </button>
              ))}
              {!list.length && <p className="hint" style={{ padding: "4px 6px" }}>None.</p>}
            </section>
          );
        })}
      </div>

      <div className="world-grid two" style={{ marginTop: 28 }}>
        <section className="panel" aria-labelledby="ev-h">
          <div className="section-head"><h2 id="ev-h" className="panel-title">Evidence</h2><button className="btn btn-small" onClick={() => setEditing({ kind: "skill" })}>Add a skill</button></div>
          <ul className="list" data-testid="evidence-list">
            {(data?.evidence ?? []).map((e) => (
              <li key={e.id}><button className="row-btn" onClick={() => setEditing({ kind: "evidence", row: { ...e, skill_ids: e.skills.map((s) => s.id) } })}>
                <span className="row-main">{e.title}</span>
                <span className="row-sub">{e.skills.length ? e.skills.map((s) => s.name).join(", ") : e.kind}{e.occurred_on ? `, ${dayLabel(e.occurred_on, data!.today)}` : ""}</span>
              </button></li>
            ))}
            {data && !data.evidence.length && <li className="empty">Projects, courses and shifts that prove a skill. Each can back a story.</li>}
          </ul>
          {data && data.skills.length > 0 && <div className="chips" style={{ marginTop: 12 }}>{data.skills.map((s) => <span key={s.id} className="chip">{s.name}</span>)}</div>}
        </section>

        <section className="panel" aria-labelledby="st-h">
          <div className="section-head"><h2 id="st-h" className="panel-title">Stories</h2><button className="btn btn-small" onClick={() => setEditing({ kind: "story", row: { evidence_ids: [] } })}>Add a story</button></div>
          <ul className="list">
            {(data?.stories ?? []).map((s) => (
              <li key={s.id}><button className="row-btn" onClick={() => setEditing({ kind: "story", row: s })}>
                <span className="row-main">{s.title}</span>
                <span className="row-sub">{s.result ? `Result: ${s.result}` : "Situation, action, result, lesson"}</span>
              </button></li>
            ))}
            {data && !data.stories.length && <li className="empty">Interview answers built from your evidence: what happened, what you did, what changed.</li>}
          </ul>
        </section>
      </div>

      <section className="panel" aria-labelledby="src-h" style={{ marginTop: 14 }}>
        <h2 id="src-h" className="panel-title">Sources</h2>
        <ul className="sources">
          {(data?.sources ?? []).map((r) => (
            <li key={r.id}>
              <a href={r.url} target="_blank" rel="noreferrer" className="source-card">
                <span className="row-main">{r.title} <ArrowUpRight size={14} aria-hidden="true" /></span>
                <span className="row-sub">{r.publisher}</span>
                {r.summary && <span className="source-sum">{r.summary}</span>}
              </a>
            </li>
          ))}
        </ul>
      </section>

      {editing?.kind === "application" && store && (
        <EditSheet title={editing.row.id ? "Edit application" : "Add an application"} spec={applicationSpec()} row={editing.row as Record<string, unknown>}
          onSave={async (v) => { const r = await store.put("applications", { ...editing.row, ...v } as never); toast(`${r.role} at ${r.organization} saved.`); }}
          onDelete={editing.row.id ? () => removeWithUndo(store as never, "applications", editing.row.id!, editing.row.role ?? "Application") : undefined}
          onClose={() => setEditing(null)} />
      )}
      {editing?.kind === "evidence" && store && data && (
        <EditSheet title={editing.row.id ? "Edit evidence" : "Add evidence"} spec={evidenceSpec(data.projects, data.skills)} row={editing.row as Record<string, unknown>}
          onSave={saveEvidence}
          onDelete={editing.row.id ? () => removeWithUndo(store as never, "evidence", editing.row.id!, editing.row.title ?? "Evidence") : undefined}
          onClose={() => setEditing(null)} />
      )}
      {editing?.kind === "story" && store && data && (
        <EditSheet title={editing.row.id ? "Edit story" : "Add a story"} spec={storySpec(data.evidence)} row={editing.row as Record<string, unknown>}
          onSave={async (v) => { const r = await store.put("stories", { ...editing.row, ...v } as never); toast(`${r.title} saved.`); }}
          onDelete={editing.row.id ? () => removeWithUndo(store as never, "stories", editing.row.id!, editing.row.title ?? "Story") : undefined}
          onClose={() => setEditing(null)} />
      )}
      {editing?.kind === "step" && store && (
        <EditSheet title={editing.row.id ? "Edit step" : "Add a step"} spec={stepSpec()} row={editing.row as Record<string, unknown>}
          onSave={async (v) => { const r = await store.put("tasks", { ...editing.row, ...v, area: "career" } as never); toast(`${r.title} saved.`); }}
          onDelete={editing.row.id ? () => removeWithUndo(store as never, "tasks", editing.row.id!, editing.row.title ?? "Step") : undefined}
          onClose={() => setEditing(null)} />
      )}
      {editing?.kind === "plan" && store && (
        <EditSheet title={editing.row.id ? "Edit option" : "Add an option"} spec={planSpec()} row={editing.row as Record<string, unknown>}
          onSave={async (v) => { const p = v.probability == null ? null : Math.max(0, Math.min(100, Math.round(Number(v.probability)))); await store.put("term_plans", { ...editing.row, ...v, probability: p } as never); toast("Map updated."); }}
          onDelete={editing.row.id ? () => removeWithUndo(store as never, "term_plans", editing.row.id!, editing.row.option ?? "Option") : undefined}
          onClose={() => setEditing(null)} />
      )}
      {editing?.kind === "skill" && store && (
        <EditSheet title="Add a skill" spec={[{ name: "name", label: "Skill", type: "text", required: true, placeholder: "Process simulation" }, { name: "notes", label: "Notes", type: "textarea" }]} row={{}}
          onSave={async (v) => { const r = await store.put("skills", v as never); toast(`${r.name} added.`); }}
          onClose={() => setEditing(null)} />
      )}
    </Shell>
  );
}
