import { useMemo } from 'react';
import { useFinance } from '@/lib/store';
import { monthTotals } from '@/lib/money';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';

/** Month totals for the month on screen, as a small ledger (same numbers as the live page). */
export function Totals() {
  const data = useFinance((s) => s.data)!;
  const month = useFinance((s) => s.month);
  const t = useMemo(() => monthTotals(data, month), [data, month]);
  return (
    <section aria-label="This month" className="mt-7">
      <dl className="grid grid-cols-2 gap-x-6">
        <Cell label="Earned" value={money(t.earned)} />
        <Cell label="Spent" value={money(t.spent)} />
        <Cell label="Bills" value={money(t.bills)} />
        <Cell label="Bills paid" value={money(t.billsPaid)} sub={`of ${money(t.bills)}`} />
      </dl>
      <div className="mt-1 flex items-baseline justify-between border-t border-rule pt-3">
        <span className="text-[0.9375rem] text-ink-soft">Left this month</span>
        <span className={cn('num font-display text-3xl leading-none', t.left >= 0 ? 'text-aegean' : 'text-vase')}>{money(t.left)}</span>
      </div>
    </section>
  );
}

function Cell({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border-t border-rule-soft py-2.5">
      <dt className="text-sm text-ink-mute">{label}</dt>
      <dd className="num mt-0.5 text-lg font-medium text-ink-strong">
        {value}
        {sub && <span className="ml-1 text-xs font-normal text-ink-mute">{sub}</span>}
      </dd>
    </div>
  );
}
