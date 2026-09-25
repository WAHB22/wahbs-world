import { z } from "zod";

/**
 * One schema per synced table. The same schemas validate forms, sync payloads
 * and imports, and supabase/migrations/0001_init.sql mirrors them column for column
 * (tests/unit/schema-sql.test.ts keeps the two in step).
 */

const id = z.string().uuid();
const ref = id.nullable().default(null);
const text = z.string().max(20_000);
const opt = text.nullable().default(null);
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");
const optDay = day.nullable().default(null);
const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "expected HH:MM");
const optTime = time.nullable().default(null);
const stamp = z.string().datetime({ offset: true });
const optStamp = stamp.nullable().default(null);
const cents = z.number().int();
const optCents = cents.nullable().default(null);
const num = z.number().nullable().default(null);
const flag = z.boolean().default(false);
const list = z.array(z.string()).default([]);
const ids = z.array(id).default([]);

export const base = z.object({
  id,
  user_id: id.nullable().default(null),
  created_at: stamp,
  updated_at: stamp,
  hlc: z.string().min(1),
  deleted_at: optStamp,
  rev: z.number().int().nullable().default(null),
  device_id: z.string().min(1),
});
export type Base = z.infer<typeof base>;

const t = <S extends z.ZodRawShape>(shape: S) => base.extend(shape);

export const AREAS = ["today", "school", "work", "money", "projects", "career", "knowledge", "training", "life"] as const;
export const CHECKIN_KINDS = ["task_done", "shift_worked", "gym_done", "spent", "moment"] as const;

