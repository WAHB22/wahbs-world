import type { FieldSpec } from "@/ui/kit/EditSheet";
import { KIND_LABEL } from "./data";

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function assessmentSpec(courses: { id: string; code: string }[]): FieldSpec[] {
  return [
    { name: "title", label: "What it is", type: "text", required: true, placeholder: "Midterm 2" },
    { name: "course_id", label: "Course", type: "select", required: true, options: courses.map((c) => ({ value: c.id, label: c.code })) },
    { name: "kind", label: "Kind", type: "select", required: true, options: Object.entries(KIND_LABEL).map(([value, label]) => ({ value, label })) },
    { name: "due_on", label: "Due on", type: "date" },
    { name: "due_time", label: "At", type: "time" },
    { name: "weight", label: "Weight in percent", type: "number" },
    { name: "status", label: "Status", type: "select", required: true, options: [{ value: "open", label: "Open" }, { value: "done", label: "Done" }, { value: "dropped", label: "Dropped" }] },
    { name: "grade", label: "Grade", type: "number" },
    { name: "grade_out_of", label: "Out of", type: "number" },
    { name: "covers", label: "Covers (topics, separated by commas)", type: "list" },
    { name: "notes", label: "Notes", type: "textarea" },
  ];
}

export function blockSpec(courses: { id: string; code: string }[]): FieldSpec[] {
  return [
    { name: "title", label: "Title", type: "text", required: true, placeholder: "CHG 3127 lecture" },
    { name: "kind", label: "Kind", type: "select", required: true, options: ["lecture", "tutorial", "lab", "discussion", "study", "gym", "shift", "other"].map((k) => ({ value: k, label: k[0].toUpperCase() + k.slice(1) })) },
    { name: "course_id", label: "Course", type: "select", options: courses.map((c) => ({ value: c.id, label: c.code })) },
    { name: "weekday", label: "Day", type: "select", required: true, options: DAYS.map((d, i) => ({ value: String(i), label: d })) },
    { name: "starts_at", label: "Starts", type: "time", required: true },
    { name: "ends_at", label: "Ends", type: "time", required: true },
    { name: "location", label: "Room", type: "text" },
  ];
}


export function courseSpec(): FieldSpec[] {
  return [
    { name: "code", label: "Code", type: "text", required: true, placeholder: "CHG 4250" },
    { name: "name", label: "Name", type: "text", required: true },
    { name: "professor", label: "Professor", type: "text" },
    { name: "language", label: "Taught in", type: "select", required: true, options: [{ value: "en", label: "English" }, { value: "fr", label: "French" }] },
    { name: "retake", label: "A retake", type: "checkbox" },
    { name: "topics", label: "Chapters or topics, separated by commas", type: "list" },
    { name: "notes", label: "Notes", type: "textarea" },
  ];
}
