import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { Undo2 } from 'lucide-react';
import { useFinance } from '@/lib/store';
import { Button } from '@/components/ui/button';

/** How long the bar stays when nothing holds it. */
const SHOW_MS = 8000;
/** After the pointer or focus lets go, at least this long before it leaves, so it never vanishes under the hand. */
const RESUME_MIN_MS = 1000;
const EASE_OUT_QUINT = [0.22, 1, 0.36, 1] as const;
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
 * "Deleted Costco $182.40 · Undo". Floats above the bottom action bar after
 * every undoable change, for 8 seconds; holding the pointer over it or moving
 * focus into it stops the clock. Ink on paper inverted, so it reads in light
 * and dark mode alike.
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
            animate={{ y: 0, opacity: 1, transition: { duration: 0.22, ease: EASE_OUT_QUINT } }}
            exit={{ y: '100%', opacity: 0, transition: { duration: 0.16, ease: EASE_IN } }}
            className="pointer-events-auto flex w-full max-w-[34rem] items-center gap-1 rounded-[var(--radius-lg)] bg-ink-strong py-1 pl-4 pr-1 text-paper shadow-lift"
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
            <span aria-hidden className="mx-1 h-6 w-px shrink-0 bg-paper/25" />
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 font-semibold text-paper hover:bg-paper/10 hover:text-paper focus-visible:outline-paper"
              onClick={() => undo(entry.id)}
            >
              <Undo2 aria-hidden />
              Undo
            </Button>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
