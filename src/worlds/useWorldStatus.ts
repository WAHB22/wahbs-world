"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { dayLabel, localDay } from "@/data/dates";
import { useWorld } from "@/data/runtime";
import type { WorldSlug } from "./registry";

function weekStart(today: string, startsOn = 1): string {
  const [y, m, d] = today.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const back = (date.getDay() - startsOn + 7) % 7;
  date.setDate(date.getDate() - back);
  return localDay(date);
}

function addDays(day: string, n: number): string {
  const [y, m, d] = day.split("-").map(Number);
  return localDay(new Date(y, m - 1, d + n));
}

/** One honest line per world for the landing panes, computed from real data. */
export function useWorldStatus(): Partial<Record<WorldSlug, string>> {
  const { store } = useWorld();
  return (
    useLiveQuery(async () => {
      if (!store) return {};
      const today = localDay();
      const soon = addDays(today, 3);
      const week = weekStart(today);
      const [assessments, tasks, checkins, blocks, ptasks, knowledge] = await Promise.all([
        store.all("assessments"),
        store.all("tasks"),
        store.all("checkins"),
        store.all("schedule_blocks"),
        store.all("project_tasks"),
        store.all("knowledge_entries"),
      ]);
      const open = assessments.filter((a) => a.status === "open" && a.due_on && a.due_on >= today).sort((a, b) => a.due_on!.localeCompare(b.due_on!));
      const urgent = open.filter((a) => a.due_on! <= soon).length + tasks.filter((t) => !t.done_at && t.due_on && t.due_on <= today).length;
      const thisWeek = checkins.filter((c) => c.local_day >= week);
      const spent = thisWeek.filter((c) => c.kind === "spent").reduce((n, c) => n + Number((c.payload as { cents?: number }).cents ?? 0), 0);
      const gym = thisWeek.filter((c) => c.kind === "gym_done").length;
      const moments = checkins.filter((c) => c.kind === "moment").sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));
      const wd = new Date().getDay();
      const nextShift = [...blocks]
        .filter((b) => b.kind === "shift")
        .map((b) => ({ b, ahead: (b.weekday - wd + 7) % 7 }))
        .sort((a, b) => a.ahead - b.ahead || a.b.starts_at.localeCompare(b.b.starts_at))[0];
      const nextPt = ptasks.filter((t) => t.status !== "done" && t.due_on && t.due_on >= today).sort((a, b) => a.due_on!.localeCompare(b.due_on!))[0];
      const careerOpen = tasks.filter((t) => t.area === "career" && !t.done_at).length;
      const next = open[0];
      const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      return {
        today: urgent ? `${urgent} ${urgent === 1 ? "thing needs" : "things need"} you` : "Clear for now",
        school: next ? `${next.title}, ${dayLabel(next.due_on!, today)}` : "Nothing due",
        work: nextShift ? `Next shift ${nextShift.ahead === 0 ? "today" : dayName[nextShift.b.weekday]}, ${nextShift.b.starts_at.slice(0, 5)}` : "No shifts planned",
        money: spent ? `${(spent / 100).toFixed(2)} dollars spent this week` : "Nothing spent this week",
        projects: nextPt ? `Next: ${nextPt.title.split(":")[0]}, ${dayLabel(nextPt.due_on!, today)}` : "No task dates",
        career: careerOpen ? `${careerOpen} steps toward summer 2027` : "Summer 2027 plan",
        knowledge: knowledge.length ? `${knowledge.length} topics` : "Your first topic waits",
        training: gym ? `${gym} ${gym === 1 ? "session" : "sessions"} this week` : "No session yet this week",
        life: moments[0] ? `Last moment ${dayLabel(moments[0].local_day, today)}` : "No moments yet",
      } satisfies Record<WorldSlug, string>;
    }, [store]) ?? {}
  );
}

export { weekStart, addDays };
