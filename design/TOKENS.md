# WAHB'S WORLD token plan

Phase 0. The source of truth for values is `design/tokens.json`; the visual board is `design/token-board.html` (screenshots in `design/shots/`). In Phase 1 these become CSS custom properties in `app/tokens.css`, mapped into Tailwind 4 with `@theme`. Components never use a raw hex value.

## 1. The scene that decides dark or light

He opens the site before a 06:15 shift and again after a lecture that ends at 21:50, in a dark room, on a phone or a laptop. So the ground is deep navy, the light comes from the objects in each world, and warm orange is the heat lamp at the pass: it marks what needs him now. Light glass exists for things that are printed in real life (tickets, receipts) and for the morning opening.

Color strategy: **committed**. Navy and blue own whole regions of every screen. Orange is spent once or twice per screen. Status tones are never decoration.

## 2. Color

| Token | Hex | Family | Role |
|---|---|---|---|
| `abyss` | `#040914` | base | deepest ground, far scene, deep glass tint |
| `midnight` | `#081330` | base | page ground, default glass tint, text on light fills |
| `deep` | `#0C1C44` | base | raised planes, text on frost |
| `harbor` | `#132A5E` | base | rails, tracks, dividers, meters |
| `cobalt` | `#1F4FD8` | blue | blueprint ground, blue buttons (ink text) |
| `cobaltInk` | `#173DB0` | blue | links and focus ring on light glass |
| `signal` | `#3B7BFF` | blue | lines, nodes, display sizes only |
| `sky` | `#8DB6FF` | blue | links and blue text on dark glass |
| `frost` | `#DCE8FF` | blue | light glass, tickets, receipts |
| `coolant` | `#2FD4E6` | cyan | focus ring on dark, live fluid, progress |
| `lagoon` | `#0E8FA3` | cyan | deep cyan fills (the jar) |
| `ember` | `#FF6A13` | orange | the primary action (midnight text) |
| `flame` | `#FF8A3D` | orange | hot text: due soon, rush |
| `glow` | `#FFB070` | orange | warm highlight, Life accent |
| `basil` | `#3FD89A` | status | done, saved, synced |
| `alarm` | `#FF8290` | status | overdue, over the 24 hour limit, sync error |
| `ink` | `#EEF3FF` | text | body and headings on dark |
| `inkSoft` | `#B9C6E4` | text | secondary text |
| `inkMute` | `#9AA8CC` | text | hints, timestamps |

Rules:

* No brown, beige, cream, sepia or paper tones anywhere in the interface. Scenes may use any color the subject needs (a flame, a molecule), never the interface.
* `signal` and `ember` fail AA as small text on dark glass. They are for fills, lines and display sizes, where 3:1 applies.
* Status is never color alone: every status also has an icon or a word.

## 3. Glass

| Backing | Recipe | Used for |
|---|---|---|
| `glass` | `midnight` at 84 percent, blur 24px, saturate 140 percent, 1px edge `frost` at 14 percent, inner top lip `frost` at 20 percent | default pane for text in every world |
| `glassDeep` | `abyss` at 88 percent, same blur and edge | long reading, dense data, busy scenes |
| `frostGlass` | `frost` at 90 percent, edge white at 60 percent | tickets, receipts, the morning opening |

Worst case contrast (pane composited over pure white; `tools/contrast.py design/tokens.json`, full output in `design/contrast-report.txt`):

| Text | on `glass` | on `glassDeep` | on `frostGlass` |
|---|---|---|---|
| `ink` | 10.33 | 13.49 | |
| `inkSoft` | 6.70 | 8.75 | |
| `inkMute` | 4.84 | 6.32 | |
| `sky` | 5.61 | 7.33 | |
| `coolant` | 6.38 | 8.34 | |
| `flame` | 4.89 | 6.39 | |
| `glow` | 6.39 | 8.35 | |
| `basil` | 6.29 | 8.21 | |
| `alarm` | 4.84 | 6.32 | |
| `midnight` | | | 11.92 |
| `deep` | | | 10.80 |
| `cobaltInk` | | | 5.86 |

Solid pairs: `midnight` on `ember` 6.39, `ink` on `cobalt` 5.97, `midnight` on `coolant` 10.19, `midnight` on `basil` 10.03, `midnight` on `alarm` 7.72, `cobaltInk` on `frost` 7.31. The check runs in CI from Phase 1, so a token change that breaks AA fails the build.

Where `backdrop-filter` is unavailable or too slow (checked at runtime on low end phones), panes fall back to the same tint at 94 percent with no blur. Contrast only improves.

## 4. Type

| Role | Face | Why this face |
|---|---|---|
| Display | **Anybody** (variable: width 50 to 150, weight 100 to 900) | Its width axis is part of the motion language. At Calm "WAHB" stands wide and settled, at Rush it condenses. Intensity changes how the letters stand instead of adding particles, and the dive transition can stretch real letterforms instead of a bitmap. |
| Interface and body | **Atkinson Hyperlegible Next** (weight 200 to 800) | Designed for legibility: 0 and O, 1 and l and I are distinct. That matters for hours, money and grades read over glass on a phone. Tabular figures available. Full French accents. |
| Accent | **Martian Mono** (width 75 to 112.5, weight 100 to 800) | Only for things that are printed in real life: order tickets, receipts, the bill, timers. Never for labels or eyebrows. |

