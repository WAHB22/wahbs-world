import { Power, ShieldCheck, Wrench } from "lucide-react";
import { closeOverlay, markOk, openOverlay, useApp } from "../../store/store";
import { activeSession, health, irregularReason, OUTCOME_LABEL, ordinal, sessionUser } from "../../sim/insights";
import { TYPES } from "../../sim/catalog";
import { fmtTime } from "../../lib/time";
import { CloseButton, Dialog } from "../Dialog";
import { ChartLegend, LiveChart } from "../LiveChart";
import { Button, StatusBadge } from "../ui";
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

  return (
    <Dialog open={open} onClose={closeOverlay} label={`${m.name} looks irregular`}>
      <div className="border-b border-border px-5 pt-5 pb-4 sm:px-7 sm:pt-6">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={e.outcome ? "normal" : "irregular"} label={e.outcome ? OUTCOME_LABEL[e.outcome] : "Irregular"} />
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
          <ChartLegend showBand />
        </div>
        <LiveChart samples={live[m.id] ?? []} unit="kw" volts={TYPES[m.type].volts} showBand height={230} />
        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 rounded-[12px] bg-bg/70 px-4 py-3 text-[13px] sm:grid-cols-4">
          <div>
            <dt className="text-muted">In use by</dt>
            <dd className="font-medium">{who?.label ?? "Nobody"}</dd>
          </div>
          <div>
            <dt className="text-muted">Session since</dt>
            <dd className="num font-medium">{s ? fmtTime(s.start) : "Not running"}</dd>
          </div>
          <div>
            <dt className="text-muted">Health</dt>
            <dd className="num font-medium">{h.score} of 100</dd>
          </div>
          <div>
            <dt className="text-muted">Started</dt>
            <dd className="num font-medium">{fmtTime(e.at)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-[14px] text-ink">
          <span className="font-semibold">{ordinal(h.irregularMonth)} irregularity this month</span>
          <span className="text-muted"> · last service {h.daysSinceService} days ago</span>
        </p>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-2 border-t border-border bg-bg/40 px-5 py-4 sm:flex-row sm:items-center sm:px-7">
        {e.outcome ? (
          <>
            <p className="flex-1 text-[13px] text-muted">Decision logged: {OUTCOME_LABEL[e.outcome]}.</p>
            <Button onClick={closeOverlay}>Close</Button>
          </>
        ) : (
          <>
            <Button variant="danger" size="lg" onClick={() => openOverlay({ type: "shutdown", machineId: m.id })}>
              <Power className="size-4" /> Shut down
            </Button>
            <Button variant="primary" size="lg" onClick={() => openOverlay({ type: "tech", machineId: m.id, eventId: e.id })}>
              <Wrench className="size-4" /> Call technician
            </Button>
            <span className="hidden flex-1 sm:block" />
            <Button variant="secondary" size="lg" onClick={() => markOk(e.id)}>
              <ShieldCheck className="size-4" /> Mark as OK
            </Button>
          </>
        )}
      </div>
    </Dialog>
  );
}
