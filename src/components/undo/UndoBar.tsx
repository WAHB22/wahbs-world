import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { useFinance } from '@/lib/store';

/** How long the bar stays when nothing holds it. */
const SHOW_MS = 8000;
/** After the pointer or focus lets go, at least this long before it leaves, so it never vanishes under the hand. */
const RESUME_MIN_MS = 1000;
/** The guide's one ease out, 200 ms in; leaving is quicker. */
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const EASE_IN = [0.55, 0, 1, 0.45] as const;

/**
 * Runs onDone after SHOW_MS for each new id. The clock stops while paused and
 * picks up where it left off; a new id starts it again from the full time.
 */
function useAutoDismiss(id: string | null, paused: boolean, onDone: (id: string) => void) {
  const left = useRef(SHOW_MS);
  const forId = useRef<string | null>(null);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });
  useEffect(() => {
    if (!id) return;
    if (forId.current !== id) {
      forId.current = id;
      left.current = SHOW_MS;
    }
    if (paused) return;
    const wait = left.current === SHOW_MS ? SHOW_MS : Math.max(left.current, RESUME_MIN_MS);
    const start = Date.now();
    const timer = window.setTimeout(() => done.current(id), wait);
    return () => {
      window.clearTimeout(timer);
      left.current = Math.max(0, wait - (Date.now() - start));
    };
  }, [id, paused]);
}

/**
 * "Deleted Costco $182.40 · Undo". An ink strip with paper text and an Undo
 * text button, 3 px corners, that slides up over 200 ms above the bottom
 * action bar after every undoable change, for 8 seconds; holding the pointer
 * over it or moving focus into it stops the clock. Ink and paper swap in dark
 * mode (a cream strip with night text), so it reads in both.
 */
export function UndoBar() {
  const entry = useFinance((s) => s.lastUndo);
  const undo = useFinance((s) => s.undo);
  const dismissUndo = useFinance((s) => s.dismissUndo);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  // Once the bar is gone, nothing can still be holding it.
  if (!entry && (hovered || focused)) {
    setHovered(false);
    setFocused(false);
  }

  useAutoDismiss(entry?.id ?? null, hovered || focused, (id) => {
    // Only the entry this timer was for; a newer one has its own clock.
    if (useFinance.getState().lastUndo?.id === id) dismissUndo();
  });

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 z-30 flex justify-center px-4"
      style={{ bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' }}
    >
      <AnimatePresence>
        {entry && (
          <m.div
            key="undo-bar"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1, transition: { duration: 0.2, ease: EASE_OUT } }}
            exit={{ y: '100%', opacity: 0, transition: { duration: 0.15, ease: EASE_IN } }}
            className="pointer-events-auto flex min-h-14 w-full max-w-[34rem] items-center gap-2 rounded-[3px] bg-[color:var(--ink-brand)] py-1.5 pl-4 pr-1.5 text-paper shadow-lift"
            onPointerEnter={() => setHovered(true)}
            onPointerLeave={() => setHovered(false)}
            onFocus={() => setFocused(true)}
            onBlur={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') dismissUndo();
            }}
          >
            <m.p
              key={entry.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.15 }}
              className="num min-w-0 flex-1 truncate text-[0.9375rem]"
            >
              {entry.note}
            </m.p>
            <button
              type="button"
              className="inline-flex min-h-11 shrink-0 items-center rounded-[3px] px-3.5 text-sm font-semibold uppercase tracking-[0.14em] text-paper underline decoration-paper/45 underline-offset-[5px] transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-paper/10 active:scale-[0.97] focus-visible:outline-paper"
              onClick={() => undo(entry.id)}
            >
              Undo
            </button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
