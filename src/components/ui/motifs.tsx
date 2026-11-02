/**
 * Original single ink line art from docs/style/style-guide-preview.html.
 * 1.6 px strokes, round caps, currentColor. Decorative unless a label is given.
 */
import { useId, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

/** The angular FINANCE wordmark (straight strokes, C drawn as "<"). Used once, in the header. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 210 44" className={cn('h-8 w-auto text-cobalt', className)} role="img" aria-label="Finance">
      <g fill="none" stroke="currentColor" strokeWidth="6.5" strokeLinecap="butt" strokeLinejoin="miter">
        <path d="M4 2V42M4 4.5H24M4 21H20" />
        <path d="M34 2V42" />
        <path d="M45 42V2L67 42V2" />
        <path d="M75 42L89 3L103 42M82 28H96" />
        <path d="M112 42V2L134 42V2" />
        <path d="M165 3L144 22L165 41" />
        <path d="M196 4.5H176V39.5H196M176 22H192" />
      </g>
    </svg>
  );
}

/** Owl coin: Athenians called their coins owls. Sits with the safe to spend number. */
export function OwlCoin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 44" className={cn('size-11 text-cobalt', className)} aria-hidden {...line}>
      <circle cx="22" cy="22" r="18" />
      <circle cx="22" cy="22" r="15" strokeDasharray="1.5 2.5" />
      <path d="M15 21c0-4 3-6 7-6s7 2 7 6c0 6-3 10-7 10s-7-4-7-10z" />
      <circle cx="19" cy="21" r="2" />
      <circle cx="25" cy="21" r="2" />
      <path d="M21 25l1 1.5 1-1.5M16 16l-1-3M28 16l1-3" />
    </svg>
  );
}

/** Ionic column for a bill: filled when paid, outline when not. */
export function ColumnIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 18 26" className={cn('h-[26px] w-[18px] text-cobalt', className)} aria-hidden>
      <g fill="currentColor" fillOpacity={filled ? 1 : 0} stroke="currentColor" strokeWidth={filled ? 0 : 1.4} style={{ transition: 'fill-opacity 200ms cubic-bezier(0.23,1,0.32,1)' }}>
        <rect x="1" y="2" width="16" height="3" />
        <rect x="3" y="5" width="12" height="17" />
        <rect x="1" y="22" width="16" height="3" />
      </g>
    </svg>
  );
}

/** Ionic column in line art, for section marks and empty states. */
export function IonicColumn({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 44" className={cn('size-11 text-cobalt', className)} aria-hidden {...line}>
      <path d="M8 8h28M10 8c-4 0-5 5-1 6 3 0 3-3 1-3M34 8c4 0 5 5 1 6-3 0-3-3-1-3M12 14h20M14 14v24M19 14v24M25 14v24M30 14v24M10 38h24M8 41h28" />
    </svg>
  );
}

/** Olive branch: real wins only. */
export function OliveBranch({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 44" className={cn('size-11 text-cobalt', className)} aria-hidden {...line}>
      <path d="M8 38C16 28 26 16 38 8" />
      <path d="M16 29c-4-1-7 1-8 4 4 1 7-1 8-4zM20 24c0-4 2-7 6-7-1 4-3 6-6 7zM24 20c-4-1-7 0-9 3 4 1 7 0 9-3zM29 15c1-4 4-6 7-6-1 4-4 6-7 6zM31 13c-4-1-6 1-7 3" />
    </svg>
  );
}

