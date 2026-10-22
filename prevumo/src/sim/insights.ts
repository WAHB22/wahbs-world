import { DAY, fmtSpan, fmtTime, HOUR, startOfDay } from "../lib/time";
import { attribute, type Attribution } from "./attribution";
import { TYPES } from "./catalog";
import { isAlwaysOn } from "./seed";
import type { AppEvent, Machine, Session, World } from "./types";

export type Status = "normal" | "irregular" | "critical" | "idle" | "off";

export function activeSession(w: World, machineId: string): Session | undefined {
  for (let i = w.sessions.length - 1; i >= 0; i--) {
    const s = w.sessions[i];
    if (s.machineId === machineId && s.end === undefined) return s;
  }
  return undefined;
}

export function openAlert(w: World, m: Machine): AppEvent | undefined {
  return m.activeAlertId ? w.events.find((e) => e.id === m.activeAlertId) : undefined;
}

/** green = normal, orange = irregular, rust = critical or shutting down, beige = off or idle. */
export function statusOf(w: World, m: Machine): Status {
  if (m.power === "stopping") return "critical";
  if (m.power === "off") return "off";
  if (openAlert(w, m)) return "irregular";
  if (m.mode === "idle") return "idle";
  return "normal";
}

export function isInUse(m: Machine): boolean {
  return (m.power === "on" || m.power === "stopping") && !isAlwaysOn(m);
}

export function isLearning(m: Machine, now: number): boolean {
  return m.learningUntil !== undefined && now < m.learningUntil;
}

export function sessionUser(w: World, s: Pick<Session, "machineId" | "start" | "pinMemberId">): Attribution {
  return attribute(s, w.members, w.assignments);
}

export interface Health {
  score: number;
  irregular30: number;
  irregularMonth: number;
  daysSinceService: number;
  dueInDays: number;
  hours30: number;
}

export function health(w: World, m: Machine, now: number): Health {
  const since = now - 30 * DAY;
  const monthStart = new Date(startOfDay(now)).setDate(1);
  const irr = w.events.filter((e) => e.kind === "irregular" && e.machineId === m.id);
  const irregular30 = irr.filter((e) => e.at >= since).length;
  const irregularMonth = irr.filter((e) => e.at >= monthStart).length;
  const hours30 = w.sessions
    .filter((s) => s.machineId === m.id && (s.end ?? now) > since)
    .reduce((a, s) => a + ((s.end ?? now) - Math.max(s.start, since)) / HOUR, 0);
  const daysSinceService = Math.floor((now - m.lastServiceAt) / DAY);
  const raw = 100 - 9 * irregular30 - Math.max(0, daysSinceService - 30) * 0.4 - Math.min(10, hours30 * 0.08);
  const score = Math.round(Math.min(99, Math.max(18, raw)));
  const dueInDays = TYPES[m.type].serviceDays - daysSinceService - 6 * irregular30;
  return { score, irregular30, irregularMonth, daysSinceService, dueInDays, hours30 };
}

export function healthTone(score: number): Status {
  if (score >= 75) return "normal";
  if (score >= 50) return "irregular";
  return "critical";
}

export function serviceText(h: Health): string {
  if (h.dueInDays > 1) return `Service due in ${h.dueInDays} days`;
  if (h.dueInDays === 1) return "Service due tomorrow";
  if (h.dueInDays === 0) return "Service due today";
  return `Service overdue by ${-h.dueInDays} day${h.dueInDays === -1 ? "" : "s"}`;
}

export function ordinal(n: number): string {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] ?? "th";
  return `${n}${s}`;
}

/** Plain reason line for an irregularity: "Spiked to 2.3× normal for 40 s". */
export function irregularReason(e: AppEvent, now: number): string {
  const sec = e.durationSec ?? Math.max(1, Math.round((now - e.at) / 1000));
  const span = fmtSpan(sec * 1000);
  const f = e.factor ?? 0;
  if (e.anomaly === "sag") return `Dropped to ${Math.round(f * 100)}% of normal for ${span}`;
  if (e.anomaly === "erratic") return `Erratic draw, swinging up to ±${Math.round(f * 100)}% for ${span}`;
  return `Spiked to ${f.toFixed(1)}× normal for ${span}`;
}

export function anomalyLabel(e: AppEvent): string {
  return e.anomaly === "sag" ? "Sag" : e.anomaly === "erratic" ? "Erratic" : "Spike";
}

export function bookingText(e: AppEvent): string | undefined {
  if (e.bookingEnd === undefined) return undefined;
  return e.bookingEnd <= e.at ? `booking ended ${fmtTime(e.bookingEnd)}` : `booked until ${fmtTime(e.bookingEnd)}`;
}

export const OUTCOME_LABEL: Record<NonNullable<AppEvent["outcome"]>, string> = {
  shutdown: "Shut down",
  technician: "Technician requested",
  ok: "Marked OK",
  "kept-on": "Kept on",
  "auto-off": "Auto shut-off",
  generated: "Report generated",
};

export function machineName(w: World, id: string | undefined): string {
  return w.machines.find((m) => m.id === id)?.name ?? "Machine";
}
