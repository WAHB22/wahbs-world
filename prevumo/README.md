# PREVUMO owner dashboard (demo prototype)

PREVUMO is the PREVentive Usage MOnitor: a box on each machine's power line (keypad, current sensor, relay) and an app for the owner of a shared space. This folder is the owner side only, as a clickable prototype for the GNG4120 pitch. It runs with no backend: a simulation engine in the browser plays the boxes, one reading per second per machine, and everything is saved in the browser's local storage.

> Booking software tells you who booked the machine. PREVUMO tells you what happened to it, and when it's about to fail.

## Run it

```bash
cd prevumo
npm install
npm run dev          # http://localhost:5180
```

Other commands:

```bash
npm run build        # typecheck, then a static site in dist/
npm run preview      # serve dist/ on http://localhost:5181
npm run lint
npm test             # simulation unit tests (Vitest)
npm run e2e          # builds, then runs the scripted demo at 1440x900 and 390px (Playwright)
```

## Deploy

The build is a static site, so any static host works. Routes are client side, so the host must send every path to `index.html`; both configs are included.

**Vercel:** import the repository, set **Root Directory** to `prevumo`, keep the Vite preset (build `npm run build`, output `dist`). `vercel.json` adds the rewrite.

**Netlify:** new site from Git, base directory `prevumo`, build `npm run build`, publish `prevumo/dist`. `public/_redirects` adds the rewrite.

Then make a QR code of the live URL for the Q&A.

## Recording the demo (about 70 s)

Open the demo controls with the small **Demo** button (bottom left) or **Shift+D**. You can hide the button in the panel; Shift+D keeps working. Each action closes the panel so the recording shows the result.

1. Log in, open Makerspace 1 · STEM. Three machines are in use: Welder 2 (PIN), CNC router (Unassigned), 3D printer 4 (assigned to Capstone team 12).
2. Shift+D, **Trigger irregularity** (Welder 2 is preselected). The rust banner slides in about 3 s later, once the spike is sustained.
3. **Review**, then **Call technician**, keep Volt Repair Ottawa, **Send request**, **Done**.
4. Shift+D, **Trigger idle** (3D printer 4 is preselected). The idle prompt appears. **Shut down**: the card turns rust, then leaves In use.
5. **Assign user**: type Beta Inc., pick Laser cutter, **This afternoon**, **Save assignment**.
6. Shift+D, **Fast forward to end of day**. The daily report opens. **Export PDF** opens the print preview.

**Reset demo** (in the panel or in Settings) puts everything back to the start.

## Where things live

| Path | What it holds |
| --- | --- |
| `src/sim/types.ts` | The data model: locations, machines, members, assignments, sessions, events |
| `src/sim/catalog.ts` | Machine types, their normal patterns, rated power, service intervals, partner technicians |
| `src/sim/signal.ts` | The live signal and the learned normal band, rebuilt deterministically from time |
| `src/sim/seed.ts` | Demo data: 3 locations, 26 machines, 9 members with PINs, 2 assignments, 30 days of history |
| `src/sim/engine.ts` | The 1 s tick, irregularity and idle detection, shutdowns, auto shut-off rules, fast forward |
| `src/sim/attribution.ts` | Who a session belongs to: PIN first, then a manual assignment, otherwise Unassigned |
| `src/sim/insights.ts`, `reports.ts` | Health score, service due, alert wording, daily and range reports |
| `src/store/store.ts` | App state, the clock, local storage, every owner and demo action |
| `src/pages/` | Login, Locations, Location home, Machine detail, Reports, Notifications, Assignments, Settings |
| `src/components/` | Cards, live chart, banners and prompts, overlays (alert, shutdown, technician, assign, machine settings), demo panel |

## How the simulation behaves

* Each machine type has its own normal pattern: steady draw with noise (welders, 3D printers), changing load (CNC, saws, laser cutters) or a duty cycle (ovens, fridges, freezers). The green band on the charts is that machine's normal range at that moment.
* An irregularity is a draw outside the band for 3 seconds or more: a spike, a sag, or an erratic swing. The banner reports what was measured, for example "Spiked to 2.3× normal for 40 s".
* Idle is a flat standby draw while the machine is on. After the idle time set in Settings (30 min by default) the owner gets a prompt; after the auto shut-off time (60 min) the machine is turned off unless the owner chose Keep on. A session still running after its assigned time frame also prompts.
* A shutdown never restarts on its own. Machines on the never auto shut off list (fridges, freezers) are only ever watched.
* At the daily shutdown time (22:00 by default) anything still on is turned off and the daily report is generated.
* New machines spend 7 days learning their normal pattern before alerts switch on.

## Assumptions

* Prices, technicians and their ratings are illustrative. Volt Repair Ottawa, Rideau Shop Services and Capital Lab Equipment are made up for the demo.
* Members, emails and PINs are fictional. Emails use the reserved `example` domain.
* Fonts are the Google Fonts families (Space Grotesk, Inter, JetBrains Mono), self-hosted through Fontsource so the demo works on classroom Wi-Fi with no external requests.
* Booking integrations (Skedda, Google Calendar) are shown as Coming soon.

## Not built (out of scope)

Member screens, real sign in, real hardware, payments and real booking integrations.
