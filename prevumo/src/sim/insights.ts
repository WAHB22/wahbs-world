import { DAY, fmtSpan, fmtTime, HOUR, startOfDay } from "../lib/time";
import { attribute, type Attribution } from "./attribution";
import { meanFrac, TYPES } from "./catalog";
import { isAlwaysOn } from "./seed";
import type { AppEvent, Machine, Session, TechRequest, World } from "./types";

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

export type HealthTone = "normal" | "irregular" | "critical";
export const TONE_WORD: Record<HealthTone, string> = { normal: "Good", irregular: "Watch", critical: "Act soon" };

export interface Health {
  score: number;
  irregular30: number;
  irregularMonth: number;
  irregularSinceService: number;
  daysSinceService: number;
  serviceDays: number;
  dueInDays: number;
  hours30: number;
  drivers: { label: string; points: number }[];
}

/** The latest service on or before `at`; the install date if there is none. */
export function serviceBefore(w: World, m: Machine, at: number): number {
  let best = m.lastServiceAt <= at ? m.lastServiceAt : m.createdAt;
  for (const s of w.services) if (s.machineId === m.id && s.at <= at && s.at > best) best = s.at;
  return best;
}

/**
 * Health starts at 100. Time since the last service costs up to 45 points, relative to this type's service
 * interval (30 points on the due date), and each irregularity since the service costs 10. A service clears both.
 */
export function health(w: World, m: Machine, now: number): Health {
  const { serviceDays } = TYPES[m.type];
  const serviced = serviceBefore(w, m, now);
  const since = now - 30 * DAY;
  const monthStart = new Date(startOfDay(now)).setDate(1);
  const irr = w.events.filter((e) => e.kind === "irregular" && e.machineId === m.id && e.at <= now);
  const n = irr.filter((e) => e.at >= serviced).length;
  const hours30 = w.sessions
    .filter((s) => s.machineId === m.id && (s.end ?? now) > since && s.start <= now)
    .reduce((a, s) => a + (Math.min(s.end ?? now, now) - Math.max(s.start, since)) / HOUR, 0);
  const daysSinceService = Math.floor((now - serviced) / DAY);
  const agePts = Math.round(Math.min(45, (30 * daysSinceService) / serviceDays));
  const irrPts = Math.min(40, 10 * n);
  return {
    score: 100 - agePts - irrPts,
    irregular30: irr.filter((e) => e.at >= since).length,
    irregularMonth: irr.filter((e) => e.at >= monthStart).length,
    irregularSinceService: n,
    daysSinceService,
    serviceDays,
    hours30,
    dueInDays: serviceDays - daysSinceService - 6 * n,
    drivers: [
      { label: `${daysSinceService} of ${serviceDays} days since service`, points: agePts },
      { label: `${n} irregularit${n === 1 ? "y" : "ies"} since service`, points: irrPts },
    ],
  };
}

export interface TrendPoint {
  at: number;
  score: number;
  irregular: number;
  serviced: boolean;
}

/** The health score at the end of each of the last `days` days. */
export function healthTrend(w: World, m: Machine, now: number, days = 30): TrendPoint[] {
  const today = startOfDay(now);
  return Array.from({ length: days }, (_, i) => {
    const from = today - (days - 1 - i) * DAY;
    const at = Math.min(now, from + DAY - 1);
    const inDay = (t: number) => t >= from && t <= at;
    return {
      at,
      score: health(w, m, at).score,
      irregular: w.events.filter((e) => e.kind === "irregular" && e.machineId === m.id && inDay(e.at)).length,
      serviced: w.services.some((s) => s.machineId === m.id && inDay(s.at)),
    };
  });
}

export const DUE_SOON_DAYS = 21;

/** Machines whose service is due within three weeks, soonest first. */
export function dueSoon(w: World, ms: Machine[], now: number) {
  return ms
    .filter((m) => !isLearning(m, now))
    .map((m) => ({ m, h: health(w, m, now) }))
    .filter((x) => x.h.dueInDays <= DUE_SOON_DAYS)
    .sort((a, b) => a.h.dueInDays - b.h.dueInDays);
}

export function openRequest(w: World, machineId: string): TechRequest | undefined {
  return w.techRequests.findLast((r) => r.machineId === machineId && (r.status ?? "open") === "open");
}

export type Severity = "warning" | "critical";

/** The draw measured over the episode, in kW. */
export function episodeKw(e: AppEvent, m: Machine): number {
  const mean = meanFrac(m.type) * m.ratedKw;
  const f = e.factor ?? 0;
  return e.anomaly === "erratic" ? (1 + f) * mean : f * mean;
}

/** Critical when the draw passes the nameplate rating: an overload, not just an odd pattern. */
export function severity(e: AppEvent, m: Machine): Severity {
  return e.anomaly !== "sag" && episodeKw(e, m) > m.ratedKw * 1.05 ? "critical" : "warning";
}

/** Irregularities still waiting for the owner's decision, on machines that are still running. */
export function openIrregular(w: World): AppEvent[] {
  return w.events.filter((e) => e.kind === "irregular" && !e.outcome && w.machines.find((m) => m.id === e.machineId)?.power === "on");
}

const STATUS_LABEL: Record<Status, string> = { normal: "Normal", irregular: "Irregular", critical: "Shutting down", idle: "Idle", off: "Off" };

/** One name per state, used on cards, the detail header and anywhere else a machine's status shows. */
export function statusLabel(w: World, m: Machine, now: number): string {
  const s = statusOf(w, m);
  if (s === "irregular" && (openAlert(w, m)?.outcome === "technician" || openRequest(w, m.id))) return "Technician requested";
  if (s === "normal" && isLearning(m, now)) return "Learning";
  return STATUS_LABEL[s];
}

export function healthTone(score: number): HealthTone {
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

/** Energy used today by these machines, counting the part of each session that falls in today. */
export function todayKwh(w: World, machines: Machine[], now: number): number {
  const today = startOfDay(now);
  const ids = new Set(machines.map((m) => m.id));
  return w.sessions
    .filter((s) => ids.has(s.machineId) && (s.end ?? now) > today && s.start <= now)
    .reduce((a, s) => {
      const end = Math.min(s.end ?? now, now);
      return a + (s.kwh * (end - Math.max(s.start, today))) / Math.max(1, end - s.start);
    }, 0);
}

export function machineName(w: World, id: string | undefined): string {
  return w.machines.find((m) => m.id === id)?.name ?? "Machine";
}
