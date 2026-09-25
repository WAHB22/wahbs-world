"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { localDay } from "@/data/dates";
import { Recap } from "@/living/Recap";
import { addDays, weekStart } from "@/worlds/useWorldStatus";

function WeekRecap() {
  const today = localDay();
  const asked = useSearchParams().get("week");
  const from = weekStart(asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) ? asked : today);
  const to = addDays(from, 6);
  const current = from === weekStart(today);
  const label = new Date(`${from}T12:00:00`).toLocaleDateString("en-CA", { month: "long", day: "numeric" });
  return <Recap kind="week" from={from} to={to} title={current ? "This week" : `Week of ${label}`} prev={`/recap?week=${addDays(from, -7)}`} next={current ? null : `/recap?week=${addDays(from, 7)}`} isCurrent={current} />;
}

export default function RecapPage() {
  return <Suspense><WeekRecap /></Suspense>;
}
