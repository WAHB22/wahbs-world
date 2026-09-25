# CLAUDE.md for WAHB'S WORLD

Read `BRIEF.md` first, then `PRODUCT.md`, `PLAN.md`, `design/TOKENS.md` and `design/DATA.md`. The brief wins any conflict.

## Where the project stands

All seven phases built. The design is Chrome Carte (see `design/TOKENS.md`): the home page is a café menu of the nine worlds under a liquid chrome hero. All nine worlds work (Today, School, Work, Money, Projects, Career, Knowledge, Training, Life), with the day's pace, sound (off by default), the weekly recap (`/recap`) and the monthly chapter (`/chapter`). Privacy on the device is a passcode lock set in Settings; sync to Supabase is switched on with `NEXT_PUBLIC_SYNC=on`. Setup steps that need Wahb's accounts are in `SETUP.md`. Each phase ends with desktop and phone screenshots in `shots/`, `/impeccable` checks, a plain language summary, and a stop.

## Non negotiables (from the brief, always on)

1. **Every check in is saved, always.** Write to IndexedDB first, in the same transaction as the outbox entry; never behind a save button; never only in memory. Sync, export and import must round trip every table.
2. **No dashes in visible text.** No em dash, no en dash, no spaced hyphen, in the interface, in docs and in commit messages. Hyphens inside words or code are fine. Run `python3 tools/nodash.py .` before every commit.
3. **Verified sources only.** Every fact, quote or resource shown in the site has an expert or official source with a working link, stored in `resources`. If it cannot be verified, leave it out.
4. **Readable first.** Body text meets 4.5:1 on its real backing. Run `python3 tools/contrast.py design/tokens.json` after any color change. One primary action and a visible way back on every page.
5. **Respect the person.** Honor `prefers-reduced-motion` and the in app setting; sound off by default and only after an intentional action; full keyboard reach with visible focus.
6. **Private.** Row level security on every table; the service role key only on the server; never commit personal data, keys or `.env` files.
7. **Honest framing.** Plain, practical copy. No hype, no fake achievements, no XP.

## Design rules

* Tokens only: components never hold raw hex values, font names or durations.
* Palette: neutral ground, near black ink, chrome for objects, one orange accent for what needs him now, status tones sparingly. No blue, brown, beige, cream or brass.
* Faces: Geist Sans and Geist Mono through `next/font`. Icons: Phosphor only.
* Shape: pills for everything pressed, 22px panels, 12px inputs, 6px tickets.
* Avoid: tracked all caps eyebrows, meta strings joined by middle dots, identical rounded cards with one grey shadow, a single acid accent on near black, decorative numbering, fade and slide up on every section.
* One bold move per screen. Motion is tied to the world's subject. Nothing animates off screen or in a hidden tab. Navigation never waits for an animation.

## Tools

* Product context, critique, audits: `/impeccable`.
* Tokens and type data: `ui-ux-pro-max`.
* Direction lead: Anthropic's `frontend-design` plugin. Use one lead per task.
* Components: shadcn MCP and 21st MCP, always restyled, licenses checked.
* Motion: `emil-design-eng`, `animate`, `improve-animations`; phone details with `mobile-native`.
* Screenshots and flow tests: Playwright (in the cloud container, launch Chromium from `/opt/pw-browsers/chromium`). Performance: Chrome DevTools MCP.
* Fact checks: Firecrawl search and scrape on official domains.
* Keys live in environment variables only (`API_KEY_21ST`, `PERPLEXITY_API_KEY`, Supabase and Vercel variables).

## Commands

```
npm run dev              # local app; device only unless Supabase or memory mode is set
npm run check            # typecheck, unit tests, generated files up to date, no dash, contrast
npm run test:sql         # migration and sync functions on a throwaway Postgres
npm run e2e              # build in memory sync mode, then Playwright: two devices, offline, export, axe
npm run gen              # after editing design/tokens.json or src/data/schema.ts
python3 tools/shoot_app.py http://localhost:3200 phaseN   # phase screenshots
```

Never edit `src/styles/tokens.css` or `supabase/migrations/0001_init.sql` by hand; they are generated.

## Data rules

* Every synced table has `id`, `user_id`, `created_at`, `updated_at`, `hlc`, `deleted_at`, `rev`, `device_id`.
* Deletes are soft. Check ins are append only.
* Money in integer CAD cents. Transfers between his own accounts are neither income nor spending.
* Personal money seed data lives in `seed/private.json`, which is gitignored.
