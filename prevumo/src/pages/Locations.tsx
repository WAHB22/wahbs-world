import { Link, Navigate } from "react-router";
import { ArrowUpRight } from "lucide-react";
import { useApp } from "../store/store";
import { dueSoon, isInUse, statusOf, type Status } from "../sim/insights";
import { todayKwh } from "../sim/reports";
import { Card } from "../components/ui";
import { cx, RAIL } from "../components/style";
import { LiveNumber } from "../components/visuals";

const TILE: Record<Status, string> = {
  normal: "bg-green-tint text-ink",
  irregular: "bg-orange-tint text-ink",
  critical: "bg-rust text-white",
  idle: "bg-idle text-ink",
  off: "border border-border text-muted",
};

/** One full-width row per location, naming every machine in its status colour. */
export function Locations() {
  const { world, live, now } = useApp();
  if (world.locations.length === 1) return <Navigate to={`/l/${world.locations[0].id}`} replace />;

  return (
    <main className="mx-auto max-w-[1320px] px-4 pt-8 pb-16 sm:px-6 lg:px-8 lg:pt-12">
      <h1 className="text-[30px] font-semibold sm:text-[38px]">Your locations</h1>
      <p className="mt-1 text-[15px] text-muted">uOttawa Engineering · {world.machines.length} machines with a PREVUMO box</p>

      <div className="mt-8 grid gap-3">
        {world.locations.map((l) => {
          const ms = world.machines.filter((m) => m.locationId === l.id);
          const inUse = ms.filter(isInUse).length;
          const alerts = world.events.filter((e) => e.kind === "irregular" && !e.outcome && e.locationId === l.id).length;
          const kw = ms.reduce((a, m) => a + (m.power === "on" ? (live[m.id]?.at(-1)?.kw ?? 0) : 0), 0);
          const kwh = todayKwh(world, l.id, now);
          const dueWeek = dueSoon(world, ms, now).filter((x) => x.h.dueInDays <= 7);
          const overdue = dueWeek.filter((x) => x.h.dueInDays < 0).length;
          const soon = dueWeek.length - overdue;
          const serviceLabel = [overdue && `${overdue} overdue`, soon && `${soon} due this week`].filter(Boolean).join(", ");
          return (
            <Link key={l.id} to={`/l/${l.id}`} className="group block rounded-[var(--radius-card)]">
              <Card rail={alerts ? "irregular" : inUse ? "normal" : "off"} className="transition-colors duration-200 group-hover:border-idle-mark">
                <div className="grid gap-5 p-5 sm:p-6 lg:grid-cols-[250px_minmax(0,1fr)_auto] lg:items-center lg:gap-8">
                  <div>
                    <h2 className="text-[22px] font-semibold">{l.name}</h2>
                    <p className="text-[14px] text-muted">{ms.length} machines</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
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
                      {serviceLabel && (
                        <span className="inline-flex h-6 items-center rounded-full bg-orange-tint px-2.5 text-xs font-medium">Service: {serviceLabel}</span>
                      )}
                    </div>
                  </div>
                  <ul aria-label={`Machines in ${l.name}`} className="flex flex-wrap gap-1.5">
                    {ms.map((m) => {
                      const st = statusOf(world, m);
                      return (
                        <li key={m.id} className={cx("inline-flex h-7 items-center gap-1.5 rounded-[6px] px-2 text-[13px]", TILE[st])}>
                          <span aria-hidden className={cx("h-3 w-1 rounded-full", st === "off" ? "border border-idle-mark" : RAIL[st])} />
                          {m.name}
                        </li>
                      );
                    })}
                  </ul>
                  <div className="flex items-end justify-between gap-8 border-t border-border pt-4 lg:border-0 lg:pt-0">
                    <dl className="flex gap-8">
                      <div>
                        <dt className="text-[13px] text-muted">Drawing now</dt>
                        <dd className="text-[24px] leading-tight">
                          <LiveNumber value={kw} /> <span className="num text-[12px] text-muted">kW</span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[13px] text-muted">Used today</dt>
                        <dd className="num text-[24px] leading-tight">
                          {kwh.toFixed(1)} <span className="text-[12px] text-muted">kWh</span>
                        </dd>
                      </div>
                    </dl>
                    <ArrowUpRight className="mb-1 size-5 text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-ink" />
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
