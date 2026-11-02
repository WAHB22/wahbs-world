import { useMemo, useRef, type Ref } from 'react';
import { m } from 'motion/react';
import { ArrowLeftRight, Check, ChevronDown, CircleAlert } from 'lucide-react';
import { pickCategory, switchAlt, toggle } from '@/lib/import/review';
import type { ReviewRow } from '@/lib/import/types';
import type { FinanceData } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  altLabel,
  canTick,
  categoryGroups,
  isPurchase,
  itemNames,
  rowAmount,
  rowTitle,
  rowWhen,
  statusLine,
  type CategoryGroup,
  type Tone,
} from './import.logic';

const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/** The preview's rule between rows: ink at 18% (cream at 18% in dark mode). */
export const HAIRLINE = 'border-[color:color-mix(in_srgb,var(--ink-brand)_18%,transparent)]';

/**
 * Status line colours on the scroll. Ochre, aegean and terracotta fall under
 * 4.5:1 there, so the words stay text, text-2 or ink (6:1), and a line that
 * needs a look carries an ochre mark instead.
 */
const TONE: Record<Tone, string> = {
  good: 'text-[color:var(--ink-brand)]',
  attention: 'font-medium text-ink',
  quiet: 'text-ink-mute',
  plain: 'text-ink-soft',
};

type Change = (update: (rows: ReviewRow[]) => ReviewRow[]) => void;

/**
 * The review: one open row per line read on the scroll, ruled by ink
 * hairlines (no boxes), every line shown (none dropped). Ticked rows are
 * saved; unticked ones sit back in text-2. The list unrolls as one piece
 * (see Unroll), so rows do not animate on their own.
 */
export function ReviewList({ rows, data, onChange }: { rows: ReviewRow[]; data: FinanceData; onChange: Change }) {
  const groups = useMemo(() => categoryGroups(data), [data]);
  const names = useMemo(() => itemNames(data), [data]);
  return (
    <ul aria-label="Lines read" className={cn('border-t', HAIRLINE)}>
      {rows.map((r) => (
        <li key={r.id} className={cn('border-b', HAIRLINE)}>
          <ReviewItem r={r} groups={groups} names={names} onChange={onChange} />
        </li>
      ))}
    </ul>
  );
}

function ReviewItem({ r, groups, names, onChange }: { r: ReviewRow; groups: CategoryGroup[]; names: Record<string, string>; onChange: Change }) {
  const selectRef = useRef<HTMLSelectElement>(null);
  const title = rowTitle(r);
  const amount = rowAmount(r);
  const status = statusLine(r);
  const alt = altLabel(r, names);
  const tickable = canTick(r);

  const onTick = () => {
    if (tickable) return onChange((rows) => toggle(rows, r.id));
    // A purchase with no category: the tick asks for one.
    const el = selectRef.current;
    if (!el) return;
    el.focus();
    try {
      el.showPicker();
    } catch {
      // Not supported: focus alone shows where to pick.
    }
  };

  return (
    <div className="flex gap-3 py-3">
      <KeepTick
        checked={r.ticked}
        muted={r.kind === 'not-spending'}
        onToggle={onTick}
        label={`${title}, ${amount}`}
        disabled={r.kind === 'not-spending'}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-3">
          <p className={cn('min-w-0 flex-1 truncate text-[0.9375rem] font-medium', r.ticked ? 'text-ink' : 'text-ink-soft')}>{title}</p>
          <p className={cn('num shrink-0 whitespace-nowrap text-[0.9375rem]', r.ticked ? 'font-semibold text-ink' : 'font-normal text-ink-soft')}>
            {amount}
          </p>
        </div>
        <p className="num text-sm text-ink-mute">{rowWhen(r)}</p>
        <p className={cn('flex items-start gap-1.5 text-sm [overflow-wrap:anywhere]', TONE[status.tone])}>
          {status.tone === 'attention' && <CircleAlert className="mt-[3px] size-3.5 shrink-0 text-kiln" aria-hidden />}
          <span className="min-w-0">{status.text}</span>
        </p>
        {isPurchase(r) && (
          <div className="mt-2 flex min-w-0 flex-wrap gap-2">
            <CategoryChip
              ref={selectRef}
              value={r.itemId}
              groups={groups}
              label={`Category for ${title}`}
              onPick={(itemId) => onChange((rows) => pickCategory(rows, r.id, itemId))}
            />
            {alt && (
              <button
                type="button"
                onClick={() => onChange((rows) => switchAlt(rows, r.id))}
                aria-label={`Switch to ${alt}`}
                className="inline-flex min-h-11 min-w-0 max-w-full items-center gap-1.5 rounded-[3px] border border-dashed border-cobalt/60 px-3.5 text-sm font-medium text-[color:var(--ink-brand)] transition-[background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-paper/60 active:scale-[0.97]"
              >
                <ArrowLeftRight className="size-[18px] shrink-0" aria-hidden />
                <span className="truncate">{alt}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Native select dressed as a chip: the phone's own picker, grouped like the budget. */
function CategoryChip({
  ref,
  value,
  groups,
  label,
  onPick,
}: {
  ref: Ref<HTMLSelectElement>;
  value: string | null;
  groups: CategoryGroup[];
  label: string;
  onPick: (itemId: string) => void;
}) {
  const empty = !value;
  return (
    <div className="relative min-w-0 max-w-full">
      <select
        ref={ref}
        aria-label={label}
        value={value ?? ''}
        onChange={(e) => e.target.value && onPick(e.target.value)}
        className={cn(
          // Sized to the chosen name (not the longest option), so the switch chip fits beside it.
          'field-sizing-content min-h-11 min-w-0 max-w-full cursor-pointer appearance-none truncate rounded-[3px] border pl-3.5 pr-9 text-sm font-medium transition-[background-color,border-color] duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/30',
          empty ? 'border-kiln/60 bg-kiln-wash text-kiln' : 'border-cobalt/40 bg-paper text-ink hover:border-cobalt',
        )}
      >
        {empty && (
          <option value="" disabled>
            Category
          </option>
        )}
        {groups.map((g) => (
          <optgroup key={g.id} label={g.name}>
            {g.items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <ChevronDown className={cn('pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2', empty ? 'text-kiln' : 'text-[color:var(--ink-brand)]')} aria-hidden />
    </div>
  );
}

/**
 * Keep this line: a square ink tick with 3 px corners (choosing, not a reward,
 * so not the column paid tick). 44 px tap area around a 24 px box; the box is
 * paper on the scroll, solid ink once ticked. Press 0.97.
 */
function KeepTick({
  checked,
  disabled,
  muted,
  onToggle,
  label,
}: {
  checked: boolean;
  disabled?: boolean;
  muted?: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      aria-disabled={disabled || undefined}
      onClick={disabled ? undefined : onToggle}
      className={cn(
        '-my-1.5 -ml-2.5 grid size-11 shrink-0 place-items-center rounded-[3px] transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)]',
        disabled ? 'cursor-default' : 'active:scale-[0.97]',
      )}
    >
      <span
        className={cn(
          'grid size-6 place-items-center rounded-[3px] border-[1.5px] transition-[background-color,border-color] duration-200',
          checked ? 'border-cobalt bg-cobalt text-on-cobalt' : muted ? 'border-dashed border-cobalt/35 bg-transparent' : 'border-cobalt/70 bg-paper',
        )}
      >
        {checked && (
          <m.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.2, ease: EASE_OUT }}>
            <Check className="size-4" strokeWidth={3} aria-hidden />
          </m.span>
        )}
      </span>
    </button>
  );
}
