"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect } from "react";
import { useWorld } from "@/data/runtime";

/** Applies the synced motion setting to the page; "system" follows prefers-reduced-motion. */
export function MotionPreference() {
  const { store } = useWorld();
  const settings = useLiveQuery(async () => (store ? (await store.all("settings"))[0] : undefined), [store]);
  useEffect(() => {
    const m = settings?.motion ?? "system";
    if (m === "system") delete document.documentElement.dataset.motion;
    else document.documentElement.dataset.motion = m;
  }, [settings?.motion]);
  return null;
}
