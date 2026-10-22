import { Link } from "react-router";
import { useApp } from "../store/store";
import { sessionUser, statusOf } from "../sim/insights";
import { windowOn } from "../sim/attribution";
import { isAlwaysOn } from "../sim/seed";
import { atTime, fmtTime, HOUR, startOfDay } from "../lib/time";
import { cx, RAIL } from "./style";

/**
 * What actually happened on the floor today: every session per machine on one time axis,
 * with irregularities in orange and shutdowns in rust. The answer booking software can't give.
 */
export function TodayTimeline({ locId }: { locId: string }) {
  const { world, now } = useApp();
  const day = startOfDay(now);
  const machines = world.machines.filter((m) => m.locationId === locId && !isAlwaysOn(m));
  const sessions = world.sessions.filter((s) => (s.end ?? now) > day && s.start < now && machines.some((m) => m.id === s.machineId));
  const first = Math.min(atTime(now, "07:00"), ...sessions.map((s) => Math.max(day, s.start)));
  const from = Math.floor(first / HOUR) * HOUR;
  const to = Math.max(atTime(now, world.settings.dailyShutdown.time), Math.ceil((now + HOUR / 2) / HOUR) * HOUR);
  const x = (t: number) => `${(((Math.min(Math.max(t, from), to) - from) / (to - from)) * 100).toFixed(3)}%`;
  const w = (a: number, b: number) => `${((Math.max(0, Math.min(b, to) - Math.max(a, from)) / (to - from)) * 100).toFixed(3)}%`;
  const hours: number[] = [];
  for (let t = from; t <= to; t += HOUR) hours.push(t);
  const step = hours.length > 12 ? 2 : 1;
  const events = world.events.filter((e) => e.at >= day && e.at <= now && e.machineId);
  const booked = world.assignments.filter((a) => a.removedAt === undefined || a.removedAt > now);

  return (
    <section aria-labelledby="today" className="mt-10">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="today" className="text-[20px] font-semibold">
          Today on the floor
        </h2>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-4 rounded-[3px] border border-dashed border-ink/50" /> Booked
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-2 w-4 rounded-sm bg-green-done" /> What really ran
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2 rounded-full border border-rust bg-orange" /> Irregularity
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-[3px] rounded-sm bg-rust" /> Shut down
          </span>
        </p>
      </div>
      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-border bg-surface">
        <div className="min-w-[680px] px-4 pt-3 pb-2 sm:px-5">
          <div className="relative ml-[128px] h-5 text-[11px] text-muted">
            {hours.map((t, i) =>
              i % step === 0 && Math.abs(t - now) > 0.6 * HOUR * step ? (
                <span key={t} className="num absolute -translate-x-1/2" style={{ left: x(t) }}>
                  {fmtTime(t)}
                </span>
              ) : null,
            )}
            <span className="num absolute -translate-x-1/2 rounded-full bg-ink px-1.5 leading-[18px] text-white" style={{ left: x(now) }}>
              {fmtTime(now)}
            </span>
          </div>
          <div className="relative">
            <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 left-[128px]">
              {hours.map((t) => (
                <span key={t} className="absolute inset-y-0 w-px bg-border/70" style={{ left: x(t) }} />
              ))}
              <span
                className="absolute inset-y-0 right-0"
                style={{ left: x(now), backgroundImage: "repeating-linear-gradient(135deg, var(--color-border) 0 1px, transparent 1px 7px)" }}
              />
              <span className="absolute -top-1 bottom-0 w-px bg-ink" style={{ left: x(now) }}>
                <span className="absolute -top-1 -left-[3px] size-[7px] rounded-full bg-ink" />
              </span>
            </div>
            {machines.map((m) => {
              const mine = sessions.filter((s) => s.machineId === m.id);
              const marks = events.filter((e) => e.machineId === m.id);
              const st = statusOf(world, m);
              return (
                <Link
                  key={m.id}
                  to={`/l/${locId}/m/${m.id}`}
                  className="group relative flex h-7 items-center rounded-[6px] transition-colors hover:bg-bg/70"
                >
                  <span className={cx("w-[128px] shrink-0 truncate pr-3 text-[13px]", mine.length ? "text-ink" : "text-muted")}>{m.name}</span>
                  <span className="relative h-full flex-1">
                    {booked.map((a) => {
                      const win = a.machineIds.includes(m.id) ? windowOn(a.frame, now) : null;
                      return win ? (
                        <span
                          key={a.id}
                          title={`Booked for ${a.name}, ${fmtTime(win.start)} to ${fmtTime(win.end)}`}
                          className="absolute top-1/2 h-5 -translate-y-1/2 rounded-[4px] border border-dashed border-ink/50"
                          style={{ left: x(win.start), width: w(win.start, win.end) }}
                        />
                      ) : null;
                    })}
                    {mine.map((s) => {
                      const running = s.end === undefined;
                      const who = sessionUser(world, s);
                      return (
                        <span
                          key={s.id}
                          title={`${who.label} · ${fmtTime(s.start)} to ${running ? "now" : fmtTime(s.end!)} · ${s.kwh.toFixed(2)} kWh`}
                          className={cx("absolute top-1/2 h-3 -translate-y-1/2 rounded-[3px]", running ? RAIL[st] : "bg-green-done")}
                          style={{ left: x(s.start), width: w(s.start, s.end ?? now), minWidth: 3 }}
                        />
                      );
                    })}
                    {marks.map((e) =>
                      e.kind === "irregular" ? (
                        <span
                          key={e.id}
                          title={`Irregularity at ${fmtTime(e.at)}`}
                          className={cx("absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-rust bg-orange", !e.outcome && "pulse-dot")}
                          style={{ left: x(e.at) }}
                        />
                      ) : e.outcome === "shutdown" || e.outcome === "auto-off" ? (
                        <span
                          key={e.id}
                          title={`Shut down at ${fmtTime(e.outcomeAt ?? e.at)}`}
                          className="absolute top-1/2 h-4 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-sm bg-rust"
                          style={{ left: x(e.outcomeAt ?? e.at) }}
                        />
                      ) : null,
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
