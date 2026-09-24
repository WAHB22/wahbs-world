# WAHB'S WORLD: build brief for Claude Code

Save this file in the repo as `BRIEF.md`.

## Kickoff prompt (paste this into Claude Code)

```
Read BRIEF.md fully, then CLAUDE.md, and inspect the old journal
(dist/wahbs-journal-v18.html) only as a source of ideas and starting content.

Do not write app code yet. Work in plan mode and deliver Phase 0 from the brief:
PLAN.md, PRODUCT.md (via /impeccable init), the design token plan, the data model,
the stack and hosting setup, and your open questions. Then stop and wait for my approval.

Follow the Non negotiables at all times. Stop at the end of every phase,
show desktop and phone screenshots, and summarize the phase in plain language.
```

---

## 1. What we are building

WAHB'S WORLD is a new website that replaces Wahb's Journal. It is not a journal redesign. It is a living, interactive world built around one person's life. The restaurant and menu idea is the organizing metaphor, glass is the interface, and motion is the language.

**Who it is for:** Wahb.

* 22, chemical engineering at the University of Ottawa, and an international student from Morocco.
* Works as a barista at Bobino Bagel.
* Builds projects, is hunting for a summer 2027 internship, trains at the gym, and wants his whole life in one place, not just his productivity.
* Opens it every day, in its own tab, on his phone and his laptop.

This is meant to be the final version he lives with for years. Structure can be hardcoded where that makes it simpler and more solid. What must stay easy to change is the content that changes with life: a new term's classes and schedule, deadlines, projects, goals, money, training and memories.

**Emotional goal on opening:** "This is mine. There is a whole world inside. Everything is alive. I want to explore." It should be organized but not sterile, and satisfying rather than overwhelming.

**It should feel like:** an interactive editorial site, a high end creative portfolio, a game interface and a personal command center at once.

**It must not feel like:**

* Notion
* a SaaS dashboard
* a spreadsheet
* a brown vintage café
* static cards on a static page

**The product principle:** a visual operating system for a life. School, work, money, projects, career, knowledge, training and life itself live together without feeling like eight separate apps. Not every day needs to be productive to be meaningful.

## 2. Non negotiables

