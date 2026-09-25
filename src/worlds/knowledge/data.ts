"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { localDay } from "@/data/dates";
import { useWorld } from "@/data/runtime";
import type { Row } from "@/data/schema";

export type EntryView = Row<"knowledge_entries"> & { links: string[] };

export function useKnowledge() {
  const { store } = useWorld();
  return useLiveQuery(async () => {
    if (!store) return undefined;
    const today = localDay();
    const [entries, links, courses] = await Promise.all([store.all("knowledge_entries"), store.all("knowledge_links"), store.all("courses")]);
    const views: EntryView[] = entries.map((e) => ({
      ...e, links: links.filter((l) => l.from_id === e.id || l.to_id === e.id).map((l) => (l.from_id === e.id ? l.to_id : l.from_id)),
    })).sort((a, b) => b.created_at.localeCompare(a.created_at));
    const due = views.filter((e) => !e.review_on || e.review_on <= today).sort((a, b) => (a.review_on ?? "").localeCompare(b.review_on ?? ""));
    return { today, entries: views, due, links, courses };
  }, [store]);
}
