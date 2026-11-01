/**
 * Geometry for the chequing forecast chart: scales, SVG path strings, the split
 * at zero, tick dates, and which marked day a tap lands on.
 * Pure: forecast points and a pixel width in, numbers and strings out.
 * No React, no DOM, no clock.
 */
import type { ForecastEvent, ForecastOk, ForecastPoint } from '@/lib/forecast';
import type { ISODate } from '@/lib/types';
import { shortDate } from '@/lib/dates';

export const CHART_HEIGHT = 180;
/** Half of a 44 px tap target: a tap this close (in x) to a marked day selects it. */
export const HIT_RADIUS = 22;
/** Smallest distance between two date labels on the x axis. */
export const TICK_GAP = 64;

export type XY = { x: number; y: number };
export type Anchor = 'start' | 'middle' | 'end';

export interface Box {
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Room above for the 'payday' label, below for the dates, at the sides for the rings. */
export function chartBox(width: number, height = CHART_HEIGHT): Box {
  return { width: Math.max(0, width), height, top: 22, right: 10, bottom: 26, left: 10 };
}

export interface Scales {
  x: (i: number) => number;
  y: (bal: number) => number;
  /** Pixels between two days. 0 when there is only one day. */
  step: number;
  zeroY: number;
  plotTop: number;
  plotBottom: number;
  plotLeft: number;
  plotRight: number;
}

/**
 * One x step per day. The y range always includes $0, so the zero line is on
 * the chart and the distance to it reads true.
 */
export function makeScales(bals: number[], box: Box): Scales {
  const lo = Math.min(0, ...bals);
  const top = Math.max(0, ...bals);
  const hi = top - lo < 1 ? lo + 1 : top;
  const plotLeft = box.left;
  const plotRight = box.width - box.right;
  const plotTop = box.top;
  const plotBottom = box.height - box.bottom;
  const n = bals.length;
  const step = n > 1 ? (plotRight - plotLeft) / (n - 1) : 0;
  const x = (i: number) => plotLeft + i * step;
  const y = (v: number) => plotTop + ((hi - v) / (hi - lo)) * (plotBottom - plotTop);
  return { x, y, step, zeroY: y(0), plotTop, plotBottom, plotLeft, plotRight };
}

const r2 = (v: number) => Math.round(v * 100) / 100;

/** 'M10 20L30 40'. Empty when there is nothing to draw (fewer than 2 points). */
export function linePath(pts: XY[]): string {
  if (pts.length < 2) return '';
  return pts.map((p, k) => `${k ? 'L' : 'M'}${r2(p.x)} ${r2(p.y)}`).join('');
}

/**
 * Last index of the leading run of actual days (estimate false). The line is
 * solid through that run and dashed after it. -1 when the first day is already
 * an estimate.
 */
export function lastActualIndex(points: Pick<ForecastPoint, 'estimate'>[]): number {
  let k = -1;
  while (k + 1 < points.length && !points[k + 1].estimate) k++;
  return k;
}

export interface Run {
  below: boolean;
  pts: XY[];
}

/**
 * Splits the line where it crosses $0, adding the crossing point (straight line
 * between two days) to both sides. A balance of exactly $0 is not below zero.
 */
export function splitAtZero(pts: (XY & { bal: number })[], zeroY: number): Run[] {
  const runs: Run[] = [];
  let cur: Run | null = null;
  for (let k = 0; k < pts.length; k++) {
    const p = pts[k];
    const below = p.bal < 0;
    if (!cur) {
      cur = { below, pts: [{ x: p.x, y: p.y }] };
      continue;
    }
    if (below === cur.below) {
      cur.pts.push({ x: p.x, y: p.y });
      continue;
    }
    // Signs differ, so a.bal - p.bal is never 0.
    const a = pts[k - 1];
    const t = a.bal / (a.bal - p.bal);
    const cross = { x: r2(a.x + t * (p.x - a.x)), y: zeroY };
    cur.pts.push(cross);
    runs.push(cur);
    cur = { below, pts: [cross, { x: p.x, y: p.y }] };
  }
  if (cur) runs.push(cur);
  return runs;
}

/** Closed shape between a run of the line and the zero line. */
export function areaPath(run: Run, zeroY: number): string {
  if (run.pts.length < 2) return '';
  const first = run.pts[0];
  const last = run.pts[run.pts.length - 1];
  const line = run.pts.map((p) => `L${r2(p.x)} ${r2(p.y)}`).join('');
  return `M${r2(first.x)} ${r2(zeroY)}${line}L${r2(last.x)} ${r2(zeroY)}Z`;
}

/**
 * Which days get a date label: the first, the last, and one a week (or every
 * two weeks when days are narrow) in between, never closer than `minGap` px.
 */
export function tickIndexes(n: number, step: number, minGap = TICK_GAP): number[] {
  if (n <= 0) return [];
  if (n === 1) return [0];
  let every = 7;
  while (every * step < minGap && every < n) every += 7;
  const out = [0];
  for (let i = every; i < n - 1; i += every) out.push(i);
  const last = n - 1;
  while (out.length > 1 && (last - out[out.length - 1]) * step < minGap) out.pop();
  if ((last - out[out.length - 1]) * step >= minGap) out.push(last);
  return out;
}

/** Keeps a label of about 2 × half px inside the chart. */
export function anchorFor(x: number, width: number, half = 20): Anchor {
  if (x - half < 0) return 'start';
  if (x + half > width) return 'end';
  return 'middle';
}

/** The marked day nearest to a tap at x, if one is within `max` px. First one on ties. */
export function nearestTarget(targets: { i: number; x: number }[], x: number, max = HIT_RADIUS): number | null {
  let best: number | null = null;
  let bestD = Infinity;
  for (const t of targets) {
    const d = Math.abs(t.x - x);
    if (d <= max && d < bestD) {
      best = t.i;
      bestD = d;
    }
  }
  return best;
}

/** Arrow key stepping through marked days (sorted indexes). Stays put at the ends. */
export function stepTarget(order: number[], current: number | null, dir: 1 | -1): number | null {
  if (!order.length) return null;
  if (current === null) return dir > 0 ? order[0] : order[order.length - 1];
  if (dir > 0) return order.find((i) => i > current) ?? current;
  for (let k = order.length - 1; k >= 0; k--) if (order[k] < current) return order[k];
  return current;
}

const DOT_KINDS = new Set<ForecastEvent['kind']>(['bill', 'late-bill', 'pay', 'planned-pay', 'visa']);

/** A day gets a dot when a bill, a pay, a planned pay or the Visa payment falls on it (not daily spending). */
export function hasDot(p: Pick<ForecastPoint, 'events'>): boolean {
  return p.events.some((e) => DOT_KINDS.has(e.kind));
}

export type ChartPoint = XY & { i: number; date: ISODate; bal: number; below: boolean };

export interface ChartModel {
  box: Box;
  zeroY: number;
  plotTop: number;
  plotBottom: number;
  pts: ChartPoint[];
  /** The whole line, for the draw in. */
  full: string;
  /** Actual days (solid). Usually empty: the points start today. */
  solid: string;
  /** Estimate days (dashed). */
  dashed: string;
  /** Area between the line and $0 where the balance is at or above zero (engraved hatch). */
  above: string;
  /** Area between the line and $0 where it is below zero (vase wash). */
  below: string;
  anyBelow: boolean;
  /** Indexes with a dot: today, and days with a bill, a pay or the Visa payment. */
  dots: number[];
  /** What a tap or an arrow key can select: the dots and the lowest point, by x. */
  targets: { i: number; x: number }[];
  lowest: number;
  payday: { x: number; anchor: Anchor; estimate: boolean } | null;
  ticks: { i: number; x: number; label: string; anchor: Anchor }[];
}

/** Everything the SVG draws, for one forecast at one pixel width. */
export function buildChart(f: Pick<ForecastOk, 'points' | 'lowest' | 'next'>, width: number, height = CHART_HEIGHT): ChartModel {
  const box = chartBox(width, height);
  const sc = makeScales(
    f.points.map((p) => p.bal),
    box,
  );
  const pts: ChartPoint[] = f.points.map((p, i) => ({ i, date: p.date, bal: p.bal, below: p.bal < 0, x: sc.x(i), y: sc.y(p.bal) }));
  const k = lastActualIndex(f.points);
  const runs = splitAtZero(pts, sc.zeroY);

  const dots = pts.filter((p) => p.i === 0 || hasDot(f.points[p.i])).map((p) => p.i);
  const lowest = Math.max(
    0,
    pts.findIndex((p) => p.date === f.lowest.date),
  );
  const targetIdx = [...new Set([...dots, lowest])].sort((a, b) => a - b);

  const payIdx = f.next ? pts.findIndex((p) => p.date === f.next!.date) : -1;
  const payday =
    f.next && payIdx >= 0 ? { x: pts[payIdx].x, anchor: anchorFor(pts[payIdx].x, box.width), estimate: f.next.estimate } : null;

  const tickIdx = tickIndexes(pts.length, sc.step);
  const last = pts.length - 1;

  return {
    box,
    zeroY: sc.zeroY,
    plotTop: sc.plotTop,
    plotBottom: sc.plotBottom,
    pts,
    full: linePath(pts),
    solid: linePath(pts.slice(0, k + 1)),
    dashed: linePath(pts.slice(Math.max(0, k))),
    above: runs
      .filter((r) => !r.below)
      .map((r) => areaPath(r, sc.zeroY))
      .join(''),
    below: runs
      .filter((r) => r.below)
      .map((r) => areaPath(r, sc.zeroY))
      .join(''),
    anyBelow: runs.some((r) => r.below),
    dots,
    targets: targetIdx.map((i) => ({ i, x: pts[i].x })),
    lowest,
    payday,
    ticks: tickIdx.map((i) => ({
      i,
      x: pts[i].x,
      label: i === 0 ? 'Today' : shortDate(pts[i].date),
      anchor: i === 0 ? 'start' : i === last ? 'end' : 'middle',
    })),
  };
}
