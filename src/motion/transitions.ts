/**
 * The signature transition from a landing pane into its world. Four prototypes for
 * Wahb to choose from. Rules from the brief: under about 900 ms, interruptible, never
 * blocking navigation (the route changes at the start; the overlay never takes pointer
 * events), a soft crossfade under reduced motion.
 *
 * Built with the Web Animations API on transform, opacity and clip-path only (plus one
 * blur on the dive), with the project's easing tokens.
 */

export type TransitionKind = "morph" | "dive" | "liquid" | "shatter";
export const TRANSITIONS: { kind: TransitionKind; name: string; line: string }[] = [
  { kind: "morph", name: "Shared morph", line: "The pane becomes the world's header in one continuous move." },
  { kind: "dive", name: "Dive through the glass", line: "You push into the pane; its glass bends and the world appears on the far side." },
  { kind: "liquid", name: "Liquid glass", line: "The pane melts outward with a ripple and settles into the world." },
  { kind: "shatter", name: "Glass shatter", line: "The pane steps forward and breaks into a few designed shards." },
];

export const DURATION: Record<TransitionKind | "reduced", number> = { morph: 620, dive: 720, liquid: 820, shatter: 780, reduced: 160 };

const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)";
const EASE_IN_OUT = "cubic-bezier(0.65, 0, 0.35, 1)";

export type Box = { x: number; y: number; w: number; h: number };
export type RunOptions = {
  kind: TransitionKind;
  host: HTMLElement; // positioned container the overlay is drawn in (fixed layer or a lab stage)
  bounds: Box; // the area the world fills, in host coordinates
  from: Box; // the pane, in host coordinates
  title: Box; // where the world's title lands, in host coordinates
  accent: string; // token name, for example "ember"
  name: string;
  reduced: boolean;
};

export type Running = { finished: Promise<void>; cancel: () => void };

function el(host: HTMLElement, css: Partial<CSSStyleDeclaration>, cls = "tx-layer"): HTMLDivElement {
  const d = document.createElement("div");
  d.className = cls;
  Object.assign(d.style, { position: "absolute", pointerEvents: "none", ...css });
  host.appendChild(d);
  return d;
}

const inset = (b: Box, box: Box, r: number) =>
  `inset(${b.y - box.y}px ${box.x + box.w - (b.x + b.w)}px ${box.y + box.h - (b.y + b.h)}px ${b.x - box.x}px round ${r}px)`;

function glass(accent: string): Partial<CSSStyleDeclaration> {
  return {
    background: `linear-gradient(160deg, rgb(var(--rgb-frost) / 0.16), rgb(var(--rgb-${accent}) / 0.22) 60%, rgb(var(--rgb-midnight) / 0.55))`,
    backdropFilter: "blur(18px) saturate(140%)",
    boxShadow: "inset 0 1px 0 rgb(var(--rgb-frost) / 0.3)",
  };
}

function label(host: HTMLElement, name: string, accent: string, at: Box, size: number): HTMLDivElement {
  const d = el(host, {
    left: `${at.x}px`, top: `${at.y}px`, fontFamily: "var(--font-display)", fontWeight: "760",
    fontSize: `${size}px`, lineHeight: "1", color: `var(--color-${accent === "cobalt" ? "signal" : accent})`,
    transformOrigin: "0 0", whiteSpace: "nowrap", fontVariationSettings: '"wdth" 96',
  });
  d.textContent = name;
  return d;
}

