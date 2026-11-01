import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useFinance } from '@/lib/store';
import { addMonths, monthKey, monthLabel } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { OliveSprig } from '@/components/ui/ornaments';
import { SyncStatus } from '@/components/boot/SyncStatus';

export function Header() {
  const month = useFinance((s) => s.month);
  const today = useFinance((s) => s.today);
  const setMonth = useFinance((s) => s.setMonth);
  const current = monthKey(today);
  return (
    <header className="pb-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h1 className="font-display text-3xl leading-none text-ink-strong">Finance</h1>
          <OliveSprig className="h-6 shrink-0" />
        </div>
        <SyncStatus className="max-w-[11rem] text-right" />
      </div>
      <nav aria-label="Month" className="mt-4 flex items-center justify-between gap-2 border-y border-rule-soft py-1">
        <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))}>
          <ChevronLeft />
        </Button>
        <div className="flex min-w-0 flex-col items-center">
          <span className="whitespace-nowrap text-[0.9375rem] font-medium text-ink-strong" aria-live="polite">
            {monthLabel(month)}
          </span>
          {month !== current && (
            <button type="button" onClick={() => setMonth(current)} className="-my-1 py-1 text-xs text-cobalt underline underline-offset-2">
              Back to this month
            </button>
          )}
        </div>
        <Button variant="ghost" size="icon" aria-label="Next month" onClick={() => setMonth(addMonths(month, 1))}>
          <ChevronRight />
        </Button>
      </nav>
    </header>
  );
}
