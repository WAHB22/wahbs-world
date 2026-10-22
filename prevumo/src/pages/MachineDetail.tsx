import { useState } from "react";
import { Link, Navigate, useParams } from "react-router";
import { ArrowLeft, Power, Settings2, TriangleAlert, UserPlus, Wrench } from "lucide-react";
import { openOverlay, useApp } from "../store/store";
import {
  activeSession,
  anomalyLabel,
  health,
  healthTone,
  irregularReason,
  isLearning,
  OUTCOME_LABEL,
  serviceText,
  sessionUser,
  statusOf,
} from "../sim/insights";
import { LEARNING_DAYS, TECHNICIANS, TYPES } from "../sim/catalog";
import { DAY, fmtClock, fmtSpan, fmtTime, fmtWhen } from "../lib/time";
import { ChartLegend, LiveChart, type Unit } from "../components/LiveChart";
import { WhoLine } from "../components/MachineCard";
import { Button, Card, Chip, Segmented, StatusBadge } from "../components/ui";
import { cx, STROKE } from "../components/style";
import { HealthRing, LiveNumber } from "../components/visuals";
import { Nums } from "../components/Nums";

const OUTCOME_TONE: Record<string, string> = {
  shutdown: "bg-rust text-white",
  technician: "bg-orange-tint text-ink",
  ok: "bg-green-tint text-ink",
  "kept-on": "bg-idle text-ink",
  "auto-off": "bg-idle text-ink",
};

export function OutcomeChip({ outcome }: { outcome?: string }) {
  if (!outcome)
    return (
      <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-orange-tint px-2.5 text-xs font-medium whitespace-nowrap text-ink">
        <span aria-hidden className="pulse-dot size-1.5 rounded-full bg-orange" />
        Awaiting decision
      </span>
    );
  return (
    <span className={cx("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium whitespace-nowrap", OUTCOME_TONE[outcome] ?? "bg-idle text-ink")}>
      {OUTCOME_LABEL[outcome as keyof typeof OUTCOME_LABEL]}
    </span>
  );
}

