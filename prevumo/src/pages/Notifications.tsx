import { useEffect } from "react";
import { Link, useParams } from "react-router";
import { FileText, Moon, PowerOff, TriangleAlert } from "lucide-react";
import { markAllRead, openOverlay, useApp } from "../store/store";
import { bookingText, irregularReason, machineName } from "../sim/insights";
import { DAY, fmtDate, fmtSpan, fmtTime, startOfDay } from "../lib/time";
import type { AppEvent, World } from "../sim/types";
import { Button, Card, OutcomeChip } from "../components/ui";
import { cx } from "../components/style";

import { Nums } from "../components/Nums";

function describe(w: World, e: AppEvent, now: number): { title: string; detail: string } {
  const name = machineName(w, e.machineId);
  switch (e.kind) {
    case "irregular":
      return { title: `${name} ${e.outcome ? "looked" : "looks"} irregular`, detail: irregularReason(e, now) };
    case "idle":
      return {
        title: `${name} was idle for ${fmtSpan((e.outcome === "auto-off" && e.outcomeAt ? e.outcomeAt : e.at) - (e.idleSince ?? e.at))}`,
        detail: [`drawing ${(e.drawKw ?? 0).toFixed(2)} kW`, bookingText(e)].filter(Boolean).join(" · "),
      };
    case "overrun":
      return { title: `${name} stayed on after its booking`, detail: [bookingText(e), `drawing ${(e.drawKw ?? 0).toFixed(2)} kW`].filter(Boolean).join(" · ") };
    case "auto-off":
      return { title: `${name} was still on at closing time`, detail: `Daily shutdown at ${fmtTime(e.at)}` };
    case "report":
      return { title: "Daily report ready", detail: `Usage and energy for ${fmtDate(e.at)}` };
  }
}

const ICON = { irregular: TriangleAlert, idle: Moon, overrun: Moon, "auto-off": PowerOff, report: FileText } as const;
const ICON_TONE = {
  irregular: "bg-orange-tint text-rust",
  idle: "bg-idle text-ink",
  overrun: "bg-idle text-ink",
  "auto-off": "bg-idle text-ink",
  report: "bg-green-tint text-green",
} as const;

export function Notifications() {
  const { locId = "" } = useParams();
  const { world, now } = useApp();
  const unread = new Set(world.events.filter((e) => !e.read).map((e) => e.id));
  useEffect(() => {
    const t = window.setTimeout(markAllRead, 1500);
    return () => window.clearTimeout(t);
  }, [world.events.length]);

  const events = [...world.events].sort((a, b) => b.at - a.at);
  const groups = new Map<number, AppEvent[]>();
  for (const e of events) {
    const d = startOfDay(e.at);
    groups.set(d, [...(groups.get(d) ?? []), e]);
  }
  const today = startOfDay(now);
  const dayLabel = (d: number) => {
    const diff = Math.round((today - d) / DAY);
    return diff === 0 ? "Today" : diff === 1 ? "Yesterday" : fmtDate(d);
  };

  return (
    <main className="mx-auto max-w-[920px] px-4 pt-7 pb-24 sm:px-6 lg:pt-10">
      <h1 className="text-[30px] font-semibold sm:text-[38px]">Notifications</h1>
      <p className="mt-1 text-[15px] text-muted">Every alert and idle prompt across your locations, with what was decided.</p>

      <div className="mt-7 space-y-7">
        {groups.size === 0 && (
          <p className="rounded-[var(--radius-card)] border border-dashed border-border px-6 py-10 text-center text-[14px] text-muted">
            No alerts or idle prompts in the last 30 days. When a machine looks irregular or sits idle, it shows up here with what you decided.
          </p>
        )}
        {[...groups.entries()].map(([d, list]) => (
          <section key={d} aria-label={dayLabel(d)}>
            <h2 className="mb-2 text-[14px] font-semibold text-muted">{dayLabel(d)}</h2>
            <Card className="overflow-hidden">
              <ul className="divide-y divide-border">
                {list.map((e) => {
                  const t = describe(world, e, now);
                  const Icon = ICON[e.kind];
                  const m = world.machines.find((x) => x.id === e.machineId);
                  const loc = world.locations.find((l) => l.id === e.locationId);
                  const pending = !e.outcome;
                  return (
                    <li key={e.id} className={cx("flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3.5 sm:px-5", unread.has(e.id) && "bg-bg/70")}>
                      <span className={cx("flex size-9 shrink-0 items-center justify-center rounded-full", ICON_TONE[e.kind])}>
                        <Icon className="size-[17px]" />
                      </span>
                      <div className="min-w-0 flex-1 basis-[220px]">
                        <p className="flex items-center gap-2 text-[15px] font-medium">
                          {unread.has(e.id) && <span aria-label="Unread" className="size-1.5 shrink-0 rounded-full bg-ink" />}
                          {t.title}
                        </p>
                        <p className="text-[13px] text-muted sm:truncate">
                          <Nums text={`${fmtTime(e.at)} · ${loc?.name} · ${t.detail}`} />
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {e.kind === "report" ? (
                          <Link to={`/l/${e.locationId}/reports`} className="text-[13px] font-medium text-green underline-offset-4 hover:underline">
                            Open report
                          </Link>
                        ) : (
                          <>
                            {pending && e.kind === "irregular" && m?.power === "on" ? (
                              <Button size="sm" variant="danger" onClick={() => openOverlay({ type: "alert", eventId: e.id })}>
                                Review
                              </Button>
                            ) : (
                              <OutcomeChip outcome={e.outcome} />
                            )}
                            {m && (
                              <Link to={`/l/${m.locationId}/m/${m.id}`} aria-label={`Open ${m.name}`} className="text-[13px] font-medium text-green underline-offset-4 hover:underline">
                                Open machine
                              </Link>
                            )}
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          </section>
        ))}
      </div>
      <p className="mt-8 text-center text-[13px] text-muted">
        Showing the last 30 days · <Link to={`/l/${locId}`} className="underline underline-offset-4">Back to {world.locations.find((l) => l.id === locId)?.name}</Link>
      </p>
    </main>
  );
}
