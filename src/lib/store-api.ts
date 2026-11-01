/**
 * The contract between the app store (src/lib/store.ts) and the UI.
 * UI code only reads state and calls these actions. Every change to saved data
 * goes through commit(), which makes it undoable, gives it a History note and
 * schedules a save.
 */
import type { Draft } from 'immer';
import type { FinanceData, ISODate, MonthKey } from './types';

export type Recipe = (draft: Draft<FinanceData>) => void | FinanceData;

export type BootStatus =
  | 'loading'
  | 'no-key' // this browser has no device key: show "This device is not set up"
  | 'bad-key' // key was sent but the server said 401
  | 'ready'
  | 'error';

export type SyncState =
  | { kind: 'idle'; savedAt?: string } // "Synced 3:42 PM"
  | { kind: 'saving' } // "Saving"
  | { kind: 'offline' } // "Not synced yet, saved on this device. Will retry."
  | { kind: 'offline-copy' } // "Offline, showing this device's copy"
  | { kind: 'error'; message: string };

export interface UndoEntry {
  id: string;
  /** Plain text for the undo bar and History: 'Deleted Costco $182.40'. */
  note: string;
  at: number;
}

export interface FinanceStore {
  boot: BootStatus;
  sync: SyncState;
  /** null until loaded. Always migrated to v2. */
  data: FinanceData | null;
  /** Month on screen. Starts at the current month. */
  month: MonthKey;
  /** Today's local date. Refreshed when the tab becomes visible. */
  today: ISODate;
  /** Latest undoable action, for the undo bar. Cleared after undo or when replaced. */
  lastUndo: UndoEntry | null;

  /** Load from the server (or this device's copy when offline). Called once at start. */
  init(): Promise<void>;
  /**
   * Apply a change. `note` is shown in the undo bar and saved for History.
   * Returns the undo entry. Does nothing (returns null) if data is not loaded.
   */
  commit(note: string, recipe: Recipe, opts?: { undoable?: boolean }): UndoEntry | null;
  /** Reverse lastUndo (or the entry with this id if it is still the latest). */
  undo(id?: string): void;
  /** Dismiss the undo bar without undoing. */
  dismissUndo(): void;
  setMonth(month: MonthKey): void;
  /** Replace all data (History restore, Restore backup). Undoable. */
  replaceAll(next: FinanceData, note: string): void;
  /** Force a save attempt now (used by the 'online' event and a retry tap). */
  flush(): Promise<void>;
}
