import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type MouseEvent, type RefObject } from 'react';
import { m, useReducedMotion } from 'motion/react';
import type { ForecastOk } from '@/lib/forecast';
import type { ISODate } from '@/lib/types';
import { Tag } from '@/components/ui/bits';
import { cn } from '@/lib/utils';
import { buildChart, CHART_HEIGHT, nearestTarget, stepTarget, type ChartModel } from './chart.logic';
import { chartSummary, dayView, readoutDays } from './forecast.logic';

/** The draw on from the style guide preview: ease out, after a short beat. */
const DRAW = { duration: 1.1, delay: 0.3, ease: [0.23, 1, 0.32, 1] as const };
/** The date the thread last drew on, so it draws at most once a day. */
const DRAWN_KEY = 'finance-thread-drawn';

/** Chart labels keep a band coloured halo, so a line passing behind never cuts the text. */
const HALO: CSSProperties = { paintOrder: 'stroke' };

/** Outline tag, so it reads on the scroll band. */
function EstimateTag() {
  return <Tag className="shrink-0 border border-rule bg-transparent px-1.5 py-0 text-ink-soft">estimate</Tag>;
}

/** Width of the element in whole px, measured before paint and on every resize. */
function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setWidth(Math.round(el.getBoundingClientRect().width));
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

type DrawPhase = 'wait' | 'draw' | 'done';

function drawnToday(today: ISODate): boolean {
  try {
    return localStorage.getItem(DRAWN_KEY) === today;
  } catch {
    return true;
  }
}

/**
 * The solid part of the thread draws on the first time it scrolls into view
 * each day. Already drawn today, reduced motion, or no IntersectionObserver:
 * it is simply there.
 */
