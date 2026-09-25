"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { localDay } from "@/data/dates";
import { useWorld } from "@/data/runtime";
import type { Row } from "@/data/schema";
import { addDays, weekStart } from "@/worlds/useWorldStatus";

export const STAGES: { id: Row<"projects">["stage"]; name: string }[] = [
  { id: "idea", name: "Idea" }, { id: "exploring", name: "Exploring" }, { id: "planning", name: "Planning" },
  { id: "building", name: "Building" }, { id: "shipping", name: "Shipping" }, { id: "done", name: "Done" },
  { id: "paused", name: "Paused" }, { id: "dropped", name: "Dropped" },
];
export const TYPES = ["engineering", "business", "school", "creative", "personal", "experiment", "idea"] as const;
export const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export type Fit = { need: number; have: number; weeks: number };
export type ProjectView = Row<"projects"> & {
  tasks: Row<"project_tasks">[]; done: number; total: number; minutesWeek: number; minutesAll: number;
  remaining: number; next: Row<"project_tasks"> | null; fit: Fit | null; course: string | null;
};

function view(p: Row<"projects">, tasks: Row<"project_tasks">[], sessions: Row<"project_sessions">[], today: string, courseCode: Map<string, string>): ProjectView {
  const mine = tasks.filter((t) => t.project_id === p.id);
  const open = mine.filter((t) => t.status !== "done");
  const ws = weekStart(today);
  const s = sessions.filter((x) => x.project_id === p.id);
  const remaining = open.reduce((n, t) => n + (t.estimate_hours ?? 0), 0);
  // Does the work fit? Remaining estimated hours against the weekly hours given, until the deadline.
  let fit: Fit | null = null;
  if (p.deadline && p.weekly_hours && p.deadline >= today) {
    const weeks = Math.max(1, Math.ceil((Date.parse(p.deadline) - Date.parse(today)) / (7 * 86_400_000)));
    fit = { need: remaining, have: weeks * p.weekly_hours, weeks };
  }
  const next = open.filter((t) => t.due_on).sort((a, b) => a.due_on!.localeCompare(b.due_on!))[0] ?? open[0] ?? null;
  return {
    ...p, tasks: mine, done: mine.length - open.length, total: mine.length,
    minutesWeek: s.filter((x) => localDay(new Date(x.started_at)) >= ws).reduce((n, x) => n + x.minutes, 0),
    minutesAll: s.reduce((n, x) => n + x.minutes, 0), remaining, next, fit, course: p.course_id ? courseCode.get(p.course_id) ?? null : null,
  };
}

export function useProjects() {
  const { store } = useWorld();
  return useLiveQuery(async () => {
    if (!store) return undefined;
    const today = localDay();
    const [projects, tasks, sessions, courses] = await Promise.all([store.all("projects"), store.all("project_tasks"), store.all("project_sessions"), store.all("courses")]);
    const code = new Map(courses.map((c) => [c.id, c.code]));
    const views = projects.map((p) => view(p, tasks, sessions, today, code));
    const open = tasks.filter((t) => t.status !== "done");
    const dueSoon = open.filter((t) => t.due_on && t.due_on >= today && t.due_on <= addDays(today, 7)).length;
    return { today, projects: views, courses, openTasks: open.length, dueSoon, minutesWeek: views.reduce((n, v) => n + v.minutesWeek, 0) };
  }, [store]);
}

export function useProject(id: string | null) {
  const { store } = useWorld();
  return useLiveQuery(async () => {
    if (!store || !id) return undefined;
    const today = localDay();
    const [p, tasks, sessions, logs, courses] = await Promise.all([store.get("projects", id), store.all("project_tasks"), store.all("project_sessions"), store.all("project_logs"), store.all("courses")]);
    if (!p || p.deleted_at) return { today, project: null };
    const code = new Map(courses.map((c) => [c.id, c.code]));
    return {
      today, courses,
      project: view(p, tasks, sessions, today, code),
      sessions: sessions.filter((s) => s.project_id === id).sort((a, b) => b.started_at.localeCompare(a.started_at)),
      logs: logs.filter((l) => l.project_id === id).sort((a, b) => b.occurred_on.localeCompare(a.occurred_on) || b.created_at.localeCompare(a.created_at)),
    };
  }, [store, id]);
}

export const hoursLabel = (m: number) => { const h = m / 60; return `${Math.round(h * 10) / 10} h`; };
