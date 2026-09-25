"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { uuidFromName } from "@/data/ids";
import { useWorld } from "@/data/runtime";
import type { Row } from "@/data/schema";
import { addDays, weekStart } from "@/worlds/useWorldStatus";

export type Deadline = Row<"assessments"> & { code: string | null };
export type Block = Row<"schedule_blocks"> & { code: string | null; state: "past" | "now" | "next"; done: boolean };
export type TodayData = {
  dayId: string;
  day: Row<"days"> | undefined;
  oneThing: { kind: "assessment"; item: Deadline } | { kind: "task"; item: Row<"tasks"> } | null;
  choices: { id: string; label: string; ref: string }[];
  attention: { id: string; text: string; tone: "alarm" | "flame" }[];
  blocks: Block[];
  rail: Deadline[];
  week: { day: string; items: Deadline[] }[];
  money: { today: number; week: number };
  training: { done: number; planned: number };
  moments: Row<"checkins">[];
  checkins: Row<"checkins">[];
};

const hm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

/** Everything Today shows, derived from the stored rows. Recomputes whenever a row changes. */
export function useToday(today: string, now: Date): TodayData | undefined {
  const { store } = useWorld();
  const minute = hm(now);
  return useLiveQuery(async () => {
    if (!store) return undefined;
    const dayId = await uuidFromName(`day:${today}`);
    const [day, assessments, courses, tasks, blocksAll, checkinsAll, terms, txAll] = await Promise.all([
      store.get("days", dayId),
      store.all("assessments"),
      store.all("courses"),
      store.all("tasks"),
      store.all("schedule_blocks"),
      store.all("checkins"),
      store.all("terms"),
      store.all("transactions"),
    ]);
    const code = new Map(courses.map((c) => [c.id, c.code]));
    const withCode = (a: Row<"assessments">): Deadline => ({ ...a, code: a.course_id ? code.get(a.course_id) ?? null : null });
    const soon = addDays(today, 3);
    const inWeek = addDays(today, 7);
    const open = assessments.filter((a) => a.status === "open" && a.due_on && a.due_on >= today).map(withCode)
      .sort((a, b) => a.due_on!.localeCompare(b.due_on!) || (b.weight ?? 0) - (a.weight ?? 0));

    // The one thing: what he picked for today, otherwise the heaviest deadline among the next few.
    let oneThing: TodayData["oneThing"] = null;
    if (day?.one_thing_ref) {
      const [kind, id] = day.one_thing_ref.split(":");
      if (kind === "assessment") { const a = assessments.find((x) => x.id === id && !x.deleted_at); if (a && a.status === "open") oneThing = { kind, item: withCode(a) }; }
      if (kind === "task") { const t = tasks.find((x) => x.id === id); if (t && !t.done_at) oneThing = { kind, item: t }; }
    }
    if (!oneThing) {
      const pick = open.slice(0, 6).sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))[0];
      if (pick) oneThing = { kind: "assessment", item: pick };
    }
    const oneId = oneThing?.item.id;
    const choices = [
      ...open.slice(0, 10).map((a) => ({ id: a.id, label: `${a.code ? a.code + " " : ""}${a.title}`, ref: `assessment:${a.id}` })),
      ...tasks.filter((t) => !t.done_at).slice(0, 10).map((t) => ({ id: t.id, label: t.title, ref: `task:${t.id}` })),
    ];

    const attention: TodayData["attention"] = [];
    for (const a of open) if (a.due_on! <= soon && a.id !== oneId) attention.push({ id: a.id, text: `${a.code ? a.code + " " : ""}${a.title} is due ${a.due_on === today ? "today" : a.due_on === addDays(today, 1) ? "tomorrow" : "in " + Math.round((Date.parse(a.due_on!) - Date.parse(today)) / 86_400_000) + " days"}`, tone: a.due_on! <= addDays(today, 1) ? "alarm" : "flame" });
    for (const t of tasks) if (!t.done_at && t.due_on && t.due_on <= today) attention.push({ id: t.id, text: `${t.title}${t.due_on < today ? " is overdue" : " is due today"}`, tone: "alarm" });

    // The service rail: this weekday's blocks from the current term, with a now line.
    const current = terms.find((t) => t.status === "current");
    const wd = new Date(`${today}T12:00:00`).getDay();
    const todays = checkinsAll.filter((c) => c.local_day === today);
    const did = (k: string) => todays.some((c) => c.kind === k);
    const blocks: Block[] = blocksAll
      .filter((b) => b.weekday === wd && (!current || !b.term_id || b.term_id === current.id))
      .filter((b) => (!b.valid_from || b.valid_from <= today) && (!b.valid_to || b.valid_to >= today))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
      .map((b) => ({
        ...b,
        code: b.course_id ? code.get(b.course_id) ?? null : null,
        state: b.ends_at.slice(0, 5) <= minute ? "past" : b.starts_at.slice(0, 5) <= minute ? "now" : "next",
        done: (b.kind === "gym" && did("gym_done")) || (b.kind === "shift" && did("shift_worked")),
      }));

    const rail = open.filter((a) => a.due_on! <= inWeek && a.id !== oneId).slice(0, 8);
    const week = Array.from({ length: 7 }, (_, i) => addDays(today, i + 1)).map((d) => ({ day: d, items: open.filter((a) => a.due_on === d) }));

    const ws = weekStart(today);
    // Money spent: every "out" entry in Money, plus any older spent check ins saved before entries existed.
    const cents = (c: Row<"checkins">) => Number((c.payload as { cents?: number }).cents ?? 0);
    const legacy = checkinsAll.filter((c) => c.kind === "spent" && !c.ref_id).map((c) => ({ day: c.local_day, cents: cents(c) }));
    const outs = txAll.filter((t) => t.direction === "out").map((t) => ({ day: t.occurred_on, cents: t.amount_cents })).concat(legacy);
    const money = { today: outs.filter((x) => x.day === today).reduce((n, x) => n + x.cents, 0), week: outs.filter((x) => x.day >= ws && x.day <= today).reduce((n, x) => n + x.cents, 0) };
    const gymBlocks = new Set(blocksAll.filter((b) => b.kind === "gym" && (!current || b.term_id === current.id)).map((b) => b.weekday)).size;
    const training = { done: checkinsAll.filter((c) => c.kind === "gym_done" && c.local_day >= ws).length, planned: gymBlocks };
    const moments = checkinsAll.filter((c) => c.kind === "moment").sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)).slice(0, 3);

    return { dayId, day, oneThing, choices, attention, blocks, rail, week, money, training, moments, checkins: todays.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at)) };
  }, [store, today, minute]);
}
