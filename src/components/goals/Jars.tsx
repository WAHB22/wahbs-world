import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { useFinance } from '@/lib/store';
import { useUI } from '@/lib/ui-store';
import { Amphora, Empty, Section } from '@/components/ui/bits';
import { Sparkle } from '@/components/ui/ornaments';
import { jars } from './goals.logic';
import { GoalSheet } from './GoalSheet';

const EASE = [0.22, 1, 0.36, 1] as const;
/** How long the Sparkle stays beside a jar after money goes in. */
const SPARKLE_MS = 1800;

/** Three tuition jars. The amphora fills with saved / target. */
export function Jars() {
  const data = useFinance((s) => s.data)!;
  const list = useMemo(() => jars(data), [data]);
  const [spark, setSpark] = useState<{ id: string; n: number } | null>(null);
  const onAdded = useCallback((id: string) => setSpark((s) => ({ id, n: (s?.n ?? 0) + 1 })), []);

  useEffect(() => {
    if (!spark) return;
    const t = window.setTimeout(() => setSpark(null), SPARKLE_MS);
    return () => window.clearTimeout(t);
  }, [spark]);

  return (
    <Section id="goals" title="Tuition goals" hint="Tap a jar to add savings">
      {list.length === 0 ? (
        <Empty>No goals yet.</Empty>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {list.map((j) => (
            <button
              key={j.id}
              type="button"
              aria-label={j.label}
              onClick={() => useUI.getState().open('goal', j.id)}
              className="relative flex min-w-0 flex-col items-center rounded-[var(--radius-lg)] px-1 pb-2.5 pt-1 text-center transition-[background-color,transform] duration-150 ease-[var(--ease-out-quint)] hover:bg-cobalt-wash/40 active:scale-[0.97] active:bg-cobalt-wash/70"
            >
              <Amphora pct={j.pct} id={j.id} />
              <AnimatePresence>
                {spark?.id === j.id && (
                  <m.span
                    key={spark.n}
                    className="pointer-events-none absolute right-[14%] top-1 text-cobalt"
                    initial={{ opacity: 0, scale: 0.4, rotate: -25 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.4 } }}
                    transition={{ duration: 0.32, ease: EASE, delay: 0.18 }}
                    aria-hidden
                  >
                    <Sparkle className="size-4" />
                    <Sparkle className="absolute -left-3 top-4 size-2.5 opacity-80" />
                  </m.span>
                )}
              </AnimatePresence>
              <span className="mt-1.5 line-clamp-2 min-h-8 w-full break-words text-xs leading-4 text-ink-soft">{j.name}</span>
              <span className="num mt-1 whitespace-nowrap text-base font-medium leading-tight text-ink-strong">{j.saved}</span>
              <span className="num whitespace-nowrap text-xs text-ink-mute">{j.of}</span>
            </button>
          ))}
        </div>
      )}
      <GoalSheet onAdded={onAdded} />
    </Section>
  );
}
