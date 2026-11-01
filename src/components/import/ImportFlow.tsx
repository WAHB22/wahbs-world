import { useEffect, useState, type ChangeEvent, type ReactNode } from 'react';
import { AnimatePresence, m } from 'motion/react';
import { Check, FileSpreadsheet, FileText, History, Image as ImageIcon, LoaderCircle, Plus, TriangleAlert, Upload } from 'lucide-react';
import { useFinance } from '@/lib/store';
import { useSheet, useUI, type OpenSheet } from '@/lib/ui-store';
import { importNote, saveLabel } from '@/lib/import/review';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Meander } from '@/components/ui/bits';
import { cn } from '@/lib/utils';
import { ReviewList } from './ReviewList';
import { needsServer, type FileKind } from './readFiles';
import {
  canSave,
  fileLine,
  importRecipe,
  importedFileIds,
  priorText,
  readSummary,
  readsLeft,
  type FileEntry,
} from './import.logic';
import { clearRun, openImportWith, rememberImported, startImport, updateRows, useImportRun } from './session';

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const ACCEPT = 'image/*,.pdf,.csv,text/csv';

/* ---------- action bar ---------- */

/**
 * The two things he does most, always under the thumb: a solid paper strip
 * fixed to the bottom (above the home indicator), with a soft shadow on its top
 * edge so the list scrolling under it stays readable.
 */
export function ActionBar() {
  const month = useFinance((s) => s.month);
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-20 border-t border-rule-soft bg-paper shadow-[0_-10px_24px_-16px_var(--scrim)]"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto flex w-full max-w-[40rem] gap-2 px-4 pt-3">
        <Button variant="primary" size="pill" className="min-w-0 flex-1" onClick={() => useUI.getState().open('expense', undefined, month)}>
          <Plus aria-hidden />
          Add expense
        </Button>
        <Button variant="secondary" size="pill" className="min-w-0 flex-1" onClick={() => useUI.getState().open('import', undefined, month)}>
          <Upload aria-hidden />
          Import
        </Button>
      </div>
    </div>
  );
}

/* ---------- drop zone ---------- */

const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');

/**
 * Wraps the app. On a laptop, dragging files over the window shows a full
 * screen target; dropping them opens the import sheet and starts reading.
 */
export function DropZone({ children }: { children: ReactNode }) {
  const [over, setOver] = useState(false);

  useEffect(() => {
    // dragenter and dragleave fire for every child crossed, so count them.
    let depth = 0;
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth++;
      setOver(true);
    };
    const overWindow = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setOver(false);
    };
    const reset = () => {
      depth = 0;
      setOver(false);
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      reset();
      openImportWith(Array.from(e.dataTransfer?.files ?? []));
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragover', overWindow);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    window.addEventListener('dragend', reset);
    window.addEventListener('blur', reset);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragover', overWindow);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', drop);
      window.removeEventListener('dragend', reset);
      window.removeEventListener('blur', reset);
    };
  }, []);

  return (
    <>
      {children}
      <AnimatePresence>
        {over && (
          <m.div
            key="drop"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.16, ease: EASE_OUT } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            className="pointer-events-none fixed inset-0 z-[60] grid place-items-center bg-paper/95 p-4"
          >
            <m.div
              initial={{ scale: 0.97 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.22, ease: EASE_OUT }}
              className="flex w-full max-w-[34rem] flex-col items-center rounded-[var(--radius-xl)] border-2 border-dashed border-cobalt/55 px-6 py-14 text-center"
            >
              <Meander className="w-40" />
              <Upload className="mt-8 size-5 text-cobalt" aria-hidden />
              <p className="mt-3 max-w-[20rem] font-display text-2xl leading-tight text-ink-strong [text-wrap:balance]">
                Drop screenshots, a PDF or a CSV to import
              </p>
              <Meander className="mt-8 w-40" />
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ---------- import sheet ---------- */

const close = () => useUI.getState().close();

/**
 * Import ('import'). Three steps in one sheet: choose files, read them (one
 * line per file), then review every line read and add the ticked ones in one
 * change that one Undo reverses.
 */
export function ImportSheet() {
  const sheet = useSheet('import');
  const data = useFinance((s) => s.data);
  const today = useFinance((s) => s.today);
  const commit = useFinance((s) => s.commit);
  const run = useImportRun((s) => s.run);

  // The opening on screen; kept while the sheet slides away so its content does not jump.
  const [shown, setShown] = useState<OpenSheet | null>(sheet);
  if (sheet && sheet !== shown) setShown(sheet);
  // A run started in an earlier opening is never shown: each opening starts fresh.
  const live = run && shown && run.sheet === shown ? run : null;
  const step = !live ? 'pick' : live.rows ? 'review' : 'reading';

  const choose = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (shown && files.length) void startImport(shown, files);
  };

  const save = () => {
    if (!live?.rows || !canSave(live.rows)) return;
    commit(importNote(live.rows), importRecipe(live.rows, today));
    rememberImported(importedFileIds(live.files), today);
    close();
  };

  const description =
    step === 'review'
      ? 'Tick the lines to add. Nothing is saved yet.'
      : step === 'reading' && !live?.done && live?.files.some((f) => needsServer(f.kind))
        ? 'Screenshots and PDFs take a few seconds each.'
        : undefined;

  const footer =
    step === 'review' && live?.rows ? (
      <Button variant="primary" size="lg" className="ml-auto min-w-0 flex-1 sm:flex-none" disabled={!canSave(live.rows)} onClick={save}>
        {saveLabel(live.rows)}
      </Button>
    ) : step === 'reading' && live?.done ? (
      <Button variant="secondary" className="ml-auto" onClick={clearRun}>
        Choose other files
      </Button>
    ) : undefined;

  return (
    <Sheet
      open={!!sheet}
      onOpenChange={(o) => !o && close()}
      title="Import"
      description={description}
      footer={footer}
    >
      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={step}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.22, ease: EASE_OUT } }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
        >
          {step === 'pick' && <PickStep onChoose={choose} />}
          {step === 'reading' && live && <FileList files={live.files} />}
          {step === 'review' && live?.rows && data && (
            <>
              <ReviewHeader files={live.files} prior={live.prior.map((p) => priorText(p, live.files.length))} />
              <ReviewList rows={live.rows} data={data} onChange={(change) => updateRows(live.sheet, change)} />
            </>
          )}
        </m.div>
      </AnimatePresence>
    </Sheet>
  );
}

