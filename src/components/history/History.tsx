import { useEffect, useRef, useState } from 'react';
import { getHistory, getVersion } from '@/lib/api';
import { useFinance } from '@/lib/store';
import { useSheet, useUI, type OpenSheet } from '@/lib/ui-store';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Tag } from '@/components/ui/bits';
import { OliveSprig } from '@/components/ui/ornaments';
import { cn } from '@/lib/utils';
import { HISTORY_COPY as C, historyRows, planRestore, restoreErrorText, type HistoryRow } from './history.logic';

type List = { kind: 'loading' } | { kind: 'error' } | { kind: 'ready'; rows: HistoryRow[] };
type RowNote = { id: string; text: string; tone: 'error' | 'info' };

const close = () => useUI.getState().close();

/**
 * The last saves kept on the server, newest first, each with Restore this
 * version. Opened with useUI.getState().open('history'). A restore goes through
 * replaceAll, so it is a new save and the undo bar can take it back.
 */
export function HistorySheet() {
  const sheet = useSheet('history');
  const replaceAll = useFinance((s) => s.replaceAll);

  const [seen, setSeen] = useState<OpenSheet | null>(null);
  const [list, setList] = useState<List>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowNote, setRowNote] = useState<RowNote | null>(null);

  // Fresh state every time the sheet opens, so the first frame never shows the last visit.
  if (sheet !== seen) {
    setSeen(sheet);
    if (sheet) {
      setList({ kind: 'loading' });
      setBusyId(null);
      setRowNote(null);
    }
  }

  // The open sheet a restore started from. A version that arrives after the
  // sheet closed (or opened again) is dropped, never restored behind his back.
  const openRef = useRef<OpenSheet | null>(sheet);
  useEffect(() => {
    openRef.current = sheet;
  }, [sheet]);

  useEffect(() => {
    if (!sheet) return;
    let live = true;
    getHistory().then(
      (versions) => live && setList({ kind: 'ready', rows: historyRows(versions, new Date()) }),
      () => live && setList({ kind: 'error' }),
    );
    return () => {
      live = false;
    };
  }, [sheet, attempt]);

  const retry = () => {
    setList({ kind: 'loading' });
    setAttempt((n) => n + 1);
  };

  const restore = async (row: HistoryRow) => {
    const from = sheet;
    setBusyId(row.id);
    setRowNote(null);
    let raw: unknown;
    try {
      raw = await getVersion(row.id);
    } catch (e) {
      if (openRef.current !== from) return;
      setBusyId(null);
      setRowNote({ id: row.id, text: restoreErrorText(e), tone: 'error' });
      return;
    }
    if (openRef.current !== from) return;
    const plan = planRestore(raw, row, useFinance.getState().data);
    setBusyId(null);
    if (plan.kind !== 'restore') {
      setRowNote({ id: row.id, text: plan.message, tone: plan.kind === 'same' ? 'info' : 'error' });
      return;
    }
    replaceAll(plan.next, plan.note);
    close();
  };

  return (
    <Sheet open={!!sheet} onOpenChange={(o) => !o && close()} title={C.title} description={C.description}>
      {list.kind === 'loading' && <SkeletonRows />}

      {list.kind === 'error' && (
        <div className="py-2">
          <p role="alert" className="text-[0.9375rem] text-ink">
            {C.loadError}
          </p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={retry}>
            {C.retry}
          </Button>
        </div>
      )}

      {list.kind === 'ready' && list.rows.length === 0 && (
        <div className="flex items-center gap-3 py-3">
          <OliveSprig className="h-6 shrink-0" />
          <p className="text-[0.9375rem] text-ink-mute">{C.empty}</p>
        </div>
      )}

      {list.kind === 'ready' && list.rows.length > 0 && (
        <>
          <ol>
            {list.rows.map((row) => (
              <Row
                key={row.id}
                row={row}
                busy={busyId === row.id}
                disabled={busyId !== null}
                note={rowNote?.id === row.id ? rowNote : null}
                onRestore={() => void restore(row)}
              />
            ))}
          </ol>
          {list.rows.length === 1 && <p className="mt-1 text-sm text-ink-mute">{C.onlyCurrent}</p>}
        </>
      )}
    </Sheet>
  );
}

function Row({
  row,
  busy,
  disabled,
  note,
  onRestore,
}: {
  row: HistoryRow;
  busy: boolean;
  disabled: boolean;
  note: RowNote | null;
  onRestore: () => void;
}) {
  const base = `history-${row.id.replace(/[^\w]/g, '_')}`;
  return (
    <li className="border-t border-rule-soft py-2.5 first:border-t-0" aria-current={row.current ? 'true' : undefined}>
      <p id={`${base}-note`} className="num line-clamp-2 break-words pt-0.5 text-[0.9375rem] font-medium leading-snug text-ink-strong">
        {row.note}
      </p>
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-3">
        <span id={`${base}-when`} className="num whitespace-nowrap text-sm text-ink-mute">
          {row.when}
        </span>
        {row.current ? (
          <Tag tone="info" className="ml-auto">
            {C.current}
          </Tag>
        ) : (
          <Button
            variant="quiet"
            size="sm"
            className="-mr-3 ml-auto"
            onClick={onRestore}
            disabled={disabled}
            aria-describedby={`${base}-note ${base}-when`}
          >
            {busy ? C.restoring : C.restore}
          </Button>
        )}
      </div>
      {note && (
        <p role={note.tone === 'error' ? 'alert' : 'status'} className={cn('pb-1 text-sm', note.tone === 'error' ? 'text-vase' : 'text-ink-soft')}>
          {note.text}
        </p>
      )}
    </li>
  );
}

const SKELETON_WIDTHS = ['72%', '54%', '80%', '46%'];

/** Static placeholder rows shaped like the list. No shimmer: nothing loops. */
function SkeletonRows() {
  return (
    <div role="status" aria-label={C.loading}>
      {SKELETON_WIDTHS.map((w, i) => (
        <div key={i} aria-hidden className="border-t border-rule-soft py-2.5 first:border-t-0">
          <div className="flex h-[1.375rem] items-center">
            <div className="h-3.5 rounded-full bg-ink/10" style={{ width: w }} />
          </div>
          <div className="flex min-h-11 items-center justify-between gap-3">
            <div className="h-3 w-24 rounded-full bg-ink/10" />
            {i > 0 && <div className="h-3 w-32 rounded-full bg-cobalt/15" />}
          </div>
        </div>
      ))}
    </div>
  );
}