All three are SIL Open Font License on Google Fonts, self hosted through `next/font` (no request to Google at runtime). Checked: none is on the overused list in the impeccable guidance.

Scale (fluid, `clamp` between 390 and 2560 px):

| Token | Face | Size | Line | Notes |
|---|---|---|---|---|
| `display.hero` | Anybody 820 | 88 to 330 px | 0.8 | landing "WAHB" only, width follows intensity (140, 118, 100, 70) |
| `display.world` | Anybody 760 | 44 to 128 px | 0.95 | one world title per screen, width 96 |
| `heading` | Anybody 720 | 28 to 46 px | 1.0 | section headings, width 90, sentence case |
| `title` | Atkinson 700 | 20 to 24 px | 1.25 | item titles |
| `body` | Atkinson 400 | 16 px phone, 17 px laptop, 19 px at 2000 px and up | 1.55 | measure 45 to 72 characters |
| `small` | Atkinson 500 | 14 to 15 px | 1.4 | metadata only, never below 14 px |
| `ticket` | Martian Mono 500, width 87.5 | 13 to 15 px | 1.5 | tabular figures |
| `figure` | Anybody 700, tabular | 32 to 72 px | 1.0 | the one big number on a screen (jar percent, hours this week) |

Rules: sentence case everywhere; no tracked all caps eyebrows; no meta strings joined with middle dots; line length under 80 characters.

## 5. Space, shape, depth

* Spacing on a 4 px base: 4, 8, 12, 16, 24, 32, 48, 64, 96, 128. Page gutter `clamp(16px, 4vw, 72px)`.
* Radius by object, not one radius for everything: glass pane 28, control 14, ticket 6 with a torn edge, chip full round, scene frame 36.
* Depth comes from real layering (z, blur, parallax), not a grey drop shadow. One shadow token: `0 40px 90px -30px` `abyss` at 80 percent, only under floating glass.
* Hit targets at least 44 by 44 px, 8 px apart.
* Large screens use the space: Today becomes three columns at 1440 and four at 2560, never a centered column.

## 6. Motion

| Token | Value | Use |
|---|---|---|
| `dur.press` | 90 ms | press feedback |
| `dur.state` | 180 ms | small state change |
| `dur.panel` | 280 ms | panel move |
| `dur.scene` | 520 ms | scene change inside a world |
| `dur.signature` | 880 ms ceiling | the landing to world transition, interruptible |
| `ease.out` | `cubic-bezier(.22, 1, .36, 1)` | entering |
| `ease.inOut` | `cubic-bezier(.65, 0, .35, 1)` | moving between places |
| `spring.glass` | stiffness 170, damping 26 | pointer tilt on panes |
| `tilt.max` | 8 degrees near, 3 degrees far | the landing |

Durations scale with intensity; navigation never waits for an animation. Reduced motion replaces every move with a 160 ms crossfade and stops all ambient loops. Nothing animates while its scene is off screen or the tab is hidden.

### Intensity

| Level | Object budget | Tempo | Sound ceiling | Display width | When |
|---|---|---|---|---|---|
| Calm | 0.15 | 1.30x | 0.2 | 140 | late night, nothing due |
| Opening | 0.40 | 1.10x | 0.4 | 118 | morning |
| Service | 0.65 | 1.00x | 0.5 | 100 | most of the day |
| Rush | 0.90 | 0.80x | 0.6 | 70 | heavy week, exam day |
| Completion | burst, 1.2 s max | 1.00x | 0.6 | 120 | something real finished |

Text size, contrast and layout never change with intensity. The cap in Settings always wins.

## 7. One accent per world

| World | Accent | Scene objects |
|---|---|---|
| Today | `ember` | heat lamps over the pass, tickets on the rail, the check in dock |
| School | `coolant` | heat exchanger with moving fluid, reactor conversion, gauges, flow lines, a pen |
| Work | `flame` | order tickets, steam, plates, the service bell, the 24 hour line |
| Money | `lagoon` | the glass jar, receipts, category streams |
| Projects | `cobalt` | blueprint sheets, nodes, dependency lines |
| Career | `sky` | the chain from experience to opportunity |
| Knowledge | `frost` | a constellation of topics |
| Training | `signal` | movement trails, rings, progress arcs |
| Life | `glow` | the memory timeline, photos |

## 8. Layout concept

Sample content comes from the v18 seed data (Fall 2026). The drawings mark structure, not styling: headings will be sentence case in the display face, and icons are SVG.

### Landing, laptop (1440 px)