/** Olive wreath, drawn once for a real win (bill paid on time, limit held, money into a jar). */
export function OliveWreath({ className, draw = false }: { className?: string; draw?: boolean }) {
  const leaf = 'M0 0c2.6-2.4 6.6-2.4 9 0-2.4 2.4-6.4 2.4-9 0z';
  const left = [0, 1, 2, 3, 4].map((i) => {
    const a = (200 + i * 28) * (Math.PI / 180);
    return { x: 22 + 15 * Math.cos(a), y: 24 + 15 * Math.sin(a), r: 200 + i * 28 + 70 };
  });
  return (
    <svg viewBox="0 0 44 44" className={cn('size-11 text-cobalt', className)} aria-hidden>
      <path
        d="M22 39C12 38 6 30 7 20M22 39c10-1 16-9 15-19"
        {...line}
        style={draw ? ({ strokeDasharray: 40, strokeDashoffset: 40, animation: 'wreath-draw 500ms cubic-bezier(0.23,1,0.32,1) forwards' } as CSSProperties) : undefined}
      />
      {left.map((p, i) => (
        <g key={i}>
          <path d={leaf} transform={`translate(${p.x} ${p.y}) rotate(${p.r})`} fill="currentColor" />
          <path d={leaf} transform={`translate(${44 - p.x} ${p.y}) rotate(${180 - p.r})`} fill="currentColor" />
        </g>
      ))}
    </svg>
  );
}

/** Four point star, for highlights. */
export function Star({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 44" className={cn('size-4 text-cobalt', className)} aria-hidden>
      <path d="M22 6c1 10 6 15 16 16-10 1-15 6-16 16-1-10-6-15-16-16 10-1 15-6 16-16z" fill="currentColor" />
    </svg>
  );
}

/** Arch window, for empty states. */
export function ArchWindow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 44" className={cn('size-11 text-cobalt', className)} aria-hidden {...line}>
      <path d="M12 40V18a10 10 0 0 1 20 0v22zM16 40V19a6 6 0 0 1 12 0v21M16 30h12" />
    </svg>
  );
}

/** Pomegranate, for groceries. */
export function Pomegranate({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 44" className={cn('size-11 text-cobalt', className)} aria-hidden {...line}>
      <circle cx="22" cy="25" r="13" />
      <path d="M19 12l1-4h4l1 4M17 9l2 3M27 9l-2 3M15 22c3 2 4 6 3 9M29 22c-3 2-4 6-3 9M22 18v14" />
    </svg>
  );
}

/** Waves, for the forecast. */
export function WavesMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 44 44" className={cn('size-11 text-cobalt', className)} aria-hidden {...line}>
      <path d="M4 26c4-6 8-6 10 0 2 6 6 6 8 0s6-6 8 0 6 6 10 0M4 33c4-5 8-5 10 0s6 5 8 0 6-5 8 0 6 5 10 0" />
    </svg>
  );
}

const JAR_BODY = 'M23 14c-11 3-15 14-12 25 3 9 10 13 19 13s16-4 19-13c3-11-1-22-12-25z';

/**
 * Panathenaic amphora that fills with ink from the bottom as savings grow.
 * The fill rises over 500 ms (transform only); reduced motion shows it in place.
 */
export function AmphoraJar({ pct, className }: { pct: number; className?: string }) {
  const id = useId();
  const p = Math.max(0, Math.min(1, pct));
  // Body spans y 14..52 in the 60x80 box.
  const top = 14;
  const bottom = 52;
  const h = (bottom - top) * p;
  return (
    <svg viewBox="0 0 60 80" className={cn('h-20 w-[60px] text-cobalt', className)} aria-hidden>
      <defs>
        <clipPath id={id}>
          <path d={JAR_BODY} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <rect
          x="0"
          y={bottom - h}
          width="60"
          height={h}
          fill="currentColor"
          style={{ transformOrigin: '30px 52px', transformBox: 'view-box', animation: 'jar-rise 500ms cubic-bezier(0.23,1,0.32,1) both' } as CSSProperties}
        />
      </g>
      <path
        d="M23 6h14M24 6c0 4-1 5-1 8M36 6c0 4 1 5 1 8M23 14c-11 3-15 14-12 25 3 9 10 13 19 13s16-4 19-13c3-11-1-22-12-25M16 17c-7 0-8 8-2 10M44 17c7 0 8 8 2 10M23 52l-3 6h20l-3-6"
        {...line}
      />
    </svg>
  );
}

