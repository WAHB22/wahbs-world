import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Plus } from 'lucide-react';
import { useFinance } from '@/lib/store';
import { useUI } from '@/lib/ui-store';
import { Button } from '@/components/ui/button';
import { Bar, Empty, RowButton, Section } from '@/components/ui/bits';
import { ArchWindow, OliveWreath } from '@/components/ui/motifs';
import { cn } from '@/lib/utils';
import { budgetView, heldSummary, type LimitGroup, type LimitRow } from './budget.logic';
import { SmallPomegranate } from './SmallPomegranate';
import { ItemSheet } from './ItemSheet';
import { AddItemSheet } from './AddItemSheet';
import { CoverSheet } from './CoverSheet';

/**
 * On the sand band, bar tracks and rules take a near black hairline, as in the
 * style guide preview (.sand .track). Built from the text token, so dark mode follows.
 */
const onSand = { '--rule': 'color-mix(in srgb, var(--text) 25%, transparent)' } as CSSProperties;

/** Spending limits for the month on screen: one bar per category, grouped. */
export function Budget() {
  const data = useFinance((s) => s.data)!;
  const month = useFinance((s) => s.month);
  const today = useFinance((s) => s.today);
  const groups = useMemo(() => budgetView(data, month, today), [data, month, today]);
  const empty = groups.every((g) => g.rows.length === 0);
  const held = useMemo(() => heldSummary(groups, month), [groups, month]);

  return (
    <Section id="budget" title="Spending limits" hint="Tap a line to edit">
      <div style={onSand}>
        <Legend />
        {held && <Held key={month} id={month} text={held} />}
        {empty ? (
          <div className="flex items-center gap-3">
            <ArchWindow className="size-10 shrink-0" />
            <Empty>No categories yet. Tap Add category.</Empty>
          </div>
        ) : (
          groups.map((g) => <Group key={g.id} group={g} month={month} />)
        )}
      </div>
      <Button variant="quiet" size="sm" className="-ml-3 mt-3" onClick={() => useUI.getState().open('add-item', undefined, month)}>
        <Plus aria-hidden />
        Add category
      </Button>
      <ItemSheet />
      <AddItemSheet />
      <CoverSheet />
    </Section>
  );
}

/** Quiet key to the bar colours: olive, ochre and terracotta squares. */
function Legend() {
  const keys = [
    ['bg-fill-green', 'under 75%'],
    ['bg-fill-orange', '75 to 100%'],
    ['bg-fill-red', 'over'],
  ] as const;
  return (
    <ul aria-label="Bar colours" className="-mt-1 mb-5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-mute">
      {keys.map(([fill, text]) => (
        <li key={text} className="flex items-center gap-1.5">
          <span className={cn('size-2 shrink-0 rounded-[1px]', fill)} aria-hidden />
          {text}
        </li>
      ))}
    </ul>
  );
}

function Group({ group, month }: { group: LimitGroup; month: string }) {
  if (group.rows.length === 0) return null;
  return (
    <div className="mt-7 first:mt-0">
      <h3 className="flex items-baseline justify-between gap-3 border-b border-rule pb-1.5">
        <span className="caps min-w-0 truncate">{group.name}</span>
        <span className="num whitespace-nowrap text-xs text-ink-soft">{group.totalText}</span>
      </h3>
      <ul>
        {group.rows.map((r) => (
          <Row key={r.id} row={r} month={month} />
        ))}
      </ul>
    </div>
  );
}

const isGroceries = (name: string) => /grocer|[ée]picerie/i.test(name);

function Row({ row: r, month }: { row: LimitRow; month: string }) {
  const open = useUI.getState().open;
  return (
    <li>
      <RowButton label={r.label} onClick={() => open('item', r.id, month)} className="border-t-0 py-2.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-1.5 self-center">
              <span className="truncate text-ink">{r.name}</span>
              {isGroceries(r.name) && <SmallPomegranate className="-my-0.5 shrink-0" />}
            </span>
            <span className={cn('num shrink-0 whitespace-nowrap', r.status === 'red' ? 'font-semibold text-ink' : 'text-ink-soft')}>
              {r.amountText}
            </span>
          </div>
          <Bar pct={r.width} status={r.status} label={r.barLabel} />
          {r.movedText && <p className="num mt-1 text-xs text-ink-mute">{r.movedText}</p>}
        </div>
      </RowButton>
      {r.cover?.kind === 'plan' && (
        <div className="pb-3 pt-0.5">
          <Button variant="secondary" size="sm" className="h-auto max-w-full whitespace-normal py-2 text-left leading-snug" onClick={() => open('cover', r.id, month)}>
            {r.cover.button}
          </Button>
        </div>
      )}
      {r.cover?.kind === 'no-room' && <p className="pb-3 text-xs text-ink-mute">No room left in other limits</p>}
    </li>
  );
}

/** Months whose wreath was already drawn this session: it draws once, not on every visit. */
const drawn = new Set<string>();

/**
 * Limits held to the end of a past month: real progress, so it gets the olive
 * wreath, drawn once. One wreath for the month (at row size the wreath reads as
 * a plain ring); each held row still says "limit held" to screen readers.
 */
function Held({ id, text }: { id: string; text: string }) {
  const [draw] = useState(() => !drawn.has(id));
  useEffect(() => {
    drawn.add(id);
  }, [id]);
  return (
    <div className="-mt-1 mb-5 flex items-center gap-3">
      <OliveWreath draw={draw} className="shrink-0" />
      <p className="text-sm leading-snug text-ink">{text}</p>
    </div>
  );
}