/** Play one transition. Resolves when the overlay is gone. */
export function runTransition(o: RunOptions): Running {
  const made: HTMLElement[] = [];
  const anims: Animation[] = [];
  const track = <T extends HTMLElement>(n: T) => (made.push(n), n);
  const play = (n: Element, k: Keyframe[], t: KeyframeAnimationOptions) => {
    const a = n.animate(k, { fill: "both", ...t });
    anims.push(a);
    return a;
  };
  const b = o.bounds;

  if (o.reduced) {
    const veil = track(el(o.host, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px`, background: "var(--color-abyss)" }));
    play(veil, [{ opacity: 0.7 }, { opacity: 0 }], { duration: DURATION.reduced, easing: "ease-out" });
  } else if (o.kind === "morph") {
    // A glass sheet grows from the pane to the header band, while the name travels to the title.
    const sheet = track(el(o.host, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px`, ...glass(o.accent) }));
    const band: Box = { x: b.x, y: b.y, w: b.w, h: o.title.y - b.y + o.title.h + 24 };
    play(sheet, [{ clipPath: inset(o.from, b, 28), opacity: 1 }, { clipPath: inset(band, b, 0), opacity: 1, offset: 0.72 }, { clipPath: inset(band, b, 0), opacity: 0 }],
      { duration: DURATION.morph, easing: EASE_IN_OUT });
    const startSize = Math.min(44, o.from.h * 0.3);
    const name = track(label(o.host, o.name, o.accent, { x: o.from.x + 22, y: o.from.y + 20, w: 0, h: 0 }, startSize));
    const scale = o.title.h / startSize;
    play(name, [
      { transform: "translate(0, 0) scale(1)", opacity: 1 },
      { transform: `translate(${o.title.x - o.from.x - 22}px, ${o.title.y - o.from.y - 20}px) scale(${scale})`, opacity: 1, color: "var(--color-ink)", offset: 0.8 },
      { transform: `translate(${o.title.x - o.from.x - 22}px, ${o.title.y - o.from.y - 20}px) scale(${scale})`, color: "var(--color-ink)", opacity: 0 },
    ], { duration: DURATION.morph, easing: EASE_IN_OUT });
  } else if (o.kind === "dive") {
    // The camera pushes into the pane: it fills the view, its name rushes past and blurs,
    // then the glass clears like a lens coming into focus.
    const lens = track(el(o.host, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px`, ...glass(o.accent) }));
    play(lens, [
      { clipPath: inset(o.from, b, 28), transform: "scale(1)", opacity: 1 },
      { clipPath: inset(b, b, 0), transform: "scale(1.04)", opacity: 1, offset: 0.5 },
      { clipPath: inset(b, b, 0), transform: "scale(1)", opacity: 0 },
    ], { duration: DURATION.dive, easing: EASE_OUT });
    const cx = o.from.x + o.from.w / 2, cy = o.from.y + o.from.h / 2;
    const name = track(label(o.host, o.name, o.accent, { x: cx, y: cy, w: 0, h: 0 }, 40));
    name.style.transformOrigin = "50% 50%";
    name.style.translate = "-50% -50%";
    play(name, [
      { transform: "scale(1)", filter: "blur(0px)", opacity: 1 },
      { transform: `translate(${b.x + b.w / 2 - cx}px, ${b.y + b.h / 2 - cy}px) scale(7)`, filter: "blur(10px)", opacity: 0 },
    ], { duration: DURATION.dive * 0.62, easing: EASE_OUT });
  } else if (o.kind === "liquid") {
    // A drop of the pane's glass spreads across the view, overshoots a touch like a liquid
    // meeting its edge, and two ripples run ahead of it; then the glass settles into the world.
    const cx = o.from.x + o.from.w / 2 - b.x, cy = o.from.y + o.from.h / 2 - b.y;
    const start = Math.min(o.from.w, o.from.h) / 2;
    const end = Math.hypot(Math.max(cx, b.w - cx), Math.max(cy, b.h - cy));
    const pool = track(el(o.host, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px`, ...glass(o.accent) }));
    play(pool, [
      { clipPath: `circle(${start}px at ${cx}px ${cy}px)`, opacity: 1 },
      { clipPath: `circle(${end * 0.55}px at ${cx}px ${cy}px)`, opacity: 1, offset: 0.3 },
      { clipPath: `circle(${end}px at ${cx}px ${cy}px)`, opacity: 1, offset: 0.62 },
      { clipPath: `circle(${end}px at ${cx}px ${cy}px)`, opacity: 0 },
    ], { duration: DURATION.liquid, easing: EASE_OUT });
    [0, 1].forEach((k) => {
      const size = end * 2;
      const ring = track(el(o.host, {
        left: `${b.x + cx - size / 2}px`, top: `${b.y + cy - size / 2}px`, width: `${size}px`, height: `${size}px`, borderRadius: "50%",
        border: `2px solid rgb(var(--rgb-frost) / 0.35)`, boxShadow: `0 0 40px rgb(var(--rgb-${o.accent}) / 0.35), inset 0 0 30px rgb(var(--rgb-frost) / 0.15)`,
      }));
      play(ring, [
        { transform: `scale(${start / end})`, opacity: 0.9 },
        { transform: "scale(1.02)", opacity: 0 },
      ], { duration: DURATION.liquid * 0.7, delay: k * 110, easing: EASE_OUT });
    });
  } else {
    // The pane steps forward, then breaks along designed lines; shards fly past the camera.
    const stage = track(el(o.host, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px`, perspective: "900px" }));
    const px = (x: number) => `${x * 100}%`;
    const impact = { x: 0.42, y: 0.46 };
    SHARDS.forEach((poly, i) => {
      const s = track(el(stage, {
        left: `${o.from.x - b.x}px`, top: `${o.from.y - b.y}px`, width: `${o.from.w}px`, height: `${o.from.h}px`,
        clipPath: `polygon(${poly.map(([x, y]) => `${px(x)} ${px(y)}`).join(", ")})`, ...glass(o.accent), borderRadius: "28px",
      }));
      const c = poly.reduce((a, [x, y]) => [a[0] + x / poly.length, a[1] + y / poly.length], [0, 0]);
      const dx = (c[0] - impact.x) * o.from.w * 2.6, dy = (c[1] - impact.y) * o.from.h * 2.6;
      const dist = Math.hypot(c[0] - impact.x, c[1] - impact.y);
      const spin = ((i * 47) % 60) - 30;
      play(s, [
        { transform: "translate3d(0,0,0) scale(1)", opacity: 1 },
        { transform: "translate3d(0,0,40px) scale(1.03)", opacity: 1, offset: 0.14 },
        { transform: `translate3d(${dx}px, ${dy}px, ${260 + (1 - dist) * 320}px) rotate3d(${c[1] - 0.5}, ${c[0] - 0.5}, 0.3, ${spin}deg)`, opacity: 0 },
      ], { duration: DURATION.shatter, delay: dist * 70, easing: EASE_OUT });
    });
  }

  const finished = Promise.all(anims.map((a) => a.finished.catch(() => undefined))).then(() => {
    made.forEach((n) => n.remove());
  });
  return {
    finished,
    cancel: () => {
      anims.forEach((a) => a.cancel());
      made.forEach((n) => n.remove());
    },
  };
}

/**
 * Eleven shards in pane coordinates (0 to 1), cut along lines that radiate from an
 * impact point left of center, so the break reads as one blow rather than confetti.
 */
const SHARDS: [number, number][][] = [
  [[0, 0], [0.3, 0], [0.42, 0.46], [0, 0.28]],
  [[0.3, 0], [0.62, 0], [0.42, 0.46]],
  [[0.62, 0], [1, 0], [1, 0.22], [0.42, 0.46]],
  [[1, 0.22], [1, 0.58], [0.42, 0.46]],
  [[1, 0.58], [1, 1], [0.8, 1], [0.42, 0.46]],
  [[0.8, 1], [0.52, 1], [0.42, 0.46]],
  [[0.52, 1], [0.2, 1], [0.42, 0.46]],
  [[0.2, 1], [0, 1], [0, 0.7], [0.42, 0.46]],
  [[0, 0.7], [0, 0.28], [0.42, 0.46]],
  [[0.42, 0.46], [0.5, 0.36], [0.56, 0.5], [0.46, 0.56]],
  [[0.42, 0.46], [0.34, 0.4], [0.36, 0.54]],
];

