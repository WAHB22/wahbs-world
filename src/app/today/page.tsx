"use client";

import { useEffect, useState } from "react";
import { dayLabel, localDay, timeLabel } from "@/data/dates";
import { useWorld } from "@/data/runtime";
import { Shell } from "@/ui/Shell";
import { askCheckin, checkinNow, CheckinDock, describe } from "@/worlds/today/CheckinDock";
import { useToday, type Block } from "@/worlds/today/useToday";

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => document.visibilityState === "visible" && setNow(new Date());
    const id = setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, []);
  return now;
}

function servicePhase(d: Date): string {
  const h = d.getHours();
  return h < 5 ? "Late night" : h < 11 ? "Opening" : h < 17 ? "Service" : h < 22 ? "Closing time" : "Late night";
}

export default function Today() {
  const { store } = useWorld();
  const now = useClock();
  const today = localDay(now);
  const data = useToday(today, now);
  const [picking, setPicking] = useState(false);
  const dateLine = now.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric" });
  const evening = now.getHours() >= 19;

  async function markOneDone() {
    if (!store || !data?.oneThing) return;
    const { kind, item } = data.oneThing;
    if (kind === "assessment") await store.patch("assessments", item.id, { status: "done" });
    else await store.patch("tasks", item.id, { done_at: new Date().toISOString() });
  }

  async function pick(ref: string, label: string) {
    if (!store || !data) return;
    await store.put("days", { ...(data.day ?? {}), id: data.dayId, day: today, one_thing_ref: ref, one_thing: label });
    setPicking(false);
  }

  const one = data?.oneThing;
  return (
    <Shell title="Today" accent="ember">
      <p className="today-sub"><span>{dateLine}</span><span className="soft">{servicePhase(now)}</span></p>
      <div className="today-layout">
        <div className="today-col">
          <section className="glass pane one-thing" aria-labelledby="one">
            <h2 id="one" className="pane-title">The one thing</h2>
            {!data ? null : one ? (
              <>
                <p className="big-line" data-testid="one-thing">{one.kind === "assessment" ? `${one.item.code ? one.item.code + " " : ""}${one.item.title}` : one.item.title}</p>
                {one.kind === "assessment" && (
                  <p className="soft">
                    {one.item.due_on ? `Due ${dayLabel(one.item.due_on, today)}` : "No date yet"}
                    {one.item.weight != null ? `, worth ${one.item.weight} percent` : ""}
                    {one.item.covers.length ? `. Covers ${one.item.covers.join(", ")}.` : "."}
                  </p>
                )}
                <div className="row-actions">
                  <button className="btn btn-primary" onClick={markOneDone} data-testid="one-done">Mark it done</button>
                  <button className="btn" onClick={() => setPicking((v) => !v)} aria-expanded={picking}>Pick another</button>
                </div>
              </>
            ) : (
              <>
                <p className="soft">Nothing is due. A good day to get ahead, or to rest.</p>
                <div className="row-actions"><button className="btn" onClick={() => setPicking((v) => !v)} aria-expanded={picking}>Pick something</button></div>
              </>
            )}
            {picking && data && (
              <div className="field pick">
                <label htmlFor="pick">The one thing for today</label>
                <select id="pick" defaultValue="" onChange={(e) => { const c = data.choices.find((x) => x.ref === e.target.value); if (c) void pick(c.ref, c.label); }}>
                  <option value="" disabled>Choose</option>
                  {data.choices.map((c) => <option key={c.ref} value={c.ref}>{c.label}</option>)}
                </select>
              </div>
            )}
          </section>

          <section className="glass pane" aria-labelledby="att">
            <h2 id="att" className="pane-title">Needs attention</h2>
            {data && data.attention.length ? (
              <ul className="attention">{data.attention.map((a) => <li key={a.id} data-tone={a.tone}><i aria-hidden="true" />{a.text}</li>)}</ul>
            ) : (
              <p className="soft">Nothing urgent in the next three days.</p>
            )}
          </section>
        </div>

        <section className="glass pane service" aria-labelledby="svc">
          <h2 id="svc" className="pane-title">Service today</h2>
          {data && data.blocks.length ? (
            <ol className="rail" data-testid="service-rail">
              {data.blocks.map((b, i) => {
                const nowLine = b.state !== "past" && (i === 0 || data.blocks[i - 1].state === "past");
                return (
                  <li key={b.id} data-state={b.state} data-kind={b.kind}>
                    {nowLine && <div className="now-line" aria-label={`Now, ${timeLabel(now.toISOString())}`}><span>Now {timeLabel(now.toISOString())}</span></div>}
                    <BlockRow b={b} />
                  </li>
                );
              })}
              {data.blocks.every((b) => b.state === "past") && <li className="now-line end"><span>Now {timeLabel(now.toISOString())}, the day's service is over</span></li>}
            </ol>
          ) : (
            <p className="soft">Nothing scheduled today.</p>
          )}
        </section>

        <section className="pane-bare tickets" aria-labelledby="rail">
          <h2 id="rail" className="pane-title">On the rail</h2>
          {data && data.rail.length ? (
            <ul className="ticket-list">
              {data.rail.map((a) => (
                <li key={a.id} className="ticket">
                  <div className="ticket-row"><span>{a.code ?? "Task"}</span><span>{dayLabel(a.due_on!, today)}</span></div>
                  <div className="ticket-title">{a.title}</div>
                  {a.weight != null && <div className="ticket-row soft-ink"><span>Weight</span><span>{a.weight} percent</span></div>}
                </li>
              ))}
            </ul>
          ) : (
            <p className="soft">No other deadlines this week.</p>
          )}
        </section>

        <section className="glass pane week-ahead" aria-labelledby="wk">
          <h2 id="wk" className="pane-title">The week ahead</h2>
          <ul className="week-list">
            {data?.week.map((d) => (
              <li key={d.day}>
                <span className="week-day">{dayLabel(d.day, today)}</span>
                <span className="soft">{d.items.length ? d.items.map((a) => `${a.code ? a.code + " " : ""}${a.title}`).join(", ") : "Nothing due"}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="today-strip">
        <section className="glass pane stat" aria-labelledby="mny">
          <h2 id="mny" className="pane-title">Money</h2>
          <p className="figure">{money(data?.money.week ?? 0)}</p>
          <p className="soft">spent this week, {money(data?.money.today ?? 0)} today</p>
        </section>
        <section className="glass pane stat" aria-labelledby="trn">
          <h2 id="trn" className="pane-title">Training</h2>
          <div className="ring-row">
            <Ring done={data?.training.done ?? 0} planned={data?.training.planned ?? 0} />
            <p className="soft">{data ? `${data.training.done} of ${data.training.planned} planned sessions this week` : ""}</p>
          </div>
        </section>
        <section className="glass pane stat" aria-labelledby="mom">
          <h2 id="mom" className="pane-title">Moments</h2>
          {data?.moments.length ? (
            <ul className="moments">{data.moments.map((m) => <li key={m.id}><span className="soft moment-day">{dayLabel(m.local_day, today)}</span>{String((m.payload as { text?: string }).text ?? "")}</li>)}</ul>
          ) : <p className="soft">None kept yet.</p>}
          {evening && <button className="btn" onClick={() => askCheckin("moment")}>Keep a moment from today</button>}
        </section>
        <section className="glass pane stat log" aria-labelledby="log">
          <h2 id="log" className="pane-title">Checked in today</h2>
          {data?.checkins.length ? (
            <ul className="log-list" data-testid="today-log">
              {data.checkins.map((c) => (
                <li key={c.id}><span className="ticket-font log-time">{timeLabel(c.occurred_at)}</span><span>{describe(c)}</span></li>
              ))}
            </ul>
          ) : (
            <p className="soft">Nothing yet. One tap below saves it, even with no connection.</p>
          )}
        </section>
      </div>

      <CheckinDock today={today} />
    </Shell>
  );
}

function BlockRow({ b }: { b: Block }) {
  const tappable = (b.kind === "gym" || b.kind === "shift") && !b.done && b.state !== "next";
  return (
    <div className="block">
      <span className="ticket-font block-time">{b.starts_at.slice(0, 5)}</span>
      <span className="block-body">
        <span className="block-title">{b.title}</span>
        {b.location && <span className="soft block-loc">{b.location}</span>}
      </span>
      {b.done ? (
        <span className="chip done">Done</span>
      ) : tappable ? (
        <button className="btn btn-small" onClick={() => checkinNow(b.kind === "gym" ? "gym_done" : "shift_worked")}>{b.kind === "gym" ? "Gym done" : "Shift worked"}</button>
      ) : null}
    </div>
  );
}

function Ring({ done, planned }: { done: number; planned: number }) {
  const r = 30, c = 2 * Math.PI * r;
  const frac = planned ? Math.min(1, done / planned) : done ? 1 : 0;
  return (
    <svg className="session-ring" viewBox="0 0 76 76" width="76" height="76" role="img" aria-label={`${done} of ${planned} sessions`}>
      <circle cx="38" cy="38" r={r} fill="none" stroke="var(--color-harbor)" strokeWidth="8" />
      <circle cx="38" cy="38" r={r} fill="none" stroke="var(--color-signal)" strokeWidth="8" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - frac)} transform="rotate(-90 38 38)" className="session-ring-arc" />
      <text x="38" y="44" textAnchor="middle" className="session-ring-num">{done}</text>
    </svg>
  );
}
