import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Sample } from "../sim/types";
import type { TrendPoint } from "../sim/insights";
import { fmtDate, fmtTime } from "../lib/time";
import { cx } from "./style";

export function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="8" fill="var(--color-ink)" />
      <rect x="5" y="12" width="22" height="10" rx="2" fill="var(--color-green-tint)" opacity=".9" />
      <path d="M5 18h4l2-3 3 5 3-6 3 4h7" fill="none" stroke="var(--color-ink)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="8" r="3" fill="var(--color-orange)" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-2.5", className)}>
      <Mark className="size-7" />
      <span className="font-display text-[17px] font-bold tracking-[0.08em] text-ink">PREVUMO</span>
    </span>
  );
}

function prefersReduced(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** A number that glides to its new value instead of jumping, in the mono face. */
export function LiveNumber({ value, digits = 2, className }: { value: number; digits?: number; className?: string }) {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);
  const reduce = prefersReduced();
  useEffect(() => {
    if (reduce) return;
    const from = shownRef.current;
    const start = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / 600);
      const v = from + (value - from) * (1 - Math.pow(1 - k, 3));
      shownRef.current = v;
      setShown(v);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce]);
  return <span className={cx("num", className)}>{(reduce ? value : shown).toFixed(digits)}</span>;
}

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

/**
 * The last minute of draw over the machine's normal band. The whole trace slides one step per second,
 * so it scrolls continuously instead of jumping.
 */
export function Sparkline({
  samples,
  stroke,
  height = 52,
  showBand = true,
}: {
  samples: Sample[];
  stroke: string;
  height?: number;
  showBand?: boolean;
}) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const pts = samples.slice(-61);
  const n = pts.length;
  const max = Math.max(0.001, ...pts.map((p) => Math.max(p.kw, showBand ? p.hi : 0))) * 1.12;
  const step = n > 1 ? width / (n - 2) : width;
  const x = (i: number) => (i - 1) * step;
  const y = (v: number) => height - 3 - (v / max) * (height - 6);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.kw).toFixed(1)}`).join("");
  const band =
    pts.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.hi).toFixed(1)}`).join("") +
    [...pts].reverse().map((p, j) => `L${x(n - 1 - j).toFixed(1)},${y(p.lo).toFixed(1)}`).join("") +
    "Z";
  const outLine = pts.map((p, i) => (p.out ? `${i && pts[i - 1].out ? "L" : "M"}${x(i).toFixed(1)},${y(p.kw).toFixed(1)}` : "")).join("");
  const last = pts[n - 1];
  return (
    <div ref={ref} className="relative w-full overflow-hidden" style={{ height }}>
      {width > 0 && n > 2 && (
        <svg width={width} height={height} className="absolute inset-0" aria-hidden>
          <g key={last.t} className="spark-scroll" style={{ ["--step" as string]: `${step}px` }}>
            {showBand && <path d={band} fill="var(--color-green-tint)" opacity={0.85} />}
            <path d={line} fill="none" stroke={stroke} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
            {outLine && <path d={outLine} fill="none" stroke="var(--color-orange)" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />}
            {pts.map((p, i) =>
              p.out ? <circle key={p.t} cx={x(i)} cy={y(p.kw)} r={2.4} fill="var(--color-orange)" stroke="var(--color-rust)" strokeWidth={1} /> : null,
            )}
          </g>
        </svg>
      )}
    </div>
  );
}

