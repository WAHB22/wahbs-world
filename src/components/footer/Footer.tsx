import { useRef, useState, type ChangeEvent } from 'react';
import { Download, History, Upload } from 'lucide-react';
import { useFinance } from '@/lib/store';
import { useUI } from '@/lib/ui-store';
import { Button } from '@/components/ui/button';
import { Waves } from '@/components/ui/ornaments';
import { BAD_FILE, RESTORE_NOTE, backupFileName, backupJson, readBackup } from './footer.logic';

const tool = 'h-auto min-h-16 flex-col justify-start gap-1 whitespace-normal px-1 pb-2 pt-2.5 text-[0.8125rem] leading-tight';

/** History, backup download and restore, and the one rule about transfers. */
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
    <footer className="mt-12">
      <Waves />
      <div className="mt-5 grid grid-cols-3 gap-2">
        <Button variant="ghost" className={tool} onClick={() => useUI.getState().open('history')}>
          <History aria-hidden />
          History
        </Button>
        <Button variant="ghost" className={tool} onClick={download} disabled={!data}>
          <Download aria-hidden />
          Download backup
        </Button>
        <Button
          variant="ghost"
          className={tool}
          onClick={() => {
            setError(null);
            fileRef.current?.click();
          }}
        >
          <Upload aria-hidden />
          Restore backup
        </Button>
      </div>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => void restore(e)} />
      {error && (
        <p role="alert" className="mt-2 text-center text-sm text-vase">
          {error}
        </p>
      )}
      <p className="mx-auto mt-4 max-w-[19rem] text-center text-xs leading-relaxed text-ink-mute">
        Transfers between your own accounts and Visa payments are not spending. Only log real purchases.
      </p>
    </footer>
  );
}
