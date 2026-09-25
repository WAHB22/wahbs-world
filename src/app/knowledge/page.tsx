"use client";

import { ArrowUpRight } from "@phosphor-icons/react";
import { useState } from "react";
import { dayLabel } from "@/data/dates";
import { useWorld } from "@/data/runtime";
import type { Row } from "@/data/schema";
import { playSound } from "@/living/sound";
import type { FieldSpec } from "@/ui/kit/EditSheet";
import { EditSheet } from "@/ui/kit/EditSheet";
import { removeWithUndo, toast } from "@/ui/kit/toast";
import { Shell } from "@/ui/Shell";
import { addDays } from "@/worlds/useWorldStatus";
import { useKnowledge, type EntryView } from "@/worlds/knowledge/data";
import { schedule, type Grade } from "@/worlds/knowledge/review";

function entrySpec(others: EntryView[], courses: Row<"courses">[]): FieldSpec[] {
  return [
    { name: "topic", label: "Topic", type: "text", required: true, placeholder: "Le Chatelier's principle" },
    { name: "learned", label: "What you learned", type: "textarea" },
    { name: "source_title", label: "Source", type: "text", placeholder: "Fogler, Elements of Chemical Reaction Engineering, ch. 4" },
    { name: "source_url", label: "Link to the source", type: "url", required: true, placeholder: "https://" },
    { name: "why_it_matters", label: "Why it matters", type: "textarea" },
    { name: "questions", label: "Questions it leaves", type: "textarea" },
    { name: "course_id", label: "Course", type: "select", options: courses.map((c) => ({ value: c.id, label: c.code })) },
    { name: "changed_mind", label: "This changed my mind", type: "checkbox" },
    { name: "rabbit_hole", label: "A rabbit hole worth going back to", type: "checkbox" },
    { name: "link_ids", label: "Connects to", type: "multi", options: others.map((o) => ({ value: o.id, label: o.topic })) },
  ];
}

const FILTERS = [{ id: "all", name: "All" }, { id: "changed", name: "Changed my mind" }, { id: "rabbit", name: "Rabbit holes" }] as const;

