import * as Dialog from '@radix-ui/react-dialog';
import { AnimatePresence, m, useDragControls, type PanInfo } from 'motion/react';
import { useId, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Bottom sheet for every edit form. Slides up on phones, sits centred on
 * laptops. Swipe the handle down to close. Radix gives focus trapping,
 * Escape and aria wiring.
 */
export interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Short plain line under the title. */
  description?: string;
  children: ReactNode;
  /** Sticky footer, usually the Save button row. */
  footer?: ReactNode;
  className?: string;
}

const EASE = [0.32, 0.72, 0, 1] as const;

export function Sheet({ open, onOpenChange, title, description, children, footer, className }: SheetProps) {
  const drag = useDragControls();
  const descId = useId();
  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 600) onOpenChange(false);
  };
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <m.div
                className="fixed inset-0 z-40 bg-scrim"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Dialog.Overlay>
            <Dialog.Content asChild forceMount aria-describedby={description ? descId : undefined}>
              <m.div
                className={cn(
                  'fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] w-full max-w-[34rem] flex-col rounded-t-[var(--radius-xl)] bg-surface text-ink shadow-lift outline-none',
                  'sm:bottom-6 sm:rounded-[var(--radius-xl)]',
                  className,
                )}
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%', transition: { duration: 0.2, ease: EASE } }}
                transition={{ duration: 0.32, ease: EASE }}
                drag="y"
                dragListener={false}
                dragControls={drag}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={{ top: 0, bottom: 0.6 }}
                onDragEnd={onDragEnd}
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
              >
                <div
                  className="flex h-6 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing sm:hidden"
                  onPointerDown={(e) => drag.start(e)}
                  aria-hidden
                >
                  <span className="h-1 w-10 rounded-full bg-rule" />
                </div>
                <div className="flex items-start gap-3 px-5 pb-2 pt-1 sm:pt-5">
                  <div className="min-w-0 flex-1">
                    <Dialog.Title className="font-display text-xl leading-tight text-ink-strong">{title}</Dialog.Title>
                    {description && (
                      <Dialog.Description id={descId} className="mt-1 text-sm text-ink-soft">
                        {description}
                      </Dialog.Description>
                    )}
                  </div>
                  <Dialog.Close
                    className="-mr-2 -mt-1 grid size-11 shrink-0 place-items-center rounded-full text-ink-mute transition-colors hover:bg-cobalt-wash hover:text-ink"
                    aria-label="Close"
                  >
                    <X className="size-5" />
                  </Dialog.Close>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">{children}</div>
                {footer && <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-rule-soft px-5 py-3">{footer}</div>}
              </m.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}
