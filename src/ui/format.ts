/** Cents as dollars, the way the app shows money everywhere. */
export function money(cents: number, opts: { sign?: boolean } = {}): string {
  const abs = Math.abs(Math.round(cents));
  const s = `$${(abs / 100).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  if (cents < 0) return `minus ${s}`;
  return opts.sign && cents > 0 ? `plus ${s}` : s;
}

export function shortDay(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric" });
}

export function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit", hour12: false });
}
