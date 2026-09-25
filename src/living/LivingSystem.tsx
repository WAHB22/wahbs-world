"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useState, useSyncExternalStore } from "react";
import { localDay } from "@/data/dates";
import { useWorld } from "@/data/runtime";
import { useSettings } from "@/ui/useSettings";
import { addDays } from "@/worlds/useWorldStatus";
import { capped, getIntensity, naturalIntensity, setIntensity, subscribeIntensity, type Intensity } from "./intensity";
import { configureSound } from "./sound";

/** Keeps the page's pace (data-intensity) and the sound settings in step with the data and Settings. */
export function LivingSystem() {
  const { store } = useWorld();
  const settings = useSettings();
  const [minute, setMinute] = useState(() => Math.floor(Date.now() / 60_000));
  useEffect(() => { const id = window.setInterval(() => setMinute(Math.floor(Date.now() / 60_000)), 60_000); return () => clearInterval(id); }, []);

  const load = useLiveQuery(async () => {
    if (!store) return undefined;
    const today = localDay();
    const [assessments, tasks, shifts] = await Promise.all([store.all("assessments"), store.all("tasks"), store.all("shifts")]);
    const openA = assessments.filter((a) => a.status === "open" && a.due_on);
    const now = Date.now();
    return {
      dueToday: openA.filter((a) => a.due_on === today).length + tasks.filter((t) => !t.done_at && t.due_on === today).length,
      overdue: openA.filter((a) => a.due_on! < today).length + tasks.filter((t) => !t.done_at && t.due_on && t.due_on < today).length,
      dueSoon: openA.filter((a) => a.due_on! > today && a.due_on! <= addDays(today, 2)).length,
      shiftNow: shifts.some((s) => s.status !== "cancelled" && Date.parse(s.starts_at) <= now && Date.parse(s.ends_at) > now),
      shiftToday: shifts.some((s) => s.status !== "cancelled" && localDay(new Date(s.starts_at)) === today),
    };
  }, [store, minute]);

  useEffect(() => {
    if (!load) return;
    const level = capped(naturalIntensity(new Date(), load), (settings?.intensity_cap ?? "rush") as Intensity);
    setIntensity(level);
    document.documentElement.dataset.intensity = level;
  }, [load, settings?.intensity_cap, minute]);

  useEffect(() => { configureSound(settings?.sound_profile ?? "off", settings?.volume ?? 0.6); }, [settings?.sound_profile, settings?.volume]);
  return null;
}

export function useIntensity(): Intensity {
  return useSyncExternalStore(subscribeIntensity, getIntensity, () => "opening");
}
