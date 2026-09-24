# Product

<!-- impeccable:product-schema 1 -->

Status: draft for Phase 0 approval. Every fact below comes from BRIEF.md or from the v18 journal's content. Facts that are inferences are marked **(inferred)** and are repeated as open questions in PLAN.md.

## Platform

web

An installable PWA used in its own window on his phone and his laptop. Mobile web stays `web`; there is no native app.

## Stack

Delegated with a recommendation in the brief, confirmed in PLAN.md section 2:
Next.js 16 (App Router) with TypeScript and Tailwind CSS 4, Motion and GSAP for motion, React Three Fiber with drei only for the landing and the transitions, Supabase for Postgres, Auth and Storage, Dexie over IndexedDB for local first saving, Serwist for the service worker, hosted on Vercel.

## Users

One user: Wahb.

* 22, chemical engineering at the University of Ottawa, international student from Morocco.
* Barista at Bobino Bagel, with early morning and weekend shifts.
* Builds projects (the GNG 4120 venture, DOTS, a Bobino trailer pitch), hunts for a summer 2027 internship, trains at the gym.
* Opens the site every day, in its own tab, on phone and laptop. Quick check ins happen on the phone between things; planning and term setup happen on the laptop.

No other audience. Nobody else signs in, and nothing is public.

## Product Purpose

A visual operating system for one life. School, work, money, projects, career, knowledge, training and life itself live together in one place without feeling like eight separate apps.

It replaces Wahb's Journal (v18). It is meant to be the version he lives with for years: structure can be hardcoded, while everything that changes with life (a new term, deadlines, projects, money, training, memories) is editable in the interface.

Success means:

* every check in he makes is still there tomorrow, on both devices, years from now;
* he can set up next term's courses and weekly schedule himself in a few minutes;
* opening it feels like entering his world, and he wants to explore rather than feeling audited.

Not every day needs to be productive to be meaningful. The product records days; it does not grade them.

## Positioning

A world built around one specific person's real life, with real data behind every scene. The menu and restaurant idea is the organizing metaphor (it comes from his life behind the counter), glass is the interface, and motion is the language. Each world animates objects from its own subject: a heat exchanger for school, tickets and a service bell for work, a savings jar for money. A generic tracker could copy the features but not this.

## Operating Context

