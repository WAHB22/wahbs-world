import type { Row } from "@/data/schema";
import type { FieldSpec } from "@/ui/kit/EditSheet";

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export function applicationSpec(): FieldSpec[] {
  return [
    { name: "organization", label: "Organization", type: "text", required: true },
    { name: "role", label: "Role", type: "text", required: true },
    { name: "status", label: "Status", type: "select", required: true, options: ["researching", "applied", "interview", "offer", "rejected", "withdrawn"].map((s) => ({ value: s, label: cap(s) })) },
    { name: "season", label: "For", type: "text", placeholder: "Summer 2027" },
    { name: "location", label: "Where", type: "text" },
    { name: "url", label: "Posting link", type: "url" },
    { name: "applied_on", label: "Applied on", type: "date" },
    { name: "next_step", label: "Next step", type: "text" },
    { name: "next_step_on", label: "Next step on", type: "date" },
    { name: "notes", label: "Notes", type: "textarea" },
  ];
}

export function evidenceSpec(projects: Row<"projects">[], skills: Row<"skills">[]): FieldSpec[] {
  return [
    { name: "title", label: "What you did", type: "text", required: true },
    { name: "kind", label: "Kind", type: "select", required: true, options: ["project", "course", "work", "award", "other"].map((s) => ({ value: s, label: cap(s) })) },
    { name: "occurred_on", label: "When", type: "date" },
    { name: "project_id", label: "Project", type: "select", options: projects.map((p) => ({ value: p.id, label: p.title })) },
    { name: "url", label: "Link to show it", type: "url" },
    { name: "description", label: "What it shows", type: "textarea" },
    { name: "skill_ids", label: "Skills it proves", type: "multi", options: skills.map((s) => ({ value: s.id, label: s.name })) },
  ];
}

export function storySpec(evidence: Row<"evidence">[]): FieldSpec[] {
  return [
    { name: "title", label: "Story", type: "text", required: true, placeholder: "Opening the café on a short team" },
    { name: "situation", label: "Situation", type: "textarea" },
    { name: "action", label: "What you did", type: "textarea" },
    { name: "result", label: "Result", type: "textarea" },
    { name: "lesson", label: "What you learned", type: "textarea" },
    { name: "evidence_ids", label: "Evidence it draws on", type: "multi", options: evidence.map((e) => ({ value: e.id, label: e.title })) },
  ];
}

export function stepSpec(): FieldSpec[] {
  return [
    { name: "title", label: "Step", type: "text", required: true },
    { name: "notes", label: "Notes", type: "textarea" },
    { name: "priority", label: "Priority", type: "select", required: true, options: ["high", "medium", "low"].map((s) => ({ value: s, label: cap(s) })) },
    { name: "due_on", label: "By", type: "date" },
  ];
}

export function planSpec(): FieldSpec[] {
  return [
    { name: "term_label", label: "Term", type: "text", required: true, placeholder: "Summer 2027" },
    { name: "option", label: "Option", type: "text", required: true, placeholder: "Internship" },
    { name: "probability", label: "Your odds, in percent", type: "number" },
    { name: "note", label: "Note", type: "textarea" },
  ];
}
