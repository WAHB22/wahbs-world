import { useMemo, type ReactNode } from 'react';
import { useFinance } from '@/lib/store';
import { useUI } from '@/lib/ui-store';
import { forecast } from '@/lib/forecast';
import { Section } from '@/components/ui/bits';
import { Button } from '@/components/ui/button';
import { OliveSprig } from '@/components/ui/ornaments';
import { ForecastChart } from './ForecastChart';
import { BalancesSheet } from './BalancesSheet';
import { balanceLine, dailyLine, forecastHint, splitMoney, visaLine } from './forecast.logic';

/** A sentence whose money figures never break across lines. */
function MoneyText({ text }: { text: string }) {
  return (
    <>
      {splitMoney(text).map((p, k) =>
        p.money ? (
          <span key={k} className="num whitespace-nowrap">
            {p.text}
          </span>
        ) : (
          p.text
        ),
      )}
    </>
  );
}

/** One quiet line under the chart, with an optional action on the right. */
function Line({ text, action }: { text: string; action?: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 border-t border-rule-soft py-1">
      <p className="min-w-0 text-sm text-ink-soft">
        <MoneyText text={text} />
      </p>
      {action}
    </div>
  );
}

/** Where the chequing balance is heading, today to the next payday or month end. */
export function Forecast() {
  const data = useFinance((s) => s.data)!;
  const today = useFinance((s) => s.today);
  const month = useFinance((s) => s.month);
  const f = useMemo(() => forecast(data, today), [data, today]);
  const openBalances = () => useUI.getState().open('balances', undefined, month);

  if (f.status === 'no-balance') {
    return (
      <Section id="forecast" title="Chequing forecast">
        <div className="flex items-start gap-3">
          <OliveSprig className="mt-0.5 h-6 shrink-0 opacity-80" />
          <div className="min-w-0">
            <p className="text-[0.9375rem] text-ink-soft">Enter your chequing balance to see where it is heading.</p>
            <Button variant="primary" size="sm" className="mt-3" onClick={openBalances}>
              Enter balance
            </Button>
          </div>
        </div>
        <BalancesSheet />
      </Section>
    );
  }

  const visa = visaLine(f);
  return (
    <Section id="forecast" title="Chequing forecast" hint={forecastHint(f)}>
      <ForecastChart f={f} today={today} />

      <p className="mt-4 text-[0.9375rem] font-medium text-ink-strong">
        <MoneyText text={f.lowest.label} />
      </p>
      {f.belowZero && (
        <p className="mt-2 rounded-[var(--radius-md)] bg-kiln-wash px-3 py-2.5 text-[0.9375rem] font-medium text-kiln">
          <MoneyText text={f.belowZero.text} />
        </p>
      )}

      <div className="mt-3">
        {visa && (
          <Line
            text={visa}
            action={
              <Button variant="quiet" size="sm" className="-mr-3" onClick={openBalances}>
                Set due day
              </Button>
            }
          />
        )}
        <Line text={dailyLine(f)} />
        <Line
          text={balanceLine(f)}
          action={
            <Button variant="quiet" size="sm" className="-mr-3" onClick={openBalances}>
              Update
            </Button>
          }
        />
      </div>
      <BalancesSheet />
    </Section>
  );
}