export const tables = {
  days: t({ day, one_thing: opt, one_thing_ref: opt, mood: num, energy: num, note: opt }),
  checkins: t({
    occurred_at: stamp,
    local_day: day,
    kind: z.enum(CHECKIN_KINDS),
    ref_table: opt,
    ref_id: ref,
    payload: z.record(z.string(), z.unknown()).default({}),
  }),
  tasks: t({
    title: z.string().min(1).max(500),
    area: z.enum(AREAS).default("today"),
    due_on: optDay,
    done_at: optStamp,
    priority: z.enum(["high", "medium", "low"]).default("medium"),
    course_id: ref,
    project_id: ref,
    resource_id: ref,
    notes: opt,
  }),
  resources: t({
    title: z.string().min(1),
    publisher: text,
    url: z.string().url(),
    summary: opt,
    area: z.enum(AREAS),
    verified_on: optDay,
    link_status: z.enum(["ok", "broken", "unchecked"]).default("unchecked"),
    link_checked_at: optStamp,
  }),
  settings: t({
    motion: z.enum(["full", "reduced", "system"]).default("system"),
    intensity_cap: z.enum(["calm", "opening", "service", "rush"]).default("rush"),
    sound_profile: z.enum(["off", "subtle", "full"]).default("off"),
    volume: z.number().min(0).max(1).default(0.6),
    week_starts_on: z.number().int().min(0).max(6).default(1),
    hours_warning: flag,
    transition: z.enum(["morph", "dive", "liquid", "shatter"]).default("liquid"),
    theme: z.enum(["system", "light", "dark"]).default("system"),
  }),
  chapters: t({ period_kind: z.enum(["week", "month"]), period_start: day, title: opt, note: opt, cover_photo_id: ref }),

  terms: t({
    name: z.string().min(1),
    kind: z.enum(["study", "break", "work"]).default("study"),
    starts_on: day,
    ends_on: day,
    status: z.enum(["planned", "current", "archived"]).default("planned"),
  }),
  term_breaks: t({ term_id: id, name: z.string().min(1), starts_on: day, ends_on: day }),
  courses: t({
    term_id: id,
    code: z.string().min(1),
    name: z.string().min(1),
    professor: opt,
    language: z.enum(["en", "fr"]).default("en"),
    retake: flag,
    topics: list,
    links: z.array(z.object({ label: z.string(), url: z.string().url() })).default([]),
    notes: opt,
  }),
  schedule_blocks: t({
    term_id: ref,
    course_id: ref,
    kind: z.enum(["lecture", "tutorial", "lab", "discussion", "study", "gym", "shift", "other"]),
    title: z.string().min(1),
    weekday: z.number().int().min(0).max(6),
    starts_at: time,
    ends_at: time,
    location: opt,
    valid_from: optDay,
    valid_to: optDay,
  }),
  assessments: t({
    course_id: ref,
    project_id: ref,
    title: z.string().min(1),
    kind: z.enum(["quiz", "midterm", "exam", "assignment", "report", "deliverable", "other"]).default("other"),
    due_on: optDay,
    due_time: optTime,
    weight: num,
    covers: list,
    status: z.enum(["open", "done", "dropped"]).default("open"),
    grade: num,
    grade_out_of: num,
    notes: opt,
  }),

  employers: t({ name: z.string().min(1), hourly_cents: optCents, tips_estimate_cents: optCents, deduction_rate: num }),
  shifts: t({
    employer_id: ref,
    starts_at: stamp,
    ends_at: stamp,
    unpaid_break_min: z.number().int().min(0).default(0),
    status: z.enum(["planned", "worked", "cancelled"]).default("planned"),
    rush: z.array(z.object({ from: time, to: time })).default([]),
    pay_cents: optCents,
    tips_cents: optCents,
    notes: opt,
  }),

  accounts: t({ name: z.string().min(1), kind: z.enum(["chequing", "savings", "cash", "credit"]), is_own: z.boolean().default(true) }),
  categories: t({
    group_name: z.string().min(1),
    name: z.string().min(1),
    kind: z.enum(["expense", "income"]).default("expense"),
    monthly_budget_cents: optCents,
    archived: flag,
  }),
  recurring_bills: t({
    name: z.string().min(1),
    amount_cents: cents,
    day_of_month: z.number().int().min(1).max(31),
    category_id: ref,
    account_id: ref,
    active: z.boolean().default(true),
  }),
  transactions: t({
    occurred_on: day,
    amount_cents: cents.nonnegative(),
    direction: z.enum(["in", "out", "transfer"]),
    account_id: ref,
    to_account_id: ref,
    category_id: ref,
    merchant: opt,
    note: opt,
    goal_id: ref,
    memory_id: ref,
    source: z.enum(["manual", "recurring"]).default("manual"),
  }),
  goals: t({
    kind: z.enum(["money", "training", "career", "other"]),
    name: z.string().min(1),
    target_cents: optCents,
    target_value: num,
    due_on: optDay,
    term_id: ref,
    notes: opt,
  }),

  projects: t({
    title: z.string().min(1),
    type: z.enum(["engineering", "business", "school", "creative", "personal", "experiment", "idea"]),
    stage: z.enum(["idea", "exploring", "planning", "building", "shipping", "done", "paused", "dropped"]).default("idea"),
    objective: opt,
    success: opt,
    deadline: optDay,
    weekly_hours: num,
    course_id: ref,
    notes: opt,
  }),
  project_tasks: t({
    project_id: id,
    title: z.string().min(1),
    deliverable: opt,
    due_on: optDay,
    estimate_hours: num,
    kind: z.enum(["research", "build", "present", "admin"]).default("build"),
    priority: z.enum(["high", "medium", "low"]).default("medium"),
    status: z.enum(["todo", "doing", "done"]).default("todo"),
    depends_on: ids,
    done_at: optStamp,
  }),
  project_sessions: t({ project_id: id, started_at: stamp, minutes: z.number().int().min(0), kind: z.enum(["work", "rehearsal"]).default("work"), note: opt }),
  project_logs: t({ project_id: id, kind: z.enum(["progress", "risk", "lesson", "decision", "rehearsal"]), body: z.string().min(1), occurred_on: day }),

  applications: t({
    organization: z.string().min(1),
    role: z.string().min(1),
    location: opt,
    url: z.string().url().nullable().default(null),
    season: opt,
    status: z.enum(["researching", "applied", "interview", "offer", "rejected", "withdrawn"]).default("researching"),
    applied_on: optDay,
    next_step: opt,
    next_step_on: optDay,
    notes: opt,
  }),
  evidence: t({
    title: z.string().min(1),
    kind: z.enum(["project", "course", "work", "award", "other"]),
    project_id: ref,
    url: z.string().url().nullable().default(null),
    description: opt,
    occurred_on: optDay,
  }),
  skills: t({ name: z.string().min(1), notes: opt }),
  evidence_skills: t({ evidence_id: id, skill_id: id }),
  stories: t({ title: z.string().min(1), situation: opt, action: opt, result: opt, lesson: opt, evidence_ids: ids }),
  linkedin_drafts: t({ section: z.enum(["headline", "about", "experience", "projects", "featured"]), body: text.default(""), resource_id: ref }),
  term_plans: t({ term_label: z.string().min(1), option: z.string().min(1), probability: num, note: opt }),

  knowledge_entries: t({
    topic: z.string().min(1),
    learned: opt,
    source_title: opt,
    source_url: z.string().url(),
    why_it_matters: opt,
    questions: opt,
    review_on: optDay,
    interval_days: z.number().int().min(0).default(1),
    ease: z.number().default(2.5),
    changed_mind: flag,
    rabbit_hole: flag,
    course_id: ref,
  }),
  knowledge_links: t({ from_id: id, to_id: id }),
  training_sessions: t({
    occurred_on: day,
    kind: z.enum(["strength", "cardio", "sport", "mobility", "other"]).default("strength"),
    minutes: z.number().int().min(0).nullable().default(null),
    notes: opt,
  }),
  memories: t({
    occurred_on: day,
    title: z.string().min(1),
    body: opt,
    kind: z.enum(["place", "meal", "outing", "people", "good_day", "hard_day", "mistake", "spontaneous"]).default("spontaneous"),
    place: opt,
    people: list,
  }),
  people: t({ name: z.string().min(1).max(120), first_seen_on: day, times_mentioned: z.number().int().min(0).default(1) }),
  photos: t({
    memory_id: ref,
    storage_path: opt,
    width: z.number().int().nullable().default(null),
    height: z.number().int().nullable().default(null),
    bytes: z.number().int().nullable().default(null),
    blurhash: opt,
    taken_at: optStamp,
  }),
} as const;

