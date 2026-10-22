import { useEffect, useRef } from "react";
import { getState, useApp } from "../store/store";
import { openIrregular, severity } from "../sim/insights";
import { playChime } from "./chime";

const BASE = "PREVUMO · Owner dashboard";
const ALERT_ICON =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#1F3D2B"/><rect x="5" y="12" width="22" height="10" rx="2" fill="#D6E4D3" opacity=".9"/><path d="M5 18h4l2-3 3 5 3-6 3 4h7" fill="none" stroke="#1F3D2B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="24" cy="8" r="7" fill="#A63D1F" stroke="#FFFDF8" stroke-width="2"/></svg>`,
  );

/**
 * Reaches the owner beyond the banner: the tab title and favicon show open alerts,
 * and a new one plays the chime once (if sound is on). Alerts already open on load are not new.
 */
export function useAlertSignals() {
  const sig = openIrregular(useApp().world)
    .map((e) => e.id)
    .join("|");
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const w = getState().world;
    const open = openIrregular(w);
    const machine = (id?: string) => w.machines.find((m) => m.id === id);
    document.title = open.length ? `(${open.length}) ${machine(open[0].machineId)?.name ?? "A machine"} looks irregular · PREVUMO` : BASE;
    const link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (link) link.href = open.length ? ALERT_ICON : "/favicon.svg";
    if (!seen.current) {
      seen.current = new Set(open.map((e) => e.id));
      return;
    }
    const known = seen.current;
    const fresh = open.filter((e) => !known.has(e.id));
    fresh.forEach((e) => known.add(e.id));
    if (fresh.length) {
      const critical = fresh.some((e) => {
        const m = machine(e.machineId);
        return m !== undefined && severity(e, m) === "critical";
      });
      playChime(critical ? "critical" : "warning");
    }
  }, [sig]);
  useEffect(
    () => () => {
      document.title = BASE;
    },
    [],
  );
}
