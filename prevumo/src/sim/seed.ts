import { addDays, atTime, dayKey, DAY, HOUR, MIN, startOfDay } from "../lib/time";
import { covers, windowOn } from "./attribution";
import { bestTechnician, TYPES, meanFrac } from "./catalog";
import type { AnomalyKind, AppEvent, Assignment, Location, Machine, MachineType, Member, Outcome, Session, World } from "./types";

export const WORLD_VERSION = 4;

/** Small seeded generator so every reset produces the same story. */
export function makeRng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    between: (lo: number, hi: number) => lo + (hi - lo) * next(),
    pick: <T,>(xs: T[]): T => xs[Math.floor(next() * xs.length)],
  };
}
export type Rng = ReturnType<typeof makeRng>;

let counter = 0;
export function uid(prefix: string): string {
  counter += 1;
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;
}

const LOCATIONS: Location[] = [
  { id: "ms1", name: "Makerspace 1 · STEM" },
  { id: "ms2", name: "Makerspace 2 · CBY" },
  { id: "chem", name: "Chem Lab B" },
];

const MACHINES: [string, string, MachineType, string, number][] = [
  ["ms1-welder-1", "Welder 1", "welder", "ms1", 3.0],
  ["ms1-welder-2", "Welder 2", "welder", "ms1", 3.2],
  ["ms1-laser", "Laser cutter", "laser", "ms1", 1.5],
  ["ms1-cnc", "CNC router", "cnc", "ms1", 2.2],
  ["ms1-bandsaw", "Band saw", "bandsaw", "ms1", 1.1],
  ["ms1-drill", "Drill press", "drill", "ms1", 0.75],
  ["ms1-sander", "Belt sander", "sander", "ms1", 0.9],
  ["ms1-printer-1", "3D printer 1", "printer", "ms1", 0.2],
  ["ms1-printer-2", "3D printer 2", "printer", "ms1", 0.2],
  ["ms1-printer-3", "3D printer 3", "printer", "ms1", 0.22],
  ["ms1-printer-4", "3D printer 4", "printer", "ms1", 0.2],
  ["ms2-laser", "Laser cutter B", "laser", "ms2", 1.8],
  ["ms2-printer-5", "3D printer 5", "printer", "ms2", 0.22],
  ["ms2-printer-6", "3D printer 6", "printer", "ms2", 0.22],
  ["ms2-cnc", "CNC mill", "cnc", "ms2", 2.8],
  ["ms2-lathe", "Lathe", "lathe", "ms2", 1.5],
  ["ms2-sewing", "Sewing machine", "sewing", "ms2", 0.12],
  ["ms2-press", "Heat press", "hotplate", "ms2", 1.8],
  ["chem-oven", "Drying oven", "oven", "chem", 5.0],
  ["chem-fridge-a", "Fridge A", "fridge", "chem", 0.3],
  ["chem-fridge-b", "Fridge B", "fridge", "chem", 0.3],
  ["chem-freezer", "Sample freezer", "freezer", "chem", 0.45],
  ["chem-hood", "Fume hood", "fumehood", "chem", 0.4],
  ["chem-centrifuge", "Centrifuge", "centrifuge", "chem", 1.0],
  ["chem-mixer", "Overhead mixer", "mixer", "chem", 0.8],
  ["chem-hotplate", "Hot plate stirrer", "hotplate", "chem", 1.0],
];

const MEMBERS: [string, string][] = [
  ["Amira Haddad", "4821"],
  ["Lucas Tremblay", "7310"],
  ["Priya Nair", "2290"],
  ["Jonah Okafor", "5583"],
  ["Sofia Martins", "9047"],
  ["Ethan Leblanc", "3162"],
  ["Mei Chen", "6675"],
  ["Omar Farouk", "1408"],
  ["Chloé Gagnon", "8834"],
];

export function emailFor(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z]+/g, ".")
    .replace(/^\.|\.$/g, "");
  return `${slug}@members.example`;
}

export function isAlwaysOn(m: Pick<Machine, "type">): boolean {
  return TYPES[m.type].alwaysOn === true;
}

