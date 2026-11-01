/**
 * One import run: the files being read and, once they are, the review rows.
 *
 * A run belongs to one opening of the import sheet (the OpenSheet object, which
 * is new on every open), so opening the sheet again always starts fresh, and a
 * read that finishes after the sheet closed never lands in a newer run. Runs
 * start from event handlers (the file picker, a drop), never from an effect.
 */
import { create } from 'zustand';
import { useFinance } from '@/lib/store';
import { useUI, type OpenSheet } from '@/lib/ui-store';
import { buildReview } from '@/lib/import/review';
import type { ReviewRow } from '@/lib/import/types';
import type { ISODate } from '@/lib/types';
import { browserReadDeps, fileKind, readFiles } from './readFiles';
import {
  IMPORTED_FILES_KEY,
  allRows,
  fileEntry,
  parseImportedFiles,
  priorImports,
  recordImported,
  withOutcome,
  type FileEntry,
  type PriorImport,
} from './import.logic';

export interface ImportRun {
  sheet: OpenSheet;
  files: FileEntry[];
  /** Set when every file is settled and at least one line was read. */
  rows: ReviewRow[] | null;
  /** Every file is settled. */
  done: boolean;
  prior: PriorImport[];
}

export const useImportRun = create<{ run: ImportRun | null }>(() => ({ run: null }));

function loadImported(): Record<string, ISODate> {
  try {
    return parseImportedFiles(localStorage.getItem(IMPORTED_FILES_KEY));
  } catch {
    return {};
  }
}

/** Remembers these file hashes as imported today. Storage blocked: the banner just will not show next time. */
export function rememberImported(fileIds: string[], today: ISODate): void {
  if (!fileIds.length) return;
  try {
    localStorage.setItem(IMPORTED_FILES_KEY, JSON.stringify(recordImported(loadImported(), fileIds, today)));
  } catch {
    // Private mode or storage full.
  }
}

/** Change the run only if it is still the one for this sheet opening. */
function patchRun(sheet: OpenSheet, change: (run: ImportRun) => ImportRun): void {
  useImportRun.setState((s) => (s.run && s.run.sheet === sheet ? { run: change(s.run) } : s));
}

/** Reads the files for this opening of the sheet, then builds the review. */
export async function startImport(sheet: OpenSheet, files: File[]): Promise<void> {
  if (!files.length) return;
  const { today } = useFinance.getState();
  const entries = files.map((f, i) => fileEntry(f, fileKind(f), i));
  useImportRun.setState({ run: { sheet, files: entries, rows: null, done: false, prior: [] } });

  await readFiles(files, browserReadDeps(today), (index, outcome) =>
    patchRun(sheet, (run) => ({ ...run, files: run.files.map((f, i) => (i === index ? withOutcome(f, outcome) : f)) })),
  );

  patchRun(sheet, (run) => {
    const data = useFinance.getState().data;
    const read = allRows(run.files);
    const rows = data && read.length ? buildReview(data, read, { today: useFinance.getState().today }) : null;
    return { ...run, rows, done: true, prior: priorImports(run.files, loadImported()) };
  });
}

/** Back to choosing files, in the same opening of the sheet. */
export function clearRun(): void {
  useImportRun.setState({ run: null });
}

export function updateRows(sheet: OpenSheet, change: (rows: ReviewRow[]) => ReviewRow[]): void {
  patchRun(sheet, (run) => (run.rows ? { ...run, rows: change(run.rows) } : run));
}

/** Drop or share: open the import sheet and start reading these files in it. */
export function openImportWith(files: File[]): void {
  if (!files.length) return;
  useUI.getState().open('import', undefined, useFinance.getState().month);
  const sheet = useUI.getState().sheet;
  if (sheet?.kind === 'import') void startImport(sheet, files);
}
