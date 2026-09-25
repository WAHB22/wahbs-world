"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { dayLabel } from "@/data/dates";
import { useWorld } from "@/data/runtime";
import type { Row } from "@/data/schema";
import { EditSheet } from "@/ui/kit/EditSheet";
import { removeWithUndo, toast } from "@/ui/kit/toast";
import { Shell } from "@/ui/Shell";
import { KIND_LABEL, useSchool } from "@/worlds/school/data";
import { assessmentSpec, courseSpec } from "@/worlds/school/specs";

export default function CoursePage() {
  return (
    <Suspense>
      <Course />
    </Suspense>
  );
}

function Course() {
  const id = useSearchParams().get("id");
  const { store } = useWorld();
  const data = useSchool();
  const [editing, setEditing] = useState<"course" | Partial<Row<"assessments">> | null>(null);
  const c = data?.courses.find((x) => x.id === id);

  if (data && !c) {
    return (
      <Shell title="Course">
        <p className="soft">This course is not in the current term.</p>
        <p><Link href="/school">Back to School</Link></p>
      </Shell>
    );
  }

  return (
    <Shell title={c?.code ?? "Course"} accent="coolant">
      {c && (
        <>
          <p className="today-sub"><span lang={c.language}>{c.name}</span>{c.professor && <span className="soft">{c.professor}</span>}</p>
          <div className="world-grid">
            <section className="glass pane" aria-labelledby="prog">
              <h2 id="prog" className="pane-title">Progress</h2>
              <p className="figure">{Math.round(c.conversion * 100)}%</p>
              <p className="soft">of this course's weight is done{c.grade != null ? `, with an average of ${Math.round(c.grade)} on graded work` : ""}.</p>
              <div className="meter" style={{ marginTop: 12 }}><i style={{ width: `${Math.round(c.conversion * 100)}%` }} /></div>
              <div className="row-actions" style={{ marginTop: 16 }}>
                <button className="btn btn-primary" onClick={() => setEditing({ course_id: c.id, status: "open", kind: "assignment" })}>Add a deadline</button>
                <button className="btn" onClick={() => setEditing("course")}>Edit course</button>
              </div>
            </section>

            <section className="glass pane" aria-labelledby="work">
              <h2 id="work" className="pane-title">Graded work</h2>
              <ul className="list">
                {c.assessments.map((a) => (
                  <li key={a.id}>
                    <button className="row-btn" onClick={() => setEditing(a)}>
                      <span className="row-main">{a.title}</span>
                      <span className="row-sub">{KIND_LABEL[a.kind]}, {a.due_on ? dayLabel(a.due_on, data!.today) : "date not posted"}{a.status === "done" ? ", done" : ""}</span>
                      <span className="row-side">{a.weight != null ? `${a.weight}%` : ""}{a.grade != null && a.grade_out_of ? <><br /><span className="soft">{a.grade}/{a.grade_out_of}</span></> : null}</span>
                    </button>
                  </li>
                ))}
                {!c.assessments.length && <li className="empty">No graded work yet.</li>}
              </ul>
            </section>

            <section className="glass pane" aria-labelledby="topics">
              <h2 id="topics" className="pane-title">Topics</h2>
              <ol className="topics" lang={c.language}>
                {c.topics.map((t) => {
                  const covered = c.assessments.some((a) => a.status === "done" && a.covers.includes(t));
                  return <li key={t} data-covered={covered || undefined}>{t}</li>;
                })}
              </ol>
              {c.notes && <p className="soft" style={{ marginTop: 12 }}>{c.notes}</p>}
            </section>
          </div>
        </>
      )}

      {editing === "course" && c && store && (
        <EditSheet
          title="Edit course"
          spec={courseSpec()}
          row={c as unknown as Record<string, unknown>}
          onSave={async (v) => { await store.patch("courses", c.id, v as never); toast(`${c.code} updated.`); }}
          onDelete={() => removeWithUndo(store as never, "courses", c.id, c.code)}
          onClose={() => setEditing(null)}
        />
      )}
      {editing && editing !== "course" && store && data && (
        <EditSheet
          title={editing.id ? "Edit deadline" : "Add a deadline"}
          spec={assessmentSpec(data.courses)}
          row={editing as Record<string, unknown>}
          onSave={async (v) => { const r = await store.put("assessments", { ...editing, ...v } as never); toast(`${r.title} saved.`); }}
          onDelete={editing.id ? () => removeWithUndo(store as never, "assessments", editing.id!, editing.title ?? "Deadline") : undefined}
          onClose={() => setEditing(null)}
        />
      )}
    </Shell>
  );
}
