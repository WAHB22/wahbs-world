import { TYPES, meanFrac } from "./catalog";
import type { AnomalyKind, Machine, Sample } from "./types";

/** Deterministic noise in [0, 1) for a machine and a second, so a trace can be rebuilt after a reload. */
export function hash(seed: number, n: number): number {
  let x = (seed * 374761393 + n * 668265263) | 0;
  x = Math.imul(x ^ (x >>> 13), 1274126177);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

export interface Expected {
  mid: number;
  lo: number;
  hi: number;
}

/** What the learned model expects this machine to draw at second t, with its normal range (kW). */
export function expected(m: Pick<Machine, "type" | "ratedKw" | "seed">, t: number): Expected {
  const p = TYPES[m.type].pattern;
  const r = m.ratedKw;
  if (p.kind === "steady") {
    const mid = p.level + p.wobble * Math.sin((t + m.seed) / 23);
    return { mid: mid * r, lo: (p.level - p.band) * r, hi: (p.level + p.band) * r };
  }
  if (p.kind === "load") {
    const seg = Math.floor((t + m.seed) / p.seg);
    const into = ((t + m.seed) % p.seg) / 3;
    const level = (s: number) => p.min + (p.max - p.min) * hash(m.seed, s);
    const now = level(seg);
    const mid = into < 1 ? level(seg - 1) + (now - level(seg - 1)) * into : now;
    return { mid: mid * r, lo: (p.min - 0.12) * r, hi: (p.max + 0.12) * r };
  }
  const phase = ((t + m.seed * 7) % p.period) / p.period;
  return phase < p.duty
    ? { mid: p.on * r, lo: (p.on - 0.14) * r, hi: (p.on + 0.12) * r }
    : { mid: p.off * r, lo: 0, hi: (p.off + 0.1) * r };
}

export function idleKw(m: Pick<Machine, "type" | "ratedKw">): number {
  return TYPES[m.type].idleFrac * m.ratedKw;
}

export function anomalyKw(m: Pick<Machine, "type" | "ratedKw" | "seed">, kind: AnomalyKind, t: number): number {
  const mean = meanFrac(m.type) * m.ratedKw;
  const h = hash(m.seed + 11, t);
  if (kind === "spike") return mean * (2.3 + 0.12 * (h - 0.5));
  if (kind === "sag") return mean * (0.35 + 0.05 * (h - 0.5));
  return mean * (1 + 0.7 * Math.sin(t * 1.3 + h * 2));
}

/** Outside the band with a small tolerance, so ordinary noise never raises an alert. */
export function isOutside(kw: number, e: Expected): boolean {
  return kw > e.hi * 1.06 || (e.lo > 0 && kw < e.lo * 0.9);
}

export interface Drive {
  on: boolean;
  mode: Machine["mode"];
  anomaly?: AnomalyKind;
}

export function sampleAt(m: Pick<Machine, "type" | "ratedKw" | "seed">, t: number, d: Drive): Sample {
  const e = expected(m, t);
  if (!d.on) return { t, kw: 0, lo: 0, hi: 0, out: false };
  const p = TYPES[m.type].pattern;
  let kw: number;
  if (d.mode === "idle") kw = idleKw(m) * (1 + 0.04 * (hash(m.seed + 3, t) - 0.5));
  else if (d.mode === "anomaly" && d.anomaly) kw = anomalyKw(m, d.anomaly, t);
  else kw = e.mid + p.noise * m.ratedKw * (hash(m.seed, t) - 0.5) * 2;
  kw = Math.max(0, kw);
  return { t, kw, lo: e.lo, hi: e.hi, out: d.mode === "idle" ? false : isOutside(kw, e) };
}

export const WINDOW_SEC = 600;
