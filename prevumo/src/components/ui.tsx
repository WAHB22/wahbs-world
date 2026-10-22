import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { Status } from "../sim/insights";
import { cx, OUTCOME_TONE, RAIL } from "./style";
import { OUTCOME_LABEL } from "../sim/insights";

type Variant = "primary" | "danger" | "secondary" | "ghost" | "quietDanger" | "onRust";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-green text-white hover:bg-[color-mix(in_srgb,var(--color-green)_88%,black)] active:translate-y-px",
  danger: "bg-rust text-white hover:bg-[color-mix(in_srgb,var(--color-rust)_88%,black)] active:translate-y-px",
  secondary: "bg-idle text-ink hover:bg-[color-mix(in_srgb,var(--color-idle)_85%,var(--color-ink))] active:translate-y-px",
  ghost: "bg-transparent text-ink hover:bg-idle",
  quietDanger: "bg-transparent text-rust hover:bg-orange-tint/50",
  onRust: "bg-surface text-rust hover:bg-white active:translate-y-px",
};

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md" | "lg" }) {
  return (
    <button
      type="button"
      {...rest}
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-[var(--radius-btn)] font-medium whitespace-nowrap",
        "transition-[background-color,transform,opacity] duration-150 disabled:opacity-45 disabled:pointer-events-none",
        size === "sm" && "h-8 px-3 text-[13px]",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-5 text-[15px]",
        VARIANTS[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Card({ className, children, rail }: { className?: string; children: ReactNode; rail?: Status }) {
  return (
    <div
      className={cx(
        "relative rounded-[var(--radius-card)] border border-border bg-surface",
        rail && "pl-1",
        className,
      )}
    >
      {rail && <span aria-hidden className={cx("absolute inset-y-0 left-0 w-1 rounded-l-[var(--radius-card)] transition-colors duration-500", RAIL[rail])} />}
      {children}
    </div>
  );
}

const BADGE: Record<Status, { cls: string; dot: string; label: string }> = {
  normal: { cls: "bg-green-tint text-ink", dot: "bg-green", label: "Normal" },
  irregular: { cls: "bg-orange-tint text-ink", dot: "bg-orange", label: "Irregular" },
  critical: { cls: "bg-rust text-white", dot: "bg-white", label: "Shutting down" },
  idle: { cls: "bg-idle text-ink", dot: "bg-muted", label: "Idle" },
  off: { cls: "bg-idle text-ink", dot: "border border-idle-mark", label: "Off" },
};

/** `still`: a handled state (for example a technician is on it), shown outlined instead of filled. */
export function StatusBadge({ status, label, className, still }: { status: Status; label?: string; className?: string; still?: boolean }) {
  const b = BADGE[status];
  return (
    <span
      className={cx(
        "inline-flex h-6 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium whitespace-nowrap",
        still ? "bg-surface text-ink ring-1 ring-orange-mark ring-inset" : b.cls,
        className,
      )}
    >
      <span aria-hidden className={cx("size-1.5 rounded-full", still ? "bg-orange" : b.dot)} />
      {label ?? b.label}
    </span>
  );
}

export function Chip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex h-6 items-center gap-1 rounded-full border border-border bg-surface px-2.5 text-xs text-muted", className)}>
      {children}
    </span>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  id?: string;
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cx(
        "relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors duration-200",
        checked ? "bg-green" : "bg-idle-mark",
      )}
    >
      <span
        aria-hidden
        className={cx(
          "inline-block size-5 rounded-full bg-surface shadow-[0_1px_2px_rgb(31_61_43/0.25)] transition-transform duration-200 ease-[var(--ease-out)]",
          checked ? "translate-x-[18px]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-[13px] font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-[10px] border border-border bg-idle/60 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "h-8 rounded-[8px] px-3 text-[13px] font-medium transition-[background-color,color,box-shadow] duration-200",
            value === o.value ? "bg-surface text-ink shadow-[0_0_0_1px_var(--color-idle-mark),0_1px_2px_rgb(31_61_43/0.12)]" : "text-muted hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SoonBadge() {
  return <span className="inline-flex h-6 items-center rounded-full bg-idle px-2.5 text-xs font-medium text-ink">Coming soon</span>;
}

/** What the owner decided, in the same colours everywhere. */
export function OutcomeChip({ outcome }: { outcome?: string }) {
  if (!outcome)
    return (
      <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-orange-tint px-2.5 text-xs font-medium whitespace-nowrap text-ink">
        <span aria-hidden className="pulse-dot size-1.5 rounded-full bg-orange" />
        Awaiting decision
      </span>
    );
  return (
    <span className={cx("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium whitespace-nowrap", OUTCOME_TONE[outcome] ?? "bg-idle text-ink")}>
      {OUTCOME_LABEL[outcome as keyof typeof OUTCOME_LABEL]}
    </span>
  );
}