<!-- wf:wf-landing-desktop -->
```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ WAHB'S WORLD                                          (o) Saved    Sound off    Menu   │
│                                                                                        │
│     ╭───────────╮ far                                         ╭─────────────╮ far      │
│     │ Career    │                                             │ Knowledge   │          │
│     ╰───────────╯                 ╭──────────────────╮        ╰─────────────╯          │
│                                   │ Today       near │                                 │
│  ╭──────────────╮ mid             │ 3 things now     │           ╭──────────────╮ mid  │
│  │ School       │                 ╰──────────────────╯           │ Work         │      │
│  │ Quiz 2 Wed   │                                                │ 21.75 of 24  │      │
│  ╰──────────────╯                                                ╰──────────────╯      │
│                          W      A      H      B                                        │
│                                                                                        │
│     ╭───────────╮ mid                                      ╭──────────────╮ mid        │
│     │ Money     │                                          │ Projects     │            │
│     ╰───────────╯           ╭──────────────╮ mid           ╰──────────────╯            │
│                             │ Training     │                            ╭──────╮ far   │
│                             ╰──────────────╯                            │ Life │       │
│                                                                         ╰──────╯       │
│ Thursday, closing time                                     [ Enter Today           > ] │
└────────────────────────────────────────────────────────────────────────────────────────┘
 Near panes tilt up to 8 degrees toward the pointer; far panes drift at a third of the speed.
 Tab moves pane to pane in reading order. The nearest pane is the world that needs him most.
 The DOM version of this screen paints first; the 3D glass layer replaces it when ready.
```

### Landing, phone (390 px)

<!-- wf:wf-landing-phone -->
```text
┌────────────────────────────────┐
│ WAHB'S WORLD    (o) Saved  Menu│
│                                │
│         W   A   H   B          │
│                                │
│  ╭──────────────────────────╮  │
│  │ Today                    │  │
│  │ 3 things need you now    │  │
│  │ Next: CHM 2120 at 19:00  │  │
│  ╰──────────────────────────╯  │
│   ╭────────────────────────╮   │
│   │ School                 │   │
│   ╰────────────────────────╯   │
│    ╭──────────────────────╮    │
│    │ Work                 │    │
│    ╰──────────────────────╯    │
│       swipe to turn panes      │
│                                │
│  [ Enter Today             > ] │
└────────────────────────────────┘
 A stacked depth carousel: the front pane is full width,
 the next ones sit behind, smaller and dimmer. Tilt uses the
 gyroscope only after he allows it.
```

### Today, laptop (1440 px)

<!-- wf:wf-today-desktop -->
```text
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ < The world       Today                                  (o) Saved    Service    Menu    │
├─────────────────────────────┬──────────────────────────────┬─────────────────────────────┤
│ The one thing               │ Service today                │ On the rail                 │
│                             │                              │ ┌─────────────────────────┐ │
│ Study for CHM 2120          │ 06:15  Bobino shift      [x] │ │ GNG 4120 Elevator pitch │ │
│ Midterm 1, Wed 30 Sept      │ 14:30  Gym               [x] │ │ Sun 27, 3 percent       │ │
│ 20 percent, modules 1 to 4  │ 16:00  Study CHG 3127        │ └─────────────────────────┘ │
│                             │ ────── now 18:02 ─────────── │ ┌─────────────────────────┐ │
│ [ Start a study block ]     │ 19:00  CHM 2120 discussion   │ │ CHG 4360 Environment    │ │
│   the primary action        │                              │ │ Mon 28, 5 percent       │ │
│                             │                              │ └─────────────────────────┘ │
│                             │                              │  4 more this week           │
├─────────────────────────────┴──────────────────────────────┴─────────────────────────────┤
│ Check in   [ Task done ]  [ Shift worked ]  [ Gym done ]  [ Spent ]  [ A moment ]        │
├─────────────────────────────┬──────────────────────────────┬─────────────────────────────┤
│ Money                       │ Training                     │ Moments                     │
│ Jar 41 percent to Fall gap  │ 3 of 4 sessions this week    │ [photo] [photo] [photo]     │
└─────────────────────────────┴──────────────────────────────┴─────────────────────────────┘
 Understandable in five seconds: the one thing on the left, the day in the middle,
 what is coming on the right. Check ins save the moment they are tapped.
 At 2560 px a fourth column shows the week ahead.
```

### Today, phone (390 px)

<!-- wf:wf-today-phone -->
```text
┌────────────────────────────────┐
│ < World     Today    (o) Saved │
│                                │
│ The one thing                  │
│ Study for CHM 2120             │
│ Midterm 1 on Wed 30, 20 pct    │
│ [ Start a study block ]        │
│                                │
│ Now    free until 19:00        │
│ 19:00  CHM 2120 discussion     │
│                                │
│ On the rail                    │
│ ┌───────────────┐┌───────────┐ │
│ │ GNG 4120  Sun ││ CHG 4360  │ │
│ └───────────────┘└───────────┘ │
│                                │
│ Jar 41%   Gym 3 of 4   Moments │
├────────────────────────────────┤
│ Task  Shift  Gym  Spent  Moment│
└────────────────────────────────┘
 The check in dock sits under the thumb. One tap saves;
 a second tap within five seconds undoes.
```