export function MachineDetail() {
  const { locId = "", machineId = "" } = useParams();
  const { world, live, now } = useApp();
  const [unit, setUnit] = useState<Unit>("kw");
  const [more, setMore] = useState(false);
  const m = world.machines.find((x) => x.id === machineId);
  if (!m) return <Navigate to={`/l/${locId}`} replace />;

  const spec = TYPES[m.type];
  const status = statusOf(world, m);
  const s = activeSession(world, m.id);
  const who = s ? sessionUser(world, s) : undefined;
  const samples = live[m.id] ?? [];
  const kw = m.power === "on" ? (samples.at(-1)?.kw ?? 0) : 0;
  const learning = isLearning(m, now);
  const h = health(world, m, now);
  const tone = healthTone(h.score);
  const alert = m.activeAlertId ? world.events.find((e) => e.id === m.activeAlertId) : undefined;
  const irregular = world.events.filter((e) => e.kind === "irregular" && e.machineId === m.id).sort((a, b) => b.at - a.at);
  const sessions = world.sessions.filter((x) => x.machineId === m.id).sort((a, b) => b.start - a.start);
  const shown = sessions.slice(0, more ? 40 : 8);
  const requests = world.techRequests.filter((r) => r.machineId === m.id).sort((a, b) => b.at - a.at);
  const loc = world.locations.find((l) => l.id === m.locationId);
  const learningDay = m.learningUntil ? Math.min(LEARNING_DAYS, LEARNING_DAYS - Math.floor((m.learningUntil - now) / DAY)) : 0;
  const offFor = m.offAt ? now - m.offAt : 0;

  return (
    <main className="mx-auto max-w-[1320px] px-4 pt-6 pb-24 sm:px-6 lg:px-8 lg:pt-8">
      <Link to={`/l/${locId}`} className="inline-flex items-center gap-1.5 rounded-[8px] py-1 text-[14px] text-muted transition-colors hover:text-ink">
        <ArrowLeft className="size-4" /> {loc?.name}
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[32px] font-semibold sm:text-[40px]">{m.name}</h1>
            <StatusBadge status={status} label={learning && status === "normal" ? "Learning" : undefined} />
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip>{spec.label}</Chip>
            <Chip>
              <span className="num">{m.ratedKw.toFixed(2)} kW</span> rated
            </Chip>
            {m.neverAutoOff && <Chip>Never auto shut off</Chip>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="danger" disabled={m.power !== "on" || spec.alwaysOn} title={m.power !== "on" ? "Already off" : undefined} onClick={() => openOverlay({ type: "shutdown", machineId: m.id })}>
            <Power className="size-4" /> Shut down
          </Button>
          <Button onClick={() => openOverlay({ type: "tech", machineId: m.id, eventId: alert && !alert.outcome ? alert.id : undefined })}>
            <Wrench className="size-4" /> Call technician
          </Button>
          <Button onClick={() => openOverlay({ type: "assign", machineIds: [m.id] })}>
            <UserPlus className="size-4" /> Assign user
          </Button>
          <Button variant="ghost" onClick={() => openOverlay({ type: "machine", machineId: m.id })} aria-label="Machine settings">
            <Settings2 className="size-4" /> <span className="sm:hidden lg:inline">Machine settings</span>
          </Button>
        </div>
      </div>

      {alert && (
        <div className={cx("mt-5 flex flex-wrap items-center gap-3 rounded-[12px] border px-4 py-3", alert.outcome ? "border-orange/50 bg-orange-tint/50" : "border-rust/30 bg-orange-tint")}>
          <TriangleAlert className="size-5 shrink-0 text-rust" />
          <p className="min-w-0 flex-1 text-[14px]">
            <span className="font-semibold">{alert.outcome === "technician" ? "Technician requested. " : "Looks irregular. "}</span>
            <Nums text={irregularReason(alert, now)} />
          </p>
          {!alert.outcome && (
            <Button size="sm" variant="danger" onClick={() => openOverlay({ type: "alert", eventId: alert.id })}>
              Review
            </Button>
          )}
        </div>
      )}
      {learning && (
        <div className="mt-5 rounded-[12px] border border-border bg-surface px-4 py-3 text-[14px]">
          <span className="font-semibold">Learning its normal pattern · day {Math.max(1, learningDay)} of {LEARNING_DAYS}.</span>{" "}
          <span className="text-muted">The normal range and irregularity alerts switch on once the pattern is learned.</span>
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-semibold">Live {unit === "kw" ? "power" : "current"}</h2>
              <p className="text-[13px] text-muted">Last 10 minutes, one reading per second, in {unit === "kw" ? "kW" : "amps"}</p>
            </div>
            <div className="flex items-center gap-4">
              <p className="text-right leading-none">
                <LiveNumber value={unit === "kw" ? kw : (kw * 1000) / spec.volts} digits={unit === "kw" ? 2 : 1} className="text-[30px]" />
                <span className="num ml-1 text-[13px] text-muted">{unit === "kw" ? "kW" : "A"}</span>
              </p>
              <Segmented
                label="Unit"
                value={unit}
                onChange={setUnit}
                options={[
                  { value: "kw", label: "kW" },
                  { value: "a", label: "Amps" },
                ]}
              />
            </div>
          </div>
          <div className="mt-3 mb-1">
            <ChartLegend showBand={!learning} />
          </div>
          <div className="relative">
            <LiveChart samples={samples} unit={unit} volts={spec.volts} showBand={!learning} height={300} stroke={status === "irregular" ? "var(--color-ink)" : STROKE[status === "off" || status === "critical" ? "off" : "normal"]} />
            {m.power === "off" && offFor > 9 * 60_000 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="rounded-full border border-border bg-surface px-4 py-2 text-[14px] text-muted">
                  Off since <span className="num text-ink">{fmtWhen(m.offAt!, now)}</span>
                </p>
              </div>
            )}
          </div>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <Card className="p-5">
            <h2 className="text-[17px] font-semibold">Health</h2>
            <div className="mt-3 flex items-center gap-5">
              <HealthRing score={learning ? 0 : h.score} color={STROKE[tone]} size={116} />
              <div className="min-w-0 flex-1 space-y-1.5 text-[13.5px]">
                {learning ? (
                  <p className="text-muted">Score available after {LEARNING_DAYS} days of learning.</p>
                ) : (
                  <p className={cx("font-semibold", h.dueInDays <= 3 ? "text-rust" : "text-ink")}>{serviceText(h)}</p>
                )}
                <p className="text-muted">
                  Last service <span className="num text-ink">{h.daysSinceService} days</span> ago
                </p>
                <p className="text-muted">
                  <span className="num text-ink">{h.irregular30}</span> irregularities in 30 days
                </p>
                <p className="text-muted">
                  <span className="num text-ink">{h.hours30.toFixed(1)} h</span> of use in 30 days
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-[17px] font-semibold">Current session</h2>
            {s ? (
              <div className="mt-3 space-y-3">
                <WhoLine who={who} className="text-[15px]" />
                <dl className="grid grid-cols-3 gap-2 text-[13px]">
                  <div>
                    <dt className="text-muted">Started</dt>
                    <dd className="num text-[15px]">{fmtTime(s.start)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Running</dt>
                    <dd className="num text-[15px]">{fmtClock(now - s.start)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Energy</dt>
                    <dd className="num text-[15px]">{s.kwh.toFixed(2)} kWh</dd>
                  </div>
                </dl>
                <p className="text-[12.5px] text-muted">
                  {who?.kind === "pin"
                    ? "Started with a PIN typed on the box."
                    : who?.kind === "assigned"
                      ? "No PIN typed. Attributed to a manual assignment."
                      : "No PIN typed and no assignment covers this time."}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-[14px] text-muted">{spec.alwaysOn ? "Always on. Not tied to a session." : "Not running. The next PIN typed on its box starts a session."}</p>
            )}
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-[17px] font-semibold">Irregularity history</h2>
            <p className="text-[13px] text-muted">What the box flagged and what you decided</p>
          </div>
          {irregular.length ? (
            <ul className="divide-y divide-border border-t border-border">
              {irregular.map((e) => (
                <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                  <span aria-hidden className={cx("size-2 shrink-0 rounded-full", e.outcome ? "bg-orange/60" : "pulse-dot bg-orange")} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-medium">
                      {anomalyLabel(e)} <span className="num font-normal text-muted">· {fmtWhen(e.at, now)}</span>
                    </p>
                    <p className="truncate text-[12.5px] text-muted">
                      <Nums text={irregularReason(e, now)} />
                    </p>
                  </div>
                  <OutcomeChip outcome={e.outcome} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="border-t border-border px-5 py-6 text-[14px] text-muted">Nothing irregular so far.</p>
          )}
          {requests.length > 0 && (
            <div className="border-t border-border bg-bg/50 px-5 py-3">
              <p className="text-[13px] font-medium">Technician requests</p>
              {requests.map((r) => (
                <p key={r.id} className="text-[13px] text-muted">
                  {TECHNICIANS.find((t) => t.id === r.techId)?.name} · <span className="num">{fmtWhen(r.at, now)}</span>
                </p>
              ))}
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-[17px] font-semibold">Session history</h2>
            <p className="text-[13px] text-muted">{sessions.length} sessions in the last 30 days</p>
          </div>
          <div className="overflow-x-auto border-t border-border">
            <table className="w-full min-w-[460px] text-[13.5px]">
              <thead>
                <tr className="text-left text-[12px] text-muted">
                  <th className="px-5 py-2 font-medium">Who</th>
                  <th className="px-3 py-2 font-medium">When</th>
                  <th className="px-3 py-2 text-right font-medium">Duration</th>
                  <th className="px-5 py-2 text-right font-medium">kWh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shown.map((x) => {
                  const u = sessionUser(world, x);
                  return (
                    <tr key={x.id}>
                      <td className={cx("px-5 py-2.5", u.kind === "unassigned" ? "text-muted" : "font-medium")}>
                        {u.label}
                        {u.kind === "assigned" && <span className="ml-1.5 text-[11.5px] font-normal text-muted">assigned</span>}
                      </td>
                      <td className="num px-3 py-2.5 text-muted">{fmtWhen(x.start, now)}</td>
                      <td className="num px-3 py-2.5 text-right">{x.end ? fmtSpan(x.end - x.start) : <span className="text-green">running</span>}</td>
                      <td className="num px-5 py-2.5 text-right">{x.kwh.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {sessions.length > 8 && (
            <div className="border-t border-border px-5 py-2.5">
              <Button size="sm" variant="ghost" onClick={() => setMore((v) => !v)}>
                {more ? "Show fewer" : `Show more (${Math.min(40, sessions.length) - 8})`}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
