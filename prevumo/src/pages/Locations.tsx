import { Link, Navigate } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { useApp } from "../store/store";
import { isInUse, statusOf } from "../sim/insights";
import { startOfDay } from "../lib/time";
import { Card } from "../components/ui";
import { cx, RAIL } from "../components/style";

export function Locations() {
  const { world, live, now } = useApp();
  if (world.locations.length === 1) return <Navigate to={`/l/${world.locations[0].id}`} replace />;
  const today = startOfDay(now);

  return (
    <main className="mx-auto max-w-[1320px] px-4 pt-8 pb-16 sm:px-6 lg:px-8 lg:pt-12">
      <h1 className="text-[32px] font-semibold sm:text-[40px]">Your locations</h1>
      <p className="mt-1 text-[15px] text-muted">uOttawa Engineering · {world.machines.length} machines with a PREVUMO box</p>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {world.locations.map((l) => {
          const ms = world.machines.filter((m) => m.locationId === l.id);
          const inUse = ms.filter(isInUse).length;
          const alerts = world.events.filter((e) => e.kind === "irregular" && !e.outcome && e.locationId === l.id).length;
          const kw = ms.reduce((a, m) => a + (m.power === "on" ? (live[m.id]?.at(-1)?.kw ?? 0) : 0), 0);
          const kwh = world.sessions
            .filter((s) => ms.some((m) => m.id === s.machineId) && (s.end ?? now) > today)
            .reduce((a, s) => {
              const end = s.end ?? now;
              return a + (s.kwh * (end - Math.max(s.start, today))) / Math.max(1, end - s.start);
            }, 0);
          return (
            <Link key={l.id} to={`/l/${l.id}`} className="group block rounded-[var(--radius-card)]">
              <Card
                rail={alerts ? "irregular" : inUse ? "normal" : "off"}
                className="h-full transition-[border-color,box-shadow,transform] duration-200 group-hover:-translate-y-0.5 group-hover:border-muted/40 group-hover:shadow-[0_12px_32px_rgb(31_61_43/0.08)]"
              >
                <div className="flex h-full flex-col gap-5 p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-[22px] font-semibold">{l.name}</h2>
                      <p className="text-[14px] text-muted">{ms.length} machines</p>
                    </div>
                    <ArrowUpRight className="size-5 text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ink" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {alerts > 0 && (
                      <span className="inline-flex h-6 items-center rounded-full bg-rust px-2.5 text-xs font-medium text-white">
                        {alerts} alert{alerts > 1 ? "s" : ""}
                      </span>
                    )}
                    {inUse > 0 ? (
                      <span className="inline-flex h-6 items-center rounded-full bg-green-tint px-2.5 text-xs font-medium">{inUse} in use</span>
                    ) : (
                      <span className="inline-flex h-6 items-center rounded-full bg-idle px-2.5 text-xs font-medium text-ink">All idle</span>
                    )}
                  </div>
                  <div aria-hidden className="flex flex-wrap gap-1">
                    {ms.map((m) => (
                      <span key={m.id} title={m.name} className={cx("h-2 w-5 rounded-full", RAIL[statusOf(world, m)])} />
                    ))}
                  </div>
                  <dl className="mt-auto grid grid-cols-2 gap-3 border-t border-border pt-4">
                    <div>
                      <dt className="text-[12.5px] text-muted">Drawing now</dt>
                      <dd className="num text-[20px]">
                        {kw.toFixed(2)} <span className="text-[12px] text-muted">kW</span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[12.5px] text-muted">Used today</dt>
                      <dd className="num text-[20px]">
                        {kwh.toFixed(1)} <span className="text-[12px] text-muted">kWh</span>
                      </dd>
                    </div>
                  </dl>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
