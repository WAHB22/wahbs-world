# WAHB'S WORLD tokens: Chrome Carte

The source of truth for values is `design/tokens.json`. `python3 tools/gen_tokens.py` turns it into `src/styles/tokens.css` (CSS custom properties, light and dark, mapped into Tailwind 4 with `@theme inline`), and `python3 tools/contrast.py design/tokens.json` checks every text color on every ground in both modes (report in `design/contrast-report.txt`). Components never hold a raw hex value.

## 1. The idea

A café menu, set in liquid chrome. The home page is the carte: the dish of the day, then the courses, each world a dish with a dotted leader running to its live figure, the way a price sits on a menu. The one bold object is the chrome itself: two metal drops on the home page that flow faster as the day gets busier. Everything else is quiet, neutral and printed.

Color strategy: **restrained**. One neutral ground, near black ink, chrome for objects, and a single orange that only ever means "this needs you".

## 2. Color

| Token | Light | Dark | Role |
|---|---|---|---|
| `canvas` | `#F4F4F6` | `#0B0B0D` | page ground |
| `surface` | `#FCFCFD` | `#151518` | panels |
| `raised` | `#FFFFFF` | `#1C1C21` | inputs, buttons, sheets |
| `sunken` | `#EBEBEF` | `#08080A` | wells, empty cells, meter tracks |
| `ink` | `#121215` | `#F3F3F5` | headings, body, the primary pill |
| `ink2` | `#3D3D45` | `#C8C8D0` | secondary text |
| `ink3` | `#62626C` | `#92929D` | hints, dates |
| `line` | `#E1E1E6` | `#2A2A30` | hairlines |
| `lineStrong` | `#C9C9D1` | `#3A3A42` | input and button borders |
| `accent` | `#FF5A1F` | `#FF6A2E` | the one orange: due now, today, the chosen day |
| `accentInk` | `#B23A0C` | `#FF8C5A` | orange as text |
| `onAccent` | `#121215` | `#121215` | text on an orange fill |
| `ok`, `okFill` | `#177A4A`, `#2FBF77` | `#47C98A`, `#2FBF77` | done, synced |
| `alarm`, `alarmFill` | `#C22B2B`, `#FF5F57` | `#FF7070`, `#FF5F57` | overdue, errors |
| `chromeHi` to `chromeDeep` | `#FFFFFF` `#C3C6CE` `#6F737D` `#24262C` | `#F4F6FA` `#9A9EA8` `#4B4E57` `#141519` | the chrome discs and the chrome headline |

Rules: one accent per screen, spent once or twice. Status colors are never decoration. No blue, no beige, no brass. Every text token passes 4.5:1 on every ground in both modes; the check runs in `npm run check`.

## 3. Chrome

* **The drops** (`src/home/ChromeScene.tsx`): two `MeshDistortMaterial` spheres, metalness 1, roughness 0.16, clearcoat, lit by a studio made of light: a gradient dome (white overhead, grey horizon, dark floor) and three soft rectangular Lightformers, rendered once into the environment map. Flow speed and distortion follow the day's pace. They lean toward the pointer.
* **Performance:** one canvas, loaded after the page is idle and only when WebGL2 exists; no transmission, no post processing; the resolution drops when frames are slow; the loop stops when the canvas is off screen, and it renders on demand only when motion is reduced.
* **The discs** (`.chrome-disc`): a CSS conic and radial gradient with a bright rim and an inner plate carrying the world's Phosphor icon. Used for every world mark, the lock screen and the transition ring.
* **The chrome headline** (`.chrome-text`): "World." fades from ink into chrome. Used once.

## 4. Type

Geist Sans for everything, Geist Mono for figures that line up (money, hours, dates in tickets), both through `next/font`. Display sizes are tight (`-0.03em` to `-0.05em`, line height 0.9 to 1.05); body is 16px at 1.55. Emphasis comes from weight and size in the same family. Course names on the carte are the one italic.

## 5. Shape and depth

* Everything you press is a pill (`999px`). Panels are `22px`. Inputs are `12px`. Tickets and printed things are `6px`.
* Shadows are tinted from `ink`, never pure black on light: `--shadow-panel` for panels, `--shadow-float` for sheets, the dock and toasts.
* The inverted block (`figure-main`, `tile-ink`) is the one heavy surface per screen.

## 6. Motion

| Moment | Tool | Timing |
|---|---|---|
| Press | CSS transition, `scale(0.98)` | 140ms `--ease-out` |
| Page entrance | CSS `rise` on the head, then the body | 620ms, body 90ms later |
| Menu dishes | CSS scroll driven `rise` (`animation-timeline: view()`) | on entry |
| Entering a world, default "Chrome drop" | WAAPI: a disc of ink grows from the dish with a chrome ring; the route changes at 300ms | 640ms |
| Entering a world, "Shared morph" | WAAPI: the name travels to the title | 560ms |
| Sheets, toasts | CSS transitions and keyframes | 320ms, 360ms |

Curves: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)`, `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)`. Navigation never waits for an animation, and the overlay never takes clicks. Reduced motion (the device setting or Settings) turns every transition into a 160ms fade, stills the chrome, and cuts entrances to 1ms.

### The day's pace

`calm`, `opening`, `service`, `rush`, from the time of day and what is due (`src/living/intensity.ts`), never above the cap in Settings. It is written to `html[data-intensity]` and drives the chrome's flow energy (0.35, 0.6, 0.8, 1) and the pulse on the pace chip at rush.

### Sound

Synthesized with Web Audio, off by default, and only ever an answer to something you did: entering a world, a check in, marking something done. Profiles off, subtle, full, with a volume.

## 7. Layout

* Desktop first, max width 1360px, gutter `clamp(20px, 4vw, 64px)`; nothing scrolls sideways down to 390px.
* **Home:** nav; a split hero (copy left, chrome right) with one primary action; the carte (the dish of the day as a feature, then three courses as two column dish lists with dotted leaders); a bento for the week (deadlines tall, worked inverted, spent in chrome, training, look back links); a footer.
* **A world:** a back link to the menu, the chrome disc and a large title with a one line lede, the primary action on the right; a hero figures row (one inverted block, supporting figures, actions); then panels in a two column grid.
