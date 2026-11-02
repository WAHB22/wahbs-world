import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useFinance } from '@/lib/store';
import { addMonths, monthKey, monthLabel } from '@/lib/dates';
import { Button } from '@/components/ui/button';
import { Wordmark } from '@/components/ui/motifs';
import { SyncStatus } from '@/components/boot/SyncStatus';

export function Header() {
  const month = useFinance((s) => s.month);
  const today = useFinance((s) => s.today);
  const setMonth = useFinance((s) => s.setMonth);
  const current = monthKey(today);
  const [name, year] = monthLabel(month).split(' ');
  return (
    <header className="pb-2">
      <div className="flex items-center justify-between gap-3">
        <h1 className="m-0">
          <Wordmark className="h-7" />
        </h1>
        <SyncStatus className="max-w-[11rem] text-right" />
      </div>
      <nav aria-label="Month" className="mt-5 flex items-center justify-between gap-2">
        <Button variant="ghost" size="icon" aria-label="Previous month" onClick={() => setMonth(addMonths(month, -1))}>
          <ChevronLeft />
        </Button>
        <div className="flex min-w-0 flex-col items-center">
          <span className="whitespace-nowrap font-display text-[2rem] font-bold leading-none text-[color:var(--ink-brand)]" aria-live="polite">
            {name} <span className="font-medium">{year}</span>
          </span>
          {month !== current && (
            <button type="button" onClick={() => setMonth(current)} className="mt-1 min-h-8 text-xs font-medium text-[color:var(--ink-brand)] underline underline-offset-2">
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
