import type { Row } from "@/data/schema";
import type { FieldSpec } from "@/ui/kit/EditSheet";

const opts = <T extends { id: string; name: string }>(xs: T[], label: (x: T) => string = (x) => x.name) => xs.map((x) => ({ value: x.id, label: label(x) }));

export function txSpec(accounts: Row<"accounts">[], categories: Row<"categories">[], goals: Row<"goals">[]): FieldSpec[] {
  return [
    { name: "amount_cents", label: "Amount", type: "money", required: true, placeholder: "12.50" },
    { name: "direction", label: "Kind", type: "select", required: true, options: [{ value: "out", label: "Spent" }, { value: "in", label: "Came in" }, { value: "transfer", label: "Moved between accounts" }] },
    { name: "occurred_on", label: "Day", type: "date", required: true },
    { name: "merchant", label: "Where or who", type: "text" },
    { name: "category_id", label: "Category", type: "select", options: opts(categories, (c) => `${c.group_name}: ${c.name}`) },
    { name: "account_id", label: "Account", type: "select", options: opts(accounts) },
    { name: "to_account_id", label: "To account (for a move)", type: "select", options: opts(accounts) },
    { name: "goal_id", label: "Toward a goal", type: "select", options: opts(goals) },
    { name: "note", label: "Note", type: "textarea" },
  ];
}

export function billSpec(accounts: Row<"accounts">[], categories: Row<"categories">[]): FieldSpec[] {
  return [
    { name: "name", label: "Name", type: "text", required: true, placeholder: "Phone plan" },
    { name: "amount_cents", label: "Amount", type: "money", required: true },
    { name: "day_of_month", label: "Day of the month", type: "number", required: true, hint: "A day past the end of a short month falls on its last day." },
    { name: "category_id", label: "Category", type: "select", options: opts(categories, (c) => `${c.group_name}: ${c.name}`) },
    { name: "account_id", label: "Paid from", type: "select", options: opts(accounts) },
    { name: "active", label: "Still paying this", type: "checkbox" },
  ];
}

export function categorySpec(): FieldSpec[] {
  return [
    { name: "name", label: "Name", type: "text", required: true },
    { name: "group_name", label: "Group", type: "text", required: true, placeholder: "Food" },
    { name: "kind", label: "Kind", type: "select", required: true, options: [{ value: "expense", label: "Spending" }, { value: "income", label: "Income" }] },
    { name: "monthly_budget_cents", label: "Monthly budget", type: "money", hint: "Leave empty for no budget." },
    { name: "archived", label: "Hide this category", type: "checkbox" },
  ];
}

export function goalSpec(): FieldSpec[] {
  return [
    { name: "name", label: "What for", type: "text", required: true, placeholder: "Winter tuition" },
    { name: "target_cents", label: "Target", type: "money", required: true },
    { name: "due_on", label: "By", type: "date" },
    { name: "notes", label: "Notes", type: "textarea" },
  ];
}
