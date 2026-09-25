"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useWorld } from "@/data/runtime";
import type { Row, TableName } from "@/data/schema";

/** Live rows of a table (tombstones hidden). Re-renders when any of them change. */
export function useRows<T extends TableName>(table: T, deps: unknown[] = []): Row<T>[] | undefined {
  const { store } = useWorld();
  return useLiveQuery(async () => (store ? store.all(table) : undefined), [store, table, ...deps]);
}
