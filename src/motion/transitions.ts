/**
 * The signature transition from a landing pane into its world. Four prototypes for
 * Wahb to choose from. Rules from the brief: under about 900 ms, interruptible, never
 * blocking navigation (the route changes at the start; the overlay never takes pointer
 * events), a soft crossfade under reduced motion.
 *
 * Built with the Web Animations API on transform, opacity and clip-path only (plus one
 * blur on the dive), with the project's easing tokens.
 */

import { snapshotOf } from "./snapshot";

export type TransitionKind = "morph" | "dive" | "liquid" | "shatter";
const SHATTER_ENTRY: { kind: TransitionKind; name: string; line: string } = { kind: "shatter", name: "Glass shatter", line: "The screen cracks where you tap, breaks into shards and they fall away to show the world." };
export const TRANSITIONS: { kind: TransitionKind; name: string; line: string }[] = [
  SHATTER_ENTRY,
  { kind: "morph", name: "Shared morph", line: "The pane becomes the world's header in one continuous move." },
  { kind: "dive", name: "Dive through the glass", line: "You push into the pane; its glass bends and the world appears on the far side." },
  { kind: "liquid", name: "Liquid glass", line: "The pane melts outward with a ripple and settles into the world." },
];

export const DURATION: Record<TransitionKind | "reduced", number> = { morph: 620, dive: 720, liquid: 820, shatter: 1150, reduced: 160 };

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
  /** what the shatter breaks: the element whose picture (see snapshot.ts) is cut into shards */
  source?: HTMLElement | null;
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
    shatter(o, b, track, play);
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

/** A small seeded random, so each break is different but a given tap is repeatable in tests. */
function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

type Pt = [number, number];

/**
 * Real glass breaks in a star: radial cracks from the point of impact, joined by rings.
 * The grid of crack points is shared, so the shards tile the screen with no gaps.
 */
export function fracture(cx: number, cy: number, w: number, h: number, seed = 7): { shards: Pt[][]; cracks: Pt[][] } {
  const rand = rng(seed);
  const rays = 11;
  const reach = Math.hypot(Math.max(cx, w - cx), Math.max(cy, h - cy)) * 1.15;
  const rings = [0, 0.07, 0.19, 0.4, 0.68, 1.02].map((r) => r * reach);
  const angles = Array.from({ length: rays }, (_, i) => ((i + (rand() - 0.5) * 0.7) / rays) * Math.PI * 2);
  const P: Pt[][] = angles.map((a) => rings.map((r, j) => {
    if (j === 0) return [cx, cy];
    const aj = a + (rand() - 0.5) * 0.22;
    const rj = r * (1 + (rand() - 0.5) * 0.24);
    return [cx + Math.cos(aj) * rj, cy + Math.sin(aj) * rj];
  }));
  const shards: Pt[][] = [];
  for (let i = 0; i < rays; i++) {
    const n = (i + 1) % rays;
    for (let j = 0; j < rings.length - 1; j++) {
      const quad: Pt[] = j === 0 ? [P[i][0], P[i][1], P[n][1]] : [P[i][j], P[i][j + 1], P[n][j + 1], P[n][j]];
      // Long outer cells split once more along a diagonal, so the big pieces are not slabs.
      if (j >= 3 && rand() > 0.35) { shards.push([quad[0], quad[1], quad[2]], [quad[0], quad[2], quad[3]]); }
      else shards.push(quad);
    }
  }
  const cracks: Pt[][] = [...P.map((ray) => ray.slice(0, 5)), ...[1, 2, 3].map((j) => [...P.map((ray) => ray[j]), P[0][j]])];
  return { shards, cracks };
}

