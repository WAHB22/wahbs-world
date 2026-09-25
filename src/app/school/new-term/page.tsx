"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useWorld } from "@/data/runtime";
import { toast } from "@/ui/kit/toast";
import { Shell } from "@/ui/Shell";
import { useSchool } from "@/worlds/school/data";
import { DAYS } from "@/worlds/school/specs";

type CourseDraft = { key: number; code: string; name: string; professor: string; language: "en" | "fr" };
type BlockDraft = { key: number; course: number; kind: "lecture" | "tutorial" | "lab" | "discussion"; weekday: number; starts_at: string; ends_at: string; location: string };

let k = 0;
const newCourse = (): CourseDraft => ({ key: ++k, code: "", name: "", professor: "", language: "en" });

/**
 * A new term in a few minutes: name and dates, the courses, their weekly times, then one tap
 * archives the old term (nothing is deleted) and makes the new one current.
 */
export default function NewTerm() {
  const { store } = useWorld();
  const school = useSchool();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [term, setTerm] = useState({ name: "", starts_on: "", ends_on: "", break_name: "Reading week", break_start: "", break_end: "" });
  const [courses, setCourses] = useState<CourseDraft[]>([newCourse()]);
  const [blocks, setBlocks] = useState<BlockDraft[]>([]);
  const [carry, setCarry] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const validCourses = courses.filter((c) => c.code.trim() && c.name.trim());
  const routine = (school?.blocks ?? []).filter((b) => ["shift", "gym", "study"].includes(b.kind));

  function next() {
    setError(null);
    if (step === 1 && (!term.name.trim() || !term.starts_on || !term.ends_on)) return setError("Give the term a name, a first day and a last day.");
    if (step === 1 && term.ends_on < term.starts_on) return setError("The last day comes before the first day.");
    if (step === 2 && !validCourses.length) return setError("Add at least one course with a code and a name.");
    if (step === 3 && blocks.some((b) => !b.starts_at || !b.ends_at || b.ends_at <= b.starts_at)) return setError("Every time block needs a start before its end.");
    setStep(step + 1);
  }

  async function start() {
    if (!store || busy) return;
    setBusy(true);
    try {
      const old = school?.term;
      if (old) await store.patch("terms", old.id, { status: "archived" });
      const t = await store.put("terms", { name: term.name.trim(), starts_on: term.starts_on, ends_on: term.ends_on, kind: "study", status: "current" });
      if (term.break_start && term.break_end) await store.put("term_breaks", { term_id: t.id, name: term.break_name.trim() || "Break", starts_on: term.break_start, ends_on: term.break_end });
      const ids = new Map<number, string>();
      for (const c of validCourses) {
        const row = await store.put("courses", { term_id: t.id, code: c.code.trim().toUpperCase(), name: c.name.trim(), professor: c.professor.trim() || null, language: c.language });
        ids.set(c.key, row.id);
      }
      for (const b of blocks) {
        const code = validCourses.find((c) => c.key === b.course)?.code.trim().toUpperCase() ?? "";
        await store.put("schedule_blocks", { term_id: t.id, course_id: ids.get(b.course) ?? null, kind: b.kind, title: `${code} ${b.kind}`.trim(), weekday: b.weekday, starts_at: b.starts_at, ends_at: b.ends_at, location: b.location.trim() || null });
      }
      if (carry) for (const r of routine) await store.put("schedule_blocks", { term_id: t.id, kind: r.kind, title: r.title, weekday: r.weekday, starts_at: r.starts_at, ends_at: r.ends_at, location: r.location });
      toast(`${t.name} started. ${old ? `${old.name} is archived.` : ""}`);
      router.push("/school");
    } catch (e) {
      setError(e instanceof Error ? e.message.split("\n")[0] : "Could not start the term.");
      setBusy(false);
    }
  }

  const setC = (key: number, patch: Partial<CourseDraft>) => setCourses((cs) => cs.map((c) => (c.key === key ? { ...c, ...patch } : c)));
  const setB = (key: number, patch: Partial<BlockDraft>) => setBlocks((bs) => bs.map((b) => (b.key === key ? { ...b, ...patch } : b)));

  return (
    <Shell title="New term" accent="coolant">
      <ol className="steps" aria-label="Steps">
        {["Term", "Courses", "Weekly times", "Start"].map((s, i) => (
          <li key={s} aria-current={step === i + 1 ? "step" : undefined} data-done={step > i + 1 || undefined}>{s}</li>
        ))}
      </ol>

      <section className="glass pane wizard">
        {step === 1 && (
          <div className="edit-fields">
            <div className="field wide"><label htmlFor="tn">Term name</label><input id="tn" value={term.name} onChange={(e) => setTerm({ ...term, name: e.target.value })} placeholder="Winter 2027" /></div>
            <div className="field"><label htmlFor="ts">First day</label><input id="ts" type="date" value={term.starts_on} onChange={(e) => setTerm({ ...term, starts_on: e.target.value })} /></div>
            <div className="field"><label htmlFor="te">Last day</label><input id="te" type="date" value={term.ends_on} onChange={(e) => setTerm({ ...term, ends_on: e.target.value })} /></div>
            <div className="field"><label htmlFor="bn">Break (optional)</label><input id="bn" value={term.break_name} onChange={(e) => setTerm({ ...term, break_name: e.target.value })} /></div>
            <div className="field"><label htmlFor="bs">Break starts</label><input id="bs" type="date" value={term.break_start} onChange={(e) => setTerm({ ...term, break_start: e.target.value })} /></div>
            <div className="field"><label htmlFor="be">Break ends</label><input id="be" type="date" value={term.break_end} onChange={(e) => setTerm({ ...term, break_end: e.target.value })} /></div>
            <p className="hint wide">{school?.term ? `${school.term.name} will be archived, not deleted: its courses and grades stay in your history.` : "This becomes your current term."}</p>
          </div>
        )}

        {step === 2 && (
          <div className="draft-list">
            {courses.map((c, i) => (
              <div key={c.key} className="draft-row">
                <div className="field"><label htmlFor={`cc${c.key}`}>Code</label><input id={`cc${c.key}`} value={c.code} onChange={(e) => setC(c.key, { code: e.target.value })} placeholder="CHG 4250" /></div>
                <div className="field grow"><label htmlFor={`cn${c.key}`}>Name</label><input id={`cn${c.key}`} value={c.name} onChange={(e) => setC(c.key, { name: e.target.value })} /></div>
                <div className="field"><label htmlFor={`cp${c.key}`}>Professor</label><input id={`cp${c.key}`} value={c.professor} onChange={(e) => setC(c.key, { professor: e.target.value })} /></div>
                <div className="field"><label htmlFor={`cl${c.key}`}>Taught in</label>
                  <select id={`cl${c.key}`} value={c.language} onChange={(e) => setC(c.key, { language: e.target.value as "en" | "fr" })}><option value="en">English</option><option value="fr">French</option></select></div>
                {courses.length > 1 && <button className="btn btn-small" aria-label={`Remove course ${i + 1}`} onClick={() => setCourses(courses.filter((x) => x.key !== c.key))}>Remove</button>}
              </div>
            ))}
            <button className="btn" onClick={() => setCourses([...courses, newCourse()])}>Add another course</button>
          </div>
        )}

        {step === 3 && (
          <div className="draft-list">
            {blocks.map((b) => (
              <div key={b.key} className="draft-row">
                <div className="field"><label htmlFor={`bc${b.key}`}>Course</label>
                  <select id={`bc${b.key}`} value={b.course} onChange={(e) => setB(b.key, { course: Number(e.target.value) })}>{validCourses.map((c) => <option key={c.key} value={c.key}>{c.code}</option>)}</select></div>
                <div className="field"><label htmlFor={`bk${b.key}`}>Kind</label>
                  <select id={`bk${b.key}`} value={b.kind} onChange={(e) => setB(b.key, { kind: e.target.value as BlockDraft["kind"] })}>{["lecture", "tutorial", "lab", "discussion"].map((x) => <option key={x} value={x}>{x[0].toUpperCase() + x.slice(1)}</option>)}</select></div>
                <div className="field"><label htmlFor={`bd${b.key}`}>Day</label>
                  <select id={`bd${b.key}`} value={b.weekday} onChange={(e) => setB(b.key, { weekday: Number(e.target.value) })}>{DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></div>
                <div className="field"><label htmlFor={`bs${b.key}`}>Starts</label><input id={`bs${b.key}`} type="time" value={b.starts_at} onChange={(e) => setB(b.key, { starts_at: e.target.value })} /></div>
                <div className="field"><label htmlFor={`be${b.key}`}>Ends</label><input id={`be${b.key}`} type="time" value={b.ends_at} onChange={(e) => setB(b.key, { ends_at: e.target.value })} /></div>
                <div className="field"><label htmlFor={`br${b.key}`}>Room</label><input id={`br${b.key}`} value={b.location} onChange={(e) => setB(b.key, { location: e.target.value })} /></div>
                <button className="btn btn-small" onClick={() => setBlocks(blocks.filter((x) => x.key !== b.key))}>Remove</button>
              </div>
            ))}
            <button className="btn" onClick={() => setBlocks([...blocks, { key: ++k, course: validCourses[0]?.key ?? 0, kind: "lecture", weekday: 1, starts_at: "", ends_at: "", location: "" }])}>Add a class time</button>
            {routine.length > 0 && (
              <label className="tappable check-row">
                <input type="checkbox" checked={carry} onChange={(e) => setCarry(e.target.checked)} />
                <span>Keep my {routine.length} routine blocks (shifts, gym, study) in the new term</span>
              </label>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="review">
            <p className="big-line">{term.name}: {term.starts_on} to {term.ends_on}</p>
            <p className="soft">{validCourses.length} {validCourses.length === 1 ? "course" : "courses"}, {blocks.length} class {blocks.length === 1 ? "time" : "times"}{carry && routine.length ? `, ${routine.length} routine blocks kept` : ""}.</p>
            <ul className="coming-list">{validCourses.map((c) => <li key={c.key} lang={c.language}>{c.code.toUpperCase()} {c.name}</li>)}</ul>
          </div>
        )}

        {error && <p className="warn" role="alert">{error}</p>}
        <div className="row-actions wizard-actions">
          {step > 1 ? <button className="btn" onClick={() => setStep(step - 1)}>Back</button> : <Link className="btn" href="/school">Cancel</Link>}
          {step < 4 ? <button className="btn btn-primary" onClick={next} data-testid="wizard-next">Next</button>
            : <button className="btn btn-primary" onClick={start} disabled={busy} data-testid="wizard-start">Start {term.name || "the term"}</button>}
        </div>
      </section>
    </Shell>
  );
}
