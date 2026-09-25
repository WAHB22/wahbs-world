"use client";

import { useEffect } from "react";
import { useSettings } from "@/ui/useSettings";

/** Applies the synced motion and theme settings to the page; "system" follows the device. */
export function MotionPreference() {
  const settings = useSettings();
  useEffect(() => {
    const root = document.documentElement;
    const m = settings?.motion ?? "system";
    if (m === "system") delete root.dataset.motion; else root.dataset.motion = m;
    const t = settings?.theme ?? "system";
    if (t === "system") delete root.dataset.theme; else root.dataset.theme = t;
  }, [settings?.motion, settings?.theme]);
  return null;
}
