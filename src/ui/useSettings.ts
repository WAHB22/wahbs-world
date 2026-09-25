"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useWorld } from "@/data/runtime";
import type { Row } from "@/data/schema";

/** The one settings row, live. Undefined while the store opens. */
export function useSettings(): Row<"settings"> | undefined {
  const { store } = useWorld();
  return useLiveQuery(async () => (store ? (await store.all("settings"))[0] : undefined), [store]);
}
