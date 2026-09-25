"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { localDay } from "@/data/dates";
import { useWorld } from "@/data/runtime";
import type { Row } from "@/data/schema";

export const APP_COLUMNS: { id: string; name: string; statuses: Row<"applications">["status"][] }[] = [
  { id: "researching", name: "Researching", statuses: ["researching"] },
  { id: "applied", name: "Applied", statuses: ["applied"] },
  { id: "interview", name: "Interview", statuses: ["interview"] },
  { id: "offer", name: "Offer", statuses: ["offer"] },
  { id: "closed", name: "Closed", statuses: ["rejected", "withdrawn"] },
];

export function useCareer() {
  const { store } = useWorld();
  return useLiveQuery(async () => {
    if (!store) return undefined;
    const [tasks, resources, applications, evidence, skills, links, stories, plans, projects] = await Promise.all([
      store.all("tasks"), store.all("resources"), store.all("applications"), store.all("evidence"), store.all("skills"),
      store.all("evidence_skills"), store.all("stories"), store.all("term_plans"), store.all("projects"),
    ]);
    const res = new Map(resources.map((r) => [r.id, r]));
    const steps = tasks.filter((t) => t.area === "career").sort((a, b) => (a.done_at ? 1 : 0) - (b.done_at ? 1 : 0) || (a.priority === "high" ? 0 : 1) - (b.priority === "high" ? 0 : 1));
    const skillName = new Map(skills.map((s) => [s.id, s.name]));
    const evidenceViews = evidence.map((e) => ({ ...e, skills: links.filter((l) => l.evidence_id === e.id).map((l) => ({ link: l.id, id: l.skill_id, name: skillName.get(l.skill_id) ?? "" })) }))
      .sort((a, b) => (b.occurred_on ?? "").localeCompare(a.occurred_on ?? ""));
    const termOrder = (label: string) => { const [season, year] = label.split(" "); return Number(year) * 10 + (["Winter", "Summer", "Fall"].indexOf(season) + 1); };
    const terms = [...new Set(plans.map((p) => p.term_label))].sort((a, b) => termOrder(a) - termOrder(b)).map((label) => ({ label, options: plans.filter((p) => p.term_label === label) }));
    return {
      today: localDay(), steps, resourceOf: (id: string | null) => (id ? res.get(id) ?? null : null),
      sources: resources.filter((r) => r.area === "career"), applications, evidence: evidenceViews, skills: skills.sort((a, b) => a.name.localeCompare(b.name)),
      links, stories, terms, projects,
    };
  }, [store]);
}
