import { useEffect, useRef } from "react";
import { getState, useApp } from "../store/store";
import { openIrregular, severity } from "../sim/insights";
import type { AppEvent, World } from "../sim/types";
import { playChime, type ChimeLevel } from "./chime";

const BASE = "PREVUMO · Owner dashboard";
const icon = (dot: string) =>
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#1F3D2B"/><rect x="5" y="12" width="22" height="10" rx="2" fill="#D6E4D3" opacity=".9"/><path d="M5 18h4l2-3 3 5 3-6 3 4h7" fill="none" stroke="#1F3D2B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="8" r="7" fill="${dot}" stroke="#FFFDF8" stroke-width="2"/></svg>`,
  );
/** Orange dot for an irregularity, rust once any of them is an overload: the same colours as the cards. */
const ICON: Record<ChimeLevel, string> = { warning: icon("#E07A2E"), critical: icon("#A63D1F") };

/** An overload nobody has answered chimes again after one minute and after five, then stays quiet. */
export const REMIND_AFTER_SEC = [60, 300];

/** Open irregularities, overloads first, then oldest first, each with a key that changes when it opens, turns into an overload or a reminder falls due. */
function openAlerts(w: World, now: number) {
  return openIrregular(w)
    .map((e: AppEvent) => {
      const m = w.machines.find((x) => x.id === e.machineId);
      const level: ChimeLevel = m && severity(e, m) === "critical" ? "critical" : "warning";
      const due = level === "critical" ? REMIND_AFTER_SEC.filter((s) => now - e.at >= s * 1000).length : 0;
      return { e, level, due, name: m?.name ?? "A machine", key: `${e.id}:${level}:${due}` };
    })
    .sort((a, b) => (a.level === b.level ? a.e.at - b.e.at : a.level === "critical" ? -1 : 1));
}

/**
 * Reaches the owner beyond the banner: the tab title and favicon name the most urgent alert, and the chime plays when an
 * alert opens, when it turns into an overload, and as a reminder for an unanswered overload (if sound is on).
 * Alerts already open on load are not new.
 */
export function useAlertSignals() {
  const { world, now } = useApp();
  const sig = openAlerts(world, now)
    .map((a) => a.key)
    .join("|");
  const seen = useRef<Map<string, { level: ChimeLevel; due: number }> | null>(null);
  const lastChime = useRef(0);
  useEffect(() => {
    const { world: w, now: t } = getState();
    const open = openAlerts(w, t);
    const top = open[0];
    document.title = top ? `(${open.length}) ${top.level === "critical" ? `Overload: ${top.name}` : `${top.name} looks irregular`} · PREVUMO` : BASE;
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link) link.href = top ? ICON[top.level] : "/favicon.svg";
    const before = seen.current;
    seen.current = new Map(open.map((a) => [a.e.id, { level: a.level, due: a.due }]));
    if (!before) return;
    // New alerts and alerts that just turned into an overload always chime; reminders keep 30 s apart, so three overloads never chime three times in a row.
    const fresh = open.filter((a) => before.get(a.e.id)?.level !== a.level);
    const due = open.filter((a) => (before.get(a.e.id)?.due ?? a.due) < a.due);
    if (!fresh.length && (!due.length || t - lastChime.current < 30_000)) return;
    lastChime.current = t;
    playChime([...fresh, ...due].some((a) => a.level === "critical") ? "critical" : "warning");
  }, [sig]);
  useEffect(
    () => () => {
      document.title = BASE;
    },
    [],
  );
}
