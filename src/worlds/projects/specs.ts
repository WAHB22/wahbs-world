import type { Row } from "@/data/schema";
import type { FieldSpec } from "@/ui/kit/EditSheet";
import { cap, STAGES, TYPES } from "./data";

export function projectSpec(courses: { id: string; code: string }[]): FieldSpec[] {
  return [
    { name: "title", label: "Name", type: "text", required: true },
    { name: "type", label: "Kind", type: "select", required: true, options: TYPES.map((t) => ({ value: t, label: cap(t) })) },
    { name: "stage", label: "Stage", type: "select", required: true, options: STAGES.map((s) => ({ value: s.id, label: s.name })) },
    { name: "deadline", label: "Deadline", type: "date" },
    { name: "weekly_hours", label: "Hours a week you give it", type: "number" },
    { name: "course_id", label: "Course", type: "select", options: courses.map((c) => ({ value: c.id, label: c.code })) },
    { name: "objective", label: "Objective", type: "textarea" },
    { name: "success", label: "What success looks like", type: "textarea" },
    { name: "notes", label: "Notes", type: "textarea" },
  ];
}

export function taskSpec(others: Row<"project_tasks">[]): FieldSpec[] {
  return [
    { name: "title", label: "Task", type: "text", required: true },
    { name: "deliverable", label: "Deliverable it belongs to", type: "text", placeholder: "Business plan" },
    { name: "due_on", label: "Due", type: "date" },
    { name: "estimate_hours", label: "Estimated hours", type: "number" },
    { name: "kind", label: "Kind", type: "select", required: true, options: ["research", "build", "present", "admin"].map((k) => ({ value: k, label: cap(k) })) },
    { name: "priority", label: "Priority", type: "select", required: true, options: ["high", "medium", "low"].map((k) => ({ value: k, label: cap(k) })) },
    { name: "status", label: "Status", type: "select", required: true, options: [{ value: "todo", label: "To do" }, { value: "doing", label: "Doing" }, { value: "done", label: "Done" }] },
    { name: "depends_on", label: "Waits on", type: "multi", options: others.map((t) => ({ value: t.id, label: t.title })) },
  ];
}

export function sessionSpec(): FieldSpec[] {
  return [
    { name: "day", label: "Day", type: "date", required: true },
    { name: "minutes", label: "Minutes", type: "number", required: true },
    { name: "kind", label: "Kind", type: "select", required: true, options: [{ value: "work", label: "Work" }, { value: "rehearsal", label: "Rehearsal" }] },
    { name: "note", label: "What you did", type: "textarea" },
  ];
}

export function logSpec(): FieldSpec[] {
  return [
    { name: "kind", label: "Kind", type: "select", required: true, options: ["progress", "risk", "lesson", "decision", "rehearsal"].map((k) => ({ value: k, label: cap(k) })) },
    { name: "occurred_on", label: "Day", type: "date", required: true },
    { name: "body", label: "Entry", type: "textarea", required: true },
  ];
}