1. **Every check in is saved, always.**
   * Whatever he records (today's tasks done, work shifts, gym sessions, money, memories, grades, notes) must persist and be there tomorrow, on both devices, for years.
   * Saves happen instantly, with no save button.
   * If the connection drops, entries are kept locally and synced when it returns. Nothing is lost on a reload, a crash or a bad signal.
   * Provide a JSON export for backup and a matching import.
2. **No dashes in any visible text:** no em dash, no en dash, no spaced hyphen. Hyphens inside words or code are fine. Add an automated check.
3. **Verified sources only.** Any fact, quote, resource or explanation shown in the site comes from an expert or official source, with a working link. If it cannot be verified, leave it out. v18's verified material (IRCC work rules, uOttawa resources, the expert presentation methods) can be reused with its sources.
4. **Readability beats spectacle.**
   * Body text on glass meets WCAG AA contrast (4.5:1). Put text on a sufficiently opaque backing, not raw transparency.
   * Every page has one clear primary action and a visible way back.
5. **Respect the person.**
   * Reduced motion mode, honoring `prefers-reduced-motion` too.
   * Sound off by default, starting only after an intentional interaction, with mute and volume.
   * Keyboard navigation and visible focus.
6. **Private.** Only Wahb can see his data. It needs a login, and remembering him on his own devices is fine.
7. **Honest framing.** Plain, practical language. No hype copy and no fake achievements.

## 3. Stack and hosting (use the best tools)

It only has to open alone in a browser tab. There is no platform constraint. Recommended stack, open to a better proposal in Phase 0 if Claude Code has strong reasons:

* **App:** Next.js (App Router), TypeScript, Tailwind CSS.
* **Motion:** Motion (framer motion) for interface motion, GSAP where timelines get complex.
* **3D and glass:** React Three Fiber, Three.js and drei, only where real depth or refraction is worth it (the landing and the transitions). drei's transmission material is the usual choice for convincing glass. Everything else stays in the DOM.
* **Components:** shadcn/ui and 21st.dev components as raw material, always restyled to this brief.
* **Data, login and photos:** Supabase (Postgres, Auth with a magic link or passkey, Storage).
* **Local first saving:** an IndexedDB cache and an offline queue, so check ins save instantly and sync when online.
* **Hosting:** Vercel.
* **Installable:** a PWA, so it can live on his phone's home screen and open like an app in its own window.
* **Copilot:** optional, built last (see section 10).

**Costs.** Vercel and Supabase have free tiers that fit one person. Free Supabase projects can pause after a stretch without use, so confirm the current policy in Phase 0 and plan around it. Daily use should keep it active, but say so if it will not.

## 4. Data

* **Clean model.** Plain tables for courses, schedule blocks, deadlines, tasks, shifts, transactions, goals, projects, project tasks, sessions, applications, evidence, knowledge entries, training sessions, memories and daily check ins. Keep data, UI and animation code separate so each can change alone.
* **Hardcoding is fine for structure:** the worlds, their names, their scenes and their layout can live in code and config files.
* **Editable in the UI:** anything that changes with time. For example:
  * next term's courses, professors and weekly schedule
  * deadlines and exams
  * projects and their tasks
  * money entries and goals
  * training
  * applications
  * knowledge
  * memories
* **Seed content:** start from real content where it helps (fall 2026 courses and schedule, GNG 4120 deliverables, current projects, career resources), taken from v18 and hardcoded as seed data. There is no requirement to migrate v18's stored history.
* **Backups:** a JSON export and import in Settings, plus an automatic periodic export if it is cheap to add.

## 5. Visual direction

**Palette: few colors, deeply satisfying.** Do not throw a full palette at him.

| Role | Colors |
|---|---|
| Base | deep navy and near black blues |
| Main family | blue in several shades, and cyan |
| Warm accent | orange (with its own shades) |
| Occasional supporting tones | used sparingly: small highlights, status colors |
| Surfaces | glass and light |

**Rules:**

* No brown, beige, cream, sepia or fake paper.
* Worlds are told apart mainly by their scenes, objects and one accent shift within this family, not by a new rainbow color each.
* Animations may use any color when the subject calls for it (a flame, a molecule, a glowing node), but the interface itself stays in the family.
* Overall feel: calm confidence with moments of energy. Satisfying, never overwhelming.

**Typography.** One expressive display face, one very readable interface face, and at most one accent face. Editorial and modern. Dramatic headings, very readable body text, line length under 80 characters.

**Avoid generic AI design tells.** Do not default to:

* tracked out all caps eyebrow labels over every heading
* meta strings joined with middle dots
* identical rounded cards with the same soft grey shadow
* a single acid accent on near black
* decorative numbering on content that is not a sequence
* fade and slide up on every section

Spend boldness in one place per screen.

**Motion.** Physical: easing, inertia, depth, parallax, subtle scale, blur, reflections. Avoid:

* constant spinning
* excessive bounce
* cheesy hovers
* particles everywhere
* motion that delays navigation

**Rule:** the content determines the animation language. Each world animates objects from its own subject, not generic particles.

## 6. The landing and the signature transition

* "WAHB" sits large at the center.
* Around it, translucent glass menu entries float in depth, one per world, reflecting and refracting.
* Mouse movement gives controlled physicality: nearby panels tilt and shift, reflections move, far panels move slower. It must never feel chaotic or nauseating.
* On a phone, adapt the scene instead of shrinking it: a swipeable orbit or a stacked depth carousel, with gyroscope tilt only if permitted.

**The signature transition (choose the best, do not assume shattering).** In Phase 2, prototype at least three transitions on the real landing. Put them side by side and let Wahb pick. Candidates:

* **Glass shatter:** the panel moves forward, fractures into a designed, controlled set of shards, and the world emerges behind.
* **Dive through the glass:** the camera pushes into the chosen panel, its refraction bends and stretches, and the world is revealed on the far side as if through a lens.
* **Liquid glass morph:** the panel melts and expands to fill the screen with a displacement ripple, then settles into the world's first scene.
* **Shared element morph:** the panel becomes the world's header in one continuous motion (View Transitions API or a layout animation), with depth and blur on everything else.
* Any better effect Claude Code finds or invents. Include it if it beats these.

**Requirements for whichever wins:**

* Under about 900 ms, interruptible, never blocking navigation.
* A soft crossfade in reduced motion.
* Graceful on a mid range phone.

## 7. The worlds

Each world gets:

* its own environment (scene)
* clear terminology, using restaurant words only where they stay understandable: orders, tickets, service, specials, reservations, the bill, 86'd
* real data with add, edit and delete where the content changes over time
* micro interactions tied to meaning

**The worlds:**

* **Today (the pass).** The current state of the world, not a dashboard.
  * Shows what needs attention, today's schedule, the one important action, deadlines, a money snapshot, training, and recent memories.
  * Quick check ins (task done, shift worked, gym done, spent, a moment worth keeping) are one tap and save instantly.
  * Understandable in five seconds.
* **School.** Courses as small engineering systems.
  * The environment animates chemical engineering objects: a heat exchanger with fluid moving through tubes, a reactor whose conversion shows progress, pressure gauges, process flow lines, and a pen writing.
  * Deadlines arrive as lab alarms or orders. Completed items stamp the course.
  * Course fields: code, name, professor, schedule, assignments, quizzes, exams, weights, grades, topics, notes, resources, links.
  * Changing terms must be easy: archive the old term and add the new courses and weekly schedule in a few minutes from the UI.
* **Work (kitchen).** Shifts as order tickets.
  * Tracks hours, pay and rush periods, with steam, plates and a service bell as the scene.
  * Warn when planned weekly hours exceed the 24 hour limit for off campus work during study terms (IRCC).
  * Track his work life, not his barista craft: he does not want barista practice work outside his shifts.
* **Money.**
  * A glass savings jar that fills toward each goal, receipts for spending, and categories flowing like streams.
  * Real numbers stay first: income, expenses, savings, tuition goals, budgets, transactions, monthly history.
  * Transfers between his own accounts are neither income nor spending.
* **Projects.**
  * Blueprints, nodes and dependency lines. A finished milestone lights up its blueprint.
  * Supports any kind of project: engineering, business, school, creative, personal, experiments, raw ideas.
  * Worth keeping from v18:
    * stages showing how far an idea got
    * tasks grouped by deliverable, with dependencies and a critical path
    * an honest "does this fit your hours" check
    * sessions, progress logs, presentation rehearsal, risks, lessons
    * a path from idea to project
* **Career.** The chain is Experience → Evidence → Skill → Story → Opportunity.
  * A finished project becomes evidence, which links to skills and feeds LinkedIn, interview stories and applications.
  * Include an applications pipeline, LinkedIn drafts, a two year map with his own probabilities, and the verified IRCC and uOttawa resources.
  * Summer 2027 internship is the priority.
* **Knowledge.**
  * A constellation map where topics connect.
  * Entries hold: topic, what he learned, source, why it matters, related topics, questions, review date.
  * Spaced review, "things I changed my mind about", and rabbit holes. Sources are expert or primary.
* **Training.** Kinetic: movement trails, rings, progress arcs, sessions and records. The gym is his keystone habit, so make showing up visible without guilt.
* **Life.**
  * A memory timeline where moments accumulate: places, meals, outings, people, good days, hard days, mistakes, spontaneous moments.
  * Photos go to storage, compressed.
  * Money spent on experiences can link to its memory.

**Rewards.** Reward real progress and showing up, never clicks. No XP farming, leaderboards or fake achievements. Celebrations are brief and meaningful: a plate served, the jar rising, a blueprint lighting up, graduation.

## 8. Living system: intensity and time

**Five intensity levels:**

| Level | Feel |
|---|---|
| Calm | minimal, slow |
| Opening | lights on, objects entering |
| Service | normal activity |
| Rush | more movement and faster transitions, still fully readable |
| Completion | a short celebration, then back |

**Inputs:**

* time of day (morning opening, evening closing)
* how much is due today and this week
* recent activity
* a cap in settings that always wins

**Outputs:**

* object budget
* ambient sound level
* transition speed
* notification density

**Time.**

* Morning feels like opening service and evening like closing, with a gentle prompt to capture a memory.
* End of week: a recap scene covering school, projects, training, money and memorable moments.
* End of month: a visual chapter.

## 9. Sound

* Atmosphere, not effects spam: service bell, soft glass, kitchen ambience, pen, register, page turns.
* Synthesize with the Web Audio API where possible. Recorded sounds must be CC0 or properly licensed, and listed in `CREDITS.md`.
* Controls: profiles (Off, Subtle, Full), mute, volume. The default is Off until he turns it on.

## 10. Copilot (optional, last)

* An AI copilot reachable from every world that already knows that world's data. It follows the same rules: no dashes, expert sources named, and for immigration questions it points to the uOttawa Student Immigration Advising Team.
* On Vercel it needs an Anthropic API key kept on the server, and it costs per use. Build it last. Show the setup and the expected cost first, and ask before enabling it.

## 11. Settings

* Motion: full or reduced, plus an intensity cap.
* Sound: profile and volume.
* Term management: archive a term, start a new one.
* Data: export, import, sync status.
* Account: sign in and sign out.

## 12. Tools in this repo and when to use them

Use one design lead per task so the skills do not pull in different directions.

1. **Phase 0:** `/impeccable init` to write PRODUCT.md, and `ui-ux-pro-max` to lock the design system and tokens within section 5's palette. `design-taste-frontend` (or Anthropic's `frontend-design`, pick one) sets the direction.
2. **Components:** the 21st MCP and the shadcn MCP to find components. Restyle everything to the tokens, never ship a component's default look, and check each license.
3. **Motion:** `emil-design-eng`, `animate` and `improve-animations`. `mobile-native` handles phone details.
4. **Quality:**
   * `/impeccable audit` and `critique` after each phase.
   * The Playwright skill for screenshots and flow tests.
   * The Chrome DevTools MCP for performance traces.
