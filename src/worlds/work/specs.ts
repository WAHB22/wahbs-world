import type { FieldSpec } from "@/ui/kit/EditSheet";

export function shiftSpec(employers: { id: string; name: string }[]): FieldSpec[] {
  return [
    { name: "day", label: "Day", type: "date", required: true },
    { name: "start", label: "Starts", type: "time", required: true },
    { name: "end", label: "Ends", type: "time", required: true, hint: "An end before the start runs past midnight." },
    { name: "employer_id", label: "Where", type: "select", options: employers.map((e) => ({ value: e.id, label: e.name })) },
    { name: "status", label: "Status", type: "select", required: true, options: [{ value: "planned", label: "Planned" }, { value: "worked", label: "Worked" }, { value: "cancelled", label: "Cancelled" }] },
    { name: "unpaid_break_min", label: "Unpaid break in minutes", type: "number" },
    { name: "tips_cents", label: "Tips", type: "money" },
    { name: "pay_cents", label: "Pay from the stub", type: "money", hint: "Leave empty to estimate from the hourly wage." },
    { name: "notes", label: "Notes", type: "textarea" },
  ];
}

export function employerSpec(): FieldSpec[] {
  return [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "hourly_cents", label: "Hourly wage", type: "money", hint: "Used to estimate pay before the stub arrives." },
    { name: "tips_estimate_cents", label: "Usual tips per shift", type: "money" },
  ];
}
