/**
 * The ledger line used by bills, spending and paycheques, after the bills rows
 * in docs/style/style-guide-preview.html: open rows on paper with a hairline
 * rule between them, never boxes. Shared by the three lists in this area.
 */
import { m, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Empty } from '@/components/ui/bits';
import { ArchWindow } from '@/components/ui/motifs';

const EASE = [0.23, 1, 0.32, 1] as const;

/** The preview's rule between rows: ink at 18% (cream at 18% in dark mode). */
export const HAIRLINE = 'border-[color:color-mix(in_srgb,var(--ink-brand)_18%,transparent)]';

/**
 * Only the line's content reacts to a press; the hairline above it stays put.
 * Reduced motion: no movement, a short opacity dip instead.
 */
const PRESS = { pressed: { scale: 0.97 } };
const PRESS_STILL = { pressed: { opacity: 0.7 } };

/**
 * Stops a press on a control inside the row (the bill tick) from also pressing
 * the row. Motion listens for pointerdown on the row itself, so this has to be
 * a native listener, not a React one.
 */
export function stopRowPress(el: HTMLElement | null) {
  if (!el) return;
  const stop = (e: Event) => e.stopPropagation();
  el.addEventListener('pointerdown', stop);
  return () => el.removeEventListener('pointerdown', stop);
}

/**
 * One ledger line: an optional lead (the Ionic column tick), the name with a
 * small second line, and the amount on the right in tabular Inter. Tap, Enter
 * or Space opens the editor. Pressing scales the line to 0.97 in 140 ms
 * (transform only).
 */
export function LedgerRow({
  onOpen,
  lead,
  title,
  sub,
  amount,
  muted = false,
  amountClassName,
}: {
  onOpen: () => void;
  lead?: ReactNode;
  title: ReactNode;
  sub: ReactNode;
  amount: string;
  /** Paid bills: name and amount drop to the small print tone. */
  muted?: boolean;
  amountClassName?: string;
}) {
  const still = useReducedMotion();
  return (
    <m.div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        // Only keys pressed on the row itself; a tick inside handles its own.
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
      whileTap="pressed"
      className={cn('group block cursor-pointer border-t first:border-t-0', HAIRLINE)}
    >
      <m.div variants={still ? PRESS_STILL : PRESS} transition={{ duration: 0.14, ease: EASE }} className="flex min-h-14 items-center gap-3 py-[9px]">
        {lead}
        <div className="min-w-0 flex-1">
          <p className={cn('truncate text-[0.9375rem]', muted ? 'text-ink-mute' : 'text-ink')}>
            <span className="decoration-rule decoration-1 underline-offset-4 group-hover:underline">{title}</span>
          </p>
          <p className="truncate text-xs leading-normal text-ink-mute">{sub}</p>
        </div>
        <span className={cn('num whitespace-nowrap text-[0.9375rem]', muted ? 'text-ink-mute' : 'text-ink-soft', amountClassName)}>{amount}</span>
      </m.div>
    </m.div>
  );
}

/** Empty list: the arch window and a line that says what to do. */
export function LedgerEmpty({ children }: { children: ReactNode }) {
  return (
    <Empty>
      <span className="flex items-center gap-3.5">
        <ArchWindow className="size-11 shrink-0" />
        <span className="text-ink-soft">{children}</span>
      </span>
    </Empty>
  );
}