5. **Hosting:** the Vercel and Supabase tooling for deploys and the database. Keep every key in environment variables, never in the repo.

## 13. Phases (stop and show at the end of each)

* **Phase 0: plan.** Deliver:
  * PLAN.md and PRODUCT.md
  * the final stack and hosting setup, with costs
  * the token system: named hex values within the palette, type roles, and a layout concept with ASCII wireframes for the landing and one world
  * the data model
  * risks, and open questions
  * No app code yet.
* **Phase 1: foundations.**
  * Scaffold, login, database, local first saving with offline sync, export and import, a settings shell, and a test harness.
  * Accept when a check in made offline appears on the other device after reconnecting, and survives reloads.
* **Phase 2: the landing and one complete world.**
  * The glass landing and the three or more transition prototypes; Wahb picks one.
  * Navigation and return.
  * Today fully working with quick check ins.
  * Desktop and phone.
* **Phase 3:** School (including the new term flow), Work and Money.
* **Phase 4:** Projects, Career, Knowledge, Training and Life.
* **Phase 5:** intensity and time system, sound, weekly and monthly recaps.
* **Phase 6:** full polish, accessibility, performance, PWA install.
* **Phase 7 (optional):** copilot.

## 14. Definition of done (measured, not felt)

* Zero console errors and zero failed tests.
* Automated suites cover:
  * check ins saving and syncing across two sessions, including offline
  * create, edit and delete where editing exists
  * the new term flow
  * export and import
  * the no dash scan
* Works at 390 px, 768 px, 1440 px and 2560 px. Large screens use the space, with no tiny centered column. Phones get an adapted layout.
* Interactions hold about 60 fps on a normal laptop and stay smooth on a mid range phone (verify with DevTools traces).
* No continuous animation runs while its scene is off screen or the tab is hidden. 3D loads lazily, and the landing's interface paints fast even before 3D is ready.
* Text contrast is AA, focus is visible, everything is reachable by keyboard, and reduced motion is honored everywhere.
* Wahb's final design test is all yes:
  * Is the home an environment?
  * Does every world have its own personality?
  * Is motion tied to meaning?
  * Is the menu idea present without clichés?
  * Is the color satisfying, not overwhelming?
  * Does it feel alive?
  * Is the chaos controlled and readable?
  * Can he change next term's classes and schedule himself?
  * Does it remember every check in?
  * Does it work on phone and laptop?
  * Does it feel like his world?

The guiding question throughout: not "how do I make a journal prettier" but "how do I turn one person's life into an interactive world he enjoys entering."
