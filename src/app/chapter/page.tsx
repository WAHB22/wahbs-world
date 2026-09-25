"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { localDay } from "@/data/dates";
import { Recap } from "@/living/Recap";
import { monthDays, monthName, shiftMonth } from "@/worlds/money/data";

function MonthChapter() {
  const today = localDay();
  const asked = useSearchParams().get("month");
  const month = asked && /^\d{4}-\d{2}$/.test(asked) ? asked : today.slice(0, 7);
  const current = month === today.slice(0, 7);
  return <Recap kind="month" from={`${month}-01`} to={`${month}-${String(monthDays(month)).padStart(2, "0")}`} title={monthName(month)}
    prev={`/chapter?month=${shiftMonth(month, -1)}`} next={current ? null : `/chapter?month=${shiftMonth(month, 1)}`} isCurrent={current} />;
}

export default function ChapterPage() {
  return <Suspense><MonthChapter /></Suspense>;
}
