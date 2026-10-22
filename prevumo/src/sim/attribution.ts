import { atTime, dayKey, dayName, fmtDate, fromDayKey } from "../lib/time";
import type { Assignment, Frame, Member, Session } from "./types";

/** The booked window of a frame on the day containing `t`, or null when it does not apply that day. */
export function windowOn(frame: Frame, t: number): { start: number; end: number } | null {
  if (frame.kind === "always") return null;
  const day = new Date(t);
  const key = dayKey(t);
  if (key < frame.from || key > frame.to || !frame.days.includes(day.getDay())) return null;
  return { start: atTime(t, frame.start), end: atTime(t, frame.end) };
}

export function covers(a: Assignment, machineId: string, t: number): boolean {
  if (!a.machineIds.includes(machineId)) return false;
  if (a.removedAt !== undefined && t >= a.removedAt) return false;
  if (a.frame.kind === "always") return t >= a.createdAt;
  const w = windowOn(a.frame, t);
  return w !== null && t >= w.start && t < w.end;
}

export type Attribution =
  | { kind: "pin"; label: string; key: string; member: Member }
  | { kind: "assigned"; label: string; key: string; assignment: Assignment }
  | { kind: "unassigned"; label: string; key: string };

/** A PIN typed on the box wins, then a manual assignment covering the session start, otherwise Unassigned. */
export function attribute(
  s: Pick<Session, "machineId" | "start" | "pinMemberId">,
  members: Member[],
  assignments: Assignment[],
): Attribution {
  const member = s.pinMemberId ? members.find((m) => m.id === s.pinMemberId) : undefined;
  if (member) return { kind: "pin", label: member.name, key: `pin:${member.id}`, member };
  const a = assignments.find((x) => covers(x, s.machineId, s.start));
  if (a) return { kind: "assigned", label: a.name, key: `as:${a.name.trim().toLowerCase()}`, assignment: a };
  return { kind: "unassigned", label: "Unassigned", key: "unassigned" };
}

/** How a session got its name, worded the same everywhere. */
export const SOURCE: Record<Attribution["kind"], string> = { pin: "PIN", assigned: "Assigned", unassigned: "No PIN or assignment" };

export function frameText(frame: Frame): string {
  if (frame.kind === "always") return "Until removed";
  const days = describeDays(frame.days);
  const dates =
    frame.from === frame.to
      ? fmtDate(fromDayKey(frame.from))
      : `${fmtDate(fromDayKey(frame.from))} to ${fmtDate(fromDayKey(frame.to))}`;
  return frame.from === frame.to
    ? `${dates}, ${frame.start} to ${frame.end}`
    : `${days}, ${frame.start} to ${frame.end} · ${dates}`;
}

function describeDays(days: number[]): string {
  const sorted = [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
  if (sorted.length === 7) return "Every day";
  if (sorted.join() === "1,2,3,4,5") return "Weekdays";
  const idx = sorted.map((d) => (d + 6) % 7);
  const run = idx.every((v, i) => i === 0 || v === idx[i - 1] + 1);
  if (run && sorted.length > 2) return `${dayName(sorted[0])} to ${dayName(sorted[sorted.length - 1])}`;
  return sorted.map(dayName).join(", ");
}

export function assignmentState(a: Assignment, now: number): "active" | "scheduled" | "ended" | "removed" {
  if (a.removedAt !== undefined) return "removed";
  if (a.frame.kind === "always") return "active";
  const key = dayKey(now);
  if (key > a.frame.to) return "ended";
  const w = windowOn(a.frame, now);
  if (w && now >= w.start && now < w.end) return "active";
  if (key === a.frame.to && (!w || now >= w.end)) return "ended";
  return "scheduled";
}
