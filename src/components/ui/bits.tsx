import { animate, m, useMotionValue, useReducedMotion, useTransform } from 'motion/react';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { LimitStatus } from '@/lib/limits';
import { ColumnIcon } from './motifs';

/** Section on the page: display heading, optional hint, optional action on the right. */
export function Section({
  title,
  hint,
  action,
  children,
  className,
  id,
}: {
  title: string;
  hint?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-h` : undefined} className={cn('mt-0', className)}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 id={id ? `${id}-h` : undefined} className="font-display text-2xl font-medium leading-tight text-[color:var(--ink-brand)]">
            {title}
          </h2>
          {hint && <p className="mt-1 text-sm text-ink-mute">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Small status tag: late, soon, estimate, not spending. */
export function Tag({ tone = 'mute', children, className }: { tone?: 'late' | 'soon' | 'good' | 'mute' | 'info'; children: ReactNode; className?: string }) {
  const tones = {
    late: 'bg-vase-wash text-vase',
    soon: 'bg-kiln-wash text-kiln',
    good: 'bg-laurel-wash text-laurel',
    info: 'bg-aegean-wash text-aegean',
    mute: 'bg-paper-2 text-ink-soft',
  } as const;
  return <span className={cn('inline-flex items-center rounded-[3px] px-1.5 py-0.5 text-xs font-medium leading-4', tones[tone], className)}>{children}</span>;
}

/** Paid mark for a bill: an Ionic column, filled when paid, outline when not. 44 px tap area. */
export function Tick({ checked, onToggle, label }: { checked: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      className="-m-2 grid size-11 shrink-0 place-items-center rounded-[3px] transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]"
    >
      <ColumnIcon filled={checked} />
    </button>
  );
}

const FILL: Record<LimitStatus, string> = {
  green: 'var(--fill-green)',
  orange: 'var(--fill-orange)',
  red: 'var(--fill-red)',
  none: 'var(--bar-none)',
};

/**
 * Limit bar, 12 px with a fine ink border, like the style guide. The fill has
 * a faint vertical stripe (the meander texture at bar scale) and grows with a
 * transform over 300 ms on first show and whenever the value changes.
 */
export function Bar({ pct, status, label }: { pct: number; status: LimitStatus; label: string }) {
  const reduce = useReducedMotion();
  const w = Math.max(0, Math.min(100, pct)) / 100;
  const color = FILL[status];
  return (
    <div className="mt-1.5 h-3 overflow-hidden rounded-[2px] border border-rule bg-bar-track" role="img" aria-label={label}>
      <m.div
        className="h-full origin-left"
        style={{
          background: status === 'none' ? color : `repeating-linear-gradient(90deg, ${color} 0 9px, color-mix(in srgb, ${color} 78%, white) 9px 10px)`,
        }}
        initial={{ scaleX: reduce ? w : 0 }}
        animate={{ scaleX: w }}
        transition={{ duration: reduce ? 0 : 0.3, ease: [0.23, 1, 0.32, 1] }}
      />
    </div>
  );
}

/** Number that counts to its new value. Formats with the given function. */
export function CountUp({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => format(v));
  const reduce = useReducedMotion();
  const first = useRef(true);
  useEffect(() => {
    if (first.current || reduce) {
      first.current = false;
      mv.set(value);
      return;
    }
    const c = animate(mv, value, { duration: 0.4, ease: [0.23, 1, 0.32, 1] });
    return () => c.stop();
  }, [value, reduce, mv]);
  return <m.span className={cn('num', className)}>{text}</m.span>;
}

/** Greek key (meander) band between two border lines, one continuous key per 16 px. */
export function Meander({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg className={cn('h-4 w-full text-cobalt/50', className)} aria-hidden preserveAspectRatio="xMidYMid slice" viewBox="0 0 256 16">
      <defs>
        <pattern id={id} width="16" height="16" patternUnits="userSpaceOnUse">
          <path
            d="M0 0.75H16M0 15.25H16M2.5 15.25V3.75H13.5V12.25H6.5V7.25H10V9.75"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        </pattern>
      </defs>
      <rect width="256" height="16" fill={`url(#${id})`} />
    </svg>
  );
}

/** Amphora for a tuition goal; the fill rises with the saved amount. */
export function Amphora({ pct, id }: { pct: number; id: string }) {
  const p = Math.max(0, Math.min(1, pct));
  const reduce = useReducedMotion();
  const body = 'M30 18c0 5-9 9-11 20-3 16 0 36 9 50 3 5 6 8 6 12h12c0-4 3-7 6-12 9-14 12-34 9-50-2-11-11-15-11-20z';
  const top = 96;
  const bottom = 18;
  const y = bottom + (top - bottom) * (1 - p);
  return (
    <svg viewBox="0 0 80 112" className="mx-auto h-28 w-auto" aria-hidden>
      <clipPath id={`amph-${id}`}>
        <path d={body} />
      </clipPath>
      <g clipPath={`url(#amph-${id})`}>
        <m.rect
          x="0"
          width="80"
          height="112"
          fill="var(--cobalt)"
          opacity="0.88"
          initial={{ y: reduce ? y : top }}
          animate={{ y }}
          transition={{ duration: reduce ? 0 : 0.8, ease: [0.22, 1, 0.36, 1] }}
        />
      </g>
      <path d={body} fill="none" stroke="var(--ink)" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M28 10h24M30 10v8M50 10v8" fill="none" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M30 24c-8 0-12 6-10 13M50 24c8 0 12 6 10 13" fill="none" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M34 100h12v6H34z" fill="none" stroke="var(--ink)" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

/** Row on a list that opens an editor when tapped. */
export function RowButton({ children, onClick, className, label }: { children: ReactNode; onClick: () => void; className?: string; label?: string }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onClick}
      onKeyDown={(e) => {
        // Only keys pressed on the row itself; a tick or button inside handles its own.
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        'flex min-h-14 cursor-pointer items-center gap-3 border-t border-rule-soft py-2.5 transition-colors first:border-t-0 hover:bg-cobalt-wash/40 active:bg-cobalt-wash/70 -mx-2 px-2 rounded-[var(--radius-sm)]',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-3 text-[0.9375rem] text-ink-mute">{children}</p>;
}
