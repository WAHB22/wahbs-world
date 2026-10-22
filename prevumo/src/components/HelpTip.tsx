import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { CircleHelp } from "lucide-react";
import { cx } from "./style";

/** A small "?" that opens a short plain explanation. Click or tap to open, Escape or click away to close. */
export function HelpTip({ label, children, align = "left" }: { label: string; children: ReactNode; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", down);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <span ref={ref} className="relative inline-flex align-middle">
      <button
        type="button"
        aria-label={`About ${label}`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex size-6 items-center justify-center rounded-full text-muted transition-colors hover:bg-idle hover:text-ink"
      >
        <CircleHelp className="size-4" />
      </button>
      {open && (
        <span
          id={id}
          role="note"
          className={cx(
            "toast-in absolute top-8 z-40 w-[290px] rounded-[12px] border border-border bg-surface p-3 text-left text-[13px] leading-relaxed font-normal tracking-normal text-ink shadow-[0_14px_40px_rgb(31_61_43/0.16)]",
            "max-sm:fixed max-sm:inset-x-4 max-sm:top-auto max-sm:bottom-4 max-sm:z-50 max-sm:w-auto",
            align === "left" ? "left-0" : "right-0",
          )}
        >
          {children}
        </span>
      )}
    </span>
  );
}