export function sessionKwh(m: Pick<Machine, "type" | "ratedKw">, ms: number, r: Rng): number {
  return m.ratedKw * meanFrac(m.type) * (ms / HOUR) * r.between(0.9, 1.1);
}

/**
 * Lay out normal sessions for one machine between `from` and `to`, the way a busy shared shop fills a day.
 * Sessions inside a manual assignment usually skip the PIN, so they are attributed to the assignment.
 */
export function generateSessions(
  m: Machine,
  from: number,
  to: number,
  r: Rng,
  members: Member[],
  assignments: Assignment[],
  dayFactor: number,
): Session[] {
  const spec = TYPES[m.type];
  if (spec.alwaysOn || to - from < 10 * MIN) return [];
  const share = (to - from) / (14 * HOUR);
  const count = Math.round(spec.perDay * dayFactor * share * r.between(0.5, 1.5));
  const out: Session[] = [];
  let cursor = from + r.between(0, 70) * MIN;
  for (let i = 0; i < count; i++) {
    const start = cursor + r.between(5, 80) * MIN;
    const dur = r.between(spec.minutes[0], spec.minutes[1]) * MIN;
    const end = start + dur;
    if (end > to) break;
    const assigned = assignments.some((a) => covers(a, m.id, start));
    const withPin = assigned ? r.next() < 0.25 : r.next() < 0.8;
    out.push({
      id: uid("s"),
      machineId: m.id,
      start,
      end,
      pinMemberId: withPin ? r.pick(members).id : undefined,
      kwh: sessionKwh(m, dur, r),
    });
    cursor = end;
  }
  return out;
}

/** Make sure a booked window that is still ahead today actually gets used, so the report shows it. */
export function fillBookedWindows(
  machines: Machine[],
  existing: Session[],
  from: number,
  to: number,
  r: Rng,
  assignments: Assignment[],
): Session[] {
  const added: Session[] = [];
  for (const a of assignments) {
    if (a.removedAt !== undefined) continue;
    const w = windowOn(a.frame, from);
    if (!w) continue;
    const start = Math.max(w.start, from) + 5 * MIN;
    const end = Math.min(w.end, to) - 5 * MIN;
    if (end - start < 25 * MIN) continue;
    for (const id of a.machineIds) {
      const m = machines.find((x) => x.id === id);
      if (!m || isAlwaysOn(m)) continue;
      const mine = [...existing, ...added].filter((s) => s.machineId === id).sort((x, y) => x.start - y.start);
      if (mine.some((s) => !s.pinMemberId && s.start >= start && s.start < end)) continue;
      let cursor = start;
      for (const s of mine) {
        const sEnd = s.end ?? to;
        if (sEnd <= cursor) continue;
        if (s.start - cursor >= 25 * MIN) break;
        cursor = Math.max(cursor, sEnd);
      }
      const next = mine.find((s) => s.start >= cursor)?.start ?? end;
      const room = Math.min(end, next) - cursor;
      if (room < 25 * MIN) continue;
      const dur = Math.min(room, r.between(40, 110) * MIN);
      added.push({ id: uid("s"), machineId: id, start: cursor, end: cursor + dur, kwh: sessionKwh(m, dur, r) });
    }
  }
  return added;
}

interface ActiveSeed {
  machineId: string;
  agoMin: number;
  pin?: string;
}

const ACTIVE: ActiveSeed[] = [
  { machineId: "ms1-welder-2", agoMin: 25.2, pin: "Amira Haddad" },
  { machineId: "ms1-printer-4", agoMin: 102 },
  { machineId: "ms1-cnc", agoMin: 12.4 },
  { machineId: "ms2-laser", agoMin: 38, pin: "Lucas Tremblay" },
];

