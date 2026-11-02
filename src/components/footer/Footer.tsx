import { useRef, useState, type ChangeEvent } from 'react';
import { useFinance } from '@/lib/store';
import { useUI } from '@/lib/ui-store';
import { Button } from '@/components/ui/button';
import { BAD_FILE, RESTORE_NOTE, backupFileName, backupJson, readBackup } from './footer.logic';

/** Quiet ink text button, 44 px tall, tight sides so the three fit one row at 390 px. */
const tool = 'px-2';

function Dot() {
  return (
    <span aria-hidden className="select-none text-ink-mute">
      ·
    </span>
  );
}

/**
 * On paper below the bands: History, backup download and restore as quiet ink
 * text buttons in one row, and the one rule about transfers.
 */
export function Footer() {
  const data = useFinance((s) => s.data);
  const today = useFinance((s) => s.today);
  const replaceAll = useFinance((s) => s.replaceAll);
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const download = () => {
    if (!data) return;
    const url = URL.createObjectURL(new Blob([backupJson(data)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = backupFileName(today);
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const restore = async (e: ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    let text = '';
    try {
      text = await file.text();
    } catch {
      text = '';
    }
    const next = readBackup(text);
    if (!next) return setError(BAD_FILE);
    setError(null);
    replaceAll(next, RESTORE_NOTE);
  };

  return (
    <footer className="mt-10 pt-2">
      <div className="flex flex-wrap items-center justify-center gap-x-1">
        <Button variant="quiet" size="sm" className={tool} onClick={() => useUI.getState().open('history')}>
          History
        </Button>
        <Dot />
        <Button variant="quiet" size="sm" className={tool} onClick={download} disabled={!data}>
          Download backup
        </Button>
        <Dot />
        <Button
          variant="quiet"
          size="sm"
          className={tool}
          onClick={() => {
            setError(null);
            fileRef.current?.click();
          }}
        >
          Restore backup
        </Button>
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => void restore(e)} />
      {error && (
        <p role="alert" className="mt-2 text-center text-sm text-vase">
          {error}
        </p>
      )}
      <p className="mx-auto mt-3 max-w-[21rem] text-balance text-center text-[0.8125rem] leading-relaxed text-ink-soft">
        Transfers between your own accounts and Visa payments are not spending. Only log real purchases.
      </p>
    </footer>
  );
}
