import { useState } from "react";
import { Navigate, useParams } from "react-router";
import { UserPlus } from "lucide-react";
import { openOverlay, useApp } from "../store/store";
import { isInUse } from "../sim/insights";
import { isAlwaysOn } from "../sim/seed";
import { startOfDay } from "../lib/time";
import { AlwaysOnCard, InUseCard, OffCard } from "../components/MachineCard";
import { TodayTimeline } from "../components/TodayTimeline";
import { Button, Switch } from "../components/ui";

export function LocationHome() {
  const { locId = "" } = useParams();
  const { world, live, now } = useApp();
  const [showAll, setShowAll] = useState(false);
  const loc = world.locations.find((l) => l.id === locId);
  if (!loc) return <Navigate to="/locations" replace />;

  const machines = world.machines.filter((m) => m.locationId === locId);
  const inUse = machines.filter(isInUse);
  const alwaysOn = machines.filter(isAlwaysOn);
  const rest = machines.filter((m) => !isInUse(m) && !isAlwaysOn(m));
  const kw = machines.reduce((a, m) => a + (m.power === "on" ? (live[m.id]?.at(-1)?.kw ?? 0) : 0), 0);
  const today = startOfDay(now);
  const kwh = world.sessions
    .filter((s) => machines.some((m) => m.id === s.machineId) && (s.end ?? now) > today)
    .reduce((a, s) => {
      const end = s.end ?? now;
      return a + (s.kwh * (end - Math.max(s.start, today))) / Math.max(1, end - s.start);
    }, 0);

  return (
    <main className="mx-auto max-w-[1320px] px-4 pt-7 pb-24 sm:px-6 lg:px-8 lg:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <h1 className="text-[30px] font-semibold sm:text-[38px]">{loc.name}</h1>
          <p className="mt-1 text-[14.5px] text-muted">
            {machines.length} machines · watched live, one reading per second
          </p>
        </div>
        <dl className="flex gap-8">
          <div>
            <dt className="text-[12.5px] text-muted">In use</dt>
            <dd className="num text-[26px] leading-tight">{inUse.length}</dd>
          </div>
          <div>
            <dt className="text-[12.5px] text-muted">Drawing now</dt>
            <dd className="num text-[26px] leading-tight">
              {kw.toFixed(2)} <span className="text-[13px] text-muted">kW</span>
            </dd>
          </div>
          <div>
            <dt className="text-[12.5px] text-muted">Used today</dt>
            <dd className="num text-[26px] leading-tight">
              {kwh.toFixed(1)} <span className="text-[13px] text-muted">kWh</span>
            </dd>
          </div>
        </dl>
      </div>

      <section aria-labelledby="in-use" className="mt-9">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="in-use" className="flex items-center gap-2.5 text-[20px] font-semibold">
            In use
            <span className="num inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-ink px-1.5 text-[12px] font-medium text-white">
              {inUse.length}
            </span>
            {inUse.length > 0 && <span aria-hidden className="live-blink size-1.5 rounded-full bg-green" />}
          </h2>
          <Button size="sm" variant="ghost" onClick={() => openOverlay({ type: "assign" })}>
            <UserPlus className="size-4" /> Assign user
          </Button>
        </div>
        {inUse.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {inUse.map((m) => (
              <InUseCard key={m.id} m={m} locId={locId} />
            ))}
          </div>
        ) : (
          <div className="rounded-[var(--radius-card)] border border-dashed border-border px-6 py-10 text-center">
            <p className="font-display text-[18px] font-semibold">Nothing is running right now</p>
            <p className="mt-1 text-[14px] text-muted">A machine shows up here the moment someone types their PIN on its box.</p>
          </div>
        )}
      </section>

      {alwaysOn.length > 0 && (
        <section aria-labelledby="always-on" className="mt-8">
          <h2 id="always-on" className="mb-3 text-[16px] font-semibold">
            Always on
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {alwaysOn.map((m) => (
              <AlwaysOnCard key={m.id} m={m} locId={locId} />
            ))}
          </div>
        </section>
      )}

      <TodayTimeline locId={locId} />

      <section aria-labelledby="all" className="mt-8">
        <div className="flex items-center justify-between gap-3 border-t border-border pt-5">
          <label htmlFor="show-all" id="all" className="cursor-pointer text-[16px] font-semibold">
            Show all machines <span className="num font-normal text-muted">({rest.length} off)</span>
          </label>
          <Switch id="show-all" checked={showAll} onChange={setShowAll} label="Show all machines" />
        </div>
        <div className="collapse-y" data-open={showAll}>
          <div>
            <div className="grid gap-2.5 pt-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" inert={!showAll}>
              {rest.map((m) => (
                <OffCard key={m.id} m={m} locId={locId} morph={showAll} />
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
