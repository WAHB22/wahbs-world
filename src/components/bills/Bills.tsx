import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { Plus } from 'lucide-react';
import { useFinance } from '@/lib/store';
import { useUI } from '@/lib/ui-store';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Section, Tick } from '@/components/ui/bits';
import { OliveWreath } from '@/components/ui/motifs';
import { BillSheet } from './BillSheet';
import { LedgerEmpty, LedgerRow, stopRowPress } from './ledger';
import { billRows, paidOnTime, tickNote, toggleTickRecipe, type BillRow } from './bills.logic';

/** How long the olive wreath stays round the column after a bill is paid on time. */
const WREATH_MS = 1800;

/** Fixed bills for the month on screen: tap the column when paid, tap a row to edit. */
export function Bills() {
  const data = useFinance((s) => s.data)!;
  const month = useFinance((s) => s.month);
  const today = useFinance((s) => s.today);
  const commit = useFinance((s) => s.commit);
  const rows = useMemo(() => billRows(data, month, today), [data, month, today]);

  // Key of the occurrence that was just paid on time; its column gets the wreath, drawn once.
  const [won, setWon] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const toggle = (r: BillRow) => {
    const nowPaid = !r.paid;
    commit(tickNote(r.o.bill.name, nowPaid), toggleTickRecipe(r.o.month, r.o.key));
    window.clearTimeout(timer.current);
    if (nowPaid && paidOnTime(r.o, today)) {
      setWon(r.o.key);
      timer.current = window.setTimeout(() => setWon(null), WREATH_MS);
    } else {
      setWon(null);
    }
  };

  return (
    <>
      <Section id="bills" title="Fixed bills" hint="Tap the column when paid">
        {rows.length ? (
          <div>
            {rows.map((r) => (
              <BillLine key={r.o.key} r={r} wreath={won === r.o.key} onToggle={() => toggle(r)} />
            ))}
          </div>
        ) : (
          <LedgerEmpty>
            No bills yet.
            <br />
            Tap Add bill.
          </LedgerEmpty>
        )}
        <Button variant="quiet" size="sm" className="-ml-3 mt-1" onClick={() => useUI.getState().open('bill', undefined, month)}>
          <Plus />
          Add bill
        </Button>
      </Section>
      <BillSheet />
    </>
  );
}

/** Second line tone: ochre text for soon, terracotta for late, small print otherwise. */
const STATUS_TONE = { soon: 'text-kiln', late: 'text-vase' } as const;

function BillLine({ r, wreath, onToggle }: { r: BillRow; wreath: boolean; onToggle: () => void }) {
  const { bill } = r.o;
  const head = [r.when, r.status].filter(Boolean).join(' · ');
  return (
    <LedgerRow
      onOpen={() => useUI.getState().open('bill', bill.id, r.o.month)}
      muted={r.paid}
      lead={
        // Presses and keys on the column must not also press or open the row.
        <span ref={stopRowPress} className="relative flex shrink-0" onKeyDown={(e) => e.stopPropagation()}>
          <Tick checked={r.paid} onToggle={onToggle} label={`${bill.name} paid`} />
          <AnimatePresence>{wreath && <PaidOnTime key="wreath" />}</AnimatePresence>
        </span>
      }
      title={bill.name}
      sub={
        <>
          <span className={cn(r.tag && STATUS_TONE[r.tag])}>{head}</span>
          {r.note && <> · {r.note}</>}
        </>
      }
      amount={money(bill.amt)}
    />
  );
}

/** Paid on or before the due date: an olive wreath draws once round the column, then fades. */
function PaidOnTime() {
  return (
    <m.span
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-1/2 block size-12 -translate-x-1/2 -translate-y-1/2"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.2, ease: [0.23, 1, 0.32, 1] } }}
      transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
    >
      <OliveWreath draw className="size-full" />
    </m.span>
  );
}
