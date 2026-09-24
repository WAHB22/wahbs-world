# WAHB'S WORLD plan

Phase 0 deliverable. Status: **approved.** Phase 1 built; waiting for Wahb to review it and to do the account setup in `SETUP.md`.

| Document | What it holds |
|---|---|
| `BRIEF.md` | the brief, unchanged |
| `PRODUCT.md` | product truth: who it is for, purpose, constraints, principles (written with `/impeccable init`) |
| `PLAN.md` | this file: stack, hosting, costs, architecture, phases, risks, open questions |
| `design/TOKENS.md` | the token system: named colors, glass, type roles, space, motion, intensity, world accents, ASCII wireframes |
| `design/tokens.json` | the same values as data, checked by `tools/contrast.py` |
| `design/token-board.html` | the visual token board; screenshots in `design/shots/` |
| `design/DATA.md` | the data model, security, sync, export and import, seed data, capacity |
| `CLAUDE.md` | working rules for any agent in this repo |

## 1. In plain language

WAHB'S WORLD will be a website that installs on his phone and laptop like an app. It opens on "WAHB" surrounded by glass panes, one per world. Each world has its own scene and its own real data. Everything he records is saved on the device the moment he taps, then copied to a private database so the other device gets it too. It costs nothing per month to run at his scale. We build it in seven phases and stop after each one to show him.

## 2. Stack and hosting (final proposal)

The brief's recommended stack holds up. Versions are the current releases on npm as of 24 September 2026; each choice below was checked against the official source.

| Layer | Choice | Why |
|---|---|---|
| App | **Next.js 16.3** (App Router), **React 19**, **TypeScript** (strict) | Server rendering for a fast first paint, file based routes for the worlds, first class on Vercel |
| Styling | **Tailwind CSS 4.3** with the tokens as CSS custom properties through `@theme` | Tokens stay the single source; components never hold raw hex values |
| Interface motion | **Motion 13** (`motion/react`) | Layout animations, shared element transitions, springs, and `useReducedMotion` |
| Timelines | **GSAP 3.15** | Complex scene timelines. GSAP is now free for all uses, including every former members only plugin (verified on gsap.com) |
| 3D and glass | **three 0.186**, **@react-three/fiber 9.8**, **@react-three/drei 10.7** (`MeshTransmissionMaterial`) | Only on the landing and the signature transition, loaded lazily after the DOM version has painted |
| Components | **shadcn/ui** (Radix primitives) and **21st.dev** as raw material | Accessible primitives; every component restyled to the tokens, licenses checked one by one |
| Local first data | **Dexie 4.4** over IndexedDB, with `liveQuery` | Instant saves, reactive reads, a local outbox |
| Validation | **Zod 4.6** | One schema per table, shared by the forms, the sync engine and import |
| Server data | **Supabase**: Postgres, Auth, Storage, Realtime (`supabase-js 2.117`, `@supabase/ssr 0.12`) | Row level security for privacy, private photo storage, a Realtime ping for fast sync |
| Login | Supabase **email one time code** (six digits), sign ups disabled, long lived sessions; passkeys later | A code works inside the installed iPhone app, where a magic link would open Safari instead. Supabase passkeys are in public beta since May 2026 |
| Offline and install | **Serwist 9.5** service worker and a web app manifest | Precached shell, offline fallback, installable. Next.js 16 builds with Turbopack by default; Serwist ships `@serwist/turbopack` for this, verified in a Phase 1 spike (fallback: build the worker with webpack) |
| Photos | `browser-image-compression` on the device, private Storage bucket, signed URLs | Photos stay small and private |
| Tests | **Vitest** with `fake-indexeddb` (sync logic), **Playwright** (flows, two browser contexts as two devices, offline switching), **axe-core** (accessibility), `tools/nodash.py`, `tools/contrast.py`, a link checker | Every definition of done item is measured |
| Hosting | **Vercel Hobby** | Personal, non commercial use, which this is |
| Database region | Supabase **Canada (Central)** `ca-central-1` | Closest to Ottawa; his data stays in Canada |

### Costs

