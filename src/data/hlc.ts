/**
 * Hybrid logical clock. Strings compare correctly as plain text:
 *   13 digit wall time : 6 digit counter : device id
 * A device never issues a stamp lower than one it has already seen, so an edit made
 * after a sync always wins over what it replaced, even when the phone clock is behind.
 */
export type Clock = { wall: number; counter: number; device: string };

const MAX_COUNTER = 999_999;

export function format(c: Clock): string {
  return `${String(c.wall).padStart(13, "0")}:${String(c.counter).padStart(6, "0")}:${c.device}`;
}

export function parse(s: string): Clock {
  const [wall, counter, ...rest] = s.split(":");
  return { wall: Number(wall), counter: Number(counter), device: rest.join(":") };
}

/** Next stamp for a local event. */
export function tick(last: Clock, now: number): Clock {
  if (now > last.wall) return { wall: now, counter: 0, device: last.device };
  if (last.counter >= MAX_COUNTER) return { wall: last.wall + 1, counter: 0, device: last.device };
  return { wall: last.wall, counter: last.counter + 1, device: last.device };
}

/** Advance the local clock past a stamp received from elsewhere. */
export function receive(last: Clock, remote: string, now: number): Clock {
  const r = parse(remote);
  const wall = Math.max(last.wall, r.wall, now);
  let counter = 0;
  if (wall === last.wall && wall === r.wall) counter = Math.max(last.counter, r.counter) + 1;
  else if (wall === last.wall) counter = last.counter + 1;
  else if (wall === r.wall) counter = r.counter + 1;
  return { wall, counter, device: last.device };
}

/** The seed stamp sorts below any real edit. */
export const SEED_HLC = format({ wall: 0, counter: 0, device: "seed" });