export type TableName = keyof typeof tables;
export const TABLES = Object.keys(tables) as TableName[];
export type Row<T extends TableName> = z.infer<(typeof tables)[T]>;
export type Input<T extends TableName> = z.input<(typeof tables)[T]>;
export type AnyRow = Base & Record<string, unknown>;

export const isTable = (name: string): name is TableName => Object.prototype.hasOwnProperty.call(tables, name);

/** Keys that may not hold null, per table. A null there (from Postgres or an old export) means "use the default". */
const notNullable = Object.fromEntries(
  TABLES.map((name) => {
    const shape = tables[name].shape as Record<string, z.ZodType>;
    return [name, Object.keys(shape).filter((k) => !shape[k].safeParse(null).success)];
  }),
) as Record<TableName, string[]>;

function dropNulls(table: TableName, input: unknown): unknown {
  if (!input || typeof input !== "object") return input;
  const copy = { ...(input as Record<string, unknown>) };
  for (const k of notNullable[table]) if (copy[k] === null) delete copy[k];
  return copy;
}

/** Validate a row for a table, filling defaults. Use this rather than tables[x].parse. */
export function parseRow<T extends TableName>(table: T, input: unknown): Row<T> {
  return tables[table].parse(dropNulls(table, input)) as Row<T>;
}

export function safeParseRow<T extends TableName>(table: T, input: unknown) {
  return tables[table].safeParse(dropNulls(table, input));
}
