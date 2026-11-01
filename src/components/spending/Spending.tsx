import { useMemo } from 'react';
import { useFinance } from '@/lib/store';
import { useUI } from '@/lib/ui-store';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Empty, RowButton, Section } from '@/components/ui/bits';
import { OliveSprig } from '@/components/ui/ornaments';
import { ExpenseSheet } from './ExpenseSheet';
import { loggedHint, txRows, type TxRow } from './expense.logic';

/** Everything logged in the month on screen, newest first. Tap a row to edit it. */
export function Spending() {
  const data = useFinance((s) => s.data)!;
  const month = useFinance((s) => s.month);
  const rows = useMemo(() => txRows(data, month), [data, month]);

  return (
    <>
      <Section id="spending" title="This month's spending" hint={loggedHint(rows.length) || undefined}>
        {rows.length ? (
          <div>
            {rows.map((r) => (
              <TxLine key={r.tx.id} r={r} month={month} />
            ))}
          </div>
        ) : (
          <Empty>
            <span className="flex items-center gap-2.5">
              <OliveSprig className="h-5 shrink-0 opacity-80" />
              Nothing logged yet. Tap Add expense or Import.
            </span>
          </Empty>
        )}
      </Section>
      <ExpenseSheet />
    </>
  );
}

function TxLine({ r, month }: { r: TxRow; month: string }) {
  const refund = r.tx.amt < 0;
  return (
    <RowButton onClick={() => useUI.getState().open('expense', r.tx.id, month)}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.9375rem] font-medium text-ink-strong">{r.title}</p>
        <p className="truncate text-sm text-ink-mute">{r.sub}</p>
      </div>
      <span className={cn('num whitespace-nowrap text-[0.9375rem] font-medium', refund ? 'text-aegean' : 'text-ink-strong')}>{money(r.tx.amt)}</span>
    </RowButton>
  );
}
