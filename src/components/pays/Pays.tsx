import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useFinance } from '@/lib/store';
import { useUI } from '@/lib/ui-store';
import { money, moneyShort } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Section } from '@/components/ui/bits';
import { LedgerEmpty, LedgerRow } from '@/components/bills/ledger';
import { PaySheet } from './PaySheet';
import { PayPlanSheet } from './PayPlanSheet';
import { payRows, planHint, type PayRow } from './pays.logic';

/** Paycheques and other income logged in the month on screen, and the planned pay. */
export function Pays() {
  const data = useFinance((s) => s.data)!;
  const month = useFinance((s) => s.month);
  const rows = useMemo(() => payRows(data, month), [data, month]);
  const plan = Number(data.settings?.payPlan) || 0;

  return (
    <>
      <Section
        id="pays"
        title="Paycheques"
        hint={
          <button
            type="button"
            onClick={() => useUI.getState().open('pay-plan', undefined, month)}
            aria-label={`Planned pay, about ${moneyShort(plan)} each. Change it`}
            className="num -my-3 inline-flex min-h-11 items-center text-left text-ink-soft underline decoration-ink-mute/60 decoration-dotted underline-offset-4 hover:text-[color:var(--ink-brand)] hover:decoration-[color:var(--ink-brand)]"
          >
            {planHint(plan)}
          </button>
        }
      >
        {rows.length ? (
          <div>
            {rows.map((r) => (
              <PayLine key={r.pay.id} r={r} month={month} />
            ))}
          </div>
        ) : (
          <LedgerEmpty>
            No paycheques logged this month.
            <br />
            Tap Log paycheque.
          </LedgerEmpty>
        )}
        <Button variant="quiet" size="sm" className="-ml-3 mt-1" onClick={() => useUI.getState().open('pay', undefined, month)}>
          <Plus />
          Log paycheque
        </Button>
      </Section>
      <PaySheet />
      <PayPlanSheet />
    </>
  );
}

/** One pay as a ledger line: Bobino pay or the income's name, then date · hours · note. */
function PayLine({ r, month }: { r: PayRow; month: string }) {
  return (
    <LedgerRow
      onOpen={() => useUI.getState().open('pay', r.pay.id, month)}
      title={r.title}
      sub={r.sub}
      amount={money(Number(r.pay.amt) || 0)}
    />
  );
}
