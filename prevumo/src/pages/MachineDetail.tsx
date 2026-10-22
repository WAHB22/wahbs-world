import { useState, type ReactNode } from "react";
import { Link, Navigate, useParams } from "react-router";
import { ArrowLeft, Power, Settings2, TriangleAlert, UserPlus, Wrench } from "lucide-react";
import { closeTechRequest, logService, openOverlay, useApp } from "../store/store";
import {
  activeSession,
  anomalyLabel,
  health,
  healthTone,
  healthTrend,
  irregularReason,
  isLearning,
  openRequest,
  serviceText,
  sessionUser,
  statusLabel,
  statusOf,
  TONE_WORD,
} from "../sim/insights";
import { LEARNING_DAYS, replyBy, TECHNICIANS, TYPES } from "../sim/catalog";
import { SOURCE } from "../sim/attribution";
import { DAY, fmtClock, fmtDate, fmtSpan, fmtTime, fmtWhen, startOfDay } from "../lib/time";
import type { Machine } from "../sim/types";
import { ChartLegend, LiveChart, type Unit } from "../components/LiveChart";
import { WhoLine } from "../components/MachineCard";
import { Button, Card, Chip, Field, OutcomeChip, Segmented, StatusBadge } from "../components/ui";
import { cx, inputCls, lineFor, STROKE, TONE_CHIP } from "../components/style";
import { HealthRing, HealthTrend, LiveNumber, Trace } from "../components/visuals";
import { Nums } from "../components/Nums";
import { HelpTip } from "../components/HelpTip";
import { HELP } from "../components/help";

/** "17:00" today, "tomorrow 09:00" otherwise. */
function byText(ts: number, now: number): string {
  return startOfDay(ts) === startOfDay(now) ? fmtTime(ts) : `tomorrow ${fmtTime(ts)}`;
}

function Step({ done, current, children }: { done?: boolean; current?: boolean; children: ReactNode }) {
  return (
    <li aria-current={current ? "step" : undefined} className={cx("flex gap-2", done || current ? "text-ink" : "text-muted")}>
      <span aria-hidden className={cx("mt-[7px] size-2 shrink-0 rounded-full", done ? "bg-green" : current ? "border-2 border-green" : "border border-idle-mark")} />
      <span>{children}</span>
    </li>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cx("flex justify-between gap-3", strong && "border-t border-border pt-1.5 font-semibold")}>
      <dt className={strong ? "text-ink" : "text-muted"}>{label}</dt>
      <dd className="num text-ink">{value}</dd>
    </div>
  );
}

