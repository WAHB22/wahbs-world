import type { ReactNode } from 'react';
import { useFinance } from '@/lib/store';
import { Page } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { EngravedTemple, OliveSprig, TornEdge } from '@/components/ui/ornaments';
import { cn } from '@/lib/utils';

/**
 * What shows before the page has data: a skeleton while loading, and a calm
 * full page when this device has no key, a refused key, or nothing loaded.
 * No data and no controls beyond Try again.
 */
export function BootScreen() {
  const boot = useFinance((s) => s.boot);
  const sync = useFinance((s) => s.sync);
  const init = useFinance((s) => s.init);

  switch (boot) {
    case 'no-key':
      return (
        <Notice title="This device is not set up">
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
            Open your private link once on this device. After that it opens like before, with no PIN.
          </p>
        </Notice>
      );
    case 'bad-key':
      return (
        <Notice title="This device key was not accepted">
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">Open your private link again on this device.</p>
        </Notice>
      );
    case 'error':
      return (
        <Notice title="Something went wrong">
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
            {sync.kind === 'error' && sync.message ? sync.message : 'Your data did not load.'}
          </p>
          <Button variant="primary" className="mt-6 min-w-32" onClick={() => void init()}>
            Try again
          </Button>
        </Notice>
      );
    default:
      // 'loading', and 'ready' for the instant before data lands.
      return <LoadingSkeleton />;
  }
}

/** A quiet page: olive sprig, a Didone heading, a few plain words. Sits a little above the middle. */
function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[40rem] flex-col justify-center px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <div className="max-w-[22rem] pb-[14vh]">
        <OliveSprig className="h-7" />
        <h1 className="mt-5 font-display text-3xl leading-[1.1] text-ink-strong">{title}</h1>
        {children}
      </div>
    </main>
  );
}

function Bone({ className }: { className?: string }) {
  return <div className={cn('rounded-full bg-ink/10', className)} />;
}

/**
 * Static stand in for the header and the Safe to spend band, built on the same
 * boxes so nothing jumps when the real page arrives. Nothing moves.
 */
function LoadingSkeleton() {
  return (
    <Page>
      <div role="status" aria-label="Loading">
        <header className="pb-5" aria-hidden>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="font-display text-3xl leading-none text-ink-strong">Finance</span>
              <OliveSprig className="h-6 shrink-0" />
            </div>
            <Bone className="h-3 w-24" />
          </div>
          <div className="mt-4 flex items-center justify-between gap-2 border-y border-rule-soft py-1">
            <div className="size-11" />
            <Bone className="h-4 w-32" />
            <div className="size-11" />
          </div>
        </header>
        <div className="-mx-4" aria-hidden>
          <div className="relative overflow-hidden bg-hero-bg px-5 pb-6 pt-6 text-hero-ink">
            <div className="pointer-events-none absolute -bottom-2 right-0 h-[125%] translate-x-[18%] opacity-[0.26]">
              <EngravedTemple />
            </div>
            <div className="relative">
              <div className="flex h-14 items-end gap-2">
                <div className="h-12 w-28 rounded-[var(--radius-md)] bg-hero-ink/20" />
                <div className="mb-0.5 h-5 w-14 rounded-full bg-hero-ink/20" />
              </div>
              <div className="mt-3 max-w-[16rem] space-y-2 py-0.5">
                <div className="h-3.5 w-[92%] rounded-full bg-hero-ink/20" />
                <div className="h-3.5 w-[60%] rounded-full bg-hero-ink/20" />
              </div>
              <div className="mt-2 flex min-h-11 items-center">
                <div className="h-3 w-44 rounded-full bg-hero-ink/15" />
              </div>
            </div>
          </div>
          <TornEdge />
        </div>
      </div>
    </Page>
  );
}
