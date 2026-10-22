import { useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import { ChevronRight, UserPlus } from "lucide-react";
import { openOverlay, useApp } from "../store/store";
import { dueSoon, healthTone, isInUse, serviceText } from "../sim/insights";
import { todayKwh } from "../sim/reports";
import { isAlwaysOn } from "../sim/seed";
import { AlwaysOnCard, InUseCard, OffCard } from "../components/MachineCard";
import { TodayTimeline } from "../components/TodayTimeline";
import { HelpTip } from "../components/HelpTip";
import { HELP } from "../components/help";
import { Button, Switch } from "../components/ui";
import { cx, TONE_CHIP } from "../components/style";
import { LiveNumber } from "../components/visuals";

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
  const kwh = todayKwh(world, locId, now);
  const due = dueSoon(world, machines, now);

  return (
    <main className="mx-auto max-w-[1320px] px-4 pt-7 pb-24 sm:px-6 lg:px-8 lg:pt-10">
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0">
          <h1 className="text-[30px] font-semibold sm:text-[38px]">{loc.name}</h1>
          <p className="mt-1 text-[15px] text-muted">{machines.length} machines · watched live, one reading per second</p>
        </div>
        <dl className="flex gap-8">
          <div>
            <dt className="text-[13px] text-muted">Drawing now</dt>
            <dd className="text-[26px] leading-tight">
              <LiveNumber value={kw} /> <span className="num text-[13px] text-muted">kW</span>
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted">Used today</dt>
            <dd className="num text-[26px] leading-tight">
              {kwh.toFixed(1)} <span className="text-[13px] text-muted">kWh</span>
            </dd>
          </div>
        </dl>
      </div>

      <section aria-labelledby="in-use" className="mt-9">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="in-use" className="flex items-center gap-1.5 text-[20px] font-semibold">
            In use
            <span className="num ml-1 text-[15px] font-normal text-muted">
              {inUse.length} of {machines.length - alwaysOn.length}
            </span>
            <HelpTip label="who is using a machine">{HELP.who}</HelpTip>
          </h2>
          <div className="flex items-center gap-3">
            <Button size="sm" variant="ghost" onClick={() => openOverlay({ type: "assign" })}>
              <UserPlus className="size-4" /> Assign user
            </Button>
            <span aria-hidden className="h-5 w-px bg-border" />
            <label htmlFor="show-all" className="cursor-pointer text-[14px] font-medium">
              Show all machines <span className="num hidden font-normal text-muted sm:inline">({rest.length} off)</span>
            </label>
            <Switch id="show-all" checked={showAll} onChange={setShowAll} label="Show all machines" />
          </div>
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
            <p className="mt-1 text-[14px] text-muted">A machine shows up here as soon as it powers on, with who started it.</p>
          </div>
        )}
      </section>

      <section aria-label="Machines not in use" className="collapse-y" data-open={showAll}>
        <div>
          <div className="grid gap-2.5 pt-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" inert={!showAll}>
            {rest.map((m) => (
              <OffCard key={m.id} m={m} locId={locId} morph={showAll} />
            ))}
          </div>
        </div>
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

      {due.length > 0 && (
        <section aria-labelledby="due" className="mt-8">
          <h2 id="due" className="mb-3 flex flex-wrap items-center gap-x-2 text-[16px] font-semibold">
            Service coming up
            <span className="text-[13px] font-normal text-muted">with health out of 100</span>
            <HelpTip label="the health score">{HELP.health}</HelpTip>
          </h2>
          <ul className="divide-y divide-border rounded-[var(--radius-card)] border border-border bg-surface">
            {due.map(({ m, h }) => (
              <li key={m.id}>
                <Link to={`/l/${locId}/m/${m.id}`} className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-bg/60">
                  <span className={cx("num inline-flex h-7 min-w-9 items-center justify-center rounded-full px-2 text-[13px] font-medium", TONE_CHIP[healthTone(h.score)])}>
                    <span className="sr-only">Health </span>
                    {h.score}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium">{m.name}</span>
                  <span className={cx("text-[14px]", h.dueInDays <= 7 ? "font-semibold text-rust" : "text-muted")}>{serviceText(h)}</span>
                  <ChevronRight aria-hidden className="size-4 text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <TodayTimeline locId={locId} />
    </main>
  );
}
