import { useMemo } from 'react';
import { useFinance } from '@/lib/store';
import { useUI } from '@/lib/ui-store';
import { Empty, RowButton, Section, Tag } from '@/components/ui/bits';
import { cn } from '@/lib/utils';
import { accountRows } from './accounts.logic';
import { AccountSheet } from './AccountSheet';

/** Balances he types in from the bank app: Chequing, Savings, Visa owing. */
export function Accounts() {
  const data = useFinance((s) => s.data)!;
  const rows = useMemo(() => accountRows(data), [data]);
  return (
    <Section id="accounts" title="Accounts" hint="Tap to update">
      {rows.length === 0 ? (
        <Empty>No accounts yet.</Empty>
      ) : (
        <div>
          {rows.map((r) => (
            <RowButton key={r.id} label={r.label} onClick={() => useUI.getState().open('account', r.id)}>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-[0.9375rem] text-ink-strong">{r.name}</span>
                  {r.tag && (
                    <Tag tone={r.tag.tone} className="shrink-0">
                      {r.tag.text}
                    </Tag>
                  )}
                </div>
                <p className="num mt-0.5 truncate text-xs text-ink-mute">{r.sub}</p>
              </div>
              <span className={cn('num shrink-0 whitespace-nowrap', r.empty ? 'text-sm text-ink-mute' : 'text-base font-medium text-ink-strong')}>
                {r.value}
              </span>
            </RowButton>
          ))}
        </div>
      )}
      <AccountSheet />
    </Section>
  );
}
