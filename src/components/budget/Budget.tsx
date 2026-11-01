import { useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useFinance } from '@/lib/store';
import { useUI } from '@/lib/ui-store';
import { Button } from '@/components/ui/button';
import { Bar, Empty, RowButton, Section } from '@/components/ui/bits';
import { OliveSprig, Sparkle } from '@/components/ui/ornaments';
import { cn } from '@/lib/utils';
import { budgetView, type LimitGroup, type LimitRow } from './budget.logic';
import { ItemSheet } from './ItemSheet';
import { AddItemSheet } from './AddItemSheet';
import { CoverSheet } from './CoverSheet';

/** Spending limits for the month on screen: one bar per category, grouped. */
export function Budget() {
  const data = useFinance((s) => s.data)!;
  const month = useFinance((s) => s.month);
  const today = useFinance((s) => s.today);
  const groups = useMemo(() => budgetView(data, month, today), [data, month, today]);
  const empty = groups.every((g) => g.rows.length === 0);

  return (
    <Section id="budget" title="Spending limits" hint="Tap a line to edit">
      <Legend />
      {empty ? (
        <div className="flex items-center gap-3">
          <OliveSprig className="h-6 shrink-0" />
          <Empty>No categories yet. Tap Add category.</Empty>
        </div>
      ) : (
        <div>
          {groups.map((g) => (
            <Group key={g.id} group={g} month={month} />
          ))}
        </div>
      )}
      <Button variant="quiet" size="sm" className="-ml-3 mt-2" onClick={() => useUI.getState().open('add-item', undefined, month)}>
        <Plus aria-hidden />
        Add category
      </Button>
      <ItemSheet />
      <AddItemSheet />
      <CoverSheet />
    </Section>
  );
}

function Legend() {
  const keys = [
    ['bg-fill-green', 'under 75%'],
    ['bg-fill-orange', '75 to 100%'],
    ['bg-fill-red', 'over'],
  ] as const;
  return (
    <ul aria-label="Bar colours" className="mb-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-mute">
      {keys.map(([fill, text]) => (
        <li key={text} className="flex items-center gap-1.5">
          <span className={cn('size-2 rounded-full', fill)} aria-hidden />
          {text}
        </li>
      ))}
    </ul>
  );
}

function Group({ group, month }: { group: LimitGroup; month: string }) {
  if (group.rows.length === 0) return null;
  return (
    <div className="mt-6 first:mt-0">
      <h3 className="flex items-baseline justify-between gap-3 border-b border-rule pb-1.5 text-2xs font-semibold uppercase tracking-[0.12em] text-ink-soft">
        <span className="min-w-0 truncate">{group.name}</span>
        <span className="num whitespace-nowrap font-medium normal-case tracking-normal text-ink-mute">{group.totalText}</span>
      </h3>
      <ul>
        {group.rows.map((r) => (
          <Row key={r.id} row={r} month={month} />
        ))}
      </ul>
    </div>
  );
}

function Row({ row: r, month }: { row: LimitRow; month: string }) {
  const open = useUI.getState().open;
  return (
    <li className="border-t border-rule-soft first:border-t-0">
      <RowButton label={r.label} onClick={() => open('item', r.id, month)} className="border-t-0 py-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-[0.9375rem] text-ink-strong">{r.name}</span>
              {r.held && <Sparkle className="size-3 shrink-0" />}
            </span>
            <span className="num shrink-0 whitespace-nowrap text-sm text-ink-mute">
              <span className={cn('font-medium', r.status === 'red' ? 'text-vase' : 'text-ink-strong')}>{r.spentText}</span> {r.limitText}
            </span>
          </div>
          <Bar pct={r.width} status={r.status} label={r.barLabel} />
          {r.movedText && <p className="num mt-1 text-xs text-ink-mute">{r.movedText}</p>}
        </div>
      </RowButton>
      {r.cover?.kind === 'plan' && (
        <div className="-mt-1 flex items-center justify-between gap-3 pb-3">
          <p className="num min-w-0 truncate text-xs text-ink-soft">{r.cover.plan.text}</p>
          <Button variant="attention" size="sm" className="shrink-0" onClick={() => open('cover', r.id, month)}>
            Cover it
          </Button>
        </div>
      )}
      {r.cover?.kind === 'no-room' && <p className="-mt-1 pb-3 text-xs text-ink-mute">No room left in other limits</p>}
    </li>
  );
}
