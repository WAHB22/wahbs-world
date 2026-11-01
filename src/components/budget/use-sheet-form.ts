import { useCallback, useState } from 'react';
import type { OpenSheet } from '@/lib/ui-store';

/**
 * Form state that starts fresh each time a sheet opens.
 *
 * Uses React's "adjust state while rendering" pattern, so the very first frame
 * of the opening sheet already shows the fresh values (an effect would flash
 * the previous ones). While the sheet animates out, the last values stay.
 * Returns null until the sheet has opened once.
 */
export function useSheetForm<T extends object>(
  sheet: OpenSheet | null,
  init: (sheet: OpenSheet) => T,
): [T | null, (patch: Partial<T> | ((f: T) => Partial<T>)) => void] {
  const [seen, setSeen] = useState<OpenSheet | null>(null);
  const [form, setForm] = useState<T | null>(null);
  if (sheet && sheet !== seen) {
    setSeen(sheet);
    setForm(init(sheet));
  }
  const update = useCallback((patch: Partial<T> | ((f: T) => Partial<T>)) => {
    setForm((f) => (f ? { ...f, ...(typeof patch === 'function' ? patch(f) : patch) } : f));
  }, []);
  return [form, update];
}
