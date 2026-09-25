/**
 * The day has a pace, like a kitchen: calm, opening, service, rush. It comes from the time of day
 * and what is actually due, and never rises above the cap set in Settings (the cap wins).
 */
export const LEVELS = ["calm", "opening", "service", "rush"] as const;
export type Intensity = (typeof LEVELS)[number];

export type Load = { dueToday: number; overdue: number; dueSoon: number; shiftNow: boolean; shiftToday: boolean };

export function naturalIntensity(now: Date, load: Load): Intensity {
  const h = now.getHours() + now.getMinutes() / 60;
  let level: Intensity = h < 5.5 || h >= 22 ? "calm" : h < 11 ? "opening" : "service";
  if (load.dueSoon > 0 || load.shiftToday) level = max(level, "service");
  if (load.overdue > 0 || load.dueToday > 0 || load.shiftNow) level = "rush";
  if (h < 5.5 && !load.overdue && !load.dueToday) level = "calm";
  return level;
}

export function capped(level: Intensity, cap: Intensity): Intensity {
  return LEVELS.indexOf(level) > LEVELS.indexOf(cap) ? cap : level;
}

function max(a: Intensity, b: Intensity): Intensity { return LEVELS.indexOf(a) >= LEVELS.indexOf(b) ? a : b; }

export const INTENSITY_LABEL: Record<Intensity, string> = { calm: "Calm", opening: "Opening", service: "Service", rush: "Rush" };
/** How strongly things move at each level (the chrome's flow, pulses). */
export const INTENSITY_ENERGY: Record<Intensity, number> = { calm: 0.35, opening: 0.6, service: 0.8, rush: 1 };

type Listener = () => void;
let current: Intensity = "opening";
const listeners = new Set<Listener>();
export function setIntensity(i: Intensity) { if (i !== current) { current = i; listeners.forEach((l) => l()); } }
export function getIntensity() { return current; }
export function subscribeIntensity(l: Listener) { listeners.add(l); return () => { listeners.delete(l); }; }
