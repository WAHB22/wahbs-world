import { addDays, DAY, fmtDate, fromDayKey, HOUR, startOfDay } from "../lib/time";
import { meanFrac } from "./catalog";
import { sessionUser } from "./insights";
import { isAlwaysOn } from "./seed";
import type { Attribution } from "./attribution";
import type { Machine, World } from "./types";

export type RangeKind = "today" | "week" | "month" | "custom";

export interface Range {
  kind: RangeKind;
  from: number;
  to: number;
  label: string;
}

export function rangeFor(kind: RangeKind, now: number, custom?: { from: string; to: string }): Range {
  const today = startOfDay(now);
  if (kind === "today") return { kind, from: today, to: now, label: fmtDate(now) };
  if (kind === "week") {
    const from = addDays(today, -((new Date(today).getDay() + 6) % 7));
    return { kind, from, to: now, label: `${fmtDate(from)} to ${fmtDate(now)}` };
  }
  if (kind === "month") {
    const from = new Date(today).setDate(1);
    return { kind, from, to: now, label: `${fmtDate(from)} to ${fmtDate(now)}` };
  }
  const a = custom ? fromDayKey(custom.from) : today;
  const b = custom ? fromDayKey(custom.to) : today;
  const from = Math.min(a, b);
  const to = Math.min(now, addDays(Math.max(a, b), 1));
  return { kind, from, to, label: `${fmtDate(from)} to ${fmtDate(Math.max(a, b))}` };
}

export interface MachineRow {
  machine: Machine;
  hours: number;
  kwh: number;
  sessions: number;
  irregular: number;
  alwaysOn: boolean;
}

export interface MemberRow {
  key: string;
  label: string;
  kind: Attribution["kind"];
  machines: string[];
  hours: number;
  kwh: number;
  sessions: number;
}

export interface Report {
  hours: number;
  kwh: number;
  irregular: number;
  idleOffs: number;
  machines: MachineRow[];
  members: MemberRow[];
}

export function buildReport(w: World, locationId: string, range: Range, now: number): Report {
  const machines = w.machines.filter((m) => m.locationId === locationId);
  const ids = new Set(machines.map((m) => m.id));
  const rows = new Map<string, MachineRow>(
    machines.map((m) => [m.id, { machine: m, hours: 0, kwh: 0, sessions: 0, irregular: 0, alwaysOn: isAlwaysOn(m) }]),
  );
  const people = new Map<string, MemberRow>();
  people.set("unassigned", { key: "unassigned", label: "Unassigned", kind: "unassigned", machines: [], hours: 0, kwh: 0, sessions: 0 });

  for (const s of w.sessions) {
    if (!ids.has(s.machineId)) continue;
    const end = s.end ?? now;
    const a = Math.max(s.start, range.from);
    const b = Math.min(end, range.to);
    if (b <= a) continue;
    const share = end > s.start ? (b - a) / (end - s.start) : 0;
    const hours = (b - a) / HOUR;
    const kwh = s.kwh * share;
    const row = rows.get(s.machineId)!;
    row.hours += hours;
    row.kwh += kwh;
    row.sessions += 1;

    const who = sessionUser(w, s);
    const p =
      people.get(who.key) ??
      people
        .set(who.key, { key: who.key, label: who.label, kind: who.kind, machines: [], hours: 0, kwh: 0, sessions: 0 })
        .get(who.key)!;
    p.hours += hours;
    p.kwh += kwh;
    p.sessions += 1;
    if (!p.machines.includes(row.machine.name)) p.machines.push(row.machine.name);
  }

  for (const row of rows.values()) {
    if (!row.alwaysOn) continue;
    const from = Math.max(range.from, row.machine.createdAt);
    row.kwh = row.machine.ratedKw * meanFrac(row.machine.type) * Math.max(0, range.to - from) / HOUR;
  }

  let irregular = 0;
  let idleOffs = 0;
  for (const e of w.events) {
    if (e.locationId !== locationId || e.at < range.from || e.at >= range.to) continue;
    if (e.kind === "irregular") {
      irregular += 1;
      const row = e.machineId ? rows.get(e.machineId) : undefined;
      if (row) row.irregular += 1;
    }
    const stopped = e.outcome === "shutdown" || e.outcome === "auto-off";
    if (e.kind === "auto-off" || ((e.kind === "idle" || e.kind === "overrun") && stopped)) idleOffs += 1;
  }

  const machineRows = [...rows.values()].sort((a, b) => b.kwh - a.kwh);
  const members = [...people.values()]
    .filter((p) => p.key === "unassigned" || p.sessions > 0)
    .sort((a, b) => (a.key === "unassigned" ? 1 : b.key === "unassigned" ? -1 : b.hours - a.hours));
  return {
    hours: machineRows.filter((r) => !r.alwaysOn).reduce((a, r) => a + r.hours, 0),
    kwh: machineRows.reduce((a, r) => a + r.kwh, 0),
    irregular,
    idleOffs,
    machines: machineRows,
    members,
  };
}

export function isWholeDay(range: Range): boolean {
  return range.to - range.from <= DAY;
}