| Item | Plan | Cost | Limits that matter (verified) |
|---|---|---|---|
| Vercel | Hobby | 0 | personal and non commercial only; 100 GB transfer, 1,000,000 function invocations, 4 CPU hours, 5,000 image optimizations a month; cron jobs once a day. Over a limit, the feature waits until the 30 day window resets |
| Supabase | Free | 0 | 500 MB database, 1 GB storage, 5 GB egress, 50,000 monthly users, 2 free projects; no automatic backups; pauses after a week of low activity (restorable for a year) |
| Auth email | built in, or a free SMTP service | 0 | the built in sender allows only 2 emails an hour; a free transactional email service raises that (recommended, see open question 4) |
| Domain | optional | about 15 to 25 CAD a year | `something.vercel.app` is free |
| Total today | | **0 per month** | |

When it could cost money: photo storage past 1 GB (roughly 3,000 photos) or a wish for managed backups means Supabase Pro at 25 USD a month; the optional copilot costs per use and is priced in Phase 7 before anything is enabled.

**Pausing.** Supabase pauses a free project after about a week of low activity ("a few user requests to the database each day over the previous week is enough" to stay active). Daily use keeps it awake, and the daily backup job also queries the database, so a week away does not pause it. Even paused, nothing is lost: both devices keep their full local copy, and a paused project can be restored.

## 3. Architecture

```
app/                     routes: / (landing), /today, /school, /work, /money,
                         /projects, /career, /knowledge, /training, /life,
                         /settings, /login, /api/backup (daily cron)
src/data/                zod schemas, Dexie database, repositories, sync engine,
                         export and import, seed modules
src/worlds/<world>/      the world's interface and its scene, one folder each
src/scenes/              the 3D landing and the signature transition (lazy)
src/motion/              motion tokens, the intensity engine, reduced motion
src/sound/               Web Audio synthesis, profiles, volume (off by default)
src/ui/                  restyled primitives (buttons, sheets, fields, glass)
supabase/migrations/     SQL: tables, row level security, sync functions, triggers
design/                  tokens, board, data model
tests/                   unit, flow, accessibility, sync across two sessions
tools/                   no dash check, contrast check, link check, screenshots
```

Rules: data code never imports interface or animation code. Scenes read derived values through selectors. Every world is a route, so the browser back button and deep links work, and each world page has one primary action and a visible way back to the landing.

## 4. Design direction

* **Direction lead:** Anthropic's `frontend-design` (one lead, as the brief asks), with `ui-ux-pro-max` for tokens and type data and `/impeccable` for product context, critique and audits.
* **The world:** night service at the pass. Deep navy rooms, light coming from the objects, orange as the heat lamp over what needs him now, glass as the interface. Details in `design/TOKENS.md`.
* **Type:** Anybody (display, with a width axis tied to intensity), Atkinson Hyperlegible Next (interface), Martian Mono (printed things only). All SIL Open Font License, self hosted.
* **Contrast:** every text color passes AA on every glass backing in the worst case (glass over pure white). The check runs in CI.
* **Phase 2 opens with the impeccable direction round** for the landing surface: the brief pins the world, so the round decides composition and the signature interaction, not a new look.

## 5. Phases and acceptance

Each phase ends with desktop and phone screenshots, `/impeccable audit` and `critique`, a plain language summary, and a stop for approval.

| Phase | Builds | Accepted when |
|---|---|---|
| 0 Plan | this document set | Wahb approves (approved 24 September 2026) |
| 1 Foundations | scaffold, tokens, login, database and migrations, row level security, Dexie store and outbox, sync engine, export and import, settings shell (motion, sound, data, account), PWA shell, test harness, CI | a check in made offline appears on the other device after reconnecting and survives reloads (automated test with two browser contexts); export then import round trips every table; no dash and contrast checks pass |
| 2 Landing and Today | the glass landing in DOM and 3D, at least three signature transition prototypes side by side, navigation and return, Today with quick check ins | Wahb picks a transition; Today is understandable in five seconds; check ins are one tap; 390, 768, 1440, 2560 px |
| 3 School, Work, Money | the three worlds, the new term flow, weekly hours, budgets, the jar, transfers | the new term flow takes a few minutes and is tested; create, edit and delete are tested |
| 4 Projects, Career, Knowledge, Training, Life | the remaining five worlds, photos | each world's create, edit and delete tested; photos compress and upload offline |
| 5 Living system | intensity and time engine, sound, weekly recap, monthly chapter | intensity changes are visible and the cap wins; sound starts only after an intentional action |
| 6 Polish | accessibility, performance, PWA install, final design test | the definition of done in the brief, measured: zero console errors, zero failed tests, about 60 fps in DevTools traces, AA everywhere, keyboard reach |

