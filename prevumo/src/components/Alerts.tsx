import { Link } from "react-router";
import { Moon, Power, TriangleAlert, VolumeX, X } from "lucide-react";
import { openOverlay, dismissToast, keepOn, shutdownMachine, toast, useApp } from "../store/store";
import { activeSession, bookingText, irregularReason, openIrregular, sessionUser, severity } from "../sim/insights";
import { fmtSpan } from "../lib/time";
import { useExiting } from "../lib/useExiting";
import { setSoundOn, useSoundOn } from "../lib/chime";
import type { AppEvent } from "../sim/types";
import { Button } from "./ui";
import { Nums } from "./Nums";

/** Banners shown in full; any more fold into one line, so the stack never covers a phone screen. */
const SHOWN = 2;

/**
 * Rust banners pinned to the very top, overloads first, then this location, then oldest. An overload carries a white tag,
 * and once it has waited a minute without a decision the banner offers Shut down as well.
 */
export function AlertBanners({ locId }: { locId?: string }) {
  const { world, now } = useApp();
  const sound = useSoundOn();
  const machine = (e: AppEvent) => world.machines.find((x) => x.id === e.machineId);
  const rank = (e: AppEvent) => {
    const m = machine(e);
    return (m && severity(e, m) === "critical" ? 0 : 2) + (e.locationId === locId ? 0 : 1);
  };
  const open = openIrregular(world).sort((a, b) => rank(a) - rank(b) || a.at - b.at);
  const rows = useExiting(open.slice(0, SHOWN), (e) => e.id, 200);
  const rest = open.slice(SHOWN);

  return (
    <div role="region" aria-label="Alerts" className="on-dark bg-rust">
      {rows.map(({ item: e, leaving, entering }, i) => {
        const m = machine(e);
        const s = m ? activeSession(world, m.id) : undefined;
        const who = s ? sessionUser(world, s) : undefined;
        const loc = e.locationId !== locId ? world.locations.find((l) => l.id === e.locationId)?.name : undefined;
        const critical = m !== undefined && severity(e, m) === "critical";
        const overdue = critical && !leaving && now - e.at >= 60_000;
        const over = critical ? `, over its ${m.ratedKw.toFixed(2)} kW rating` : "";
        return (
          <div key={e.id} className="collapse-y" data-open={!leaving && !entering}>
            <div>
              <div className="banner border-b border-white/15 text-white">
                <div className="mx-auto flex max-w-[1320px] items-center gap-3 px-4 py-2.5 sm:gap-4 sm:px-6 sm:py-3 lg:px-8">
                  <span key={overdue ? "overdue" : "new"} className="banner-icon hidden size-8 shrink-0 items-center justify-center rounded-full bg-white/15 sm:flex">
                    <TriangleAlert className="size-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p role="alert" className="font-display text-[16px] leading-snug font-semibold tracking-[-0.01em]">
                      {critical && (
                        <>
                          <span className="mr-1.5 inline-flex h-5 items-center rounded-full bg-white px-2 align-[1px] text-[12px] font-semibold text-rust">Overload</span>{" "}
                        </>
                      )}
                      {m?.name ?? "A machine"} looks irregular{loc ? ` · ${loc}` : ""}
                    </p>
                    <p className="line-clamp-2 text-[14px] text-white/85 sm:line-clamp-none">
                      <Nums text={irregularReason(e, now) + over} />
                      {who && (
                        <>
                          {" · "}
                          {who.kind === "unassigned" ? "Unassigned (no PIN or assignment)" : `In use by ${who.label}`}
                        </>
                      )}
                    </p>
                  </div>
                  {sound && i === 0 && (
                    <button
                      type="button"
                      aria-label="Mute alert sound"
                      onClick={() => {
                        setSoundOn(false);
                        toast("Alert sound off. Turn it on again in Settings.");
                      }}
                      className="inline-flex size-10 shrink-0 items-center justify-center rounded-full text-white/85 hover:bg-white/15 hover:text-white"
                    >
                      <VolumeX className="size-[18px]" />
                    </button>
                  )}
                  <div className="flex shrink-0 flex-col gap-2 sm:flex-row-reverse sm:items-center">
                    <Button variant="onRust" size="md" onClick={() => openOverlay({ type: "alert", eventId: e.id })} className="font-semibold">
                      Review
                    </Button>
                    {overdue && (
                      <button
                        type="button"
                        onClick={() => openOverlay({ type: "shutdown", machineId: m.id })}
                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-[var(--radius-btn)] px-3 text-sm font-medium text-white ring-1 ring-white/60 ring-inset hover:bg-white/15"
                      >
                        <Power className="size-4" /> Shut down
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      {rest.length > 0 && (
        <div className="border-b border-white/15 text-white">
          <div className="mx-auto flex max-w-[1320px] items-center gap-3 px-4 py-2 text-[14px] sm:px-6 lg:px-8">
            <p className="min-w-0 flex-1 truncate text-white/85">
              <span className="font-semibold text-white">{rest.length} more:</span> {rest.map((e) => machine(e)?.name ?? "A machine").join(", ")}
            </p>
            <Link to={`/l/${locId ?? world.locations[0].id}/notifications`} className="shrink-0 rounded-[6px] font-semibold underline underline-offset-4">
              See all {open.length}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function promptText(e: AppEvent, name: string, now: number): { title: string; detail: string } {
  const draw = `drawing ${(e.drawKw ?? 0).toFixed(2)} kW`;
  const booking = bookingText(e);
  if (e.kind === "overrun") {
    return { title: `${name} is still on after its booking`, detail: cap([draw, booking].filter(Boolean).join(" · ")) };
  }
  const idle = fmtSpan(now - (e.idleSince ?? e.at));
  return { title: `${name} has been idle for ${idle}`, detail: cap([draw, booking].filter(Boolean).join(" · ")) };
}

/** Idle and overrun prompts, plus short confirmations, stacked in the bottom corner. */
export function Prompts() {
  const { world, now, toasts } = useApp();
  const prompts = world.events.filter((e) => {
    if ((e.kind !== "idle" && e.kind !== "overrun") || e.outcome) return false;
    return world.machines.find((m) => m.id === e.machineId)?.power === "on";
  });
  const rows = useExiting(prompts, (e) => e.id, 160);
  const toastRows = useExiting(toasts, (t) => t.id, 160);
  return (
    <div className="no-print pointer-events-none fixed right-3 bottom-3 left-3 z-50 flex flex-col items-end gap-2 sm:right-5 sm:bottom-5 sm:left-auto sm:w-[400px]">
      {rows.map(({ item: e, leaving }) => {
        const m = world.machines.find((x) => x.id === e.machineId);
        const t = promptText(e, m?.name ?? "A machine", now);
        return (
          <div
            key={e.id}
            role="alertdialog"
            aria-label={t.title}
            data-leaving={leaving}
            className="toast pointer-events-auto w-full overflow-hidden rounded-[14px] border border-border bg-surface shadow-[0_16px_44px_rgb(31_61_43/0.2)]"
          >
            <div className="flex gap-3 p-4">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-idle text-ink">
                <Moon className="size-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[16px] leading-snug font-semibold">
                  <Nums text={t.title} />
                </p>
                <p className="mt-0.5 text-[13px] text-muted">
                  <Nums text={t.detail} />
                </p>
                <div className="mt-3 flex gap-2">
                  <Button variant="danger" size="sm" onClick={() => shutdownMachine(e.machineId!)}>
                    Shut down
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => keepOn(e.id)}>
                    Keep on
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      {toastRows.map(({ item: t, leaving }) => (
        <div
          key={t.id}
          role="status"
          data-leaving={leaving}
          className="toast on-dark pointer-events-auto flex w-full items-center gap-3 rounded-[12px] bg-ink px-4 py-3 text-[14px] text-white shadow-[0_12px_32px_rgb(31_61_43/0.25)]"
        >
          <span className="flex-1">{t.text}</span>
          {t.action && (
            <button
              type="button"
              onClick={() => {
                t.action!.run();
                dismissToast(t.id);
              }}
              className="rounded-full px-3 py-1 font-semibold text-white underline underline-offset-4 hover:bg-white/10"
            >
              {t.action.label}
            </button>
          )}
          <button type="button" aria-label="Dismiss" onClick={() => dismissToast(t.id)} className="rounded-full p-1 text-white/70 hover:text-white">
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
