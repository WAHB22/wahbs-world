import { useMemo } from 'react';
import { useFinance } from '@/lib/store';
import { useUI } from '@/lib/ui-store';
import { money } from '@/lib/format';
import { Section } from '@/components/ui/bits';
import { LedgerEmpty, LedgerRow } from '@/components/bills/ledger';
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
          <LedgerEmpty>
            Nothing logged yet.
            <br />
            Tap Add expense or Import.
          </LedgerEmpty>
        )}
      </Section>
      <ExpenseSheet />
    </>
  );
}

/** One expense as a ledger line: category, then date · merchant or note · account, amount on the right. */
function TxLine({ r, month }: { r: TxRow; month: string }) {
  // A refund is money back: the softer ink, so it reads apart from spending.
  const refund = r.tx.amt < 0;
  return (
    <LedgerRow
      onOpen={() => useUI.getState().open('expense', r.tx.id, month)}
      title={r.title}
      sub={r.sub}
      amount={money(r.tx.amt)}
      amountClassName={refund ? 'text-aegean' : undefined}
    />
  );
}
