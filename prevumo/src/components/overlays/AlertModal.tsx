import { Power, ShieldCheck, Wrench } from "lucide-react";
import { closeOverlay, markOk, openOverlay, useApp } from "../../store/store";
import { activeSession, health, irregularReason, OUTCOME_LABEL, ordinal, sessionUser, severity } from "../../sim/insights";
import { TYPES } from "../../sim/catalog";
import { fmtTime } from "../../lib/time";
import { CloseButton, Dialog } from "../Dialog";
import { LiveChart } from "../Chart";
import { ChartLegend } from "../visuals";
import { Button, OutcomeChip, StatusBadge } from "../ui";
import { lineFor } from "../style";
import { Nums } from "../Nums";

export function AlertModal({ eventId, open }: { eventId?: string; open: boolean }) {
  const { world, live, now } = useApp();
  const e = world.events.find((x) => x.id === eventId);
  const m = world.machines.find((x) => x.id === e?.machineId);
  if (!e || !m) return <Dialog open={false} onClose={closeOverlay} label="Irregularity"><div /></Dialog>;
  const s = activeSession(world, m.id);
  const who = s ? sessionUser(world, s) : undefined;
  const h = health(world, m, now);
  const loc = world.locations.find((l) => l.id === m.locationId);
  const sev = severity(e, m);
  const rated = `${m.ratedKw.toFixed(2)} kW`;
  const advice =
    sev === "critical"
      ? `Overload: above its ${rated} rating. Call a technician, and shut it down if it does not settle within a minute.`
      : who && who.kind !== "unassigned"
        ? `Within its ${rated} rating. Check with ${who.label} first, or call a technician if it happens again.`
        : `Within its ${rated} rating. Have someone look at it, or call a technician if it happens again.`;

  return (
    <Dialog open={open} onClose={closeOverlay} label={`${m.name} looks irregular`}>
      <div className="border-b border-border px-5 pt-5 pb-4 sm:px-7 sm:pt-6">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {e.outcome ? <OutcomeChip outcome={e.outcome} /> : sev === "critical" ? <StatusBadge status="critical" label="Overload" /> : <StatusBadge status="irregular" />}
              <span className="text-[13px] text-muted">
                {loc?.name} · {TYPES[m.type].label}
              </span>
            </div>
            <h2 className="mt-3 text-[26px] font-semibold sm:text-[28px]">{m.name} looks irregular</h2>
            <p className="mt-1 text-[15px] text-ink">
              <Nums text={irregularReason(e, now)} />
            </p>
          </div>
          <CloseButton onClick={closeOverlay} />
        </div>
      </div>

      <div className="px-5 pt-4 sm:px-7">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] font-medium">Last 10 minutes against its normal range, in kW</p>
          <ChartLegend showBand stroke={lineFor("normal")} />
        </div>
        <LiveChart samples={live[m.id] ?? []} unit="kw" volts={TYPES[m.type].volts} showBand height={230} stroke={lineFor("normal")} since={e.outcome ? undefined : e.at} rated={!e.outcome && sev === "critical" ? m.ratedKw : undefined} />
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 rounded-[12px] bg-bg/70 px-4 py-3 text-[13px] sm:grid-cols-4">
          <div>
            <dt className="text-muted">In use by</dt>
            <dd className="font-medium">{who?.label ?? "Nobody"}</dd>
          </div>
          <div>
            <dt className="text-muted">Session started</dt>
            <dd className="num font-medium">{s ? fmtTime(s.start) : "Not running"}</dd>
          </div>
          <div>
            <dt className="text-muted">Health</dt>
            <dd className="num font-medium">{h.score} of 100</dd>
          </div>
          <div>
            <dt className="text-muted">Flagged at</dt>
            <dd className="num font-medium">{fmtTime(e.at)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-[14px] text-ink">
          <span className="font-semibold">{ordinal(h.irregularMonth)} irregularity this month</span>
          <span className="text-muted"> · last service {h.daysSinceService} days ago</span>
        </p>
      </div>

      <div className="sticky bottom-0 mt-5 border-t border-border bg-surface px-5 py-4 sm:px-7">
        {e.outcome ? (
          <div className="flex items-center gap-3">
            <p className="flex-1 text-[13px] text-muted">Decision logged: {OUTCOME_LABEL[e.outcome]}.</p>
            <Button onClick={closeOverlay}>Close</Button>
          </div>
        ) : (
          <>
            <p className={sev === "critical" ? "mb-3 text-[14px] font-medium text-rust" : "mb-3 text-[14px] text-ink"}>
              <Nums text={advice} />
            </p>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <Button
                variant={sev === "critical" ? "danger" : "quietDanger"}
                size="lg"
                className={sev === "critical" ? undefined : "ring-1 ring-rust/40 ring-inset"}
                onClick={() => openOverlay({ type: "shutdown", machineId: m.id })}
              >
                <Power className="size-4" /> Shut down
              </Button>
              <Button variant="primary" size="lg" onClick={() => openOverlay({ type: "tech", machineId: m.id, eventId: e.id })}>
                <Wrench className="size-4" /> Call technician
              </Button>
              <span className="hidden flex-1 sm:block" />
              <Button variant="secondary" size="lg" className="col-span-2" onClick={() => markOk(e.id)}>
                <ShieldCheck className="size-4" /> Mark as OK
              </Button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
}
