import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { cx } from "./style";

/** Native dialog: focus trap, Escape and the top layer for free. Stays mounted so it can animate out. */
export function Dialog({
  open,
  onClose,
  kind = "modal",
  label,
  children,
  className,
  width = 720,
}: {
  width?: number;
  open: boolean;
  onClose: () => void;
  kind?: "modal" | "drawer";
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      d.querySelector<HTMLElement>("[data-autofocus]")?.focus({ preventScroll: true });
    }
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      aria-label={label}
      style={kind === "modal" ? { width: `min(${width}px, calc(100vw - 24px))` } : undefined}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cx(
        kind,
        "max-h-none max-w-none bg-transparent p-0 text-ink",
        kind === "modal" && "fixed inset-0 m-auto h-fit overflow-visible",
        kind === "drawer" && "fixed top-0 right-0 bottom-0 left-auto m-0 h-dvh w-[min(460px,100vw)]",
      )}
    >
      <div
        className={cx(
          "relative bg-surface",
          kind === "modal" && "max-h-[calc(100dvh-24px)] overflow-y-auto rounded-[14px] border border-border shadow-[0_24px_60px_rgb(31_61_43/0.22)]",
          kind === "drawer" && "flex h-full flex-col overflow-y-auto border-l border-border shadow-[-16px_0_48px_rgb(31_61_43/0.16)]",
          className,
        )}
      >
        {children}
      </div>
    </dialog>
  );
}

export function CloseButton({ onClick, label = "Close" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex size-11 items-center justify-center rounded-full text-muted transition-colors hover:bg-idle hover:text-ink sm:size-9"
    >
      <X className="size-[18px]" />
    </button>
  );
}