function useDrawOnce(ref: RefObject<HTMLElement | null>, today: ISODate, reduce: boolean) {
  const [phase, setPhase] = useState<DrawPhase>(() =>
    reduce || typeof IntersectionObserver === 'undefined' || drawnToday(today) ? 'done' : 'wait',
  );
  const done = phase === 'done';
  useEffect(() => {
    if (reduce && !done) setPhase('done');
  }, [reduce, done]);
  useEffect(() => {
    if (phase !== 'wait') return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        try {
          localStorage.setItem(DRAWN_KEY, today);
        } catch {
          // Private mode: it may draw again tomorrow, which is fine.
        }
        setPhase('draw');
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [phase, ref, today]);
  return [phase, () => setPhase('done')] as const;
}

/** The solid part of the thread: drawn on with stroke dashoffset while drawing, plain after. */
function SpunPath({ c, phase, onDrawn }: { c: ChartModel; phase: DrawPhase; onDrawn?: () => void }) {
  if (!c.toPay || phase === 'wait') return null;
  if (phase === 'done') return <path d={c.toPay} />;
  const len = c.toPayLength;
  return (
    <m.path
      key={c.toPay}
      d={c.toPay}
      style={{ strokeDasharray: len }}
      initial={{ strokeDashoffset: len }}
      animate={{ strokeDashoffset: 0 }}
      transition={DRAW}
      onAnimationComplete={onDrawn}
    />
  );
}

/**
 * The chequing balance as the Fates' thread, after the style guide preview:
 * one ink line, solid from today to payday and dotted after it, where the 30
 * day spending estimate takes over; a fine dashed $0 line; the lowest point as
 * a paper ring with its label; the part under zero in terracotta. Beads mark
 * bills, pays and the Visa payment. Tap near a bead (or use the arrow keys) to
 * read that day below the chart.
 */
export function ForecastChart({ f, today }: { f: ForecastOk; today: ISODate }) {
  const [ref, width] = useWidth();
  const reduce = useReducedMotion() ?? false;
  const [phase, finishDraw] = useDrawOnce(ref, today, reduce);
  const [selDate, setSelDate] = useState<ISODate | null>(null);
  const c = useMemo(() => (width > 0 ? buildChart(f, width) : null), [f, width]);
  const summary = useMemo(() => chartSummary(f, today), [f, today]);
  const readout = useMemo(() => readoutDays(f, today), [f, today]);

  const uid = useId();
  const id = { above: `${uid}a`, below: `${uid}b` };

  const sel = selDate ? f.points.findIndex((p) => p.date === selDate) : -1;
  const selPoint = sel >= 0 ? c?.pts[sel] : undefined;
  const day = sel >= 0 ? dayView(f.points[sel], today) : null;

  const onClick = (e: MouseEvent<HTMLDivElement>) => {
    if (!c) return;
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
    const i = nearestTarget(c.targets, x);
    const date = i === null ? null : f.points[i].date;
    setSelDate((d) => (date === d ? null : date));
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!c) return;
    const order = c.targets.map((t) => t.i);
    let pick: (current: number | null) => number | null;
    if (e.key === 'ArrowRight') pick = (cur) => stepTarget(order, cur, 1);
    else if (e.key === 'ArrowLeft') pick = (cur) => stepTarget(order, cur, -1);
    else if (e.key === 'Home') pick = () => order[0] ?? null;
    else if (e.key === 'End') pick = () => order[order.length - 1] ?? null;
    else if (e.key === 'Escape' && selDate) pick = () => null;
    else return;
    e.preventDefault();
    // From the latest selection, so a held arrow key never skips a day.
    setSelDate((d) => {
      const k = d ? f.points.findIndex((p) => p.date === d) : -1;
      const next = pick(k >= 0 ? k : null);
      return next === null ? null : f.points[next].date;
    });
  };

  const beadFill = (below: boolean) => (below ? 'fill-vase' : 'fill-cobalt');
  const low = c ? c.pts[c.lowest] : null;

  return (
    <div>
      <div
        ref={ref}
        role="group"
        aria-label="Forecast chart. Use the arrow keys to read each marked day."
        tabIndex={0}
        onClick={onClick}
        onKeyDown={onKeyDown}
        className="relative w-full cursor-pointer touch-manipulation select-none"
        style={{ height: CHART_HEIGHT }}
      >
        {c && low && (
          <svg width={c.box.width} height={c.box.height} viewBox={`0 0 ${c.box.width} ${c.box.height}`} role="img" aria-label={summary} className="block overflow-visible">
            <defs>
              <clipPath id={id.above}>
                <rect x={-4} y={-4} width={c.box.width + 8} height={c.zeroY + 4} />
              </clipPath>
              <clipPath id={id.below}>
                <rect x={-4} y={c.zeroY} width={c.box.width + 8} height={Math.max(0, c.box.height - c.zeroY + 4)} />
              </clipPath>
            </defs>

            {/* The fine dashed $0 line. */}
            <line x1={c.zeroLine.x1} x2={c.zeroLine.x2} y1={c.zeroY} y2={c.zeroY} className="stroke-ink" strokeWidth={0.75} strokeDasharray="2 3" />
            <text x={c.zeroMark.x} y={c.zeroMark.y} textAnchor={c.zeroMark.anchor} className="num fill-ink-soft text-2xs">
              {c.zeroMark.text}
            </text>

            {/* The thread: ink above $0, terracotta under it. Solid to payday, dotted after. */}
            <g fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <g clipPath={`url(#${id.above})`} className="stroke-cobalt">
                <SpunPath c={c} phase={phase} onDrawn={finishDraw} />
                {c.afterPay && <path d={c.afterPay} strokeDasharray="1 5" />}
              </g>
              {c.anyBelow && (
                <g clipPath={`url(#${id.below})`} className="stroke-vase">
                  <SpunPath c={c} phase={phase} />
                  {c.afterPay && <path d={c.afterPay} strokeDasharray="1 5" />}
                </g>
              )}
            </g>

            {c.dots.map((i) => {
              if (i === c.lowest) return null;
              const p = c.pts[i];
              return <circle key={p.date} cx={p.x} cy={p.y} r={2.75} className={beadFill(p.below)} />;
            })}

            {/* Lowest point: a paper filled ring. */}
            <circle cx={low.x} cy={low.y} r={4} strokeWidth={1.6} className={cn('fill-paper', low.below ? 'stroke-vase' : 'stroke-cobalt')} />

            {selPoint && <circle cx={selPoint.x} cy={selPoint.y} r={4.5} className={beadFill(selPoint.below)} />}

            <text x={c.lowMark.x} y={c.lowMark.y} textAnchor="middle" strokeWidth={3} strokeLinejoin="round" style={HALO} className="num fill-cobalt stroke-scroll text-2xs font-medium">
              {c.lowMark.text}
            </text>
            {c.payMark && (
              <text x={c.payMark.x} y={c.payMark.y} textAnchor="middle" strokeWidth={3} strokeLinejoin="round" style={HALO} className="fill-cobalt stroke-scroll text-2xs font-medium">
                {c.payMark.text}
              </text>
            )}
          </svg>
        )}
      </div>

      <div aria-live="polite" className="mt-2">
        {day ? (
          <m.div
            key={day.date}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2, ease: DRAW.ease }}
            className="border-t border-rule pt-2.5"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="caps">{day.title}</span>
              <span className={cn('num whitespace-nowrap font-display text-xl font-bold leading-none', selPoint?.below ? 'text-vase' : 'text-ink-strong')}>
                {day.balance}
              </span>
            </div>
            <div className="flex min-h-6 items-center justify-between gap-3">
              <span className="text-xs text-ink-mute">Balance at end of day</span>
              {day.estimate && <EstimateTag />}
            </div>
            {day.events.length > 0 && (
              <ul className="mt-1 border-t border-rule-soft pt-1">
                {day.events.map((e) => (
                  <li key={e.key} className="flex min-h-7 items-center gap-2 text-sm">
                    <span className="min-w-0 truncate text-ink">{e.label}</span>
                    {e.estimate && <EstimateTag />}
                    <span className={cn('num ml-auto shrink-0 whitespace-nowrap', e.inflow ? 'font-medium text-ink-strong' : 'text-ink-soft')}>{e.amount}</span>
                  </li>
                ))}
              </ul>
            )}
          </m.div>
        ) : (
          <p className="text-xs text-ink-mute">Tap a dot to see that day.</p>
        )}
      </div>

      <ul className="sr-only">
        {readout.map((d) => (
          <li key={d.date}>{d.text}</li>
        ))}
      </ul>
    </div>
  );
}
