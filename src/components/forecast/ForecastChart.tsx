import { useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { m, useReducedMotion } from 'motion/react';
import type { ForecastOk } from '@/lib/forecast';
import type { ISODate } from '@/lib/types';
import { Tag } from '@/components/ui/bits';
import { cn } from '@/lib/utils';
import { buildChart, CHART_HEIGHT, nearestTarget, stepTarget } from './chart.logic';
import { chartSummary, dayView, readoutDays } from './forecast.logic';

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Outline pill, so it still reads on the quiet panel (same look as the top band's estimate). */
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

/**
 * Hand drawn line chart of the chequing balance, today to the end of the
 * horizon: a dashed ultramarine line (estimate days) over an engraved hatch,
 * turning vase red under the zero line. Dots mark bills, pays and the Visa
 * payment; a ring marks the lowest point. Tap near a dot (or use the arrow
 * keys) to read that day below the chart.
 */
export function ForecastChart({ f, today }: { f: ForecastOk; today: ISODate }) {
  const [ref, width] = useWidth();
  const reduce = useReducedMotion();
  // After the draw in, the mask comes off, so the line can never stay half hidden.
  const [drawn, setDrawn] = useState(false);
  const [selDate, setSelDate] = useState<ISODate | null>(null);
  const c = useMemo(() => (width > 0 ? buildChart(f, width) : null), [f, width]);
  const summary = useMemo(() => chartSummary(f, today), [f, today]);
  const readout = useMemo(() => readoutDays(f, today), [f, today]);

  const uid = useId();
  const id = { above: `${uid}a`, below: `${uid}b`, hatch: `${uid}h`, draw: `${uid}d` };

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

  const dotFill = (below: boolean) => (below ? 'fill-vase' : 'fill-cobalt');

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
        {c && (
          <svg width={c.box.width} height={c.box.height} viewBox={`0 0 ${c.box.width} ${c.box.height}`} role="img" aria-label={summary} className="block">
            <defs>
              <clipPath id={id.above}>
                <rect x={0} y={0} width={c.box.width} height={c.zeroY} />
              </clipPath>
              <clipPath id={id.below}>
                <rect x={0} y={c.zeroY} width={c.box.width} height={Math.max(0, c.box.height - c.zeroY)} />
              </clipPath>
              {/* Line screen, after the engraved caryatid poster. */}
              <pattern id={id.hatch} width={3} height={4} patternUnits="userSpaceOnUse">
                <rect width={1} height={4} className="fill-cobalt" />
              </pattern>
              {/* The line draws in once: a white stroke along the same path reveals the dashed line under it. */}
              {!drawn && (
                <mask id={id.draw} maskUnits="userSpaceOnUse" x={0} y={0} width={c.box.width} height={c.box.height}>
                  <m.path
                    d={c.full}
                    fill="none"
                    stroke="white"
                    strokeWidth={12}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: reduce ? 1 : 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: reduce ? 0 : 0.6, ease: EASE_OUT }}
                    onAnimationComplete={() => setDrawn(true)}
                  />
                </mask>
              )}
            </defs>

            {c.above && <path d={c.above} fill={`url(#${id.hatch})`} opacity={0.11} />}
            {c.below && <path d={c.below} className="fill-vase-wash" />}

            <line x1={c.box.left} x2={c.box.width - c.box.right} y1={c.zeroY} y2={c.zeroY} className="stroke-rule" strokeWidth={1} />

            {c.payday && (
              <g className="stroke-ink-mute fill-ink-mute">
                <line
                  x1={c.payday.x}
                  x2={c.payday.x}
                  y1={c.plotTop - 4}
                  y2={c.plotBottom}
                  strokeWidth={1}
                  strokeOpacity={0.6}
                  strokeDasharray={c.payday.estimate ? '2 3' : undefined}
                />
                <text x={c.payday.x} y={c.plotTop - 9} textAnchor={c.payday.anchor} stroke="none" className="text-2xs">
                  payday
                </text>
              </g>
            )}

            {selPoint && (
              <line x1={selPoint.x} x2={selPoint.x} y1={c.plotTop - 4} y2={c.plotBottom} className="stroke-cobalt" strokeOpacity={0.35} strokeWidth={1} />
            )}

            <g mask={drawn ? undefined : `url(#${id.draw})`} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <g clipPath={`url(#${id.above})`} className="stroke-cobalt">
                {c.solid && <path d={c.solid} />}
                {c.dashed && <path d={c.dashed} strokeDasharray="3.5 5" />}
              </g>
              {c.anyBelow && (
                <g clipPath={`url(#${id.below})`} className="stroke-vase">
                  {c.solid && <path d={c.solid} />}
                  {c.dashed && <path d={c.dashed} strokeDasharray="3.5 5" />}
                </g>
              )}
            </g>

            {(() => {
              const low = c.pts[c.lowest];
              return <circle cx={low.x} cy={low.y} r={7} fill="none" strokeWidth={1.5} className={low.below ? 'stroke-vase' : 'stroke-ink-strong'} />;
            })()}

            {c.dots.map((i) => {
              const p = c.pts[i];
              return <circle key={p.date} cx={p.x} cy={p.y} r={3.5} strokeWidth={2} className={cn('stroke-paper', dotFill(p.below))} />;
            })}

            {selPoint && <circle cx={selPoint.x} cy={selPoint.y} r={5} strokeWidth={2} className={cn('stroke-paper', dotFill(selPoint.below))} />}

            {c.ticks.map((t) => (
              <text key={t.i} x={t.x} y={c.box.height - 7} textAnchor={t.anchor} className="num fill-ink-mute text-2xs">
                {t.label}
              </text>
            ))}
          </svg>
        )}
      </div>

      <div aria-live="polite" className="mt-1">
        {day ? (
          <div className="rounded-[var(--radius-md)] bg-paper-2 px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-medium text-ink-strong">{day.title}</span>
              <span className={cn('num whitespace-nowrap text-sm font-medium', selPoint?.below ? 'text-vase' : 'text-ink-strong')}>{day.balance}</span>
            </div>
            <div className="flex min-h-6 items-center justify-between gap-3">
              <span className="text-xs text-ink-mute">Balance at end of day</span>
              {day.estimate && <EstimateTag />}
            </div>
            {day.events.length > 0 && (
              <ul className="mt-1.5 border-t border-rule-soft pt-1.5">
                {day.events.map((e) => (
                  <li key={e.key} className="flex min-h-7 items-center gap-2 text-sm">
                    <span className="min-w-0 truncate text-ink">{e.label}</span>
                    {e.estimate && <EstimateTag />}
                    <span className={cn('num ml-auto shrink-0 whitespace-nowrap', e.inflow ? 'text-aegean' : 'text-ink-strong')}>{e.amount}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
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
