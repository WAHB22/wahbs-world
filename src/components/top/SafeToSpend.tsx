import { useMemo, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import { useFinance } from '@/lib/store';
import { safeToSpend } from '@/lib/money';
import { dollars, money } from '@/lib/format';
import { shortDate } from '@/lib/dates';
import { useUI } from '@/lib/ui-store';
import { CountUp } from '@/components/ui/bits';
import { EngravedTemple, TornEdge } from '@/components/ui/ornaments';
import { cn } from '@/lib/utils';

/** Bill names in sentences drop the bracket part: 'Phone + Crave/Disney (Bell)' -> 'Phone + Crave'. */
function shortName(name: string): string {
  return name.split(/[/(]/)[0].trim() || name;
}

/**
 * The one number at the top. Full bleed ultramarine band (cream in dark mode)
 * with an engraved temple and a torn paper edge.
 */
export function SafeToSpend() {
  const data = useFinance((s) => s.data)!;
  const today = useFinance((s) => s.today);
  const s = useMemo(() => safeToSpend(data, today), [data, today]);
  const [open, setOpen] = useState(false);

  return (
    <div className="-mx-4">
      <div className="relative overflow-hidden bg-hero-bg px-5 pb-6 pt-6 text-hero-ink">
        <div className="pointer-events-none absolute -bottom-2 right-0 h-[125%] translate-x-[18%] opacity-[0.26]">
          <EngravedTemple />
        </div>
        {s.status === 'no-pay' ? (
          <div className="relative max-w-[17rem]">
            <p className="font-display text-2xl leading-tight">Safe to spend today</p>
            <p className="mt-2 text-[0.9375rem] leading-snug text-hero-ink/90">
              Log your last paycheque and this shows what you can spend each day until the next one.
            </p>
            <button
              type="button"
              onClick={() => useUI.getState().open('pay')}
              className="mt-4 min-h-11 rounded-full bg-hero-ink px-5 text-[0.9375rem] font-medium text-hero-bg transition-transform duration-150 active:scale-[0.97]"
            >
              Log paycheque
            </button>
          </div>
        ) : (
          <div className="relative">
            <p className="flex items-baseline gap-2 font-display leading-none">
              <CountUp value={s.perDay} format={dollars} className="text-hero" />
              <span className="text-2xl">today</span>
            </p>
            <p className="mt-3 max-w-[16rem] text-[0.9375rem] leading-snug">
              Safe to spend, {s.detail}
              {s.next.estimate && (
                <span className="ml-1.5 inline-block rounded-full border border-hero-soft/70 px-2 py-px align-[1px] text-xs">estimate</span>
              )}
            </p>
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="-ml-1 mt-2 inline-flex min-h-11 items-center gap-1 rounded-full px-1 text-sm text-hero-soft underline-offset-4 hover:underline"
            >
              How this is worked out
              <ChevronDown className={cn('size-4 transition-transform duration-200', open && 'rotate-180')} aria-hidden />
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <m.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0, transition: { duration: 0.16 } }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <dl className="num mt-1 max-w-[19rem] space-y-1 text-sm">
                    <Line label="Income this month" value={money(s.income)} />
                    <Line label="Spending this month" value={money(-s.spending)} />
                    <Line label="Bills paid" value={money(-s.billsPaid)} />
                    <Line
                      label="Bills due before payday"
                      value={money(-s.unpaidBeforePay)}
                      sub={s.unpaid.length ? s.unpaid.map((o) => `${shortName(o.bill.name)} ${shortDate(o.date)}`).join(', ') : undefined}
                    />
                    <div className="border-t border-hero-soft/50 pt-1">
                      <Line label="Left until payday" value={money(Math.max(0, s.available))} strong />
                    </div>
                    <Line label={`Days until payday (${shortDate(s.next.date)})`} value={String(s.daysLeft)} />
                  </dl>
                  {s.next.estimate && (
                    <p className="mt-2 max-w-[19rem] text-xs text-hero-soft">
                      Payday is an estimate: two weeks after your last logged paycheque.
                    </p>
                  )}
                </m.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
      <TornEdge />
    </div>
  );
}

function Line({ label, value, sub, strong }: { label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-hero-soft">{label}</dt>
        <dd className={cn('whitespace-nowrap', strong && 'font-semibold')}>{value}</dd>
      </div>
      {sub && <p className="text-xs text-hero-soft/90">{sub}</p>}
    </div>
  );
}