export function seedWorld(now: number): World {
  const r = makeRng(20261023);
  const today = startOfDay(now);
  const members: Member[] = MEMBERS.map(([name, pin], i) => ({ id: `mem-${i + 1}`, name, pin, email: emailFor(name) }));
  const byName = (n: string) => members.find((m) => m.name === n)!;

  const machines: Machine[] = MACHINES.map(([id, name, type, locationId, ratedKw], i) => ({
    id,
    name,
    type,
    locationId,
    ratedKw,
    neverAutoOff: TYPES[type].alwaysOn === true,
    createdAt: now - 160 * DAY,
    lastServiceAt: now - (id === "ms1-welder-2" ? 74 : Math.round(r.between(8, 70))) * DAY,
    seed: i * 97 + 13,
    power: TYPES[type].alwaysOn ? "on" : "off",
    mode: "normal",
    outsideStreak: 0,
  }));

  const betaFrom = dayKey(addDays(today, -56));
  const assignments: Assignment[] = [
    {
      id: "as-beta",
      name: "Beta Inc.",
      email: "shop@beta-inc.example",
      machineIds: ["ms1-welder-2", "ms1-bandsaw"],
      frame: { kind: "schedule", from: betaFrom, to: dayKey(addDays(today, 60)), days: [2, 3, 4], start: "13:00", end: "17:00" },
      createdAt: addDays(today, -56),
    },
    {
      id: "as-capstone",
      name: "Capstone team 12",
      email: "capstone12@members.example",
      machineIds: ["ms1-printer-3", "ms1-printer-4"],
      frame: { kind: "always" },
      createdAt: now - 40 * DAY,
    },
  ];

  const activeStart = new Map(ACTIVE.map((a) => [a.machineId, now - a.agoMin * MIN]));
  const sessions: Session[] = [];
  for (let d = -30; d <= 0; d++) {
    const day = addDays(today, d);
    const wd = new Date(day).getDay();
    const factor = wd === 0 || wd === 6 ? 0.35 : 1;
    for (const m of machines) {
      let to = day + 21.5 * HOUR;
      if (d === 0) to = Math.min(to, (activeStart.get(m.id) ?? now) - 15 * MIN);
      sessions.push(...generateSessions(m, day + 8 * HOUR, to, r, members, assignments, factor));
    }
  }

  for (const a of ACTIVE) {
    const m = machines.find((x) => x.id === a.machineId)!;
    const start = activeStart.get(a.machineId)!;
    m.power = "on";
    sessions.push({
      id: `s-live-${a.machineId}`,
      machineId: m.id,
      start,
      pinMemberId: a.pin ? byName(a.pin).id : undefined,
      kwh: m.ratedKw * meanFrac(m.type) * ((now - start) / HOUR),
    });
  }

  const events: AppEvent[] = [];
  const monthStart = new Date(today).setDate(1);
  const inMonth = (t: number, frac: number) => (t >= monthStart ? t : monthStart + (now - monthStart) * frac);

  const irregular = (machineId: string, at: number, anomaly: AnomalyKind, factor: number, sec: number, outcome: Outcome) => {
    const m = machines.find((x) => x.id === machineId)!;
    events.push({
      id: uid("e"),
      kind: "irregular",
      at,
      locationId: m.locationId,
      machineId,
      anomaly,
      factor,
      n: sec,
      durationSec: sec,
      outcome,
      outcomeAt: at + sec * 1000 + 3 * MIN,
      read: true,
    });
  };
  irregular("ms1-welder-2", inMonth(atTime(addDays(today, -12), "14:20"), 0.3), "spike", 1.7, 26, "ok");
  irregular("ms1-welder-2", inMonth(atTime(addDays(today, -4), "15:05"), 0.7), "erratic", 0.52, 34, "ok");
  irregular("ms1-cnc", atTime(addDays(today, -21), "11:40"), "erratic", 0.61, 48, "shutdown");
  irregular("ms1-bandsaw", atTime(addDays(today, -17), "16:10"), "sag", 0.41, 63, "technician");
  irregular("ms1-printer-2", atTime(addDays(today, -9), "10:25"), "sag", 0.38, 120, "ok");
  irregular("ms2-laser", atTime(addDays(today, -14), "13:15"), "spike", 1.9, 22, "ok");
  irregular("ms2-lathe", atTime(addDays(today, -6), "09:50"), "erratic", 0.57, 41, "ok");
  irregular("chem-oven", atTime(addDays(today, -19), "15:30"), "spike", 1.6, 95, "technician");
  irregular("chem-centrifuge", atTime(addDays(today, -3), "11:05"), "erratic", 0.66, 18, "shutdown");

  // Idle prompts on past sessions: the session ends where the owner or the auto rule stopped it.
  const idleTypes: MachineType[] = ["printer", "laser", "cnc", "oven", "hotplate", "fumehood", "lathe"];
  const past = sessions.filter(
    (s) => s.end !== undefined && s.end < today && idleTypes.includes(machines.find((m) => m.id === s.machineId)!.type),
  );
  for (let i = 0; i < 14 && past.length; i++) {
    const s = past.splice(Math.floor(r.next() * past.length), 1)[0];
    const m = machines.find((x) => x.id === s.machineId)!;
    const roll = r.next();
    const outcome: Outcome = roll < 0.45 ? "shutdown" : roll < 0.75 ? "auto-off" : "kept-on";
    const idleMin = outcome === "auto-off" ? 60 : r.between(32, 55);
    const at = s.end! - (outcome === "kept-on" ? 20 * MIN : 0);
    events.push({
      id: uid("e"),
      kind: "idle",
      at,
      locationId: m.locationId,
      machineId: m.id,
      sessionId: s.id,
      idleSince: at - idleMin * MIN,
      drawKw: TYPES[m.type].idleFrac * m.ratedKw,
      autoReason: outcome === "auto-off" ? "idle" : undefined,
      outcome,
      outcomeAt: at + (outcome === "shutdown" ? 2 * MIN : 0),
      read: true,
    });
  }

  // A few printers left on at closing time and stopped by the daily shutdown.
  for (const [d, id] of [[-11, "ms1-printer-1"], [-5, "ms2-printer-6"], [-2, "ms1-printer-3"]] as const) {
    const day = addDays(today, d);
    const close = atTime(day, "22:00");
    const m = machines.find((x) => x.id === id)!;
    const start = close - r.between(150, 240) * MIN;
    if (sessions.some((s) => s.machineId === id && (s.end ?? now) > start && s.start < close)) continue;
    const s: Session = { id: uid("s"), machineId: id, start, end: close, kwh: sessionKwh(m, close - start, r) };
    sessions.push(s);
    events.push({
      id: uid("e"),
      kind: "auto-off",
      at: close,
      locationId: m.locationId,
      machineId: id,
      sessionId: s.id,
      autoReason: "daily",
      outcome: "auto-off",
      outcomeAt: close,
      read: true,
    });
  }

  sessions.sort((a, b) => a.start - b.start);
  events.sort((a, b) => a.at - b.at);
  for (const m of machines) {
    const last = sessions.filter((s) => s.machineId === m.id && s.end !== undefined).at(-1);
    if (m.power === "off" && last) m.offAt = last.end;
  }

  const closedDays: Record<string, number> = {};
  for (let d = -30; d <= -1; d++) closedDays[dayKey(addDays(today, d))] = atTime(addDays(today, d), "22:00");

  return {
    version: WORLD_VERSION,
    loggedIn: false,
    clockOffset: 0,
    lastTick: now,
    locations: LOCATIONS,
    machines,
    members,
    assignments,
    sessions,
    events,
    techRequests: [],
    services: machines.flatMap((m) => {
      const techId = bestTechnician(m.type).id;
      const prev = m.lastServiceAt - Math.round(TYPES[m.type].serviceDays * 0.95) * DAY;
      return [
        { id: uid("sv"), machineId: m.id, at: prev, techId },
        { id: uid("sv"), machineId: m.id, at: m.lastServiceAt, techId },
      ];
    }),
    settings: {
      idlePromptMin: 30,
      autoOffIdle: { enabled: true, minutes: 60 },
      dailyShutdown: { enabled: true, time: "22:00" },
    },
    closedDays,
    hideDemoButton: false,
  };
}