/** Health as a ring of ticks, filled up to the score in the status colour. */
export function HealthRing({ score, color, size = 132, label }: { score: number | null; color: string; size?: number; label?: string }) {
  const ticks = 60;
  const r = size / 2;
  const filled = Math.round(((score ?? 0) / 100) * ticks);
  return (
    <div className="relative" role="img" aria-label={label ?? `Health ${score} of 100`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        {Array.from({ length: ticks }, (_, i) => {
          const a = (i / ticks) * Math.PI * 2 - Math.PI / 2;
          const r1 = r - 4;
          const r2 = r - (i % 5 === 0 ? 15 : 12);
          return (
            <line
              key={i}
              x1={r + Math.cos(a) * r1}
              y1={r + Math.sin(a) * r1}
              x2={r + Math.cos(a) * r2}
              y2={r + Math.sin(a) * r2}
              stroke={i < filled ? color : "var(--color-border)"}
              strokeWidth={2.4}
              strokeLinecap="round"
              style={{ transition: `stroke 400ms ${i * 8}ms` }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {score === null ? (
          <span className="text-[13px] text-muted">Learning</span>
        ) : (
          <>
            <LiveNumber value={score} digits={0} className="text-[34px] font-medium leading-none text-ink" />
            <span className="mt-1 text-xs text-muted">of 100</span>
          </>
        )}
      </div>
    </div>
  );
}

/** A frozen power trace, for the record (what was sent with a technician request). It does not scroll. */
export function Trace({ samples, height = 64 }: { samples: Sample[]; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const n = samples.length;
  const max = Math.max(0.001, ...samples.map((p) => Math.max(p.kw, p.hi))) * 1.12;
  const x = (i: number) => (i / Math.max(1, n - 1)) * width;
  const y = (v: number) => height - 3 - (v / max) * (height - 6);
  const path = (k: "kw" | "hi") => samples.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join("");
  const band =
    path("hi") +
    samples
      .map((_, j) => n - 1 - j)
      .map((i) => `L${x(i).toFixed(1)},${y(samples[i].lo).toFixed(1)}`)
      .join("") +
    "Z";
  return (
    <div>
      <div ref={ref} style={{ height }}>
        {width > 0 && n > 2 && (
          <svg width={width} height={height} role="img" aria-label={`Power before the request, ${samples.filter((p) => p.out).length} readings outside the normal range`}>
            <path d={band} fill="var(--color-green-tint)" />
            <path d={path("kw")} fill="none" stroke="var(--color-ink)" strokeWidth={1.5} strokeLinejoin="round" />
            {samples.map((p, i) => p.out && <circle key={p.t} cx={x(i)} cy={y(p.kw)} r={2.4} fill="var(--color-orange)" stroke="var(--color-rust)" strokeWidth={1} />)}
          </svg>
        )}
      </div>
      {n > 1 && (
        <p className="num mt-1 flex justify-between text-[11px] text-muted">
          <span>{fmtTime(samples[0].t * 1000)}</span>
          <span>{fmtTime(samples[n - 1].t * 1000)}</span>
        </p>
      )}
    </div>
  );
}

/** Health over the last 30 days: steps down at irregularities, drifts with age, jumps back at each service. */
export function HealthTrend({ points, height = 64 }: { points: TrendPoint[]; height?: number }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const n = points.length;
  const p = 6;
  const last = points[n - 1];
  const x = (i: number) => p + (i / Math.max(1, n - 1)) * (width - p * 2 - 26);
  const y = (v: number) => p + (1 - v / 100) * (height - p * 2);
  return (
    <div ref={ref} style={{ height }}>
      {width > 0 && n > 1 && (
        <svg width={width} height={height} role="img" aria-label={`Health went from ${points[0].score} to ${last.score} over ${n} days`}>
          {[75, 50].map((v) => (
            <line key={v} x1={p} x2={x(n - 1)} y1={y(v)} y2={y(v)} stroke="var(--color-border)" strokeDasharray="2 3" />
          ))}
          <path d={points.map((q, i) => `${i ? "L" : "M"}${x(i)},${y(q.score)}`).join("")} fill="none" stroke="var(--color-ink)" strokeWidth={2} strokeLinejoin="round" />
          {points.map((q, i) => (
            <g key={q.at}>
              {q.serviced && <line x1={x(i)} x2={x(i)} y1={p} y2={height - p} stroke="var(--color-green)" strokeWidth={2} />}
              {q.irregular > 0 && <circle cx={x(i)} cy={y(q.score)} r={4} fill="var(--color-orange-mark)" stroke="var(--color-surface)" strokeWidth={2} />}
              <rect x={x(i) - 5} width={10} height={height} fill="transparent">
                <title>{`${fmtDate(q.at)}: ${q.score}${q.irregular ? ", irregular" : ""}${q.serviced ? ", serviced" : ""}`}</title>
              </rect>
            </g>
          ))}
          <text x={x(n - 1) + 6} y={y(last.score) + 4} fontSize={12} className="num" fill="var(--color-ink)">
            {last.score}
          </text>
        </svg>
      )}
    </div>
  );
}
