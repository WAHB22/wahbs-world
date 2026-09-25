"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { localDay } from "@/data/dates";
import { useWorld } from "@/data/runtime";
import type { Row } from "@/data/schema";

export type CourseView = Row<"courses"> & {
  assessments: Row<"assessments">[];
  conversion: number; // share of the course weight already done, 0 to 1
  grade: number | null; // weighted percent over graded work
  next: Row<"assessments"> | null;
};

/** The current term and its courses, each with its deadlines and progress. */
export function useSchool() {
  const { store } = useWorld();
  return useLiveQuery(async () => {
    if (!store) return undefined;
    const today = localDay();
    const [terms, courses, assessments, blocks] = await Promise.all([store.all("terms"), store.all("courses"), store.all("assessments"), store.all("schedule_blocks")]);
    const term = terms.find((t) => t.status === "current") ?? null;
    const mine = courses.filter((c) => !term || c.term_id === term.id).sort((a, b) => a.code.localeCompare(b.code));
    const views: CourseView[] = mine.map((c) => {
      const list = assessments.filter((a) => a.course_id === c.id).sort((a, b) => (a.due_on ?? "9999").localeCompare(b.due_on ?? "9999"));
      const total = list.reduce((n, a) => n + (a.weight ?? 0), 0);
      const done = list.filter((a) => a.status === "done").reduce((n, a) => n + (a.weight ?? 0), 0);
      const graded = list.filter((a) => a.grade != null && a.grade_out_of);
      const gw = graded.reduce((n, a) => n + (a.weight ?? 0), 0);
      const grade = gw ? graded.reduce((n, a) => n + ((a.grade! / a.grade_out_of!) * 100 * (a.weight ?? 0)), 0) / gw : null;
      const next = list.find((a) => a.status === "open" && a.due_on && a.due_on >= today) ?? null;
      return { ...c, assessments: list, conversion: total ? done / total : 0, grade, next };
    });
    const allWeight = views.reduce((n, c) => n + c.assessments.reduce((m, a) => m + (a.weight ?? 0), 0), 0);
    const doneWeight = views.reduce((n, c) => n + c.assessments.filter((a) => a.status === "done").reduce((m, a) => m + (a.weight ?? 0), 0), 0);
    const termBlocks = blocks.filter((b) => !term || !b.term_id || b.term_id === term.id);
    return { today, term, terms, courses: views, blocks: termBlocks, conversion: allWeight ? doneWeight / allWeight : 0 };
  }, [store]);
}

export const KIND_LABEL: Record<string, string> = {
  quiz: "Quiz", midterm: "Midterm", exam: "Exam", assignment: "Assignment", report: "Report", deliverable: "Deliverable", other: "Other",
};