function shatter(o: RunOptions, b: Box, track: <T extends HTMLElement>(n: T) => T, play: (n: Element, k: Keyframe[], t: KeyframeAnimationOptions) => Animation) {
  // The tap lands in the middle of the pane that was chosen.
  const cx = o.from.x + o.from.w / 2 - b.x, cy = o.from.y + o.from.h / 2 - b.y;
  const { shards, cracks } = fracture(cx, cy, b.w, b.h, Math.round(cx * 31 + cy * 17));
  const stage = track(el(o.host, { left: `${b.x}px`, top: `${b.y}px`, width: `${b.w}px`, height: `${b.h}px`, perspective: "1400px", overflow: "hidden" }));
  const snap = snapshotOf(o.source);
  const hostBox = o.host.getBoundingClientRect();
  // Where the picture sits in stage coordinates.
  const sx = snap ? snap.box.x - hostBox.left - b.x : 0, sy = snap ? snap.box.y - hostBox.top - b.y : 0;
  const scale = snap?.scale ?? Math.min(window.devicePixelRatio || 1, 1.5);
  const CRACK = 150; // the crack spreads before anything moves
  const rand = rng(Math.round(cx + cy));

  shards.forEach((poly) => {
    // Each shard is a small canvas holding its piece of the screen, with the broken edge lit.
    const xs = poly.map((p) => p[0]), ys = poly.map((p) => p[1]);
    const x0 = Math.max(0, Math.floor(Math.min(...xs))), y0 = Math.max(0, Math.floor(Math.min(...ys)));
    const x1 = Math.min(b.w, Math.ceil(Math.max(...xs))), y1 = Math.min(b.h, Math.ceil(Math.max(...ys)));
    const w = x1 - x0, h = y1 - y0;
    if (w < 2 || h < 2) return;
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(w * scale); canvas.height = Math.ceil(h * scale);
    Object.assign(canvas.style, { position: "absolute", left: `${x0}px`, top: `${y0}px`, width: `${w}px`, height: `${h}px`, willChange: "transform, opacity" });
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(scale, scale);
    ctx.translate(-x0, -y0);
    ctx.beginPath();
    poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    ctx.save();
    ctx.clip();
    if (snap) ctx.drawImage(snap.canvas, sx, sy, snap.box.w, snap.box.h);
    else {
      const g = ctx.createLinearGradient(0, 0, b.w, b.h);
      g.addColorStop(0, "rgba(120, 170, 255, 0.55)");
      g.addColorStop(1, "rgba(18, 51, 156, 0.75)");
      ctx.fillStyle = g;
      ctx.fillRect(x0, y0, w, h);
    }
    // A faint sheen across the piece: glass catches light when it breaks.
    const ang = rand() * Math.PI;
    const sh = ctx.createLinearGradient(x0 + w / 2 - Math.cos(ang) * w, y0 + h / 2 - Math.sin(ang) * h, x0 + w / 2 + Math.cos(ang) * w, y0 + h / 2 + Math.sin(ang) * h);
    sh.addColorStop(0.35, "rgba(255,255,255,0)");
    sh.addColorStop(0.5, "rgba(255,255,255,0.16)");
    sh.addColorStop(0.65, "rgba(255,255,255,0)");
    ctx.fillStyle = sh;
    ctx.fillRect(x0, y0, w, h);
    ctx.restore();
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.shadowColor = "rgba(170, 220, 255, 0.9)";
    ctx.shadowBlur = 4;
    ctx.stroke();
    stage.appendChild(canvas);

    const mx = xs.reduce((n, v) => n + v, 0) / xs.length, my = ys.reduce((n, v) => n + v, 0) / ys.length;
    canvas.style.transformOrigin = `${mx - x0}px ${my - y0}px`;
    const dx = mx - cx, dy = my - cy;
    const len = Math.hypot(dx, dy) || 1;
    const d = len / Math.hypot(b.w, b.h);
    const push = 1 - Math.min(1, d * 1.6); // pieces near the impact fly at you; far ones mostly drop
    const ux = dx / len, uy = dy / len;
    const outX = ux * (80 + push * 280) + (rand() - 0.5) * 60;
    const fall = b.h * (0.9 + rand() * 0.5) + uy * 120;
    const z = 60 + push * 560 + rand() * 80;
    const rx = (rand() - 0.5) * 150, ry = (rand() - 0.5) * 150, rz = (rand() - 0.5) * 90;
    const delay = CRACK + d * 220 + rand() * 40;
    const dur = DURATION.shatter - delay + 40;
    play(canvas, [
      { transform: "none", opacity: 1, filter: "brightness(1)" },
      { transform: `translate3d(${ux * 6}px, ${uy * 6}px, ${z * 0.12}px)`, opacity: 1, filter: "brightness(1.35)", offset: 0.1 },
      { transform: `translate3d(${outX * 0.5}px, ${fall * 0.22}px, ${z * 0.7}px) rotateX(${rx * 0.4}deg) rotateY(${ry * 0.4}deg) rotateZ(${rz * 0.4}deg)`, opacity: 1, filter: "brightness(1.1)", offset: 0.45 },
      { transform: `translate3d(${outX}px, ${fall}px, ${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg)`, opacity: 0, filter: "brightness(0.9)" },
    ], { duration: dur, delay, easing: "cubic-bezier(0.3, 0, 0.8, 0.6)" });
  });
  stage.dataset.shards = String(stage.childElementCount);

  // The crack: lines race out from the tap, with a white flash at the point of impact.
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", String(b.w)); svg.setAttribute("height", String(b.h));
  Object.assign(svg.style, { position: "absolute", left: `${b.x}px`, top: `${b.y}px`, pointerEvents: "none", overflow: "visible" });
  cracks.forEach((line, k) => {
    const path = document.createElementNS(ns, "polyline");
    path.setAttribute("points", line.map((p) => p.join(",")).join(" "));
    path.setAttribute("fill", "none");
    path.setAttribute("stroke", "white");
    path.setAttribute("stroke-width", k < 11 ? "2.4" : "1.5");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("pathLength", "1");
    path.setAttribute("stroke-dasharray", "1");
    svg.appendChild(path);
    play(path, [{ strokeDashoffset: 1, opacity: 1 }, { strokeDashoffset: 0, opacity: 1, offset: 0.5 }, { strokeDashoffset: 0, opacity: 0 }],
      { duration: CRACK + 200, delay: k < 11 ? 0 : 40 + (k - 11) * 25, easing: "cubic-bezier(0.2, 0.8, 0.3, 1)" });
  });
  svg.style.filter = "drop-shadow(0 0 3px rgb(200 230 255 / 0.9))";
  o.host.appendChild(svg);
  track(svg as unknown as HTMLElement);
  const flash = track(el(o.host, { left: `${b.x + cx - 110}px`, top: `${b.y + cy - 110}px`, width: "220px", height: "220px", borderRadius: "50%",
    background: "radial-gradient(circle, rgb(255 255 255 / 0.95), rgb(200 230 255 / 0.45) 30%, transparent 70%)" }));
  play(flash, [{ transform: "scale(0.15)", opacity: 1 }, { transform: "scale(1.5)", opacity: 0 }], { duration: 380, easing: EASE_OUT });
  // One small jolt of the whole pane of glass at the moment of impact.
  play(stage, [{ transform: "none" }, { transform: "translate(4px, -3px)", offset: 0.25 }, { transform: "translate(-3px, 2px)", offset: 0.5 }, { transform: "none" }], { duration: 170, easing: "linear" });
}