* **Daily rhythm.** Morning opening, shifts at Bobino Bagel (often 06:15 to 14:00, and 08:00 to 16:00 on weekends), classes in the afternoon and evening, gym most days, study blocks. Evening is closing time and the moment to capture a memory.
* **Terms.** Fall 2026 is the current term with six courses, some taught in French (CHG 3735 is "Contrôle des procédés"). A new term brings new courses, professors and a new weekly schedule.
* **Work rules** (tracking set aside for now at his request). As a study permit holder he may work off campus up to 24 hours a week during academic sessions and full time only during scheduled breaks (IRCC). The Work world warns when planned hours cross that limit.
* **Career horizon.** A summer 2027 internship is the priority, inside a two year map (Winter 2027 to Winter 2028) whose options depend on immigration rules he confirms with the uOttawa Student Immigration Advising Team.
* **Money.** Fixed monthly bills, category budgets, tuition goals per term, and transfers between his own accounts that are neither income nor spending. Currency is CAD **(inferred)**.
* **Devices.** An iPhone as a home screen app **(inferred from the brief's gyroscope and home screen notes; confirm the phone model)** and a laptop browser.

## Capabilities and Constraints

**Worlds (fixed structure):** Today (the pass), School, Work (the kitchen), Money, Projects, Career, Knowledge, Training, Life. Plus Settings.

**Core capabilities:**

* One tap check ins that save instantly with no save button: task done, shift worked, gym done, money spent, a moment worth keeping.
* Local first: entries are written to the device first, queued, and synced when a connection exists. Nothing is lost on a reload, a crash or a bad signal.
* Sync between phone and laptop through one private account.
* JSON export and a matching import in Settings, plus an automatic periodic backup if it stays cheap.
* Add, edit and delete for everything that changes with time: courses, schedule blocks, deadlines, tasks, shifts, transactions, goals, projects and project tasks, sessions, applications, evidence, knowledge entries, training sessions, memories.
* A new term flow: archive the old term, add new courses and a weekly schedule in minutes.
* Photos for memories, compressed before upload.
* Five intensity levels (Calm, Opening, Service, Rush, Completion) driven by time of day, workload and recent activity, always capped by a setting.
* Weekly recap and monthly chapter.
* Ambient sound, off by default.

**Terminology.** Restaurant words only where they stay understandable: orders, tickets, service, specials, reservations, the bill, 86'd. Each world keeps plain labels for its real data (course, deadline, shift, transaction).

**Hard constraints (the brief's non negotiables):**

1. Every check in is saved, always, on both devices, for years. Instant saves, offline queue, export and import.
2. No em dash, no en dash and no spaced hyphen in any visible text, enforced by an automated check.
3. Verified sources only, with working links. Unverifiable facts are left out.
4. Readability beats spectacle: AA contrast (4.5:1) for body text, text on an opaque enough backing, one clear primary action and a visible way back on every page.
5. Reduced motion (and `prefers-reduced-motion`), sound off by default and only after an intentional interaction, keyboard navigation with visible focus.
6. Private: login required; only Wahb sees his data; staying signed in on his own devices is fine.
7. Honest framing: plain, practical language, no hype, no fake achievements.

**Explicitly out of scope:** barista craft practice outside his shifts; XP, levels, streak shaming, leaderboards and badges for clicks (v18's XP, levels and quests are retired); migrating v18's stored history.

**Undecided product facts:** see PLAN.md, Open questions.

## Brand Commitments

* Name: **WAHB'S WORLD**. The landing shows "WAHB" large at the center.
* Voice: plain, warm, practical, second person. No hype copy.
* Binding visual constraints from the brief (recorded, not expanded here): deep navy and near black blue base; blues and cyan as the main family; orange as the warm accent; supporting tones used sparingly; glass and light surfaces; no brown, beige, cream, sepia or fake paper. One display face, one interface face, at most one accent face.
* Anti references: Notion, a SaaS dashboard, a spreadsheet, a brown vintage café, static cards on a static page. v18's café menu look is retired; its content and good ideas are kept.

## Evidence on Hand

Real content available as seed data, from `dist/wahbs-journal-v18.html` in the old journal:

* Fall 2026 courses with professors and chapter lists: CHG 3127, CHM 2120, CHG 3735, CHG 3337, CHG 4360, GNG 4120.
* The Fall 2026 weekly class schedule with rooms, and a sample weekly routine (shifts, gym, study).
* Fall 2026 deadlines with weights, including the full GNG 4120 deliverables schedule and its dependencies.
* Current projects: GNG 4120 Bobino events app, DOTS, Bobino trailer pitch, CHG 4250 Plant Design preparation.
* Verified career resources with working links: IRCC work off campus, study permit conditions, PGWP eligibility, CEC help centre answer, uOttawa Career Development LinkedIn guidance, uOttawa Student Immigration Advising Team, LinkedIn Help, and expert presentation and project methods (Mazières, Alley, Winston, Hale, PMI).
* A career task list and a two year term map with notes.
* Personal money figures: fixed bills, category budgets, tuition goals. These are private and are seeded from a local file, never committed.
* Quotes with attributions but without links, and history topics sourced to Wikipedia. Both must be re sourced to primary or expert pages with working links, or dropped.

Absences future work must not fabricate: grades, achievements, testimonials, employer names he has not applied to, internship offers, and any fact without a source.

## Product Principles

1. **Nothing he records is ever lost.** Saving is instant and local first; sync and backup are foundations, not features.
2. **Readable first, alive second.** Motion and glass serve the content and never delay navigation or hide text.
3. **Show up, do not grind.** Reward real progress and showing up, never clicks. Celebrations are brief and meaningful.
4. **His life, not a productivity app.** Memories, rest and hard days count as much as deadlines.
5. **True or absent.** Every fact shown has an expert or official source with a working link; if it cannot be verified, it is not there.

## Accessibility & Inclusion

* WCAG 2.2 AA: 4.5:1 for body text, 3:1 for large text and interface parts, on the actual backing used over glass.
* Full keyboard reach with visible focus.
* Reduced motion everywhere, honoring `prefers-reduced-motion` and an in app setting; the signature transition becomes a soft crossfade.
* Sound off by default, with profiles (Off, Subtle, Full), mute and volume.
* Layouts adapted (not shrunk) at 390, 768, 1440 and 2560 px wide.
* Bilingual content: some course names and deliverables are French and must render correctly (accents, `lang` attributes on French strings). The interface language is English **(inferred)**.
