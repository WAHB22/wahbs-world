/**
 * Which sheet is open. One at a time, so opening a sheet from anywhere
 * (the + Expense button, a row, the forecast prompt) closes the others.
 */
import { create } from 'zustand';

export type SheetKind =
  | 'expense' // id = tx id to edit, none = add
  | 'pay' // id = pay id to edit
  | 'pay-plan'
  | 'bill' // id = bill id
  | 'item' // id = budget item id
  | 'add-item'
  | 'account' // id = account id
  | 'goal' // id = goal id
  | 'balances' // chequing balance + Visa owing + Visa due day (forecast prompt)
  | 'cover' // id = budget item id
  | 'import'
  | 'history';

export interface OpenSheet {
  kind: SheetKind;
  id?: string;
  /** Month the sheet was opened from (the month on screen). */
  month?: string;
}

interface UIState {
  sheet: OpenSheet | null;
  open: (kind: SheetKind, id?: string, month?: string) => void;
  close: () => void;
}

export const useUI = create<UIState>((set) => ({
  sheet: null,
  open: (kind, id, month) => set({ sheet: { kind, id, month } }),
  close: () => set({ sheet: null }),
}));

/** Hook: is this sheet kind open? Returns the open sheet or null. */
export function useSheet(kind: SheetKind): OpenSheet | null {
  return useUI((s) => (s.sheet?.kind === kind ? s.sheet : null));
}
