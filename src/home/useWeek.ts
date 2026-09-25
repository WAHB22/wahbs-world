"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { dayLabel, localDay } from "@/data/dates";
import { useWorld } from "@/data/runtime";
import { billDue, paysBill } from "@/worlds/money/data";
import { addDays } from "@/worlds/useWorldStatus";

/** What the home page's week board shows: the next seven days of deadlines and the bills still to pay. */
export function useWeek() {
  const { store } = useWorld();
  return useLiveQuery(async () => {
    if (!store) return undefined;
    const today = localDay(), end = addDays(today, 7), month = today.slice(0, 7);
    const [assessments, courses, ptasks, bills, txs] = await Promise.all([store.all("assessments"), store.all("courses"), store.all("project_tasks"), store.all("recurring_bills"), store.all("transactions")]);
    const code = new Map(courses.map((c) => [c.id, c.code]));
    const deadlines = [
      ...assessments.filter((a) => a.status === "open" && a.due_on && a.due_on >= today && a.due_on <= end)
        .map((a) => ({ id: a.id, on: a.due_on!, label: `${a.course_id ? code.get(a.course_id) + " " : ""}${a.title}` })),
      ...ptasks.filter((t) => t.status !== "done" && t.due_on && t.due_on >= today && t.due_on <= end).map((t) => ({ id: t.id, on: t.due_on!, label: t.title })),
    ].sort((a, b) => a.on.localeCompare(b.on)).map((d) => ({ ...d, when: dayLabel(d.on, today) }));
    const billsLeft = bills.filter((b) => b.active && billDue(b, month) >= today.slice(0, 7) + "-01" && !txs.some((t) => paysBill(t, b, month))).length;
    return { deadlines, billsLeft };
  }, [store]);
}
