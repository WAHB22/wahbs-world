import { useState } from "react";
import { CircleCheck, FileText, MapPin, Star, Timer } from "lucide-react";
import { closeOverlay, requestTechnician, useApp } from "../../store/store";
import { bestTechnician, TECHNICIANS, TYPES } from "../../sim/catalog";
import { health, irregularReason } from "../../sim/insights";
import { DAY, HOUR } from "../../lib/time";
import type { Machine, World } from "../../sim/types";
import { CloseButton, Dialog } from "../Dialog";
import { Button } from "../ui";
import { cx, inputCls } from "../style";

function attachments(world: World, m: Machine, eventId: string | undefined, now: number): string[] {
  const h = health(world, m, now);
  const e = world.events.find((x) => x.id === eventId);
  const since = now - 30 * DAY;
  const sessions = world.sessions.filter((s) => s.machineId === m.id && (s.end ?? now) > since);
  const hours = sessions.reduce((a, s) => a + ((s.end ?? now) - Math.max(s.start, since)) / HOUR, 0);
  return [
    e ? `Last 10 min of power data, irregular stretch marked (${irregularReason(e, now).toLowerCase()})` : "Last 10 min of power data",
    `${h.irregularMonth} irregularit${h.irregularMonth === 1 ? "y" : "ies"} this month, ${h.irregular30} in 30 days`,
    `Last service ${h.daysSinceService} days ago · health ${h.score} of 100`,
    `${sessions.length} sessions, ${hours.toFixed(1)} h of use in the last 30 days`,
  ];
}

export function TechnicianPanel({
  machineId,
  eventId,
  open,
}: {
  machineId?: string;
  eventId?: string;
  open: boolean;
}) {
  const { world, now } = useApp();
  const m = world.machines.find((x) => x.id === machineId);
  const best = m ? bestTechnician(m.type) : TECHNICIANS[0];
  const [picked, setPicked] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState<{ techId: string; items: string[] } | null>(null);
  const [lastKey, setLastKey] = useState<string | undefined>(undefined);
  const key = open ? `${machineId}:${eventId}` : undefined;
  if (key && key !== lastKey) {
    setLastKey(key);
    setPicked(null);
    setNote("");
    setSent(null);
  }
  const techId = picked ?? best.id;
  if (!m) return <Dialog open={false} onClose={closeOverlay} label="Call technician" kind="drawer"><div /></Dialog>;
  const items = attachments(world, m, eventId, now);
  const tech = TECHNICIANS.find((t) => t.id === (sent?.techId ?? techId))!;

  return (
    <Dialog open={open} onClose={closeOverlay} label="Call technician" kind="drawer">
      <div className="flex items-start gap-3 border-b border-border px-5 pt-5 pb-4 sm:px-6">
        <div className="min-w-0 flex-1">
          <h2 className="text-[22px] font-semibold">{sent ? "Request sent" : "Call a technician"}</h2>
          <p className="mt-0.5 text-[13.5px] text-muted">
            {m.name} · {TYPES[m.type].label}
          </p>
        </div>
        <CloseButton onClick={closeOverlay} />
      </div>

      {sent ? (
        <div className="flex flex-1 flex-col px-5 py-6 sm:px-6">
          <div className="toast-in flex items-start gap-3 rounded-[12px] bg-green-tint px-4 py-4">
            <CircleCheck className="mt-0.5 size-6 shrink-0 text-green" />
            <div>
              <p className="font-display text-[17px] leading-snug font-semibold">
                Request sent to {tech.name} · machine history attached
              </p>
              <p className="mt-1 text-[13.5px] text-ink/80">{tech.response}. It is logged on the machine and in its irregularity history.</p>
            </div>
          </div>
          <p className="mt-6 text-[13px] font-medium">What they received</p>
          <ul className="mt-2 divide-y divide-border rounded-[12px] border border-border">
            {sent.items.map((t) => (
              <li key={t} className="flex gap-3 px-4 py-3 text-[13.5px]">
                <FileText className="mt-0.5 size-4 shrink-0 text-muted" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <div className="flex-1" />
          <Button variant="primary" size="lg" className="mt-6 w-full" onClick={closeOverlay}>
            Done
          </Button>
        </div>
      ) : (
        <form
          className="flex flex-1 flex-col px-5 py-5 sm:px-6"
          onSubmit={(ev) => {
            ev.preventDefault();
            requestTechnician(m.id, techId, note.trim(), eventId);
            setSent({ techId, items });
          }}
        >
          <fieldset>
            <legend className="text-[13px] font-medium">Partner technicians</legend>
            <div className="mt-2 grid gap-2">
              {TECHNICIANS.map((t) => {
                const on = t.id === techId;
                return (
                  <label
                    key={t.id}
                    className={cx(
                      "relative flex cursor-pointer gap-3 rounded-[12px] border px-4 py-3.5 transition-[border-color,background-color,box-shadow] duration-200",
                      on ? "border-green bg-green-tint/40 shadow-[0_0_0_1px_var(--color-green)]" : "border-border hover:border-muted/50",
                    )}
                  >
                    <input type="radio" name="tech" value={t.id} checked={on} onChange={() => setPicked(t.id)} className="peer sr-only" />
                    <span
                      aria-hidden
                      className={cx(
                        "mt-1 flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        on ? "border-green" : "border-border",
                      )}
                    >
                      <span className={cx("size-2 rounded-full bg-green transition-transform duration-200", on ? "scale-100" : "scale-0")} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium">{t.name}</span>
                        {t.id === best.id && (
                          <span className="rounded-full bg-green px-2 py-0.5 text-[11px] font-medium text-white">Best match</span>
                        )}
                      </span>
                      <span className="block text-[13px] text-muted">{t.specialty}</span>
                      <span className="num mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-ink">
                        <span className="inline-flex items-center gap-1">
                          <Star className="size-3.5 fill-orange text-orange" /> {t.rating.toFixed(1)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3.5 text-muted" /> {t.km.toFixed(1)} km
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Timer className="size-3.5 text-muted" /> {t.response}
                        </span>
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <label htmlFor="tech-note" className="mt-5 text-[13px] font-medium">
            Note for the technician <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id="tech-note"
            rows={3}
            value={note}
            onChange={(ev) => setNote(ev.target.value)}
            placeholder="For example: the arc keeps cutting out and the breaker tripped once."
            className={cx(inputCls, "mt-1.5 h-auto resize-none py-2.5")}
          />

          <div className="mt-5 rounded-[12px] bg-bg/70 px-4 py-3">
            <p className="text-[13px] font-medium">Machine history attached automatically</p>
            <ul className="mt-1.5 space-y-1 text-[13px] text-muted">
              {items.map((t) => (
                <li key={t} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-muted" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1" />
          <Button type="submit" variant="primary" size="lg" className="mt-6 w-full">
            Send request
          </Button>
        </form>
      )}
    </Dialog>
  );
}
