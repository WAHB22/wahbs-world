import type { ReactNode } from 'react';
import { useFinance } from '@/lib/store';
import { Page } from '@/components/AppShell';
import { Button } from '@/components/ui/button';
import { ArchWindow, EngravedTemple, OwlCoin, Wordmark } from '@/components/ui/motifs';
import { cn } from '@/lib/utils';

/**
 * What shows before the page has data: a still copy of the top of the page
 * while loading, and a calm full page when this device has no key, a refused
 * key, or nothing loaded. No data and no controls beyond Try again.
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
        <Notice title="Your data did not load">
          <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink-soft">
            {sync.kind === 'error' && sync.message ? sync.message : 'Check the connection and try again.'}
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

/**
 * A quiet page laid out like the Welcome to Greece poster: the wordmark where
 * the header puts it, an arch window (the empty state drawing), a Bodoni
 * heading and a few plain words, and the engraved temple bleeding off the
 * bottom right corner.
 */
function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-hidden">
      <div className="pointer-events-none absolute -right-10 bottom-0 h-[264px] w-[220px]" aria-hidden>
        <EngravedTemple className="h-full w-full" />
      </div>
      <div className="relative mx-auto flex min-h-dvh w-full max-w-[40rem] flex-col px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]">
        <header>
          <Wordmark className="h-7" />
        </header>
        <main className="flex flex-1 flex-col justify-center pb-[30vh] pt-12">
          <div className="max-w-[22rem]">
            <ArchWindow className="size-14 text-[color:var(--ink-brand)]" />
            <h1 className="mt-5 font-display text-[2rem] font-bold leading-[1.08] tracking-[-0.01em] text-[color:var(--ink-brand)]">{title}</h1>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function Bone({ className }: { className?: string }) {
  return <div className={cn('rounded-[3px] bg-cobalt/10', className)} />;
}

/**
 * Still stand in for the header and the Safe to spend hero, built on the same
 * boxes (Header.tsx, SafeToSpend.tsx) so nothing jumps when the real page
 * arrives: the wordmark, the month line, the caps label, a block where the big
 * number goes, the owl coin and the temple. Nothing moves.
 */
function LoadingSkeleton() {
  return (
    <Page>
      <div role="status" aria-label="Loading">
        <header className="pb-2" aria-hidden>
          <div className="flex items-center justify-between gap-3">
            <Wordmark className="h-7" />
            <Bone className="h-3 w-24" />
          </div>
          <div className="mt-5 flex items-center justify-between gap-2">
            <div className="size-11" />
            <Bone className="h-8 w-56" />
            <div className="size-11" />
          </div>
        </header>
        <div className="relative -mx-4 overflow-hidden px-4 pb-10 pt-8" aria-hidden>
          <div className="pointer-events-none absolute -right-10 bottom-0 h-[264px] w-[220px]">
            <EngravedTemple className="h-full w-full" />
          </div>
          <p className="caps relative">Safe to spend today</p>
          <div className="relative">
            {/* Same type boxes as the real number and payday line, kept invisible, so the heights match exactly. */}
            <div className="relative mt-2">
              <p className="invisible font-display text-hero font-bold">$00</p>
              <Bone className="absolute left-0 top-1/2 h-[4.5rem] w-40 -translate-y-1/2" />
            </div>
            <div className="relative mt-2 max-w-[12.5rem] text-sm leading-snug">
              <p className="invisible">Payday in 0 days · Nov 0 (estimate)</p>
              <div className="absolute inset-0 flex flex-col justify-center gap-2">
                <Bone className="h-3.5 w-[92%]" />
                <Bone className="h-3.5 w-[55%]" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-3">
              <OwlCoin className="opacity-40" />
            </div>
            <div className="mt-3 flex min-h-11 items-center">
              <Bone className="h-3 w-44" />
            </div>
          </div>
        </div>
      </div>
    </Page>
  );
}
