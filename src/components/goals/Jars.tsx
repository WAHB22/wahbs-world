import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { useFinance } from '@/lib/store';
import { useUI } from '@/lib/ui-store';
import { Empty, Section } from '@/components/ui/bits';
import { AmphoraJar, ArchWindow, OliveWreath } from '@/components/ui/motifs';
import { useFirstWeek } from '@/components/top/SafeToSpend';
import { jars } from './goals.logic';
import { GoalSheet } from './GoalSheet';

const EASE = [0.23, 1, 0.32, 1] as const;
/** The sheet slides away in 200 ms; the jar rises and the wreath draws once it is gone. */
const SHEET_EXIT_MS = 200;
/** How long the olive wreath stays beside a jar after money goes in. */
const WREATH_MS = 2600;

/**
 * Three tuition jars on the sage band, like the style guide: a Panathenaic
 * amphora that fills with ink (saved / target), the saved amount in Bodoni,
 * then "of $10,043" and the name in small text. Money put into a jar is a real
 * win: the amphora rises again and an olive wreath is drawn once beside it.
 */
export function Jars() {
  const data = useFinance((s) => s.data)!;
  const today = useFinance((s) => s.today);
  const list = useMemo(() => jars(data), [data]);
  const story = useFirstWeek(today);
  const [win, setWin] = useState<{ id: string; n: number } | null>(null);
  /** Bumped per jar on a real add, so its amphora remounts and the ink rises (500 ms). */
  const [rises, setRises] = useState<Record<string, number>>({});
  const pending = useRef<number | undefined>(undefined);

  const onAdded = useCallback((id: string) => {
    window.clearTimeout(pending.current);
    pending.current = window.setTimeout(() => {
      setRises((r) => ({ ...r, [id]: (r[id] ?? 0) + 1 }));
      setWin((w) => ({ id, n: (w?.n ?? 0) + 1 }));
    }, SHEET_EXIT_MS);
  }, []);

  useEffect(() => () => window.clearTimeout(pending.current), []);

  useEffect(() => {
    if (!win) return;
    const t = window.setTimeout(() => setWin(null), WREATH_MS);
    return () => window.clearTimeout(t);
  }, [win]);

  return (
    <Section id="goals" title="Tuition jars" hint="Tap a jar to add savings">
      {list.length === 0 ? (
        <div className="flex items-center gap-3">
          <ArchWindow className="size-9 shrink-0" />
          <Empty>No tuition jars yet.</Empty>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            {list.map((j) => (
              <button
                key={j.id}
                type="button"
                aria-label={j.label}
                onClick={() => useUI.getState().open('goal', j.id)}
                className="relative flex min-h-11 min-w-0 flex-col items-center rounded-[var(--radius-md)] px-1 pb-1 pt-1 text-center transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]"
              >
                <AmphoraJar key={rises[j.id] ?? 0} pct={j.pct} className="mb-1 shrink-0" />
                <AnimatePresence>
                  {win?.id === j.id && (
                    <m.span
                      key={win.n}
                      className="pointer-events-none absolute left-[calc(50%+18px)] top-1"
                      initial={{ opacity: 0, scale: 0.94 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, transition: { duration: 0.2, ease: EASE } }}
                      transition={{ duration: 0.2, ease: EASE }}
                      aria-hidden
                    >
                      <OliveWreath draw className="size-9" />
                    </m.span>
                  )}
                </AnimatePresence>
                <span className="num whitespace-nowrap font-display text-[0.9375rem] font-semibold leading-tight text-ink-strong">{j.saved}</span>
                <span className="mt-0.5 block w-full text-2xs leading-[1.3] text-ink-mute">
                  <span className="num block whitespace-nowrap">{j.of}</span>
                  <span className="line-clamp-2 block break-words">{j.name}</span>
                </span>
              </button>
            ))}
          </div>
          {story && (
            <p className="mx-auto mt-2 max-w-[20rem] text-center text-[0.8125rem] leading-snug text-ink-mute">
              Winners at the Panathenaic games took home an amphora of olive oil.
            </p>
          )}
        </>
      )}
      <GoalSheet onAdded={onAdded} />
    </Section>
  );
}
