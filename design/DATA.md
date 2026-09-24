# WAHB'S WORLD data model and sync

Implemented in Phase 1. The schema lives in `src/data/schema.ts`; `supabase/migrations/0001_init.sql` is generated from it (`npm run gen`), so the two never drift.

## 1. Principles

1. **The device writes first.** Every change goes to IndexedDB on the device inside one transaction, together with an outbox entry. The interface reads from IndexedDB, so a tap is saved before any network call starts. There is no save button anywhere.
2. **The server is the meeting point, not the source of speed.** Supabase Postgres holds the synced copy for both devices and for backups.
3. **Nothing is silently lost.** Check ins are append only. Edits to the same row on two devices resolve by last writer wins, and the server keeps the replaced version in a history table, so a lost edit can always be recovered.
4. **Data, UI and animation are separate.** Tables know nothing about scenes. Scenes read derived values (for example "jar percent") from selectors, never from raw tables.
5. **Structure in code, life in data.** The nine worlds, their names, scenes and layouts live in code. Everything that changes with time lives in these tables and is editable in the interface.

## 2. Columns every synced table has

| Column | Type | Meaning |
|---|---|---|
| `id` | `uuid` | generated on the device (UUID v7, time ordered), so offline rows need no server round trip |
| `user_id` | `uuid` | owner, defaults to `auth.uid()`; the only thing row level security looks at |
| `created_at` | `timestamptz` | first write, device clock |
| `updated_at` | `timestamptz` | last edit, device clock, informational |
| `hlc` | `text` | hybrid logical clock of the last edit: physical milliseconds, a counter and the device id. Used to order edits even when a phone clock is wrong |
| `deleted_at` | `timestamptz null` | soft delete; the row stays as a tombstone so the other device learns about the delete |
| `rev` | `bigint` | assigned by the server from one sequence on every accepted write; the other device pulls "everything with `rev` above what I have" |
| `device_id` | `text` | which device made the last edit |

Money is stored as integer cents in CAD. Weekdays follow JavaScript (0 is Sunday). Links between tables are plain uuid columns without foreign keys, because rows can arrive in any order from an offline device; the app checks links, and the seed test proves every seed link resolves. Dates that are days (a deadline day, a memory day) are `date`; moments are `timestamptz`. Times of a weekly schedule are `time` in the America/Toronto zone.

## 3. Tables by world

### Shared

| Table | Key fields | Notes |
|---|---|---|
| `days` | `day date unique`, `one_thing`, `one_thing_ref`, `mood`, `energy`, `note` | one row per date; the daily check in and the chosen "one thing" |
| `checkins` | `occurred_at`, `local_day`, `kind`, `ref_table`, `ref_id`, `payload jsonb` | append only events: `task_done`, `shift_worked`, `gym_done`, `spent`, `moment`. Undo sets `deleted_at` |
| `tasks` | `title`, `area`, `due_on`, `done_at`, `priority`, `course_id`, `project_id`, `resource_id`, `notes` | general to dos in any world (`area` is one of the nine worlds) |
| `resources` | `title`, `publisher`, `url`, `summary`, `area`, `verified_on`, `link_status`, `link_checked_at` | every source shown in the site. A weekly link check updates `link_status`; a broken link hides the item until it is fixed |
| `settings` | one row: `motion`, `intensity_cap`, `sound_profile`, `volume`, `week_starts_on`, `currency` | synced preferences. Device only preferences (last world open) stay in local storage |
| `chapters` | `period_kind` (week, month), `period_start`, `title`, `note`, `cover_photo_id` | what he writes on a weekly recap or monthly chapter; the numbers are computed, not stored |

### School

| Table | Key fields | Notes |
|---|---|---|
| `terms` | `name`, `kind` (study, break, work term), `starts_on`, `ends_on`, `status` (planned, current, archived) | archiving a term hides its courses and schedule without deleting anything |
| `term_breaks` | `term_id`, `name`, `starts_on`, `ends_on` | reading week, holidays. IRCC allows unlimited off campus hours during scheduled breaks, so the Work warning turns off inside them |
| `courses` | `term_id`, `code`, `name`, `professor`, `language` (en, fr), `retake`, `topics text[]`, `links jsonb`, `notes` | `topics` holds the chapter list |
| `schedule_blocks` | `term_id`, `course_id null`, `kind` (lecture, tutorial, lab, discussion, study, gym, shift, other), `title`, `weekday`, `starts_at`, `ends_at`, `location`, `valid_from`, `valid_to` | the weekly pattern; shifts that actually happen live in `shifts` |
| `assessments` | `course_id null`, `project_id null`, `title`, `kind` (quiz, midterm, exam, assignment, report, deliverable, other), `due_on null`, `due_time null`, `weight`, `covers text[]`, `status` (open, done, dropped), `grade`, `grade_out_of`, `notes` | deadlines and exams; a null `due_on` means "date not posted yet" and is shown as such |

### Work