## 6. Tools and when they are used

| Moment | Tool |
|---|---|
| Product context, critique, audits | `/impeccable` (init done; `critique` and `audit` after every phase) |
| Tokens and type data | `ui-ux-pro-max` |
| Visual direction | `frontend-design` (the single lead) |
| Components | shadcn MCP and 21st MCP, restyled, license checked |
| Motion | `emil-design-eng`, `animate`, `improve-animations`; `mobile-native` for phone details |
| Screenshots and flow tests | Playwright skill |
| Performance traces | Chrome DevTools MCP |
| Fact checking | Firecrawl search and scrape on official domains |
| Deploys and database | Vercel and Supabase tooling, keys only in environment variables |

## 7. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| iPhone storage eviction of IndexedDB for sites not used for a while | local copy lost on the phone | install to the home screen, request persistent storage, keep the server copy as the backstop; data is only removed from a device after the server confirms it |
| Two devices edit the same row offline | one edit wins | row level last writer wins by a hybrid clock, and the replaced version kept in `history`, restorable from Settings |
| Serwist with Turbopack in Next.js 16 | offline shell harder to build | Phase 1 spike with `@serwist/turbopack`; fallback to webpack builds for the worker |
| Glass blur and 3D refraction on a mid range phone | dropped frames, heat, battery | 3D only on the landing and the transition, loaded lazily; the DOM landing paints first; runtime quality tiers; solid tint fallback without blur; nothing animates off screen or in a hidden tab |
| Supabase free project pausing | sync stops until restored | daily use plus the daily backup job; local copies keep working; Pro is 25 USD a month if it ever becomes a problem |
| Built in auth email limit of 2 an hour | locked out after several code requests | custom SMTP through a free transactional email service; long lived sessions so codes are rare |
| No automatic backups on Supabase Free | a mistake on the server is permanent | daily JSON snapshot to private storage (last 14), manual export in Settings, and full local copies on both devices |
| Verified sources rot | broken links shown as facts | `resources.link_status` and a weekly link check; a broken source hides its item until fixed |
| Scope: nine worlds of real features | phases run long | worlds share one data layer and one set of primitives; each phase is accepted before the next starts |
| Private data in a public place | exposure | private repo; personal money seed is gitignored; bank statements from v18 are never imported into the repo; secrets only in environment variables |
| Sound licensing | legal | Web Audio synthesis first; any recording CC0 or properly licensed and listed in `CREDITS.md` |

## 8. Decisions made on his behalf (say if any is wrong)

1. Email one time code instead of a magic link, for the installed iPhone app. Passkeys added when Supabase's beta is stable.
2. Last writer wins per row, with history kept, instead of field level merging.
3. v18's XP, levels, quests and badges are retired (the brief rules out XP and fake achievements).
4. v18's quotes and history topics are re sourced to primary or expert pages, or dropped.
5. Personal money figures are seeded from a private local file, never committed.
6. Paid work hours exclude unpaid breaks, following IRCC's definition of hours as time spent earning wages.
7. Money is stored in CAD cents.
8. Database region Canada (Central).

## 9. Answers from Wahb (24 September 2026)

1. **Phone:** iPhone. Install, storage persistence and gyroscope permission follow iOS rules.
2. **Account:** his Gmail address is the only account. It is set through the `ALLOWED_EMAIL` environment variable, not written in the repo.
3. **Address:** the free `vercel.app` address.
4. **Auth email:** yes, a free SMTP sender is set up for sign in codes.
5. **Immigration:** set aside for now. Work tracks hours and pay; the weekly hours limit warning is off by default and can be switched on later in Settings (week counted Monday to Sunday).
6. **Money:** manual entries plus recurring bills. No statement import.
7. **Language:** English interface; French course names stay as they are.
8. **Training:** sessions only (kind, minutes, a note).
9. **People in memories:** typed names, and every name typed is remembered in a `people` list so it can be picked next time.
10. **Copilot:** dropped.
11. **Go ahead:** full green light to proceed.

## 10. What happens after approval

Phase 1 starts with the scaffold and the sync engine, because every later phase depends on "nothing is ever lost". The first thing he will be able to try is signing in on both devices and watching a check in made offline on the phone appear on the laptop.
