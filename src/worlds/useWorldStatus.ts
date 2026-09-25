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

export type WorldStatus = { line: string; figure: string };

const money = (c: number) => `$${(c / 100).toLocaleString("en-CA", { minimumFractionDigits: c % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
const hours = (h: number) => `${Math.round(h * 10) / 10} h`;

/** For each world, a short figure (the price on the menu) and one honest line, from real data. */
export function useWorldStatus(): Partial<Record<WorldSlug, WorldStatus>> {
  const { store } = useWorld();
  return (
    useLiveQuery(async () => {
      if (!store) return {};
      const today = localDay();
      const soon = addDays(today, 3);
      const inWeek = addDays(today, 7);
      const week = weekStart(today);
      const month = today.slice(0, 7);
      const [assessments, tasks, checkins, blocks, ptasks, knowledge, shifts, txs, sessions, memories, applications] = await Promise.all([
        store.all("assessments"), store.all("tasks"), store.all("checkins"), store.all("schedule_blocks"), store.all("project_tasks"),
        store.all("knowledge_entries"), store.all("shifts"), store.all("transactions"), store.all("training_sessions"), store.all("memories"), store.all("applications"),
      ]);
      const open = assessments.filter((a) => a.status === "open" && a.due_on && a.due_on >= today).sort((a, b) => a.due_on!.localeCompare(b.due_on!));
      const urgent = open.filter((a) => a.due_on! <= soon).length + tasks.filter((t) => !t.done_at && t.due_on && t.due_on <= today).length;
      const next = open[0];

      const worked = shifts.filter((s) => s.status === "worked" && localDay(new Date(s.starts_at)) >= week)
        .reduce((n, s) => n + Math.max(0, (Date.parse(s.ends_at) - Date.parse(s.starts_at)) / 3_600_000 - s.unpaid_break_min / 60), 0);
      const upcoming = shifts.filter((s) => s.status === "planned" && Date.parse(s.ends_at) > Date.now()).sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
      const wd = new Date().getDay();
      const routine = blocks.filter((b) => b.kind === "shift").map((b) => ({ b, ahead: (b.weekday - wd + 7) % 7 })).sort((a, b) => a.ahead - b.ahead || a.b.starts_at.localeCompare(b.b.starts_at))[0];
      const DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

      const legacySpent = checkins.filter((c) => c.kind === "spent" && !c.ref_id && c.local_day >= week).reduce((n, c) => n + Number((c.payload as { cents?: number }).cents ?? 0), 0);
      const spent = txs.filter((t) => t.direction === "out" && t.occurred_on >= week && t.occurred_on <= today).reduce((n, t) => n + t.amount_cents, 0) + legacySpent;

      const openPt = ptasks.filter((t) => t.status !== "done");
      const nextPt = openPt.filter((t) => t.due_on && t.due_on >= today).sort((a, b) => a.due_on!.localeCompare(b.due_on!))[0];
      const careerOpen = tasks.filter((t) => t.area === "career" && !t.done_at);
      const activeApps = applications.filter((a) => ["applied", "interview", "offer"].includes(a.status)).length;
      const dueReview = knowledge.filter((k) => !k.review_on || k.review_on <= today).length;
      const legacyGym = checkins.filter((c) => c.kind === "gym_done" && !c.ref_id && c.local_day >= week).length;
      const weekSessions = sessions.filter((s) => s.occurred_on >= week && s.occurred_on <= today).length + legacyGym;
      const planned = new Set(blocks.filter((b) => b.kind === "gym").map((b) => b.weekday)).size;
      const lastMemory = [...memories].sort((a, b) => b.occurred_on.localeCompare(a.occurred_on))[0];
      const monthMemories = memories.filter((m) => m.occurred_on.startsWith(month)).length;

      return {
        today: { figure: urgent ? `${urgent} due` : "Clear", line: next ? `Next: ${next.title}, ${dayLabel(next.due_on!, today)}` : "Nothing dated ahead" },
        school: { figure: `${open.filter((a) => a.due_on! <= inWeek).length} this week`, line: next ? `${next.title}, ${dayLabel(next.due_on!, today)}` : "Nothing due" },
        work: {
          figure: hours(worked),
          line: upcoming ? `Next shift ${dayLabel(localDay(new Date(upcoming.starts_at)), today)}, ${new Date(upcoming.starts_at).toTimeString().slice(0, 5)}`
            : routine ? `Usual shift ${routine.ahead === 0 ? "today" : DAY[routine.b.weekday]}, ${routine.b.starts_at.slice(0, 5)}` : "No shifts planned",
        },
        money: { figure: money(spent), line: spent ? "Spent this week" : "Nothing spent this week" },
        projects: { figure: `${openPt.length} open`, line: nextPt ? `Next: ${nextPt.title.split(":")[0]}, ${dayLabel(nextPt.due_on!, today)}` : "No dated tasks" },
        career: { figure: `${careerOpen.length} steps`, line: activeApps ? `${activeApps} ${activeApps === 1 ? "application" : "applications"} in play` : "Toward summer 2027" },
        knowledge: { figure: `${dueReview} to review`, line: knowledge.length ? `${knowledge.length} ${knowledge.length === 1 ? "topic" : "topics"} kept` : "Your first topic waits" },
        training: { figure: planned ? `${weekSessions} of ${planned}` : `${weekSessions}`, line: weekSessions ? "Sessions this week" : "No session yet this week" },
        life: { figure: `${monthMemories}`, line: lastMemory ? `Last: ${lastMemory.title}` : "No moments yet" },
      } satisfies Record<WorldSlug, WorldStatus>;
    }, [store]) ?? {}
  );
}

export { weekStart, addDays };