export default function Knowledge() {
  const { store } = useWorld();
  const data = useKnowledge();
  const [editing, setEditing] = useState<(Partial<EntryView> & { link_ids?: string[] }) | null>(null);
  const [shown, setShown] = useState(false);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const card = data?.due[0];
  const topic = new Map((data?.entries ?? []).map((e) => [e.id, e.topic]));
  const list = (data?.entries ?? []).filter((e) => filter === "all" || (filter === "changed" ? e.changed_mind : e.rabbit_hole));

  async function grade(g: Grade) {
    if (!store || !card || !data) return;
    const next = schedule(card.interval_days, card.ease, g);
    await store.patch("knowledge_entries", card.id, { interval_days: next.interval, ease: next.ease, review_on: addDays(data.today, next.interval) });
    setShown(false);
    playSound(g === "again" ? "tick" : "check");
  }

  async function save(v: Record<string, unknown>) {
    if (!store || !editing || !data) return;
    const { link_ids, ...rest } = v as { link_ids: string[] } & Record<string, unknown>;
    const isNew = !editing.id;
    const e = await store.put("knowledge_entries", { ...editing, ...rest, links: undefined, link_ids: undefined, ...(isNew ? { review_on: addDays(data.today, 1), interval_days: 1, ease: 2.5 } : {}) } as never);
    const have = data.links.filter((l) => l.from_id === e.id || l.to_id === e.id);
    for (const l of have) { const other = l.from_id === e.id ? l.to_id : l.from_id; if (!link_ids.includes(other)) await store.remove("knowledge_links", l.id); }
    for (const o of link_ids) if (!have.some((l) => l.from_id === o || l.to_id === o)) await store.put("knowledge_links", { from_id: e.id, to_id: o });
    toast(isNew ? `${e.topic} kept. First review tomorrow.` : `${e.topic} saved.`);
  }

  return (
    <Shell title="Knowledge" world="knowledge" lede={data ? `${data.entries.length} ${data.entries.length === 1 ? "topic" : "topics"} kept, each with its source.` : undefined}
      actions={<button className="btn btn-primary" data-testid="add-topic" onClick={() => setEditing({ interval_days: 1, ease: 2.5, link_ids: [] })}>Add what you learned</button>}>
      <section className="hero-figures" aria-label="Review">
        <div className="figure-block figure-main review-card" data-testid="review-card">
          <span className="figure-label">{data ? (data.due.length ? `${data.due.length} to review today` : "Review") : ""}</span>
          {card ? (
            <>
              <span className="review-topic">{card.topic}</span>
              {shown ? (
                <div className="review-answer">
                  {card.learned && <p>{card.learned}</p>}
                  {card.why_it_matters && <p className="figure-note">Why it matters: {card.why_it_matters}</p>}
                  <div className="row-actions grades">
                    <button className="btn btn-small" onClick={() => grade("again")}>Forgot</button>
                    <button className="btn btn-small" onClick={() => grade("hard")}>Hard</button>
                    <button className="btn btn-small btn-accent" onClick={() => grade("good")} data-testid="grade-good">Got it</button>
                    <button className="btn btn-small" onClick={() => grade("easy")}>Easy</button>
                  </div>
                </div>
              ) : (
                <div className="row-actions"><button className="btn btn-accent" onClick={() => setShown(true)} data-testid="show-answer">Recall it, then show</button></div>
              )}
            </>
          ) : <span className="review-topic">{data?.entries.length ? "All caught up." : "Nothing to review yet."}</span>}
        </div>
        <div className="figure-block">
          <span className="figure-label">Changed your mind</span>
          <span className="figure-lg">{(data?.entries ?? []).filter((e) => e.changed_mind).length}</span>
          <span className="figure-note">{(data?.entries ?? []).filter((e) => e.rabbit_hole).length} rabbit holes to go back to</span>
        </div>
      </section>

      <div className="section-head" style={{ marginTop: 28 }}>
        <h2 className="band-title" style={{ margin: 0 }}>Everything you kept</h2>
        <div className="tabs" role="tablist" aria-label="Show">
          {FILTERS.map((f) => <button key={f.id} role="tab" aria-selected={filter === f.id} onClick={() => setFilter(f.id)}>{f.name}</button>)}
        </div>
      </div>
      <ul className="topic-grid" data-testid="topic-list">
        {list.map((e) => (
          <li key={e.id} className="card topic-card">
            <button className="linkless" onClick={() => setEditing({ ...e, link_ids: e.links })}>
              <span className="card-title">{e.topic}</span>
              {e.learned && <span className="topic-learned">{e.learned}</span>}
              <span className="card-meta">
                {e.changed_mind && <span className="chip hot">Changed my mind</span>}
                {e.rabbit_hole && <span className="chip">Rabbit hole</span>}
                <span>Review {e.review_on ? dayLabel(e.review_on, data!.today) : "today"}</span>
                {e.links.length > 0 && <span>Connects to {e.links.map((l) => topic.get(l)).filter(Boolean).join(", ")}</span>}
              </span>
            </button>
            <a className="source" href={e.source_url} target="_blank" rel="noreferrer">{e.source_title || new URL(e.source_url).hostname} <ArrowUpRight size={14} aria-hidden="true" /></a>
          </li>
        ))}
        {data && !list.length && <li className="empty">{filter === "all" ? "Keep what you learn with its source; it comes back for review before you forget it." : "Nothing marked this way yet."}</li>}
      </ul>

      {editing && store && data && (
        <EditSheet title={editing.id ? "Edit topic" : "Add what you learned"} spec={entrySpec(data.entries.filter((o) => o.id !== editing.id), data.courses)} row={editing as Record<string, unknown>}
          onSave={save}
          onDelete={editing.id ? () => removeWithUndo(store as never, "knowledge_entries", editing.id!, editing.topic ?? "Topic") : undefined}
          onClose={() => setEditing(null)} />
      )}
    </Shell>
  );
}
