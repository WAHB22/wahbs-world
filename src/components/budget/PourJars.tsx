import { m, useReducedMotion } from 'motion/react';
import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * Cover it, drawn: two small amphorae, the left one tilts and pours room into
 * the right one (STYLE_GUIDE.md "Myth meets money": Cover it = two amphorae
 * pouring). Original line art in one ink, the amphora motif from the style
 * guide preview. Plays once when shown: it waits for the sheet to land
 * (`delay`), then pours in about 450 ms, transform and opacity only.
 * Reduced motion shows the poured state with no movement.
 */

/** Amphora outline in a 44 x 44 box: mouth at y 4, foot at y 41. */
const OUTLINE =
  'M17 4h10M18 4c0 3-1 4-1 6M26 4c0 3 1 4 1 6M17 10c-8 2-11 10-9 18 2 6 7 9 14 9s12-3 14-9c2-8-1-16-9-18M12 12c-5 0-6 6-2 8M32 12c5 0 6 6 2 8M17 37l-2 4h14l-2-4';
const BODY = 'M17 10c-8 2-11 10-9 18 2 6 7 9 14 9s12-3 14-9c2-8-1-16-9-18z';

const EASE = [0.23, 1, 0.32, 1] as const;
const line = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

/** The giving jar turns about its middle until its mouth sits over the other jar. */
const PIVOT = { x: 35.2, y: 16.8 };
const TILT = 70;
/** The receiving jar sits lower and to the right; its mouth is at (64, 25). */
const RECEIVER = { x: 42, y: 21 };

export function PourJars({ className, delay = 0.2 }: { className?: string; /** Seconds before the pour starts. */ delay?: number }) {
  const clip = useId();
  const reduce = useReducedMotion();
  const still = !!reduce;
  // Ink level inside the receiving jar after the pour (jar coordinates, body spans y 10..37).
  const level = 25;
  return (
    <svg viewBox="0 -2 96 68" className={cn('h-[68px] w-24 text-cobalt', className)} aria-hidden>
      <defs>
        <clipPath id={clip}>
          <path d={BODY} transform={`translate(${RECEIVER.x} ${RECEIVER.y})`} />
        </clipPath>
      </defs>

      {/* The receiving jar fills from its foot. */}
      <g clipPath={`url(#${clip})`}>
        <m.rect
          x={RECEIVER.x}
          y={RECEIVER.y + level}
          width="44"
          height={37 - level + 1}
          fill="currentColor"
          style={{ transformBox: 'view-box', originX: `${RECEIVER.x + 22}px`, originY: `${RECEIVER.y + 38}px` }}
          initial={still ? false : { scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.26, delay: delay + 0.2, ease: EASE }}
        />
      </g>
      <path d={OUTLINE} transform={`translate(${RECEIVER.x} ${RECEIVER.y})`} {...line} />

      {/* A dotted stream from one mouth to the other. */}
      <m.path
        d="M55.5 10.5c4 1 7 5 8 13"
        {...line}
        strokeDasharray="0.1 3"
        initial={still ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18, delay: delay + 0.16, ease: EASE }}
      />

      {/* The giving jar tilts toward the other one. */}
      <m.g
        style={{ transformBox: 'view-box', originX: `${PIVOT.x}px`, originY: `${PIVOT.y}px` }}
        initial={still ? false : { rotate: 0 }}
        animate={{ rotate: TILT }}
        transition={{ duration: 0.24, delay, ease: EASE }}
      >
        <path d={OUTLINE} transform={`translate(${PIVOT.x - 22} ${PIVOT.y - 24})`} {...line} />
      </m.g>
    </svg>
  );
}
