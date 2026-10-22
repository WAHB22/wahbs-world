import type { HealthTone, Status } from "../sim/insights";

export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

export const RAIL: Record<Status, string> = {
  normal: "bg-green",
  irregular: "bg-orange",
  critical: "bg-rust",
  idle: "bg-idle-mark",
  off: "bg-idle-mark",
};

export const STROKE: Record<Status, string> = {
  normal: "var(--color-green)",
  irregular: "var(--color-orange)",
  critical: "var(--color-rust)",
  idle: "var(--color-muted)",
  off: "var(--color-muted)",
};

/** The live line keeps the machine's own colour; irregular stretches are drawn in orange on top. */
export const lineFor = (s: Status) => (s === "irregular" ? STROKE.normal : STROKE[s]);

export const TONE_CHIP: Record<HealthTone, string> = {
  normal: "bg-green-tint text-ink",
  irregular: "bg-orange-tint text-ink",
  critical: "bg-rust text-white",
};

export const OUTCOME_TONE: Record<string, string> = {
  shutdown: "bg-rust text-white",
  technician: "bg-orange-tint text-ink",
  ok: "bg-green-tint text-ink",
  "kept-on": "bg-idle text-ink",
  "auto-off": "bg-idle text-ink",
  generated: "bg-green-tint text-ink",
};

export const inputCls =
  "h-11 w-full rounded-[10px] border border-field bg-surface px-3 text-ink placeholder:text-muted outline-none transition-[border-color,box-shadow] focus:border-green focus:shadow-[0_0_0_3px_var(--color-green-tint)]";
