import { useState } from "react";
import { CircleCheck, FileText, MapPin, Star, Timer } from "lucide-react";
import { closeOverlay, requestTechnician, useApp } from "../../store/store";
import { bestTechnician, replyBy, TECHNICIANS, TYPES, whyBest } from "../../sim/catalog";
import { health, irregularReason, openRequest } from "../../sim/insights";
import { freeze } from "../../sim/signal";
import { DAY, fmtTime, HOUR, startOfDay } from "../../lib/time";
import type { Machine, Sample, World } from "../../sim/types";
import { CloseButton, Dialog } from "../Dialog";
import { Button } from "../ui";
import { cx, inputCls } from "../style";
import { Trace } from "../visuals";

function attachments(world: World, m: Machine, eventId: string | undefined, now: number): string[] {
  const h = health(world, m, now);
  const e = world.events.find((x) => x.id === eventId);
  const since = now - 30 * DAY;
  const sessions = world.sessions.filter((s) => s.machineId === m.id && (s.end ?? now) > since && s.start <= now);
  const hours = sessions.reduce((a, s) => a + (Math.min(s.end ?? now, now) - Math.max(s.start, since)) / HOUR, 0);
  return [
    e ? `Last 10 min of power data, irregular stretch marked (${irregularReason(e, now).toLowerCase()})` : "Last 10 min of power data",
    `${h.irregularMonth} irregularit${h.irregularMonth === 1 ? "y" : "ies"} this month, ${h.irregular30} in 30 days`,
    `Last service ${h.daysSinceService} days ago · health ${h.score} of 100`,
    `${sessions.length} sessions, ${hours.toFixed(1)} h of use in the last 30 days`,
  ];
}

const byText = (ts: number, now: number) => (startOfDay(ts) === startOfDay(now) ? fmtTime(ts) : `tomorrow ${fmtTime(ts)}`);

interface Sent {
  techId: string;
  items: string[];
  snapshot: Sample[];
  note: string;
  at: number;
}

