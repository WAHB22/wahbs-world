import { useFinance } from '@/lib/store';
import type { SyncState } from '@/lib/store-api';
import { cn } from '@/lib/utils';

function timeText(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function syncText(s: SyncState): string {
  switch (s.kind) {
    case 'idle':
      return s.savedAt ? `Synced ${timeText(s.savedAt)}` : 'Synced';
    case 'saving':
      return 'Saving';
    case 'offline':
      return 'Not synced yet, saved on this device. Will retry.';
    case 'offline-copy':
      return "Offline, showing this device's copy";
    case 'error':
      return s.message;
  }
}

/** One quiet line under the header. Tapping it retries when something is waiting. */
export function SyncStatus({ className }: { className?: string }) {
  const sync = useFinance((s) => s.sync);
  const flush = useFinance((s) => s.flush);
  const waiting = sync.kind === 'offline' || sync.kind === 'error';
  return (
    <p className={cn('text-xs text-ink-mute', className)} aria-live="polite">
      {waiting ? (
        <button type="button" onClick={() => void flush()} className="-my-2 py-2 text-left underline decoration-rule underline-offset-4">
          {syncText(sync)}
        </button>
      ) : (
        syncText(sync)
      )}
    </p>
  );
}
