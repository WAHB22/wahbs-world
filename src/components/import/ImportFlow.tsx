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
import { HAIRLINE, ReviewList } from './ReviewList';
import { ScrollMotif, Unroll } from './ScrollMotif';
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

const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const ACCEPT = 'image/*,.pdf,.csv,text/csv';

/* ---------- action bar ---------- */

/**
 * The two things he does most, always under the thumb: a solid paper strip
 * fixed to the bottom (above the home indicator), ruled off from the page by
 * one ink hairline like the rows above it. Add expense is solid ink, Import is
 * the ink outline; both are the kit Button (3 px corners, press 0.97).
 */
export function ActionBar() {
  const month = useFinance((s) => s.month);
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-20 border-t border-rule bg-paper"
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
              transition={{ duration: 0.2, ease: EASE_OUT }}
              className="flex w-full max-w-[34rem] flex-col items-center rounded-[3px] border-[1.5px] border-dashed border-cobalt/55 bg-[color:var(--scroll)] px-6 py-14 text-center"
            >
              <Meander className="w-40" />
              <ScrollMotif className="mt-8 size-14 text-[color:var(--ink-brand)]" />
              <p className="mt-4 max-w-[20rem] font-display text-[1.75rem] font-medium leading-tight text-[color:var(--ink-brand)] [text-wrap:balance]">
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
 * On the scroll colour, small text keeps 4.5:1: text-3 is raised to text-2
 * (as the Band does), and status hues are kept for icons only.
 */
const ON_SCROLL = 'bg-[color:var(--scroll)] [--ink-mute:var(--text-2)]';

/**
 * Import ('import'). Three steps in one sheet: choose files, read them (one
 * line per file), then review every line read and add the ticked ones in one
 * change that one Undo reverses. The sheet is the scroll colour, and the
 * review unrolls top to bottom when it shows (the guide's scroll moment).
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
      className={ON_SCROLL}
    >
      <AnimatePresence mode="wait" initial={false}>
        {step === 'review' ? (
          <m.div key="review" exit={{ opacity: 0, transition: { duration: 0.12 } }}>
            {live?.rows && data && (
              <Unroll>
                <ReviewHeader files={live.files} prior={live.prior.map((p) => priorText(p, live.files.length))} />
                <ReviewList rows={live.rows} data={data} onChange={(change) => updateRows(live.sheet, change)} />
              </Unroll>
            )}
          </m.div>
        ) : (
          <m.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.2, ease: EASE_OUT } }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
          >
            {step === 'pick' && <PickStep onChoose={choose} />}
            {step === 'reading' && live && <FileList files={live.files} />}
          </m.div>
        )}
      </AnimatePresence>
    </Sheet>
  );
}

/** The rolled up scroll: one dashed ink frame, the scroll drawing, and the whole frame is the file picker. */
function PickStep({ onChoose }: { onChoose: (e: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="pt-2">
      <label
        className={cn(
          'group flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-[3px] border-[1.5px] border-dashed border-cobalt/50 px-6 py-8 text-center',
          'transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]',
          'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-cobalt/40 has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-[color:var(--scroll)]',
        )}
      >
        <input type="file" multiple accept={ACCEPT} onChange={onChoose} className="sr-only" />
        <ScrollMotif className="size-14 text-[color:var(--ink-brand)]" />
        <span className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-[3px] bg-cobalt px-5 text-sm font-semibold text-on-cobalt transition-colors duration-150 group-hover:bg-cobalt-press">
          <Upload className="size-[1.125rem]" aria-hidden />
          Choose files
        </span>
        <span className="mt-3 max-w-[19rem] text-sm text-ink-soft [text-wrap:pretty]">
          CIBC notification screenshots, CIBC app screens, or a statement (PDF or CSV). Several at once.
        </span>
      </label>
      <p className="mt-3 hidden text-center text-sm text-ink-soft [@media(pointer:fine)]:block">You can also drop files anywhere on the page.</p>
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

/**
 * One hairline row per file: its name and Reading, Read 6 lines, or a plain
 * error. Text stays text or text-2 on the scroll; the state shows in the icon.
 */
function FileList({ files, compact }: { files: FileEntry[]; compact?: boolean }) {
  return (
    <ul aria-label="Files" aria-live="polite" className={cn(compact ? '' : 'mt-1')}>
      {files.map((f) => {
        const Icon = KIND_ICON[f.kind];
        return (
          <li key={f.key} className={cn('flex items-start gap-3 border-t py-3 first:border-t-0', HAIRLINE)}>
            <Icon className="mt-0.5 size-[18px] shrink-0 text-[color:var(--ink-brand)]" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[0.9375rem] font-medium text-ink">{f.name}</p>
              <p className={cn('text-sm [overflow-wrap:anywhere]', f.state === 'error' ? 'text-ink' : 'text-ink-soft')}>{fileLine(f)}</p>
            </div>
            <span className="mt-0.5 grid size-[18px] shrink-0 place-items-center" aria-hidden>
              {f.state === 'reading' && <LoaderCircle className="size-[18px] text-cobalt motion-safe:animate-spin" />}
              {f.state === 'done' && <Check className="size-[18px] text-[color:var(--ink-brand)]" />}
              {f.state === 'error' && <TriangleAlert className="size-[18px] text-vase" />}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Above the review: files imported before, files that failed, and how much was
 * read as a spaced caps label. Warnings are plain text with an ochre mark, no box.
 */
function ReviewHeader({ files, prior }: { files: FileEntry[]; prior: string[] }) {
  const failed = files.filter((f) => f.state === 'error' || (f.state === 'done' && f.rows.length === 0));
  const left = readsLeft(files);
  return (
    <div className="pb-2">
      {prior.map((text) => (
        <p key={text} className={cn('flex items-start gap-2 border-b py-2.5 text-sm font-medium text-ink [overflow-wrap:anywhere]', HAIRLINE)}>
          <History className="mt-0.5 size-[18px] shrink-0 text-kiln" aria-hidden />
          {text}
        </p>
      ))}
      {failed.length > 0 && (
        <div className={cn('mb-1 border-b', HAIRLINE)}>
          <FileList files={failed} compact />
        </div>
      )}
      <p className="caps num mt-3">{readSummary(files)}</p>
      {left && (
        <p className="mt-1.5 flex items-start gap-2 text-sm text-ink">
          <TriangleAlert className="mt-0.5 size-[18px] shrink-0 text-kiln" aria-hidden />
          {left}
        </p>
      )}
    </div>
  );
}
