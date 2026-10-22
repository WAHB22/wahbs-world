import type { Status } from "../sim/insights";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export const RAIL: Record<Status, string> = {
  normal: "bg-green",
  irregular: "bg-orange",
  critical: "bg-rust",
  idle: "bg-[color-mix(in_srgb,var(--color-muted)_45%,var(--color-idle))]",
  off: "bg-border",
};

export const STROKE: Record<Status, string> = {
  normal: "var(--color-green)",
  irregular: "var(--color-orange)",
  critical: "var(--color-rust)",
  idle: "var(--color-muted)",
  off: "var(--color-muted)",
};

export const inputCls =
  "h-11 w-full rounded-[10px] border border-border bg-surface px-3 text-ink placeholder:text-muted/70 outline-none transition-[border-color,box-shadow] focus:border-green focus:shadow-[0_0_0_3px_var(--color-green-tint)]";