| Table | Key fields | Notes |
|---|---|---|
| `employers` | `name`, `hourly_cents`, `tips_estimate_cents`, `deduction_rate` | Bobino Bagel today |
| `shifts` | `employer_id`, `starts_at`, `ends_at`, `unpaid_break_min`, `status` (planned, worked, cancelled), `rush jsonb`, `pay_cents null`, `tips_cents null`, `notes` | paid hours = length minus unpaid break, because IRCC counts time spent earning wages |

The weekly limit check sums paid hours of planned and worked shifts in the week (Monday to Sunday by default, set in Settings), only while the current term is a study term and the day is outside a `term_breaks` range.

### Money

| Table | Key fields | Notes |
|---|---|---|
| `accounts` | `name`, `kind` (chequing, savings, cash, credit), `is_own` | |
| `categories` | `group_name`, `name`, `kind` (expense, income), `monthly_budget_cents`, `archived` | |
| `recurring_bills` | `name`, `amount_cents`, `day_of_month`, `category_id`, `active` | rent, phone, subscriptions |
| `transactions` | `occurred_on`, `amount_cents` (always positive), `direction` (in, out, transfer), `account_id`, `to_account_id null`, `category_id null`, `merchant`, `note`, `goal_id null`, `memory_id null`, `source` (manual, recurring) | a transfer between his own accounts is `direction = transfer`: never income, never spending. Moving money into savings for a goal is a transfer with `goal_id` |
| `goals` | `kind` (money, training, career, other), `name`, `target_cents null`, `target_value null`, `due_on`, `term_id null`, `notes` | the jar reads `sum(transfers with this goal_id) / target_cents` |

### Projects

| Table | Key fields | Notes |
|---|---|---|
| `projects` | `title`, `type` (engineering, business, school, creative, personal, experiment, idea), `stage` (idea, exploring, planning, building, shipping, done, paused, dropped), `objective`, `success`, `deadline`, `weekly_hours`, `course_id null` | an idea is a project at stage `idea`: one path from idea to project |
| `project_tasks` | `project_id`, `title`, `deliverable`, `due_on`, `estimate_hours`, `kind` (research, build, present, admin), `priority`, `status` (todo, doing, done), `depends_on uuid[]`, `done_at` | tasks grouped by deliverable; the critical path and the "does this fit your hours" check are computed from `estimate_hours`, `depends_on` and `weekly_hours` |
| `project_sessions` | `project_id`, `started_at`, `minutes`, `kind` (work, rehearsal), `note` | |
| `project_logs` | `project_id`, `kind` (progress, risk, lesson, decision, rehearsal), `body`, `occurred_on` | |

### Career

| Table | Key fields | Notes |
|---|---|---|
| `applications` | `organization`, `role`, `location`, `url`, `season` (for example Summer 2027), `status` (researching, applied, interview, offer, rejected, withdrawn), `applied_on`, `next_step`, `next_step_on`, `notes` | |
| `evidence` | `title`, `kind` (project, course, work, award, other), `project_id null`, `url`, `description`, `occurred_on` | a finished project becomes evidence |
| `skills` | `name`, `notes` | only skills that evidence supports |
| `evidence_skills` | `evidence_id`, `skill_id` | the Experience to Evidence to Skill links |
| `stories` | `title`, `situation`, `action`, `result`, `lesson`, `evidence_ids uuid[]` | interview stories |
| `linkedin_drafts` | `section` (headline, about, experience, projects, featured), `body`, `resource_id` | |
| `term_plans` | `term_label`, `option`, `probability`, `note` | the two year map with his own probabilities |

### Knowledge, Training, Life

| Table | Key fields | Notes |
|---|---|---|
| `knowledge_entries` | `topic`, `learned`, `source_title`, `source_url`, `why_it_matters`, `questions`, `review_on`, `interval_days`, `ease`, `changed_mind`, `rabbit_hole`, `course_id null` | spaced review uses `interval_days` and `ease`; `source_url` is required |
| `knowledge_links` | `from_id`, `to_id` | the constellation edges |
| `training_sessions` | `occurred_on`, `kind` (strength, cardio, sport, mobility, other), `minutes`, `notes` | sessions only, by his choice |
| `memories` | `occurred_on`, `title`, `body`, `kind` (place, meal, outing, people, good day, hard day, mistake, spontaneous), `place`, `people text[]` |
| `people` | `name`, `first_seen_on`, `times_mentioned` | every name typed in a memory is remembered here, so it can be picked next time |
| `photos` | `memory_id`, `storage_path`, `width`, `height`, `bytes`, `blurhash`, `taken_at` | files live in a private Storage bucket |

### Server only

| Table | Purpose |
|---|---|
| `history` | `table_name`, `row_id`, `old_row jsonb`, `replaced_at`. Written by a trigger on every update of a synced table. Kept 180 days. |
| `backups` | index of the daily JSON snapshots in Storage |

## 4. Security

* Supabase Auth with **email one time code** (six digits, `signInWithOtp` with `shouldCreateUser: false`). A code works inside the installed iPhone app; a magic link would open Safari instead of the home screen app. Passkeys are in public beta in Supabase Auth (May 2026) and can be added on top once stable, for Face ID sign in.
* New sign ups are disabled in the Supabase dashboard. Wahb's single account is created once by hand.
* Sessions persist on his devices (refresh tokens), so he rarely signs in.
* Every table has row level security:

```sql
alter table public.courses enable row level security;
create policy "owner only" on public.courses
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
```

* Photos: a private bucket `photos`, objects stored under `<user id>/<photo id>.webp`, a storage policy that matches the first folder to `auth.uid()`, and short lived signed URLs for display.
* Keys: the anon key is public by design; the service role key exists only in Vercel server environment variables (for the daily backup) and never in the client bundle or the repo.

## 5. Sync

```
 tap ──► Dexie transaction ──► row + outbox entry ──► interface updates (liveQuery)
                                   │
                  online? ─────────┘
                     │
                     ▼
          sync_push(batch) RPC ──► per row: accept if incoming hlc is newer,
                     │               write old version to history, assign rev
                     ▼
          sync_pull(since_rev) RPC ◄── on start, on focus, on reconnect,
                     │                  every 60 s while visible, on a Realtime ping
                     ▼
          merge into Dexie with the same hlc rule, store the new high water rev
```

* **Outbox.** A local only table: `op_id`, `table`, `row_id`, `row` (the full row), `queued_at`, `attempts`, `last_error`. Drained in order, in batches of up to 200, with exponential backoff. An entry is removed only after the server confirms it.
* **Conflicts.** Row level last writer wins by `hlc`. Two devices editing different rows never conflict. Check ins never conflict because each is a new row. The loser of a same row conflict is kept in `history` and can be restored from Settings.
* **Deletes** are soft (`deleted_at`) and sync like edits. Tombstones older than a year can be purged after both devices have synced past them.
* **Durability on the device.** The app requests persistent storage (`navigator.storage.persist()`), which protects IndexedDB from eviction; installing to the home screen matters on iPhone for the same reason. Nothing important lives only in memory.
* **Sync status** is always visible: Saved on this device, Syncing, Synced, or Offline with the count of waiting changes.
* **Photos offline.** A photo taken offline is compressed on the device (1600 px long edge, about 80 percent quality, WebP where the browser can encode it and JPEG otherwise) and stored in IndexedDB until it uploads.

## 6. Export and import

* **Export** (Settings, Data): one JSON file, `wahbs-world-2026-09-24.json`:

```json
{
  "app": "wahbs-world",
  "schema": 1,
  "exported_at": "2026-09-24T21:10:00-04:00",
  "tables": { "courses": [], "assessments": [], "checkins": [] },
  "photos": [{ "id": "…", "storage_path": "…", "bytes": 312004 }]
}
```

  It includes tombstones so an import can reproduce deletes. Photos are listed, not embedded; a separate "download photos" action makes a zip.
* **Import** validates every row with the same Zod schemas the app uses, shows a preview (rows per table, how many are new, newer or older than what is on the device), then merges by `id` with the `hlc` rule. It never wipes existing data.
* **Automatic backup.** A Vercel cron job (Hobby allows one run per day) calls a server route that writes the day's JSON snapshot to a private Storage bucket and keeps the last 14. Supabase Free has no automatic backups, so this is the safety net. The same daily request also counts as database activity, which keeps the free project from pausing during a week away.
* Settings shows the date of the last automatic backup and of the last manual export.

## 7. Seed data

From v18, as hardcoded seed modules in the repo, applied once on the first sign in:

* Term Fall 2026 (study term) with its reading week, dates taken from the official uOttawa calendar, and the planned terms Winter 2027 to Winter 2028 for the two year map.
* Six courses with professors and chapter lists: CHG 3127, CHM 2120, CHG 3735, CHG 3337, CHG 4360, GNG 4120.
* The weekly class schedule with rooms, and the routine blocks (shifts, gym, study) as editable schedule blocks.
* All Fall 2026 assessments with weights, including the GNG 4120 deliverables and their dependencies as project tasks.
* Projects: GNG 4120 Bobino events app, DOTS, Bobino trailer pitch, CHG 4250 Plant Design preparation.
* Career: the verified resources (IRCC, uOttawa, LinkedIn Help, the presentation and project methods), the career task list, the two year map options and notes.

Not in the repo: personal money figures (fixed bills, budgets, tuition goals). They go in a local `seed/private.json` that is gitignored and imported once through the import screen.

Needs work before it can ship: v18's quotes have attributions but no links, and its history topics link to Wikipedia. Each will be re sourced to a primary or expert page with a working link, or dropped (non negotiable 3).

## 8. Capacity on the free tiers

| Resource | Free limit | Expected use |
|---|---|---|
| Database | 500 MB | text rows for years stay well under 100 MB; `history` is pruned at 180 days |
| Storage | 1 GB | about 300 KB per compressed photo, so roughly 3,000 photos; backups add about 1 MB a day for 14 days |
| Egress | 5 GB a month | one person syncing text; photos are cached on the device after first view |
| Monthly active users | 50,000 | 1 |

The first limit he will reach is photo storage. At that point the choice is Supabase Pro (25 USD a month, 100 GB) or moving older photos to a download archive.
