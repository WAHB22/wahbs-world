import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Sample } from "../sim/types";
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
  const last = pts[n - 1];
  return (
    <div ref={ref} className="relative w-full overflow-hidden" style={{ height }}>
      {width > 0 && n > 2 && (
        <svg width={width} height={height} className="absolute inset-0" aria-hidden>
          <g key={last.t} className="spark-scroll" style={{ ["--step" as string]: `${step}px` }}>
            {showBand && <path d={band} fill="var(--color-green-tint)" opacity={0.85} />}
            <path d={line} fill="none" stroke={stroke} strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" />
            {pts.map((p, i) =>
              p.out ? <circle key={p.t} cx={x(i)} cy={y(p.kw)} r={2.4} fill="var(--color-orange)" /> : null,
            )}
          </g>
        </svg>
      )}
    </div>
  );
}

/** Health as a ring of ticks, filled up to the score in the status colour. */
export function HealthRing({ score, color, size = 132 }: { score: number; color: string; size?: number }) {
  const ticks = 60;
  const r = size / 2;
  const filled = Math.round((score / 100) * ticks);
  return (
    <div className="relative" style={{ width: size, height: size }}>
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
        <span className="num text-[34px] font-medium leading-none text-ink">{score}</span>
        <span className="mt-1 text-xs text-muted">of 100</span>
      </div>
    </div>
  );
}
