/**
 * The way into a world: a drop of liquid chrome spreads from where you tapped, its polished
 * rim leading, covers the view while the world loads underneath, and clears. The shared morph
 * (the name travelling to the title) is the quieter alternative; reduced motion is a short fade.
 *
 * Web Animations API on transform, opacity and clip-path only. The overlay never takes pointer events.
 */

export type TransitionKind = "morph" | "dive" | "liquid" | "shatter";
/** What each stored choice plays. The older experiments (dive, shatter) now play the chrome drop. */
export const PLAYS: Record<TransitionKind, "drop" | "morph"> = { liquid: "drop", dive: "drop", shatter: "drop", morph: "morph" };
export const TRANSITIONS: { kind: TransitionKind; name: string; line: string }[] = [
  { kind: "liquid", name: "Chrome drop", line: "A drop of liquid chrome spreads from where you tap and clears into the world." },
  { kind: "morph", name: "Shared morph", line: "The world's name travels from the menu to its title." },
];

export const DURATION = { drop: 640, morph: 560, reduced: 160 } as const;
/** The drop covers the view at this point; the route changes then, under cover. */
export const DROP_COVERED = 300;

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
const EASE_IN_OUT = "cubic-bezier(0.77, 0, 0.175, 1)";

export type Box = { x: number; y: number; w: number; h: number };
export type RunOptions = {
  kind: TransitionKind | "drop";
  host: HTMLElement;
  bounds: Box;
  from: Box;
  title: Box;
  name: string;
  reduced: boolean;
};
export type Running = { finished: Promise<void>; cancel: () => void };

function el(host: HTMLElement, css: Partial<CSSStyleDeclaration>): HTMLDivElement {
  const d = document.createElement("div");
  d.className = "tx-layer";
  Object.assign(d.style, { position: "absolute", pointerEvents: "none", ...css });
  host.appendChild(d);
  return d;
}

export function runTransition(o: RunOptions): Running {
  const made: HTMLElement[] = [];
  const anims: Animation[] = [];
  const track = <T extends HTMLElement>(n: T) => (made.push(n), n);
  const play = (n: Element, k: Keyframe[], t: KeyframeAnimationOptions) => { const a = n.animate(k, { fill: "both", ...t }); anims.push(a); return a; };
  const b = o.bounds;
  const mode = o.kind === "drop" ? "drop" : PLAYS[o.kind];

  if (o.reduced) {
    const veil = track(el(o.host, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px`, background: "var(--canvas)" }));
    play(veil, [{ opacity: 0.85 }, { opacity: 0 }], { duration: DURATION.reduced, easing: "ease-out" });
  } else if (mode === "drop") {
    const cx = o.from.x + o.from.w / 2 - b.x, cy = o.from.y + o.from.h / 2 - b.y;
    const end = Math.hypot(Math.max(cx, b.w - cx), Math.max(cy, b.h - cy)) + 24;
    const t = DURATION.drop, cover = DROP_COVERED / t;
    // The body of the drop: the page's own ground with a soft reflection, so the world seems to rise out of it.
    const fill = track(el(o.host, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px`,
      background: `radial-gradient(circle at ${cx}px ${cy}px, rgb(var(--chrome-hi-rgb) / 0.9), var(--canvas) ${Math.min(end, 420)}px)` }));
    play(fill, [
      { clipPath: `circle(0px at ${cx}px ${cy}px)`, opacity: 1 },
      { clipPath: `circle(${end}px at ${cx}px ${cy}px)`, opacity: 1, offset: cover },
      { clipPath: `circle(${end}px at ${cx}px ${cy}px)`, opacity: 1, offset: cover + 0.08 },
      { clipPath: `circle(${end}px at ${cx}px ${cy}px)`, opacity: 0 },
    ], { duration: t, easing: EASE_IN_OUT });
    // The polished rim: a ring of chrome running just ahead of the drop, thinning as it spreads.
    const size = end * 2;
    const ring = track(el(o.host, {
      left: `${b.x + cx - end}px`, top: `${b.y + cy - end}px`, width: `${size}px`, height: `${size}px`, borderRadius: "50%",
      background: "conic-gradient(from 200deg, var(--chrome-mid), var(--chrome-hi), var(--chrome-lo), var(--chrome-deep), var(--chrome-mid), var(--chrome-hi), var(--chrome-mid))",
      webkitMask: "radial-gradient(circle, transparent calc(70.7% - 10px), #000 calc(70.7% - 9px), #000 70.7%, transparent calc(70.7% + 1px))",
      mask: "radial-gradient(circle, transparent calc(70.7% - 10px), #000 calc(70.7% - 9px), #000 70.7%, transparent calc(70.7% + 1px))",
      filter: "drop-shadow(0 0 6px rgb(0 0 0 / 0.18))",
    } as Partial<CSSStyleDeclaration>));
    play(ring, [
      { transform: "scale(0.02) rotate(0deg)", opacity: 1 },
      { transform: `scale(${1 / 0.707 * 1.02}) rotate(40deg)`, opacity: 0.9, offset: cover },
      { transform: `scale(${1 / 0.707 * 1.08}) rotate(50deg)`, opacity: 0 },
    ], { duration: t * 0.75, easing: EASE_OUT });
  } else {
    // Shared morph: the name travels from the menu row to the world's title.
    const startSize = Math.max(18, Math.min(40, o.from.h * 0.42));
    const name = track(el(o.host, {
      left: `${o.from.x}px`, top: `${o.from.y + o.from.h / 2 - startSize / 2}px`, font: `700 ${startSize}px/1 var(--font-sans)`,
      letterSpacing: "-0.03em", color: "var(--ink)", transformOrigin: "0 0", whiteSpace: "nowrap",
    }));
    name.textContent = o.name;
    const veil = track(el(o.host, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px`, background: "var(--canvas)" }));
    o.host.appendChild(name);
    play(veil, [{ opacity: 0 }, { opacity: 1, offset: 0.35 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: DURATION.morph, easing: EASE_IN_OUT });
    const scale = o.title.h / startSize;
    const dx = o.title.x - o.from.x, dy = o.title.y - (o.from.y + o.from.h / 2 - startSize / 2);
    play(name, [
      { transform: "translate(0,0) scale(1)", opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 1, offset: 0.8 },
      { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, opacity: 0 },
    ], { duration: DURATION.morph, easing: EASE_IN_OUT });
  }

  const finished = Promise.all(anims.map((a) => a.finished.catch(() => undefined))).then(() => { made.forEach((n) => n.remove()); });
  return { finished, cancel: () => { anims.forEach((a) => a.cancel()); made.forEach((n) => n.remove()); } };
}
