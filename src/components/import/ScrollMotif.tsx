import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { animate, m, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { cn } from '@/lib/utils';

/**
 * A scroll with a roll at each end, for the import sheet ("Import review: a
 * scroll that unrolls", STYLE_GUIDE.md). Same hand as the motifs in
 * src/components/ui/motifs.tsx: 1.6 px strokes, round caps, currentColor.
 * Kept here (not in ui/) because only the import flow uses it.
 */
export function ScrollMotif({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 44 44"
      className={cn('size-11 text-cobalt', className)}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.5 5.5h24.5a3.6 3.6 0 0 1 0 7.2H9.5a3.6 3.6 0 0 1 0-7.2z" />
      <path d="M9.6 9.1h.1M34 9.1h.1" />
      <path d="M12 12.7v18.6M32 12.7v18.4" />
      <path d="M10 31.3h24.4a3.6 3.6 0 0 1 0 7.2H10a3.6 3.6 0 0 1 0-7.2z" />
      <path d="M10.1 34.9h.1M34.4 34.9h.1" />
      <path d="M16.5 18.2h11M16.5 22.2h9M16.5 26.2h10.5" />
    </svg>
  );
}

const SHEET_EASE = [0.32, 0.72, 0, 1] as const;
/** The guide allows sheets up to 500 ms; the unroll stays inside that. */
const UNROLL_S = 0.46;

/**
 * The scroll that unrolls: the review is revealed top to bottom with a clip
 * path while a paper roll travels down its edge, once, when the review shows.
 * The roll covers what fits on screen in the full time (a long list below the
 * fold is simply there when he scrolls). Reduced motion: shown in place, no roll.
 */
export function Unroll({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const p = useMotionValue(reduce ? 1 : 0);
  // Full height of the review, and how far the roll travels (the part that shows in the sheet).
  const full = useMotionValue(0);
  const reach = useMotionValue(0);
  const box = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState(false);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const h = el.offsetHeight;
    // The part of the review that shows inside the sheet's scrolling body.
    let port: HTMLElement | null = el.parentElement;
    while (port && !/(auto|scroll)/.test(getComputedStyle(port).overflowY)) port = port.parentElement;
    const bottom = port ? port.getBoundingClientRect().bottom : window.innerHeight;
    const seen = Math.round(bottom - el.getBoundingClientRect().top);
    full.set(h);
    reach.set(Math.max(0, Math.min(h, seen > 40 ? seen : h)));
    setMeasured(h > 0);
  }, [full, reach]);

  useEffect(() => {
    if (reduce) {
      p.set(1);
      return;
    }
    const run = animate(p, 1, { duration: UNROLL_S, ease: SHEET_EASE });
    return () => run.stop();
  }, [reduce, p]);

  // Left and right stay open so focus rings and the 44 px tick targets are never cut; none once unrolled.
  const clipPath = useTransform([p, full, reach], ([v, h, d]: number[]) => {
    if (v >= 1) return 'none';
    if (!h) return 'inset(-8px -24px 100% -24px)';
    return `inset(-8px -24px ${Math.max(0, h - v * d).toFixed(1)}px -24px)`;
  });
  const y = useTransform([p, reach], ([v, d]: number[]) => v * d);
  const opacity = useTransform(p, [0, 0.85, 1], [1, 1, 0]);

  return (
    <div className={cn('relative', className)}>
      <m.div ref={box} style={{ clipPath }}>
        {children}
      </m.div>
      {!reduce && measured && (
        <m.div aria-hidden className="pointer-events-none absolute inset-x-0 -top-1 h-2" style={{ y, opacity }}>
          <div className="h-full rounded-[3px] border border-[color:color-mix(in_srgb,var(--ink-brand)_30%,transparent)] bg-[color:color-mix(in_srgb,var(--stone)_28%,var(--scroll))]" />
        </m.div>
      )}
    </div>
  );
}