function PickStep({ onChoose }: { onChoose: (e: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="pt-2">
      <label
        className={cn(
          'flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-[var(--radius-lg)] border-[1.5px] border-dashed border-cobalt/45 bg-paper px-6 py-8 text-center',
          'transition-[background-color,transform] duration-150 hover:bg-cobalt-wash/50 active:scale-[0.99]',
          'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-cobalt/40 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-surface',
        )}
      >
        <input type="file" multiple accept={ACCEPT} onChange={onChoose} className="sr-only" />
        <span className="grid size-12 place-items-center rounded-full bg-cobalt text-on-cobalt shadow-card">
          <Upload className="size-5" aria-hidden />
        </span>
        <span className="mt-3 text-lg font-medium text-ink-strong">Choose files</span>
        <span className="mt-1.5 max-w-[19rem] text-sm text-ink-soft [text-wrap:pretty]">
          CIBC notification screenshots, CIBC app screens, or a statement (PDF or CSV). Several at once.
        </span>
      </label>
      <p className="mt-3 hidden text-center text-sm text-ink-mute [@media(pointer:fine)]:block">You can also drop files anywhere on the page.</p>
    </div>
  );
}

const KIND_ICON: Record<FileKind, typeof FileText> = {
  csv: FileSpreadsheet,
  pdf: FileText,
  image: ImageIcon,
  heic: ImageIcon,
  other: FileText,
};

/** One line per file: its name and Reading, Read 6 lines, or a plain error. */
function FileList({ files, compact }: { files: FileEntry[]; compact?: boolean }) {
  return (
    <ul aria-label="Files" aria-live="polite" className={cn(compact ? '' : 'mt-1')}>
      {files.map((f) => {
        const Icon = KIND_ICON[f.kind];
        return (
          <li key={f.key} className="flex items-start gap-3 border-t border-rule-soft py-3 first:border-t-0">
            <Icon className="mt-0.5 size-[18px] shrink-0 text-ink-mute" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.9375rem] font-medium text-ink-strong">{f.name}</p>
              <p className={cn('text-sm [overflow-wrap:anywhere]', f.state === 'error' ? 'text-vase' : f.state === 'done' ? 'text-ink-soft' : 'text-ink-mute')}>
                {fileLine(f)}
              </p>
            </div>
            <span className="mt-0.5 grid size-[18px] shrink-0 place-items-center" aria-hidden>
              {f.state === 'reading' && <LoaderCircle className="size-[18px] text-cobalt motion-safe:animate-spin" />}
              {f.state === 'done' && <Check className="size-[18px] text-aegean" />}
              {f.state === 'error' && <TriangleAlert className="size-[18px] text-vase" />}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** Above the review: files imported before, files that failed, how much was read. */
function ReviewHeader({ files, prior }: { files: FileEntry[]; prior: string[] }) {
  const failed = files.filter((f) => f.state === 'error' || (f.state === 'done' && f.rows.length === 0));
  const left = readsLeft(files);
  return (
    <div className="pb-1">
      {prior.map((text) => (
        <p
          key={text}
          className="mb-2 flex items-start gap-2 rounded-[var(--radius-md)] bg-kiln-wash px-3 py-2.5 text-sm text-kiln [overflow-wrap:anywhere]"
        >
          <History className="mt-0.5 size-[18px] shrink-0" aria-hidden />
          {text}
        </p>
      ))}
      {failed.length > 0 && (
        <div className="mb-2">
          <FileList files={failed} compact />
        </div>
      )}
      <p className="text-sm text-ink-mute">{readSummary(files)}</p>
      {left && <p className="text-sm text-kiln">{left}</p>}
    </div>
  );
}
