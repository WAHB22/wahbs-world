"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { localDay } from "@/data/dates";
import { useWorld } from "@/data/runtime";
import type { Row } from "@/data/schema";
import type { Store } from "@/data/store";
import { addDays, weekStart } from "@/worlds/useWorldStatus";

export type ShiftView = Row<"shifts"> & { day: string; hours: number; pay: number | null; employer: string };

/** Paid hours of a shift: its length less the unpaid break. */
export function shiftHours(s: Pick<Row<"shifts">, "starts_at" | "ends_at" | "unpaid_break_min">): number {
  return Math.max(0, (Date.parse(s.ends_at) - Date.parse(s.starts_at)) / 3_600_000 - s.unpaid_break_min / 60);
}

/** What a shift paid: the stub amount when he entered one, otherwise hours at the wage, plus tips. */
export function shiftPay(s: Row<"shifts">, e: Row<"employers"> | undefined): number | null {
  const base = s.pay_cents ?? (e?.hourly_cents != null ? Math.round(shiftHours(s) * e.hourly_cents) : null);
  if (base == null && s.tips_cents == null) return null;
  return (base ?? 0) + (s.tips_cents ?? 0);
}

export function useWork() {
  const { store } = useWorld();
  return useLiveQuery(async () => {
    if (!store) return undefined;
    const today = localDay();
    const [employers, shifts, blocks, terms] = await Promise.all([store.all("employers"), store.all("shifts"), store.all("schedule_blocks"), store.all("terms")]);
    const byId = new Map(employers.map((e) => [e.id, e]));
    const views: ShiftView[] = shifts
      .map((s) => ({ ...s, day: localDay(new Date(s.starts_at)), hours: shiftHours(s), pay: shiftPay(s, s.employer_id ? byId.get(s.employer_id) : undefined), employer: (s.employer_id && byId.get(s.employer_id)?.name) || "Shift" }))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    const ws = weekStart(today);
    const we = addDays(ws, 7);
    const month = today.slice(0, 7);
    const live = views.filter((s) => s.status !== "cancelled");
    const week = live.filter((s) => s.day >= ws && s.day < we);
    const sum = (xs: ShiftView[], f: (s: ShiftView) => number) => xs.reduce((n, s) => n + f(s), 0);
    const current = terms.find((t) => t.status === "current");
    const routine = blocks.filter((b) => b.kind === "shift" && (!current || !b.term_id || b.term_id === current.id));
    return {
      today,
      employers,
      shifts: views,
      upcoming: live.filter((s) => s.status === "planned" && Date.parse(s.ends_at) >= Date.now()),
      toConfirm: live.filter((s) => s.status === "planned" && Date.parse(s.ends_at) < Date.now()),
      worked: views.filter((s) => s.status === "worked").reverse(),
      week: { days: Array.from({ length: 7 }, (_, i) => addDays(ws, i)), shifts: week, worked: sum(week.filter((s) => s.status === "worked"), (s) => s.hours), planned: sum(week, (s) => s.hours), pay: sum(week.filter((s) => s.status === "worked"), (s) => s.pay ?? 0) },
      month: { hours: sum(live.filter((s) => s.status === "worked" && s.day.startsWith(month)), (s) => s.hours), pay: sum(live.filter((s) => s.status === "worked" && s.day.startsWith(month)), (s) => s.pay ?? 0) },
      routine,
    };
  }, [store]);
}

const at = (day: string, time: string) => new Date(`${day}T${time.slice(0, 5)}:00`).toISOString();

/** Shift start and end from a day and two clock times; an end before the start runs past midnight. */
export function shiftTimes(day: string, start: string, end: string) {
  const starts_at = at(day, start);
  const ends_at = end.slice(0, 5) <= start.slice(0, 5) ? at(addDays(day, 1), end) : at(day, end);
  return { starts_at, ends_at };
}

/** Plan the next two weeks from the routine's shift blocks, skipping days that already have a shift. */
export async function planFromRoutine(store: Store, routine: Row<"schedule_blocks">[], employers: Row<"employers">[], shifts: ShiftView[], from: string, days = 14): Promise<number> {
  const taken = new Set(shifts.filter((s) => !s.deleted_at).map((s) => s.day));
  let made = 0;
  for (let i = 0; i < days; i++) {
    const day = addDays(from, i);
    if (taken.has(day)) continue;
    const wd = new Date(`${day}T12:00:00`).getDay();
    for (const b of routine.filter((r) => r.weekday === wd && (!r.valid_from || r.valid_from <= day) && (!r.valid_to || r.valid_to >= day))) {
      const employer = employers.find((e) => e.name === b.title) ?? employers[0];
      await store.put("shifts", { ...shiftTimes(day, b.starts_at, b.ends_at), employer_id: employer?.id ?? null, status: "planned" });
      made++;
    }
  }
  return made;
}

export function fmtHours(h: number): string {
  const r = Math.round(h * 4) / 4;
  return `${Number.isInteger(r) ? r : r.toFixed(2).replace(/0$/, "")} ${r === 1 ? "hour" : "hours"}`;
}
