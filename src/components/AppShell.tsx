import { LazyMotion, MotionConfig, domAnimation } from 'motion/react';
import type { ReactNode } from 'react';

/** Motion with the small feature set, and reduced motion from the OS setting. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

/** Page column: phone first, 16 px side gutter, room at the bottom for the action bar. */
export function Page({ children }: { children: ReactNode }) {
  return <div className="mx-auto w-full max-w-[40rem] px-4 pb-40 pt-[max(1rem,env(safe-area-inset-top))]">{children}</div>;
}
