# WAHB'S WORLD token plan

Phase 0. The source of truth for values is `design/tokens.json`; the visual board is `design/token-board.html` (screenshots in `design/shots/`). In Phase 1 these become CSS custom properties in `app/tokens.css`, mapped into Tailwind 4 with `@theme`. Components never use a raw hex value.

## 1. The scene that decides the palette

A bright, clear blue sky, not a dark room: Wahb asked for a brighter blue. The ground is a vivid blue that deepens toward the bottom of the screen, slow orbs of light drift behind everything, and every pane is glass that bends and blurs that light. Warm orange is still the heat lamp at the pass: it marks what needs him now.

Color strategy: **committed**. Blue owns every screen. Orange is spent once or twice per screen. Status tones are never decoration.

## 2. Color

| Token | Hex | Family | Role |
|---|---|---|---|
| `abyss` | `#0B2170` | base | deepest ground, text on bright fills |
| `midnight` | `#12339C` | base | lower page ground |
| `deep` | `#1A46C4` | base | upper page ground |
| `harbor` | `#2458E0` | base | raised planes, meters |
| `cobalt` | `#2F6BFF` | blue | sky orbs, fills |
| `signal` | `#6A9BFF` | blue | lines, rings, display sizes |
| `sky` | `#B5D0FF` | blue | blue text on glass |
| `frost` | `#EEF4FF` | blue | tickets, receipts, light glass |
| `cobaltInk` | `#173DB0` | blue | blue buttons, links on light glass |
| `tint` | `#0A1B5C` | base | the tint inside every glass pane |
| `coolant` | `#6FF0F8` | cyan | focus ring, live fluid, School and Money text |
| `lagoon` | `#19B8CC` | cyan | deep cyan fills (the jar) |
| `ember` | `#FF6A13` | orange | the primary action |
| `flame` | `#FF8A3D` | orange | hot fills: the bell, rush |
| `glow` | `#FFC08A` | orange | warm text on glass, Today and Life |
| `peach` | `#FFB27A` | orange | warm text on glass, Work |
| `basil` | `#6CEBB6` | status | done, saved, synced |
| `alarm` | `#FFB0B9` | status | overdue, sync error |
| `leaf` | `#7DDB8A` | scene | the little planet |
| `petal` | `#FFD6E8` | scene | soft highlights |
| `ink` | `#FFFFFF` | text | body and headings |
| `inkSoft` | `#E3ECFF` | text | secondary text |
| `inkMute` | `#CFDCFF` | text | hints, timestamps |

Rules:

* No brown, beige, cream, sepia or paper tones in the interface. Scenes may use any color the subject needs (a meadow, a flame), never the interface.
* `ember`, `flame` and `signal` are fills, lines and display sizes, never small text.
* Status is never color alone: every status also has an icon or a word.

## 3. Glass

| Backing | Recipe | Used for |
|---|---|---|
| `glass` | `tint` at 64 percent, blur 22px, saturate 185 percent; a bright top rim, a bevel ring, a faint prism split on the edges, a specular streak that slides across on hover, a lit bottom edge for thickness, the room's accent pooling inside | every pane with text |
| `landingPane` | `tint` at 56 percent, same recipe | the nine landing panes (large names, short lines) |
| `glassDeep` | `tint` at 80 percent | long reading, dense data |
| `frostGlass` | `frost` at 90 percent | tickets, receipts |

Worst case contrast: each backing composited over the brightest light the sky can put behind glass (`behind`, `#6FA2FF`), from `tools/contrast.py design/tokens.json` (full output in `design/contrast-report.txt`). The check runs in CI, so a token change that breaks AA fails the build.

```
backing          text         worst bg   worst   best  need
glass            ink          #2E4C97     8.09  15.34  4.5  ok
glass            inkSoft      #2E4C97     6.82  12.94  4.5  ok
glass            inkMute      #2E4C97     5.91  11.20  4.5  ok
glass            sky          #2E4C97     5.17   9.81  4.5  ok
glass            coolant      #2E4C97     5.97  11.32  4.5  ok
glass            glow         #2E4C97     5.07   9.61  4.5  ok
glass            peach        #2E4C97     4.58   8.69  4.5  ok
glass            basil        #2E4C97     5.47  10.37  4.5  ok
glass            alarm        #2E4C97     4.68   8.89  4.5  ok
landingPane      ink          #3656A4     6.94  15.15  4.5  ok
landingPane      inkSoft      #3656A4     5.86  12.77  4.5  ok
landingPane      inkMute      #3656A4     5.07  11.06  4.5  ok
landingPane      coolant      #3656A4     5.12  11.18  4.5  ok
glassDeep        ink          #1E367D    11.18  15.58  4.5  ok
glassDeep        inkSoft      #1E367D     9.42  13.14  4.5  ok
glassDeep        inkMute      #1E367D     8.16  11.38  4.5  ok
glassDeep        sky          #1E367D     7.15   9.96  4.5  ok
glassDeep        coolant      #1E367D     8.25  11.50  4.5  ok
glassDeep        glow         #1E367D     7.00   9.76  4.5  ok
glassDeep        peach        #1E367D     6.33   8.83  4.5  ok
glassDeep        basil        #1E367D     7.56  10.53  4.5  ok
glassDeep        alarm        #1E367D     6.47   9.02  4.5  ok
frostGlass       midnight     #D6DCE6     7.70   9.71  4.5  ok
frostGlass       abyss        #D6DCE6    10.40  13.11  4.5  ok
frostGlass       cobaltInk    #D6DCE6     6.54   8.24  4.5  ok

ink on midnight                           ink on midnight    10.61  4.5  ok
inkMute on midnight                   inkMute on midnight     7.75  4.5  ok
inkSoft on deep (text on the room)    inkSoft on deep         6.52  4.5  ok
inkMute on deep (text on the room)    inkMute on deep         5.64  4.5  ok
abyss on ember (primary button)         abyss on ember        5.00  4.5  ok
abyss on flame                          abyss on flame        6.11  4.5  ok
ink on cobaltInk (blue button)            ink on cobaltInk    9.01  4.5  ok
abyss on coolant                        abyss on coolant     10.57  4.5  ok
abyss on basil (done chip)              abyss on basil        9.69  4.5  ok
abyss on alarm (alert chip)             abyss on alarm        8.30  4.5  ok
cobaltInk on frost                  cobaltInk on frost        8.16  4.5  ok
abyss on frost (tickets)                abyss on frost       12.98  4.5  ok
focus ring coolant on midnight        coolant on midnight     7.83  3  ok
focus ring cobaltInk on frost       cobaltInk on frost        8.16  3  ok
ink on harbor (large display only)        ink on harbor       5.92  3  ok
```

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
| Projects | `cobalt` (fills), `signal` (text, since `cobalt` is 2.76:1 on midnight) | blueprint sheets, nodes, dependency lines |
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
