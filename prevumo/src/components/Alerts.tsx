import { Moon, TriangleAlert, X } from "lucide-react";
import { openOverlay, dismissToast, keepOn, shutdownMachine, useApp } from "../store/store";
import { activeSession, bookingText, irregularReason, sessionUser } from "../sim/insights";
import { fmtSpan } from "../lib/time";
import { useExiting } from "../lib/useExiting";
import type { AppEvent } from "../sim/types";
import { Button } from "./ui";
import { Nums } from "./Nums";
import { cx } from "./style";

/** Rust banners pinned to the very top, one per machine that looks irregular. */
export function AlertBanners({ locId }: { locId?: string }) {
  const { world, now } = useApp();
  const open = world.events.filter((e) => {
    if (e.kind !== "irregular" || e.outcome) return false;
    const m = world.machines.find((x) => x.id === e.machineId);
    return m?.power === "on";
  });
  const rows = useExiting(open, (e) => e.id, 380);

  return (
    <div role="region" aria-label="Alerts" aria-live="assertive" className="bg-rust">
      {rows.map(({ item: e, leaving, entering }) => {
        const m = world.machines.find((x) => x.id === e.machineId);
        const s = m ? activeSession(world, m.id) : undefined;
        const who = s ? sessionUser(world, s) : undefined;
        const loc = e.locationId !== locId ? world.locations.find((l) => l.id === e.locationId)?.name : undefined;
        return (
          <div key={e.id} className="collapse-y" data-open={!leaving && !entering}>
            <div>
              <div className={cx("border-b border-white/15 text-white", !entering && !leaving && "banner-in")}>
                <div className="mx-auto flex max-w-[1320px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/15">
                    <TriangleAlert className="size-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1 basis-[240px]">
                    <p className="font-display text-[16px] leading-snug font-semibold tracking-[-0.01em]">
                      {m?.name ?? "A machine"} looks irregular{loc ? ` · ${loc}` : ""}
                    </p>
                    <p className="text-[13.5px] text-white/85">
                      <Nums text={irregularReason(e, now)} />
                      {who && (
                        <>
                          {" · "}
                          {who.kind === "unassigned" ? "Unassigned" : `In use by ${who.label}`}
                        </>
                      )}
                    </p>
                  </div>
                  <Button variant="onRust" size="md" onClick={() => openOverlay({ type: "alert", eventId: e.id })} className="font-semibold">
                    Review
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function promptText(e: AppEvent, name: string, now: number): { title: string; detail: string } {
  const draw = `drawing ${(e.drawKw ?? 0).toFixed(2)} kW`;
  const booking = bookingText(e);
  if (e.kind === "overrun") {
    return { title: `${name} is still on after its booking`, detail: [draw, booking].filter(Boolean).join(" · ") };
  }
  const idle = fmtSpan(now - (e.idleSince ?? e.at));
  return { title: `${name} has been idle for ${idle}`, detail: [draw, booking].filter(Boolean).join(" · ") };
}

/** Idle and overrun prompts, plus short confirmations, stacked in the bottom corner. */
export function Prompts() {
  const { world, now, toasts } = useApp();
  const prompts = world.events.filter((e) => {
    if ((e.kind !== "idle" && e.kind !== "overrun") || e.outcome) return false;
    return world.machines.find((m) => m.id === e.machineId)?.power === "on";
  });
  const rows = useExiting(prompts, (e) => e.id, 300);
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
            className={cx(
              "toast-in pointer-events-auto w-full overflow-hidden rounded-[14px] border border-border bg-surface shadow-[0_16px_44px_rgb(31_61_43/0.2)] transition-[opacity,transform] duration-300",
              leaving && "translate-y-2 opacity-0",
            )}
          >
            <div className="flex gap-3 p-4">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-idle text-ink">
                <Moon className="size-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[15.5px] leading-snug font-semibold">
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
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="toast-in pointer-events-auto flex w-full items-center gap-3 rounded-[12px] bg-ink px-4 py-3 text-[14px] text-white shadow-[0_12px_32px_rgb(31_61_43/0.25)]"
        >
          <span className="flex-1">{t.text}</span>
          <button type="button" aria-label="Dismiss" onClick={() => dismissToast(t.id)} className="rounded-full p-1 text-white/70 hover:text-white">
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
