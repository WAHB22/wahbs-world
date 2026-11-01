/**
 * Hand drawn Mediterranean ornaments, authored as SVG in one ink
 * (currentColor), after the Minos motif sheet and the engraved caryatid poster.
 * All are decorative: aria-hidden, no text.
 */
import { useId } from 'react';
import { cn } from '@/lib/utils';

/** Wave scroll band (running dog), as on Greek pottery rims. */
export function Waves({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg className={cn('h-3.5 w-full text-cobalt/55', className)} aria-hidden preserveAspectRatio="xMidYMid slice" viewBox="0 0 240 14">
      <defs>
        <pattern id={id} width="24" height="14" patternUnits="userSpaceOnUse">
          <path
            d="M0 12.5C5 12.5 6.5 4 12 3.5C16.2 3.1 18.4 6.6 16.6 9.2C15.1 11.3 11.6 10.9 11.4 8.6C11.3 7.2 12.6 6.4 13.7 7M16.6 9.2C18.6 12.2 21 12.5 24 12.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </pattern>
      </defs>
      <rect width="240" height="14" fill={`url(#${id})`} />
    </svg>
  );
}

/** Small olive branch, for the header and empty states. */
export function OliveSprig({ className }: { className?: string }) {
  const leaf = 'M0 0C3.5-3.2 10-3.4 14 0C10 3.4 3.5 3.2 0 0Z';
  const leaves: [number, number, number][] = [
    [10, 22, -40],
    [16, 16, 30],
    [22, 13, -35],
    [29, 9, 28],
    [35, 7, -25],
    [41, 4, 20],
  ];
  return (
    <svg className={cn('h-7 w-auto text-cobalt', className)} aria-hidden viewBox="0 0 60 30" fill="none">
      <path d="M3 28C14 20 30 10 56 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      {leaves.map(([x, y, r], i) => (
        <path key={i} d={leaf} transform={`translate(${x} ${y}) rotate(${r})`} fill="currentColor" opacity={i % 2 ? 1 : 0.85} />
      ))}
      <circle cx="20" cy="22" r="2.6" fill="currentColor" />
      <circle cx="33" cy="15.5" r="2.3" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

/** Four point star, used only next to real progress (on goal, limit held, bill paid on time). */
export function Sparkle({ className }: { className?: string }) {
  return (
    <svg className={cn('size-3.5 text-cobalt', className)} aria-hidden viewBox="0 0 24 24">
      <path d="M12 0C12.9 7.2 16.8 11.1 24 12C16.8 12.9 12.9 16.8 12 24C11.1 16.8 7.2 12.9 0 12C7.2 11.1 11.1 7.2 12 0Z" fill="currentColor" />
    </svg>
  );
}

/** Deterministic pseudo random walk for the torn edge, so it never changes between renders. */
function tornPath(width: number, depth: number, seed: number): string {
  let s = seed;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const pts: string[] = [`M0 0H${width}`];
  let x = width;
  while (x > 0) {
    x = Math.max(0, x - (4 + rnd() * 9));
    const y = depth * (0.25 + rnd() * 0.75);
    pts.push(`L${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  pts.push('Z');
  return pts.join(' ');
}

const TORN_MAIN = tornPath(400, 14, 7);
const TORN_FIBRE = tornPath(400, 17, 31);

/**
 * Torn paper edge hanging under a coloured band (Museo collage). Put it right
 * after the band; it inherits the band colour from `--hero-bg`.
 */
export function TornEdge({ className }: { className?: string }) {
  return (
    <svg className={cn('-mt-px block h-4 w-full', className)} aria-hidden preserveAspectRatio="none" viewBox="0 0 400 18">
      <path d={TORN_FIBRE} fill="var(--hero-soft)" opacity="0.55" />
      <path d={TORN_MAIN} fill="var(--hero-bg)" />
    </svg>
  );
}

/**
 * Temple corner drawn in vertical engraving lines (line screen), after the
 * caryatid poster. Fills with currentColor at whatever opacity the parent sets.
 */
export function EngravedTemple({ className }: { className?: string }) {
  const id = useId();
  const cols = [46, 104, 162];
  return (
    <svg className={cn('h-full w-auto', className)} aria-hidden viewBox="0 0 210 250">
      <defs>
        <pattern id={`${id}-l`} width="3" height="4" patternUnits="userSpaceOnUse">
          <rect width="1.15" height="4" fill="currentColor" />
        </pattern>
        <pattern id={`${id}-d`} width="2" height="4" patternUnits="userSpaceOnUse">
          <rect width="1.25" height="4" fill="currentColor" />
        </pattern>
      </defs>
      <g fill={`url(#${id}-l)`}>
        <path d="M4 14H210V30H4z" />
        <path d="M14 30H210V42H14z" />
        <path d="M22 42H210V52H22z" />
        {cols.map((x) => (
          <g key={x}>
            <path d={`M${x - 8} 52H${x + 34}V60H${x - 8}z`} />
            <circle cx={x - 6} cy={60} r={6} />
            <circle cx={x + 32} cy={60} r={6} />
            <path d={`M${x + 1} 64H${x + 25}L${x + 27} 226H${x - 1}z`} />
          </g>
        ))}
        <path d="M20 226H210V234H20z" />
        <path d="M8 234H210V250H8z" />
      </g>
      {/* Shadow side of each shaft, denser lines for volume. */}
      <g fill={`url(#${id}-d)`}>
        <path d="M14 30H210V34H14z" />
        {cols.map((x) => (
          <path key={x} d={`M${x + 16} 64H${x + 25}L${x + 27} 226H${x + 17}z`} />
        ))}
      </g>
    </svg>
  );
}
