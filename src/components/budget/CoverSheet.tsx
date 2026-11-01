import { useMemo } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { Check } from 'lucide-react';
import { useFinance } from '@/lib/store';
import { useSheet, useUI } from '@/lib/ui-store';
import { applyCover, applyRaise, coverNote, coverPlan, raiseNote, type CoverPlan, type RaiseSuggestion } from '@/lib/cover';
import { monthKey } from '@/lib/dates';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Bar } from '@/components/ui/bits';
import { cn } from '@/lib/utils';
import { coverView, findItem, movedIntoText, raiseButton, suggestAfterCover } from './budget.logic';
import { useSheetForm } from './use-sheet-form';

const close = () => useUI.getState().close();
const EASE = [0.22, 1, 0.36, 1] as const;

type CoverForm = {
  itemId: string;
  month: string;
  title: string;
  phase: 'plan' | 'raise';
  /** Set after the move, for the raise step. */
  moved: string;
  raise: RaiseSuggestion | null;
};

/**
 * Cover it: explains which limits give room and what the bar looks like after,
 * then moves it in one tap. Right after that tap, and only then, it may
 * suggest raising the base limit (three months in a row of top ups).
 */
export function CoverSheet() {
  const sheet = useSheet('cover');
  const data = useFinance((s) => s.data)!;
  const today = useFinance((s) => s.today);
  const commit = useFinance((s) => s.commit);
  const [form, update] = useSheetForm<CoverForm>(sheet, (s) => {
    const id = s.id ?? '';
    return {
      itemId: id,
      month: s.month ?? monthKey(today),
      title: `Cover ${String(findItem(data, id)?.name ?? 'this limit')}`,
      phase: 'plan',
      moved: '',
      raise: null,
    };
  });

  const plan = useMemo(() => (form && form.phase === 'plan' ? coverPlan(data, form.month, form.itemId) : null), [data, form]);
  const view = useMemo(() => (form && plan ? coverView(data, form.month, plan) : null), [data, form, plan]);

  const move = (p: CoverPlan) => {
    if (!form) return;
    // Worked out on the data before the move, so it does not depend on when the store updates.
    const raise = suggestAfterCover(data, form.month, p, today);
    const moved = movedIntoText(data, p);
    commit(coverNote(data, p, today), (d) => applyCover(d, form.month, p, today));
    if (raise) update({ phase: 'raise', raise, moved, title: 'Room moved' });
    else close();
  };

  const makeIt = (r: RaiseSuggestion) => {
    if (!form) return;
    const name = String(findItem(data, form.itemId)?.name ?? '');
    commit(raiseNote(name, r.newLimit), (d) => applyRaise(d, form.itemId, r.newLimit));
    close();
  };

  const raising = form?.phase === 'raise' && form.raise;

  return (
    <Sheet
      open={!!sheet}
      onOpenChange={(o) => !o && close()}
      title={form?.title ?? 'Cover it'}
      description={raising ? undefined : (view?.situation ?? undefined)}
      footer={
        raising ? (
          <>
            <Button variant="ghost" onClick={close}>
              Not now
            </Button>
            <Button variant="primary" className="ml-auto" onClick={() => makeIt(form.raise!)}>
              {raiseButton(form.raise!)}
            </Button>
          </>
        ) : plan && view ? (
          <Button variant="primary" className="ml-auto min-w-32" onClick={() => move(plan)}>
            {view.button}
          </Button>
        ) : (
          <Button className="ml-auto" onClick={close}>
            Close
          </Button>
        )
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {raising ? (
          <m.div
            key="raise"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.24, ease: EASE }}
          >
            <p className="mt-1 flex items-center gap-2 text-[0.9375rem] text-aegean">
              <Check className="size-[1.125rem] shrink-0" aria-hidden />
              <span className="num">{form.moved}</span>
            </p>
            <p className="num mt-4 text-pretty text-[0.9375rem] leading-snug text-ink-strong">{form.raise!.text}</p>
            <p className="mt-2 text-sm text-ink-mute">This sets the monthly limit for every month. Room you moved stays where it is.</p>
          </m.div>
        ) : view ? (
          <m.div key="plan" exit={{ opacity: 0, transition: { duration: 0.12 } }}>
            <p className="num mt-1 text-[0.9375rem] font-medium text-ink-strong">{view.lead}</p>
            <ul className="mt-2">
              {view.donors.map((d) => (
                <li key={d.id} className="flex items-baseline justify-between gap-3 border-t border-rule-soft py-2.5 first:border-t-0">
                  <div className="min-w-0">
                    <p className="truncate text-[0.9375rem] text-ink">{d.name}</p>
                    <p className="num text-xs text-ink-mute">{d.after}</p>
                  </div>
                  <span className="num whitespace-nowrap text-[0.9375rem] font-medium text-ink-strong">{d.amt}</span>
                </li>
              ))}
            </ul>

            <div className="mt-4 border-t border-rule pt-3">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-sm text-ink-soft">After the move</span>
                <span className="num whitespace-nowrap text-sm text-ink-mute">
                  <span className="font-medium text-ink-strong">{view.after.spentText}</span> {view.after.limitText}
                </span>
              </div>
              <Bar pct={view.after.width} status={view.after.status} label={view.after.label} />
              <p className={cn('mt-2 text-sm', view.partial ? 'text-kiln' : 'text-ink-soft')}>{view.partial ?? view.effect}</p>
              <p className="mt-1 text-sm text-ink-mute">{view.scope}</p>
            </div>
          </m.div>
        ) : form ? (
          <p key="none" className="mt-1 text-[0.9375rem] text-ink-soft">
            {findItem(data, form.itemId) ? 'This limit does not need covering right now.' : 'This category is no longer in your budget.'}
          </p>
        ) : null}
      </AnimatePresence>
    </Sheet>
  );
}
