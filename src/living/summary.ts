"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { localDay } from "@/data/dates";
import { useWorld } from "@/data/runtime";
import type { Row } from "@/data/schema";

export type Summary = {
  done: { id: string; label: string; on: string }[];
  hours: number; pay: number | null; spent: number; income: number;
  categories: { name: string; cents: number }[];
  sessions: number; memories: Row<"memories">[]; photos: Row<"photos">[]; learned: Row<"knowledge_entries">[]; projectMinutes: number;
  chapter: Row<"chapters"> | undefined;
};

const inRange = (day: string, from: string, to: string) => day >= from && day <= to;
const dayOf = (iso: string | null | undefined) => (iso ? localDay(new Date(iso)) : "");

/** Everything that happened between two days (inclusive), plus the chapter row that titles it. */
export function useSummary(kind: "week" | "month", from: string, to: string): Summary | undefined {
  const { store } = useWorld();
  return useLiveQuery(async () => {
    if (!store) return undefined;
    const [assessments, courses, ptasks, tasks, shifts, employers, txs, cats, sessions, memories, photos, knowledge, psessions, chapters] = await Promise.all([
      store.all("assessments"), store.all("courses"), store.all("project_tasks"), store.all("tasks"), store.all("shifts"), store.all("employers"),
      store.all("transactions"), store.all("categories"), store.all("training_sessions"), store.all("memories"), store.all("photos"),
      store.all("knowledge_entries"), store.all("project_sessions"), store.all("chapters"),
    ]);
    const code = new Map(courses.map((c) => [c.id, c.code]));
    const done = [
      ...assessments.filter((a) => a.status === "done" && inRange(dayOf(a.updated_at), from, to)).map((a) => ({ id: a.id, label: `${a.course_id ? code.get(a.course_id) + " " : ""}${a.title}`, on: dayOf(a.updated_at) })),
      ...ptasks.filter((t) => t.status === "done" && inRange(dayOf(t.done_at ?? t.updated_at), from, to)).map((t) => ({ id: t.id, label: t.title, on: dayOf(t.done_at ?? t.updated_at) })),
      ...tasks.filter((t) => t.done_at && inRange(dayOf(t.done_at), from, to)).map((t) => ({ id: t.id, label: t.title, on: dayOf(t.done_at) })),
    ].sort((a, b) => a.on.localeCompare(b.on));
    const worked = shifts.filter((s) => s.status === "worked" && inRange(dayOf(s.starts_at), from, to));
    const hours = worked.reduce((n, s) => n + Math.max(0, (Date.parse(s.ends_at) - Date.parse(s.starts_at)) / 3_600_000 - s.unpaid_break_min / 60), 0);
    const wage = new Map(employers.map((e) => [e.id, e.hourly_cents]));
    const pays = worked.map((s) => s.pay_cents ?? (s.employer_id && wage.get(s.employer_id) != null ? Math.round(((Date.parse(s.ends_at) - Date.parse(s.starts_at)) / 3_600_000 - s.unpaid_break_min / 60) * wage.get(s.employer_id)!) : null));
    const pay = pays.some((p) => p != null) ? pays.reduce<number>((n, p) => n + (p ?? 0), 0) + worked.reduce((n, s) => n + (s.tips_cents ?? 0), 0) : null;
    const t = txs.filter((x) => inRange(x.occurred_on, from, to));
    const catName = new Map(cats.map((c) => [c.id, c.name]));
    const byCat = new Map<string, number>();
    for (const x of t.filter((x) => x.direction === "out")) byCat.set(catName.get(x.category_id ?? "") ?? "Other", (byCat.get(catName.get(x.category_id ?? "") ?? "Other") ?? 0) + x.amount_cents);
    const mem = memories.filter((m) => inRange(m.occurred_on, from, to)).sort((a, b) => a.occurred_on.localeCompare(b.occurred_on));
    const memIds = new Set(mem.map((m) => m.id));
    return {
      done, hours, pay,
      spent: t.filter((x) => x.direction === "out").reduce((n, x) => n + x.amount_cents, 0),
      income: t.filter((x) => x.direction === "in").reduce((n, x) => n + x.amount_cents, 0),
      categories: [...byCat.entries()].map(([name, cents]) => ({ name, cents })).sort((a, b) => b.cents - a.cents).slice(0, 5),
      sessions: sessions.filter((s) => inRange(s.occurred_on, from, to)).length,
      memories: mem, photos: photos.filter((p) => p.memory_id && memIds.has(p.memory_id)),
      learned: knowledge.filter((k) => inRange(dayOf(k.created_at), from, to)),
      projectMinutes: psessions.filter((s) => inRange(dayOf(s.started_at), from, to)).reduce((n, s) => n + s.minutes, 0),
      chapter: chapters.find((c) => c.period_kind === kind && c.period_start === from),
    };
  }, [store, kind, from, to]);
}
