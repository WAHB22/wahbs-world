"use client";

import Link from "next/link";
import { Shell } from "@/ui/Shell";
import { worldBySlug, type WorldSlug } from "./registry";
import { useWorldStatus } from "./useWorldStatus";

const PLAN: Partial<Record<WorldSlug, string[]>> = {
  school: ["Courses as small engineering systems: a heat exchanger, a reactor whose conversion is your progress", "Deadlines arrive as lab alarms; finished work stamps the course", "Archive a term and set up the next one in a few minutes"],
  work: ["Shifts as order tickets with hours, pay and rush periods", "Steam, plates and a service bell", "Weekly hours at a glance"],
  money: ["A glass jar that fills toward each goal", "Receipts for spending, categories flowing like streams", "Transfers between your own accounts are never counted as spending"],
  projects: ["Blueprints, nodes and dependency lines", "Tasks grouped by deliverable, with the critical path", "An honest check of whether the work fits your hours"],
  career: ["Experience, evidence, skill, story, opportunity", "Applications pipeline and LinkedIn drafts", "Your two year map with your own odds"],
  knowledge: ["A constellation where topics connect", "Spaced review and the things you changed your mind about", "Every entry keeps its expert source"],
  training: ["Sessions as rings and progress arcs", "Showing up made visible, without guilt"],
  life: ["A timeline where moments accumulate", "Photos, compressed and private", "Names you type are remembered for next time"],
};

export function ComingWorld({ slug }: { slug: WorldSlug }) {
  const w = worldBySlug(slug)!;
  const status = useWorldStatus();
  return (
    <Shell title={w.name} accent={w.accent}>
      <section className="glass pane coming" aria-labelledby="coming">
        <h2 id="coming" className="pane-title">Opens in phase {w.opensIn}</h2>
        {status[slug] && <p className="big-line">{status[slug]}</p>}
        <p className="soft">What this world will hold:</p>
        <ul className="coming-list">{(PLAN[slug] ?? []).map((l) => <li key={l}>{l}</li>)}</ul>
        <p className="hint">Your data for it is already saved and syncing; this page only shows it later.</p>
        <div className="row-actions">
          <Link href="/" className="btn">Back to the world</Link>
          <Link href="/today" className="btn btn-primary">Go to Today</Link>
        </div>
      </section>
    </Shell>
  );
}
