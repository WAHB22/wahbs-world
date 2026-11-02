import { useMemo, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { useFinance } from '@/lib/store';
import { safeToSpend } from '@/lib/money';
import { dollars, money } from '@/lib/format';
import { daysBetween, shortDate } from '@/lib/dates';
import { useUI } from '@/lib/ui-store';
import { CountUp } from '@/components/ui/bits';
import { Button } from '@/components/ui/button';
import { EngravedTemple, OwlCoin } from '@/components/ui/motifs';
import { cn } from '@/lib/utils';

/** Bill names in sentences drop the bracket part: 'Phone + Crave/Disney (Bell)' -> 'Phone + Crave'. */
function shortName(name: string): string {
  return name.split(/[/(]/)[0].trim() || name;
}

/** Optional one line stories show only in his first week with the new look (STYLE_GUIDE.md). */
export function useFirstWeek(today: string): boolean {
  return useMemo(() => {
    try {
      const k = 'finance-look-since';
      let since = localStorage.getItem(k);
      if (!since) {
        since = today;
        localStorage.setItem(k, today);
      }
      return daysBetween(since, today) < 7;
    } catch {
      return false;
    }
  }, [today]);
}

function paydayLine(today: string, next: string): string {
  const n = daysBetween(today, next);
  const when = n <= 0 ? 'Payday today' : n === 1 ? 'Payday tomorrow' : `Payday in ${n} days`;
  return `${when} · ${shortDate(next)}`;
}

/**
 * The one big number on the home screen, on paper, with an engraved temple
 * bleeding off the right edge like the Welcome to Greece poster.
 */
export function SafeToSpend() {
  const data = useFinance((s) => s.data)!;
  const today = useFinance((s) => s.today);
  const s = useMemo(() => safeToSpend(data, today), [data, today]);
  const [open, setOpen] = useState(false);
  const story = useFirstWeek(today);
  const big = s.status === 'ok' && s.perDay >= 1000;

  return (
    <section aria-labelledby="sts-h" className="relative -mx-4 overflow-hidden px-4 pb-10 pt-8">
      <div className="pointer-events-none absolute -right-10 bottom-0 h-[264px] w-[220px]" aria-hidden>
        <EngravedTemple className="h-full w-full" />
      </div>
      <h2 id="sts-h" className="caps relative">
        Safe to spend today
      </h2>
      {s.status === 'no-pay' ? (
        <div className="relative mt-3 max-w-[13.5rem]">
          <p className="font-display text-3xl font-semibold leading-tight text-[color:var(--ink-brand)]">Log your last paycheque</p>
          <p className="mt-2 text-sm text-ink-soft">Then this shows what you can spend each day until the next one.</p>
          <Button variant="secondary" size="sm" className="mt-4 bg-paper" onClick={() => useUI.getState().open('pay')}>
            Log paycheque
          </Button>
        </div>
      ) : (
        <div className="relative">
          <p className={cn('mt-2 font-display font-bold leading-none text-[color:var(--ink-brand)]', big ? 'text-[4rem]' : 'text-hero')}>
            <CountUp value={s.perDay} format={dollars} />
          </p>
          <p className="mt-2 max-w-[12.5rem] text-sm leading-snug text-ink">
            {paydayLine(today, s.next.date)}
            {s.next.estimate && <span className="text-ink-soft"> (estimate)</span>}
          </p>
          <div className="mt-4 flex items-center gap-3">
            <OwlCoin />
            {story && <p className="max-w-[9.5rem] text-xs leading-snug text-ink-soft">Athenians called their coins owls.</p>}
          </div>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="relative mt-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-[color:var(--ink-brand)] underline decoration-rule underline-offset-4"
          >
            How this is worked out
            <ChevronDown className={cn('size-4 transition-transform duration-200', open && 'rotate-180')} aria-hidden />
          </button>
          <AnimatePresence initial={false}>
            {open && (
              <m.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0, transition: { duration: 0.15 } }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
                className="relative overflow-hidden"
              >
                <dl className="num mt-1 max-w-[15rem] space-y-1 rounded-[3px] bg-paper/90 py-1 text-sm">
                  <Line label={`Pays since ${shortDate(s.periodStart)}`} value={money(s.income)} />
                  <Line label="Spending since then" value={money(-s.spending)} />
                  <Line
                    label="Bills due this pay period"
                    value={money(-s.billsInPeriod)}
                    sub={s.billsInPeriodList.map((o) => `${shortName(o.bill.name)} ${shortDate(o.date)}`).join(', ') || undefined}
                  />
                  {s.olderUnpaid > 0 && (
                    <Line
                      label="Older bills not paid yet"
                      value={money(-s.olderUnpaid)}
                      sub={s.olderUnpaidList.map((o) => `${shortName(o.bill.name)} ${shortDate(o.date)}`).join(', ')}
                    />
                  )}
                  <div className="border-t border-rule pt-1">
                    <Line label="Left until payday" value={money(Math.max(0, s.available))} strong />
                  </div>
                  <Line label="Days left, today included" value={String(s.daysLeft)} />
                </dl>
                {s.next.estimate && <p className="mt-2 max-w-[15rem] text-xs text-ink-soft">Payday is an estimate: two weeks after your last logged paycheque.</p>}
              </m.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}

function Line({ label, value, sub, strong }: { label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-ink-soft">{label}</dt>
        <dd className={cn('whitespace-nowrap text-ink', strong && 'font-semibold')}>{value}</dd>
      </div>
      {sub && <p className="text-xs text-ink-soft">{sub}</p>}
    </div>
  );
}
