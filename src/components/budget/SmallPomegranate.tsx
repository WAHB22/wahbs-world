import { cn } from '@/lib/utils';

/**
 * Pomegranate for the Groceries row, drawn for 20 px: the round fruit, its
 * flared crown and one leaf. The full
 * size `Pomegranate` motif reads as a stopwatch at this size, so this keeps
 * only what you can see on a phone. One ink, round caps, decorative.
 */
export function SmallPomegranate({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn('size-5 text-cobalt', className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9.7 7.7C6.6 8.6 4.4 11.2 4.4 14.4c0 4.1 3.4 7.2 7.6 7.2s7.6-3.1 7.6-7.2c0-3.2-2.2-5.8-5.3-6.7" />
      <path d="M9.7 7.7 8.7 4.5l2 1.3L12 3.3l1.3 2.5 2-1.3-1 3.2" />
      <path d="M15.6 7.4c.9-1.9 2.8-2.9 4.6-2.6-.6 1.9-2.4 3-4.6 2.6z" />
    </svg>
  );
}
