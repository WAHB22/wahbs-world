import { useMemo, useRef, type Ref } from 'react';
import { m } from 'motion/react';
import { ArrowLeftRight, Check, ChevronDown } from 'lucide-react';
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

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const TONE: Record<Tone, string> = {
  good: 'text-aegean',
  attention: 'text-kiln',
  quiet: 'text-ink-mute',
  plain: 'text-ink-soft',
};

type Change = (update: (rows: ReviewRow[]) => ReviewRow[]) => void;

/**
 * The review: one row per line read, every line shown (none dropped). Ticked
 * rows are saved; unticked ones sit back in quieter ink.
 */
export function ReviewList({ rows, data, onChange }: { rows: ReviewRow[]; data: FinanceData; onChange: Change }) {
  const groups = useMemo(() => categoryGroups(data), [data]);
  const names = useMemo(() => itemNames(data), [data]);
  return (
    <ul aria-label="Lines read" className="mt-1">
      {rows.map((r, i) => (
        <m.li
          key={r.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: EASE_OUT, delay: Math.min(i, 8) * 0.03 }}
          className="border-t border-rule-soft first:border-t-0"
        >
          <ReviewItem r={r} groups={groups} names={names} onChange={onChange} />
        </m.li>
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
          <p
            className={cn(
              'min-w-0 flex-1 truncate text-[0.9375rem] font-medium transition-colors duration-150',
              r.ticked ? 'text-ink-strong' : 'text-ink-soft',
            )}
          >
            {title}
          </p>
          <p
            className={cn(
              'num shrink-0 whitespace-nowrap text-[0.9375rem] transition-colors duration-150',
              r.ticked ? 'font-semibold text-ink-strong' : 'font-normal text-ink-mute',
            )}
          >
            {amount}
          </p>
        </div>
        <p className="num text-sm text-ink-mute">{rowWhen(r)}</p>
        <p className={cn('text-sm [overflow-wrap:anywhere]', TONE[status.tone])}>{status.text}</p>
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
                className="inline-flex min-h-11 min-w-0 max-w-full items-center gap-1.5 rounded-full border border-dashed border-cobalt/50 px-3.5 text-sm font-medium text-cobalt transition-[background-color,transform] duration-150 hover:bg-cobalt-wash active:scale-[0.97]"
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
          'field-sizing-content min-h-11 min-w-0 max-w-full cursor-pointer appearance-none truncate rounded-full border pl-3.5 pr-9 text-sm font-medium transition-[background-color,border-color] duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/30',
          empty ? 'border-kiln/50 bg-kiln-wash text-kiln' : 'border-rule bg-surface text-ink hover:border-cobalt/60',
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
      <ChevronDown className={cn('pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2', empty ? 'text-kiln' : 'text-ink-mute')} aria-hidden />
    </div>
  );
}

/**
 * Keep this line: a square tick in cobalt ink (choosing, not a reward, so not
 * the laurel paid tick). 44 px tap area around a 24 px box.
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
        '-my-1.5 -ml-2.5 grid size-11 shrink-0 place-items-center rounded-full transition-transform duration-150',
        disabled ? 'cursor-default' : 'active:scale-[0.94]',
      )}
    >
      <span
        className={cn(
          'grid size-6 place-items-center rounded-[7px] border-[1.5px] transition-[background-color,border-color] duration-150',
          checked ? 'border-cobalt bg-cobalt text-on-cobalt' : muted ? 'border-rule bg-paper-2' : 'border-ink-mute/70 bg-surface',
        )}
      >
        {checked && (
          <m.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.16, ease: EASE_OUT }}>
            <Check className="size-4" strokeWidth={3} aria-hidden />
          </m.span>
        )}
      </span>
    </button>
  );
}
