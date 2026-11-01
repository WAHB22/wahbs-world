import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { Plus } from 'lucide-react';
import { useFinance } from '@/lib/store';
import { useUI } from '@/lib/ui-store';
import { money } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Empty, RowButton, Section, Tag, Tick } from '@/components/ui/bits';
import { OliveSprig, Sparkle } from '@/components/ui/ornaments';
import { BillSheet } from './BillSheet';
import { billRows, paidOnTime, tickNote, toggleTickRecipe, type BillRow } from './bills.logic';

/** How long the paid on time sparkle stays beside the tick. */
const SPARKLE_MS = 1400;

/** Fixed bills for the month on screen: tick the box when paid, tap a row to edit. */
export function Bills() {
  const data = useFinance((s) => s.data)!;
  const month = useFinance((s) => s.month);
  const today = useFinance((s) => s.today);
  const commit = useFinance((s) => s.commit);
  const rows = useMemo(() => billRows(data, month, today), [data, month, today]);

  // Key of the occurrence that was just paid on time; it gets a brief sparkle.
  const [pop, setPop] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const toggle = (r: BillRow) => {
    const nowPaid = !r.paid;
    commit(tickNote(r.o.bill.name, nowPaid), toggleTickRecipe(r.o.month, r.o.key));
    window.clearTimeout(timer.current);
    if (nowPaid && paidOnTime(r.o, today)) {
      setPop(r.o.key);
      timer.current = window.setTimeout(() => setPop(null), SPARKLE_MS);
    } else {
      setPop(null);
    }
  };

  return (
    <>
      <Section id="bills" title="Fixed bills" hint="Tap the box when paid">
        {rows.length ? (
          <div>
            {rows.map((r) => (
              <BillLine key={r.o.key} r={r} sparkle={pop === r.o.key} onToggle={() => toggle(r)} />
            ))}
          </div>
        ) : (
          <Empty>
            <span className="flex items-center gap-2.5">
              <OliveSprig className="h-5 shrink-0 opacity-80" />
              No bills yet. Tap Add bill.
            </span>
          </Empty>
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

function BillLine({ r, sparkle, onToggle }: { r: BillRow; sparkle: boolean; onToggle: () => void }) {
  const { bill } = r.o;
  return (
    <RowButton onClick={() => useUI.getState().open('bill', bill.id, r.o.month)}>
      {/* Keys pressed on the tick must not also open the row's editor. */}
      <span className="relative flex shrink-0" onKeyDown={(e) => e.stopPropagation()}>
        <Tick checked={r.paid} onToggle={onToggle} label={`${bill.name} paid`} />
        <AnimatePresence>{sparkle && <PaidOnTime key="sparkle" />}</AnimatePresence>
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className={cn('truncate text-[0.9375rem] font-medium', r.paid ? 'text-ink-soft' : 'text-ink-strong')}>{bill.name}</span>
          {r.tag && (
            <Tag tone={r.tag} className="shrink-0">
              {r.tag}
            </Tag>
          )}
        </div>
        <p className="truncate text-sm text-ink-mute">{r.sub}</p>
      </div>
      <span className={cn('num whitespace-nowrap text-[0.9375rem] font-medium', r.paid ? 'text-ink-soft' : 'text-ink-strong')}>{money(bill.amt)}</span>
    </RowButton>
  );
}

/** Two four point stars that open beside the tick, then fade: paid on or before the due date. */
function PaidOnTime() {
  return (
    <m.span
      aria-hidden
      className="pointer-events-none absolute -right-3.5 -top-3 block size-6"
      initial={{ opacity: 0, scale: 0.3, rotate: -40 }}
      animate={{ opacity: 1, scale: 1, rotate: 0 }}
      exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] } }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      <Sparkle className="absolute right-0 top-0 size-4" />
      <Sparkle className="absolute bottom-0 left-0 size-2.5 opacity-80" />
    </m.span>
  );
}