export function TechnicianPanel({ machineId, eventId, open }: { machineId?: string; eventId?: string; open: boolean }) {
  const { world, live, now } = useApp();
  const m = world.machines.find((x) => x.id === machineId);
  const best = m ? bestTechnician(m.type) : TECHNICIANS[0];
  const [picked, setPicked] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState<Sent | null>(null);
  const [snap, setSnap] = useState<Sample[]>([]);
  const [lastKey, setLastKey] = useState<string | undefined>(undefined);
  const key = open ? `${machineId}:${eventId}` : undefined;
  if (key && key !== lastKey) {
    setLastKey(key);
    setPicked(null);
    setNote("");
    setSent(null);
    // Freeze the trace when the panel opens, so the preview is exactly what gets sent.
    setSnap(freeze(live[machineId ?? ""] ?? []));
  }
  const techId = picked ?? best.id;
  if (!m) return <Dialog open={false} onClose={closeOverlay} label="Call technician" kind="drawer"><div /></Dialog>;
  const items = attachments(world, m, eventId, now);
  const tech = TECHNICIANS.find((t) => t.id === (sent?.techId ?? techId))!;
  const prior = openRequest(world, m.id);
  const ordered = [best, ...TECHNICIANS.filter((t) => t.id !== best.id)];

  const submit = () => {
    if (sent) return;
    requestTechnician(m.id, techId, note.trim(), eventId, { snapshot: snap, items });
    setSent({ techId, items, snapshot: snap, note: note.trim(), at: now });
  };

  return (
    <Dialog open={open} onClose={closeOverlay} label="Call technician" kind="drawer">
      <div className="flex items-start gap-3 border-b border-border px-5 pt-5 pb-4 sm:px-6">
        <div className="min-w-0 flex-1">
          <h2 className="text-[22px] font-semibold">{sent ? "Request sent" : "Call a technician"}</h2>
          <p className="mt-0.5 text-[14px] text-muted">
            {m.name} · {TYPES[m.type].label}
          </p>
        </div>
        <CloseButton onClick={closeOverlay} />
      </div>

      {sent ? (
        <div className="flex flex-1 flex-col px-5 py-6 sm:px-6">
          <div role="status" className="toast-in flex items-start gap-3 rounded-[12px] bg-green-tint px-4 py-4">
            <CircleCheck className="mt-0.5 size-6 shrink-0 text-green" />
            <div>
              <p className="font-display text-[17px] leading-snug font-semibold">Request sent to {tech.name} · machine history attached</p>
              <p className="mt-1 text-[14px] text-ink/80">
                Typical reply by <span className="num">{byText(replyBy(tech, sent.at), now)}</span>. Tracked on {m.name} until you mark the visit done.
              </p>
            </div>
          </div>
          <p className="mt-6 text-[13px] font-medium">What they received</p>
          <div className="mt-2 rounded-[12px] border border-border">
            {sent.snapshot.length > 2 && (
              <div className="px-4 pt-3 pb-2">
                <Trace samples={sent.snapshot} />
              </div>
            )}
            <ul className="divide-y divide-border border-t border-border">
              {sent.items.map((t) => (
                <li key={t} className="flex gap-3 px-4 py-3 text-[14px]">
                  <FileText className="mt-0.5 size-4 shrink-0 text-muted" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            {sent.note && (
              <p className="border-t border-border px-4 py-3 text-[14px]">
                <span className="text-muted">Your note: </span>
                {sent.note}
              </p>
            )}
          </div>
          <p className="mt-4 text-[13px] text-muted">Demo prototype: nothing leaves this browser. The request is saved on the machine.</p>
          <div className="flex-1" />
          <Button variant="primary" size="lg" className="mt-6 w-full" onClick={closeOverlay} autoFocus>
            Done
          </Button>
        </div>
      ) : (
        <form
          className="flex flex-1 flex-col px-5 pt-5 sm:px-6"
          onSubmit={(ev) => {
            ev.preventDefault();
            submit();
          }}
        >
          {prior && (
            <p className="mb-4 rounded-[12px] border border-border bg-bg/70 px-4 py-3 text-[14px]">
              {TECHNICIANS.find((t) => t.id === prior.techId)?.name} already has an open request from <span className="num">{fmtTime(prior.at)}</span>. Sending again adds a second one with fresh data.
            </p>
          )}
          <fieldset>
            <legend className="text-[13px] font-medium">Partner technicians</legend>
            <div className="mt-2 grid gap-2">
              {ordered.map((t) => {
                const on = t.id === techId;
                return (
                  <label
                    key={t.id}
                    className={cx(
                      "relative flex cursor-pointer gap-3 rounded-[12px] border px-4 py-3.5 transition-[border-color,background-color,box-shadow] duration-200",
                      "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-green",
                      on ? "border-green bg-green-tint/40 shadow-[0_0_0_1px_var(--color-green)]" : "border-border hover:border-idle-mark",
                    )}
                  >
                    <input type="radio" name="tech" value={t.id} checked={on} onChange={() => setPicked(t.id)} className="peer sr-only" data-autofocus={on || undefined} />
                    <span
                      aria-hidden
                      className={cx("mt-1 flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 transition-colors", on ? "border-green" : "border-idle-mark")}
                    >
                      <span className={cx("size-2 rounded-full bg-green transition-[transform,opacity] duration-150", on ? "scale-100 opacity-100" : "scale-50 opacity-0")} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium">{t.name}</span>
                        {t.id === best.id && <span className="rounded-full bg-green px-2 py-0.5 text-[11px] font-medium text-white">Best match</span>}
                      </span>
                      <span className="block text-[13px] text-muted">{t.specialty}</span>
                      <span className="num mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[13px] text-ink">
                        <span className="inline-flex items-center gap-1">
                          <Star className="size-3.5 fill-muted text-muted" /> {t.rating.toFixed(1)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="size-3.5 text-muted" /> {t.km.toFixed(1)} km
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Timer className="size-3.5 text-muted" /> {t.response}
                        </span>
                      </span>
                      {t.id === best.id ? (
                        <span className="mt-1.5 block text-[13px] text-green">{whyBest(t, now)}</span>
                      ) : (
                        !t.fits.includes(m.type) && <span className="mt-1.5 block text-[13px] text-muted">{TYPES[m.type].label} is outside their listed specialty</span>
                      )}
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
            maxLength={500}
            value={note}
            onChange={(ev) => setNote(ev.target.value)}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" && (ev.metaKey || ev.ctrlKey)) {
                ev.preventDefault();
                ev.currentTarget.form?.requestSubmit();
              }
            }}
            aria-keyshortcuts="Control+Enter Meta+Enter"
            placeholder="For example: the arc keeps cutting out and the breaker tripped once."
            className={cx(inputCls, "mt-1.5 h-auto resize-none py-2.5")}
          />

          <div className="mt-5 rounded-[12px] bg-bg/70 px-4 py-3">
            <p className="text-[13px] font-medium">Machine history attached automatically</p>
            {snap.length > 2 && (
              <div className="mt-2">
                <Trace samples={snap} height={56} />
              </div>
            )}
            <ul className="mt-2 space-y-1 text-[13px] text-muted">
              {items.map((t) => (
                <li key={t} className="flex gap-2">
                  <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-muted" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1" />
          <div className="sticky bottom-0 -mx-5 mt-6 border-t border-border bg-surface px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] sm:-mx-6 sm:px-6">
            <Button type="submit" variant="primary" size="lg" className="w-full">
              Send request
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
