export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function addDays(ts: number, n: number): number {
  const d = new Date(ts);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

/** YYYY-MM-DD in local time. */
export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromDayKey(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).getTime();
}

/** "13:45" on the day of `day` (any time on that day). */
export function atTime(day: number, hm: string): number {
  const [h, m] = hm.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

export function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function fmtTime(ts: number): string {
  const d = new Date(ts);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function dayName(i: number): string {
  return DAYS[i];
}

export function fmtDate(ts: number): string {
  const d = new Date(ts);
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "Today 13:45", "Yesterday 09:10" or "Mon 20 Oct 09:10". */
export function fmtWhen(ts: number, now: number): string {
  const diff = Math.round((startOfDay(now) - startOfDay(ts)) / DAY);
  const day = diff === 0 ? "Today" : diff === 1 ? "Yesterday" : fmtDate(ts);
  return `${day} ${fmtTime(ts)}`;
}

/** 00:25:13 */
export function fmtClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** "45 min", "2 h 10 min", "40 s" */
export function fmtSpan(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
}

export function hoursBetween(a: number, b: number): number {
  return Math.max(0, b - a) / HOUR;
}
