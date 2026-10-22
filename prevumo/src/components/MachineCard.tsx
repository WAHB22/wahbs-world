import { Link } from "react-router";
import { CalendarClock, KeyRound, Power, UserRound } from "lucide-react";
import { useApp } from "../store/store";
import { activeSession, isLearning, openRequest, sessionUser, statusLabel, statusOf } from "../sim/insights";
import { SOURCE, type Attribution } from "../sim/attribution";
import { fmtClock, fmtTime, fmtWhen } from "../lib/time";
import type { Machine } from "../sim/types";
import { Card, StatusBadge } from "./ui";
import { cx, lineFor } from "./style";
import { LiveNumber, Sparkline } from "./visuals";

export function WhoLine({ who, className }: { who?: Attribution; className?: string }) {
  if (!who) return null;
  const Icon = who.kind === "pin" ? KeyRound : who.kind === "assigned" ? CalendarClock : UserRound;
  const how = SOURCE[who.kind];
  return (
    <p className={cx("flex min-w-0 items-center gap-1.5 text-[14px]", className)}>
      <Icon className="size-3.5 shrink-0 text-muted" aria-hidden />
      <span className={cx("truncate", who.kind === "unassigned" ? "text-muted" : "font-medium text-ink")}>{who.label}</span>
      <span className={cx("shrink-0 text-muted", who.kind === "unassigned" && "hidden sm:inline")}>· {how}</span>
    </p>
  );
}

/** A running machine: who, how long, how much, and its last minute of draw. */
export function InUseCard({ m, locId }: { m: Machine; locId: string }) {
  const { world, live, now } = useApp();
  const status = statusOf(world, m);
  const s =
    activeSession(world, m.id) ??
    (m.power === "stopping" ? world.sessions.filter((x) => x.machineId === m.id && x.end !== undefined).at(-1) : undefined);
  const who = s ? sessionUser(world, s) : undefined;
  const samples = live[m.id] ?? [];
  const kw = m.power === "on" ? (samples[samples.length - 1]?.kw ?? 0) : 0;
  const learning = isLearning(m, now);
  const line = lineFor(status);
  const badge = statusLabel(world, m, now);
  const alert = m.activeAlertId ? world.events.find((e) => e.id === m.activeAlertId) : undefined;
  const awaiting = status === "irregular" && !alert?.outcome;
  const fresh = awaiting && !!alert && now - alert.at < 6000;

  return (
    <Link
      to={`/l/${locId}/m/${m.id}`}
      style={{ viewTransitionName: `m-${m.id}` }}
      className="group block rounded-[var(--radius-card)] transition-transform duration-200 hover:-translate-y-0.5"
    >
      <Card
        rail={status}
        className={cx(
          "h-full transition-[background-color,border-color,box-shadow] duration-500 group-hover:border-muted/40 group-hover:shadow-[0_10px_28px_rgb(31_61_43/0.08)]",
          status === "critical" && "border-rust bg-[color-mix(in_srgb,var(--color-rust)_8%,var(--color-surface))]",
          awaiting && "border-orange",
          fresh && "attn",
        )}
      >
        <div className="flex flex-col gap-3 px-4 pt-4 pb-3.5 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-[18px] font-semibold">{m.name}</h3>
              <WhoLine who={who} className="mt-0.5" />
            </div>
            <StatusBadge status={status} label={badge} still={status === "irregular" && !awaiting} className="shrink-0" />
          </div>
          <div className="flex items-end gap-4">
            <div className="shrink-0">
              <p className="leading-none">
                <LiveNumber value={kw} digits={2} className="text-[30px] font-medium text-ink" />
                <span className="num ml-1 text-[13px] text-muted">kW</span>
              </p>
            </div>
            <div className="min-w-0 flex-1">
              <Sparkline samples={samples} stroke={line} showBand={!learning} height={46} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-border pt-2.5 text-[13px] text-muted">
            <span>
              {s ? (
                <>
                  <span className="num text-ink">{fmtClock((s.end ?? now) - s.start)}</span> {s.end ? "ended" : "since"} <span className="tnum">{fmtTime(s.end ?? s.start)}</span>
                </>
              ) : (
                "No session"
              )}
            </span>
            <span className="num">{s ? `${s.kwh.toFixed(2)} kWh` : ""}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

/** A machine at rest, greyed out: when it was last used. */
export function OffCard({ m, locId, morph = true }: { m: Machine; locId: string; morph?: boolean }) {
  const { world, now } = useApp();
  const learning = isLearning(m, now);
  const lastWasShutdown = world.events.some(
    (e) => e.machineId === m.id && e.outcome === "shutdown" && e.outcomeAt !== undefined && m.offAt !== undefined && Math.abs(e.outcomeAt - m.offAt) < 2000,
  );
  return (
    <Link
      to={`/l/${locId}/m/${m.id}`}
      style={morph ? { viewTransitionName: `m-${m.id}` } : undefined}
      className="group block rounded-[var(--radius-card)]"
    >
      <div className="flex h-full items-center gap-3 rounded-[var(--radius-card)] border border-border/70 bg-idle/70 px-4 py-3.5 transition-colors duration-200 group-hover:border-border group-hover:bg-idle">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface/70 text-muted">
          <Power className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium text-ink/80">{m.name}</p>
          <p className="tnum truncate text-[13px] text-ink/75">
            {learning
              ? "Off · learning its normal pattern"
              : m.offAt
                ? `${openRequest(world, m.id) ? "Technician requested" : lastWasShutdown ? "Shut down" : "Off"} · last used ${fmtWhen(m.offAt, now).replace("Today ", "")}`
                : "Off · not used yet"}
          </p>
        </div>
      </div>
    </Link>
  );
}

/** Fridges and freezers: always on, never auto shut off, still watched. */
export function AlwaysOnCard({ m, locId }: { m: Machine; locId: string }) {
  const { world, live } = useApp();
  const status = statusOf(world, m);
  const samples = live[m.id] ?? [];
  const kw = samples[samples.length - 1]?.kw ?? 0;
  return (
    <Link to={`/l/${locId}/m/${m.id}`} className="group block rounded-[var(--radius-card)]">
      <Card rail={status} className="transition-[border-color] duration-200 group-hover:border-muted/40">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15px] font-medium">{m.name}</p>
            <p className="text-[13px] text-muted">Always on · never auto shut off</p>
          </div>
          <div className="w-20">
            <Sparkline samples={samples} stroke={lineFor(status)} height={30} />
          </div>
          <p className="w-16 text-right">
            <LiveNumber value={kw} className="text-[15px]" />
            <span className="num ml-0.5 text-[11px] text-muted">kW</span>
          </p>
        </div>
      </Card>
    </Link>
  );
}