/** Deterministic torn edge path for a band's top edge (0 to 16 high, jagged within 2..12). */
function tornTop(seed: number): string {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const pts = ['M0 14'];
  let x = 0;
  while (x < 430) {
    x = Math.min(430, x + 5 + rnd() * 11);
    pts.push(`L${x.toFixed(1)} ${(2 + rnd() * 10).toFixed(1)}`);
  }
  pts.push('L430 16 L0 16Z');
  return pts.join(' ');
}

const TORN = { sand: tornTop(11), sage: tornTop(29), scroll: tornTop(47), paper: tornTop(71) } as const;

export type BandTone = 'paper' | 'sand' | 'sage' | 'scroll';

/**
 * Full width colour band, like the Museo site, with an optional torn paper top
 * edge. Inside a band, small text switches to tones that keep 4.5:1 on that
 * colour (see STYLE_GUIDE.md "Text on bands"), and bar tracks use the paper colour.
 */
export function Band({ tone, torn = false, children, className, id }: { tone: BandTone; torn?: boolean; children: ReactNode; className?: string; id?: string }) {
  const vars: Record<BandTone, CSSProperties> = {
    paper: {},
    sand: { '--ink-mute': 'var(--text-2)', '--bar-track': 'var(--paper)' } as CSSProperties,
    scroll: { '--ink-mute': 'var(--text-2)', '--bar-track': 'var(--paper)' } as CSSProperties,
    sage: { '--ink-mute': 'var(--text)', '--ink-soft': 'var(--text)', '--ink-strong': 'var(--text)', '--bar-track': 'var(--paper)' } as CSSProperties,
  };
  const bg: Record<BandTone, string> = { paper: 'var(--paper)', sand: 'var(--sand)', sage: 'var(--sage)', scroll: 'var(--scroll)' };
  return (
    <div id={id} className={cn('relative -mx-4 px-4', torn ? 'mt-10 pb-8 pt-7' : 'mt-0 pb-8 pt-7', className)} style={{ background: bg[tone], ...vars[tone] }}>
      {torn && (
        <svg className="absolute inset-x-0 -top-[15px] block h-4 w-full" viewBox="0 0 430 16" preserveAspectRatio="none" aria-hidden>
          <path d={TORN[tone]} fill={bg[tone]} />
        </svg>
      )}
      {children}
    </div>
  );
}

/**
 * Engraved temple as a vertical line screen: thin lines where light hits, thick
 * lines in shadow, like the Welcome to Greece poster. Generated from code (a
 * stand in for a pre rendered Met Open Access photo).
 */
export function EngravedTemple({ className, style }: { className?: string; style?: CSSProperties }) {
  const rects: string[] = [];
  const lit: [number, number][] = [
    [28, 58],
    [88, 115],
    [145, 172],
  ];
  const r = (x: number, y: number, w: number, h: number) => {
    if (h > 0 && w > 0) rects.push(`M${x} ${y}h${w.toFixed(2)}v${h.toFixed(1)}h${(-w).toFixed(2)}z`);
  };
  for (let x = 10; x < 200; x += 3) {
    const yTop = x <= 115 ? 44 - (x - 10) * 0.3737 : 6 + (x - 115) * 0.3765;
    r(x, yTop, 0.7, 42 - yTop);
    r(x, 44, 1.5, 7);
    r(x, 52, 0.9, 12);
    const col = lit.find(([a, b]) => x >= a && x <= b);
    if (col) {
      const u = (x - col[0]) / (col[1] - col[0]);
      const w = Math.min(2.25, 0.36 + 1.9 * Math.pow(Math.abs(u - 0.35) / 0.65, 2));
      r(x, 64, 1.3, 10);
      r(x, 74, w, 122);
    } else if (x >= 22) {
      r(x, 64, 2.3, 132);
    }
    if (x >= 19) r(x, 196, 1, 10);
    r(x, 206, 0.6, 10);
    r(x, 218, 1.4, 22);
  }
  return (
    <svg viewBox="0 0 200 240" className={cn('text-cobalt', className)} style={style} aria-hidden>
      <path d={rects.join('')} fill="currentColor" />
    </svg>
  );
}