function LogService({ m }: { m: Machine }) {
  const { world } = useApp();
  const [open, setOpen] = useState(false);
  const [tech, setTech] = useState(() => world.techRequests.filter((r) => r.machineId === m.id).at(-1)?.techId ?? "");
  const [note, setNote] = useState("");
  return (
    <div className="mt-4">
      {!open && (
        <Button size="sm" onClick={() => setOpen(true)}>
          <Wrench className="size-4" /> Log a service
        </Button>
      )}
      <div className="collapse-y" data-open={open}>
        <div>
          <form
            inert={!open}
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              logService(m.id, tech || undefined, note);
              setNote("");
              setOpen(false);
            }}
          >
            <Field label="Done by" htmlFor="sv-tech">
              <select id="sv-tech" value={tech} onChange={(e) => setTech(e.target.value)} className={inputCls}>
                <option value="">Our own staff</option>
                {TECHNICIANS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="What was done (optional)" htmlFor="sv-note">
              <input id="sv-note" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" type="submit" variant="primary">
                Save service
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
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
  const urgent = status === "irregular" || status === "critical";
  const s = activeSession(world, m.id);
  const who = s ? sessionUser(world, s) : undefined;
  const samples = live[m.id] ?? [];
  const kw = m.power === "on" ? (samples.at(-1)?.kw ?? 0) : 0;
  const learning = isLearning(m, now);
  const h = health(world, m, now);
  const tone = healthTone(h.score);
  const trend = learning ? [] : healthTrend(world, m, now);
  const alert = m.activeAlertId ? world.events.find((e) => e.id === m.activeAlertId) : undefined;
  const req = openRequest(world, m.id);
  const reqTech = req ? TECHNICIANS.find((t) => t.id === req.techId) : undefined;
  const alertTech = TECHNICIANS.find((t) => t.id === alert?.techId);
  const sessions = world.sessions.filter((x) => x.machineId === m.id && x.start <= now).sort((a, b) => b.start - a.start);
  const shown = sessions.slice(0, more ? 40 : 8);
  const requests = world.techRequests.filter((r) => r.machineId === m.id).sort((a, b) => b.at - a.at);
  const history = [
    ...world.events.filter((e) => e.kind === "irregular" && e.machineId === m.id).map((e) => ({ at: e.at, e, sv: undefined })),
    ...world.services.filter((sv) => sv.machineId === m.id && sv.at >= now - 30 * DAY && sv.at <= now).map((sv) => ({ at: sv.at, e: undefined, sv })),
  ].sort((a, b) => b.at - a.at);
  const loc = world.locations.find((l) => l.id === m.locationId);
  const learningDay = m.learningUntil ? Math.min(LEARNING_DAYS, LEARNING_DAYS - Math.floor((m.learningUntil - now) / DAY)) : 0;
  const offFor = m.offAt ? now - m.offAt : 0;
  const line = lineFor(status);

  return (
    <main className="mx-auto max-w-[1320px] px-4 pt-6 pb-24 sm:px-6 lg:px-8 lg:pt-8">
      <Link to={`/l/${locId}`} className="inline-flex items-center gap-1.5 rounded-[8px] py-1 text-[14px] text-muted transition-colors hover:text-ink">
        <ArrowLeft className="size-4" /> {loc?.name}
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[30px] font-semibold sm:text-[38px]">{m.name}</h1>
            <StatusBadge status={status} label={statusLabel(world, m, now)} still={status === "irregular" && !!alert?.outcome} />
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
          {m.power === "on" && !spec.alwaysOn ? (
            <Button
              variant={urgent ? "danger" : "quietDanger"}
              className={urgent ? undefined : "ring-1 ring-rust/30 ring-inset"}
              onClick={() => openOverlay({ type: "shutdown", machineId: m.id })}
            >
              <Power className="size-4" /> Shut down
            </Button>
          ) : (
            <span className="inline-flex h-10 items-center gap-2 rounded-[var(--radius-btn)] border border-dashed border-idle-mark px-4 text-sm text-muted">
              <Power className="size-4" /> {m.power === "stopping" ? "Shutting down" : spec.alwaysOn ? "Always on, never shut down remotely" : "Already off"}
            </span>
          )}
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

      {alert && !alert.outcome && (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-[12px] border border-rust/30 bg-orange-tint px-4 py-3">
          <TriangleAlert className="size-5 shrink-0 text-rust" />
          <p className="min-w-0 flex-1 text-[14px]">
            <span className="font-semibold">Looks irregular. </span>
            <Nums text={irregularReason(alert, now)} />
          </p>
          <Button size="sm" variant="danger" onClick={() => openOverlay({ type: "alert", eventId: alert.id })}>
            Review
          </Button>
        </div>
      )}
      {alert?.outcome === "technician" && !req && (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-[12px] border border-border bg-surface px-4 py-3">
          <Wrench className="size-5 shrink-0 text-ink" />
          <p className="min-w-0 flex-1 text-[14px]">
            <span className="font-semibold">
              Technician requested{alertTech ? ` from ${alertTech.name}` : ""} at <span className="num">{fmtTime(alert.outcomeAt!)}</span>.
            </span>{" "}
            <span className="text-muted">Still outside its normal range. Shut it down if it gets worse.</span>
          </p>
        </div>
      )}
      {req && reqTech && (
        <section aria-label="Technician request" className="mt-5 grid gap-4 rounded-[12px] border border-border bg-surface p-4 sm:grid-cols-[minmax(0,1fr)_260px] sm:p-5">
          <div>
            <p className="flex items-center gap-2 text-[15px] font-semibold">
              <Wrench className="size-4 text-green" /> Technician requested from {reqTech.name}
            </p>
            {status === "irregular" && <p className="mt-1 text-[14px] text-muted">Still outside its normal range. Shut it down if it gets worse.</p>}
            <ol className="mt-3 grid gap-1.5 text-[14px]">
              <Step done>
                Sent <span className="tnum">{fmtWhen(req.at, now)}</span> with machine history
              </Step>
              <Step current>
                Waiting for their reply, typically by <span className="tnum">{byText(replyBy(reqTech, req.at), now)}</span>
              </Step>
              <Step>Visit done: mark it here and the service date resets</Step>
            </ol>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="primary" onClick={() => closeTechRequest(req.id, "done")}>
                Mark visit done
              </Button>
              <Button size="sm" variant="ghost" onClick={() => closeTechRequest(req.id, "cancelled")}>
                Cancel request
              </Button>
            </div>
          </div>
          {req.snapshot && req.snapshot.length > 2 && (
            <figure>
              <Trace samples={req.snapshot} height={60} />
              <figcaption className="mt-1 text-[13px] text-muted">Sent with the request</figcaption>
            </figure>
          )}
        </section>
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
          <div className="mt-3 mb-1 flex items-center gap-2">
            <ChartLegend showBand={!learning} stroke={line} />
            <HelpTip label="the normal range" align="right">
              {learning ? HELP.learning : HELP.band}
            </HelpTip>
          </div>
          <div className="relative">
            <LiveChart samples={samples} unit={unit} volts={spec.volts} showBand={!learning} height={320} stroke={line} since={alert && !alert.outcome ? alert.at : undefined} />
            {m.power === "off" && offFor > 9 * 60_000 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="rounded-full border border-border bg-surface px-4 py-2 text-[14px] text-muted">
                  Off since <span className="tnum text-ink">{fmtWhen(m.offAt!, now)}</span>
                </p>
              </div>
            )}
          </div>
        </Card>

        <div className="order-first grid gap-4 sm:grid-cols-2 lg:order-none lg:grid-cols-1">
          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-1 text-[17px] font-semibold">
                Health
                <HelpTip label="the health score">{learning ? HELP.learning : HELP.health}</HelpTip>
              </h2>
              {!learning && <span className={cx("inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium", TONE_CHIP[tone])}>{TONE_WORD[tone]}</span>}
            </div>
            <div className="mt-3 flex items-center gap-5">
              <HealthRing score={learning ? 0 : h.score} color={STROKE[tone]} size={108} label={learning ? "Not scored yet" : `Health ${h.score} of 100, ${TONE_WORD[tone]}`} />
              <div className="min-w-0 flex-1 space-y-1 text-[14px]">
                {learning ? (
                  <p className="text-muted">Score available after {LEARNING_DAYS} days of learning.</p>
                ) : (
                  <>
                    <p className={cx("text-[15px] font-semibold", h.dueInDays <= 7 ? "text-rust" : "text-ink")}>{serviceText(h)}</p>
                    <p className="text-muted">
                      Last service <span className="tnum text-ink">{fmtDate(m.lastServiceAt)}</span>
                    </p>
                    <p className="text-muted">
                      <span className="tnum text-ink">{h.hours30.toFixed(1)} h</span> of use in 30 days
                    </p>
                  </>
                )}
              </div>
            </div>
            {!learning && (
              <>
                <dl className="mt-4 space-y-1.5 border-t border-border pt-3 text-[13px]">
                  <Row label="Starting score" value="100" />
                  {h.drivers.map((d) => (
                    <Row key={d.label} label={d.label} value={d.points ? `−${d.points}` : "0"} />
                  ))}
                  <Row label="Health now" value={String(h.score)} strong />
                </dl>
                <p className="mt-2 text-[13px] text-muted">Each irregularity also brings the service date 6 days closer. Logging a service clears both.</p>
              </>
            )}
            <LogService key={m.id} m={m} />
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
                <p className="text-[13px] text-muted">
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
            <p className="text-[13px] text-muted">What the box flagged, what you decided, and services</p>
          </div>
          {trend.length > 1 && (
            <div className="border-t border-border px-5 pt-3 pb-2">
              <p className="mb-1 text-[13px] text-muted">Health, last 30 days. Orange dots are irregularities, green lines are services.</p>
              <HealthTrend points={trend} />
            </div>
          )}
          {history.length ? (
            <ul className="divide-y divide-border border-t border-border">
              {history.map(({ e, sv }) =>
                e ? (
                  <li key={e.id} className="flex items-center gap-3 px-5 py-3">
                    <span aria-hidden className={cx("size-2 shrink-0 rounded-full bg-orange", !e.outcome && "pulse-dot")} />
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-medium">
                        {anomalyLabel(e)} <span className="tnum font-normal text-muted">· {fmtWhen(e.at, now)}</span>
                      </p>
                      <p className="truncate text-[13px] text-muted">
                        <Nums text={irregularReason(e, now)} />
                      </p>
                    </div>
                    <OutcomeChip outcome={e.outcome} />
                  </li>
                ) : sv ? (
                  <li key={sv.id} className="flex items-center gap-3 bg-green-tint/40 px-5 py-2.5 text-[14px]">
                    <Wrench aria-hidden className="size-3.5 shrink-0 text-green" />
                    <p className="min-w-0 flex-1">
                      <span className="font-medium">Serviced</span> <span className="tnum text-muted">{fmtWhen(sv.at, now)}</span>
                      <span className="text-muted">
                        {" "}
                        by {TECHNICIANS.find((t) => t.id === sv.techId)?.name ?? "own staff"}
                        {sv.note ? `. ${sv.note}` : ""}
                      </span>
                    </p>
                  </li>
                ) : null,
              )}
            </ul>
          ) : (
            <p className="border-t border-border px-5 py-6 text-[14px] text-muted">{learning ? "Alerts start once its normal pattern is learned." : "Nothing irregular so far."}</p>
          )}
          {requests.length > 0 && (
            <div className="border-t border-border bg-bg/50 px-5 py-3">
              <p className="text-[13px] font-medium">Technician requests</p>
              {requests.map((r) => (
                <p key={r.id} className="text-[13px] text-muted">
                  {TECHNICIANS.find((t) => t.id === r.techId)?.name} · <span className="tnum">{fmtWhen(r.at, now)}</span> · {r.status ?? "open"}
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
            <table className="w-full min-w-[460px] text-[14px]">
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
                        {u.kind !== "unassigned" && <span className="ml-1.5 text-[12px] font-normal text-muted">{SOURCE[u.kind]}</span>}
                      </td>
                      <td className="tnum px-3 py-2.5 text-muted">{fmtWhen(x.start, now)}</td>
                      <td className="tnum px-3 py-2.5 text-right">{x.end ? fmtSpan(x.end - x.start) : <span className="text-green">running</span>}</td>
                      <td className="tnum px-5 py-2.5 text-right">{x.kwh.toFixed(2)}</td>
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
