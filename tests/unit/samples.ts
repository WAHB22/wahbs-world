import type { TableName } from "@/data/schema";

const u = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const d = "2026-09-24";
const ts = "2026-09-24T12:00:00.000Z";

/** One valid row for every table, used to prove nothing is lost in a round trip. */
export function sampleRows(): [TableName, Record<string, unknown>][] {
  return [
    ["days", { day: d, one_thing: "Study CHM 2120", mood: 4 }],
    ["checkins", { occurred_at: ts, local_day: d, kind: "moment", payload: { text: "Sunset on the canal" } }],
    ["tasks", { title: "Book advisers", area: "career", due_on: d }],
    ["resources", { title: "Work off campus", publisher: "IRCC", url: "https://www.canada.ca/", area: "career" }],
    ["settings", { motion: "reduced", sound_profile: "subtle", volume: 0.4 }],
    ["chapters", { period_kind: "week", period_start: d, note: "Good week" }],
    ["terms", { name: "Fall 2026", starts_on: "2026-09-02", ends_on: "2026-12-23", status: "current" }],
    ["term_breaks", { term_id: u(1), name: "Reading week", starts_on: "2026-10-11", ends_on: "2026-10-17" }],
    ["courses", { term_id: u(1), code: "CHG 3735", name: "Contrôle des procédés", language: "fr", topics: ["PID"], links: [{ label: "Site", url: "https://www.uottawa.ca/" }] }],
    ["schedule_blocks", { kind: "lecture", title: "CHG 3337 lecture", weekday: 1, starts_at: "17:30", ends_at: "18:50" }],
    ["assessments", { title: "Midterm 1", kind: "midterm", due_on: "2026-09-30", weight: 20, covers: ["SN1 and SN2"] }],
    ["employers", { name: "Bobino Bagel", hourly_cents: 1800 }],
    ["shifts", { starts_at: "2026-09-26T12:00:00.000Z", ends_at: "2026-09-26T20:00:00.000Z", unpaid_break_min: 30, rush: [{ from: "11:30", to: "13:00" }] }],
    ["accounts", { name: "Chequing", kind: "chequing" }],
    ["categories", { group_name: "Food", name: "Groceries", monthly_budget_cents: 40000 }],
    ["recurring_bills", { name: "Phone", amount_cents: 8943, day_of_month: 15 }],
    ["transactions", { occurred_on: d, amount_cents: 1250, direction: "out", merchant: "Market" }],
    ["goals", { kind: "money", name: "Tuition cushion", target_cents: 1_000_000 }],
    ["projects", { title: "DOTS", type: "creative", stage: "exploring" }],
    ["project_tasks", { project_id: u(2), title: "Pitch deck", depends_on: [u(3)] }],
    ["project_sessions", { project_id: u(2), started_at: ts, minutes: 50 }],
    ["project_logs", { project_id: u(2), kind: "lesson", body: "Start earlier", occurred_on: d }],
    ["applications", { organization: "Example Co", role: "Process intern", status: "researching" }],
    ["evidence", { title: "Pitch deck", kind: "project" }],
    ["skills", { name: "Process control" }],
    ["evidence_skills", { evidence_id: u(4), skill_id: u(5) }],
    ["stories", { title: "Opening a café", evidence_ids: [u(4)] }],
    ["linkedin_drafts", { section: "headline", body: "Chemical engineering student" }],
    ["term_plans", { term_label: "Summer 2027", option: "Internship", probability: 0.5 }],
    ["knowledge_entries", { topic: "Arrhenius", source_url: "https://www.nobelprize.org/", review_on: d }],
    ["knowledge_links", { from_id: u(6), to_id: u(7) }],
    ["training_sessions", { occurred_on: d, kind: "strength", minutes: 60 }],
    ["memories", { occurred_on: d, title: "Dinner with friends", people: ["Aurélie"] }],
    ["people", { name: "Aurélie", first_seen_on: d }],
    ["photos", { memory_id: u(8), width: 1600, height: 1200, bytes: 300000 }],
  ];
}
