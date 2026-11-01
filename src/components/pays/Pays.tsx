import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useFinance } from '@/lib/store';
import { useUI } from '@/lib/ui-store';
import { money, moneyShort } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Empty, RowButton, Section } from '@/components/ui/bits';
import { OliveSprig } from '@/components/ui/ornaments';
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
            className="num -my-3 inline-flex min-h-11 items-center text-left text-ink-soft underline decoration-ink-mute/50 decoration-dotted underline-offset-4 transition-colors hover:text-cobalt hover:decoration-cobalt"
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
          <Empty>
            <span className="flex items-center gap-2.5">
              <OliveSprig className="h-5 shrink-0 opacity-80" />
              No paycheques logged this month.
            </span>
          </Empty>
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

function PayLine({ r, month }: { r: PayRow; month: string }) {
  return (
    <RowButton onClick={() => useUI.getState().open('pay', r.pay.id, month)}>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[0.9375rem] font-medium text-ink-strong">{r.title}</p>
        <p className="truncate text-sm text-ink-mute">{r.sub}</p>
      </div>
      <span className="num whitespace-nowrap text-[0.9375rem] font-medium text-aegean">{money(Number(r.pay.amt) || 0)}</span>
    </RowButton>
  );
}
