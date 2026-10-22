import { atTime, dayKey, HOUR, MIN } from "../lib/time";
import { attribute, windowOn } from "./attribution";
import { meanFrac, TYPES } from "./catalog";
import { fillBookedWindows, generateSessions, isAlwaysOn, makeRng, uid } from "./seed";
import { sampleAt, WINDOW_SEC, type Drive } from "./signal";
import type { AnomalyKind, AppEvent, Machine, Outcome, Sample, Session, World } from "./types";

export type Live = Record<string, Sample[]>;

/** Copy-on-write view of the world, so React sees new references only where something changed. */
class Draft {
  w: World;
  private sIndex = new Map<string, number>();
  private eIndex = new Map<string, number>();
  private touchedS = new Set<string>();
  private touchedE = new Set<string>();

  constructor(world: World) {
    this.w = {
      ...world,
      machines: world.machines.map((m) => ({ ...m })),
      sessions: [...world.sessions],
      events: [...world.events],
      closedDays: { ...world.closedDays },
    };
    this.w.sessions.forEach((s, i) => this.sIndex.set(s.id, i));
    this.w.events.forEach((e, i) => this.eIndex.set(e.id, i));
  }

  machine(id: string): Machine | undefined {
    return this.w.machines.find((m) => m.id === id);
  }

  activeSession(machineId: string): Session | undefined {
    for (let i = this.w.sessions.length - 1; i >= 0; i--) {
      const s = this.w.sessions[i];
      if (s.machineId === machineId && s.end === undefined) return this.session(s.id);
    }
    return undefined;
  }

  session(id: string): Session | undefined {
    const i = this.sIndex.get(id);
    if (i === undefined) return undefined;
    if (!this.touchedS.has(id)) {
      this.w.sessions[i] = { ...this.w.sessions[i] };
      this.touchedS.add(id);
    }
    return this.w.sessions[i];
  }

  event(id: string | undefined): AppEvent | undefined {
    if (!id) return undefined;
    const i = this.eIndex.get(id);
    if (i === undefined) return undefined;
    if (!this.touchedE.has(id)) {
      this.w.events[i] = { ...this.w.events[i] };
      this.touchedE.add(id);
    }
    return this.w.events[i];
  }

  addSession(s: Session) {
    this.sIndex.set(s.id, this.w.sessions.length);
    this.touchedS.add(s.id);
    this.w.sessions.push(s);
  }

  addEvent(e: AppEvent) {
    this.eIndex.set(e.id, this.w.events.length);
    this.touchedE.add(e.id);
    this.w.events.push(e);
  }
}

function driveAt(m: Machine, t: number, sessions: Session[]): Drive {
  const ms = t * 1000;
  if (isAlwaysOn(m)) return { on: m.power === "on", mode: m.mode, anomaly: m.anomaly };
  const running = sessions.some((s) => s.start <= ms && (s.end === undefined ? m.power === "on" : s.end > ms));
  if (!running) return { on: false, mode: "normal" };
  const inMode = m.mode !== "normal" && m.modeSince !== undefined && ms >= m.modeSince && m.power === "on";
  return { on: true, mode: inMode ? m.mode : "normal", anomaly: inMode ? m.anomaly : undefined };
}

/** Rebuild the last ten minutes of samples for one machine from its sessions and current mode. */
export function backfillMachine(w: World, m: Machine, now: number): Sample[] {
  const end = Math.floor(now / 1000);
  const from = end - WINDOW_SEC + 1;
  const sessions = w.sessions.filter((s) => s.machineId === m.id && (s.end ?? Infinity) > from * 1000);
  const out: Sample[] = [];
  for (let t = from; t <= end; t++) out.push(sampleAt(m, t, driveAt(m, t, sessions)));
  return out;
}

export function backfill(w: World, now: number): Live {
  const live: Live = {};
  for (const m of w.machines) live[m.id] = backfillMachine(w, m, now);
  return live;
}

function resolve(d: Draft, id: string | undefined, outcome: Outcome, at: number) {
  const e = d.event(id);
  if (!e || e.outcome) return;
  e.outcome = outcome;
  e.outcomeAt = at;
  if (e.kind === "irregular") e.durationSec = Math.max(1, Math.round((at - e.at) / 1000));
}

/** Stop a machine and end its session. The box never restarts it on its own. */
function stop(d: Draft, m: Machine, at: number, how: "owner" | "auto" | "end", reason?: "idle" | "daily") {
  const s = d.activeSession(m.id);
  if (s) s.end = at;
  const outcome: Outcome = how === "owner" ? "shutdown" : "auto-off";
  if (how !== "end") {
    resolve(d, m.activeAlertId, outcome, at);
    resolve(d, m.activeIdleId, outcome, at);
    for (const e of d.w.events) {
      if (e.kind === "overrun" && !e.outcome && e.machineId === m.id) resolve(d, e.id, outcome, at);
    }
  }
  if (how === "auto" && reason === "daily") {
    d.addEvent({
      id: uid("e"),
      kind: "auto-off",
      at,
      locationId: m.locationId,
      machineId: m.id,
      sessionId: s?.id,
      autoReason: "daily",
      outcome: "auto-off",
      outcomeAt: at,
      read: false,
    });
  }
  m.power = how === "owner" ? "stopping" : "off";
  m.stoppingUntil = how === "owner" ? at + 2400 : undefined;
  m.offAt = at;
  m.mode = "normal";
  m.modeSince = undefined;
  m.anomaly = undefined;
  m.outsideStreak = 0;
  m.activeAlertId = undefined;
  m.activeIdleId = undefined;
}

function closeDay(d: Draft, at: number) {
  const w = d.w;
  for (const m of w.machines) {
    if (m.power === "on" && !isAlwaysOn(m) && !m.neverAutoOff) stop(d, m, at, "auto", "daily");
  }
  w.closedDays[dayKey(at)] = at;
  for (const l of w.locations) {
    d.addEvent({ id: uid("e"), kind: "report", at, locationId: l.id, outcome: "generated", outcomeAt: at, read: false });
  }
}

function bookingEnd(w: World, s: Session, t: number): number | undefined {
  const a = attribute(s, w.members, w.assignments);
  if (a.kind !== "assigned") return undefined;
  return windowOn(a.assignment.frame, t)?.end;
}

function stepSecond(d: Draft, live: Live, t: number, prevMs: number) {
  const w = d.w;
  const ms = t * 1000;
  for (const m of w.machines) {
    const buf = live[m.id] ?? (live[m.id] = []);
    if (m.power === "stopping" && m.stoppingUntil !== undefined && ms >= m.stoppingUntil) {
      m.power = "off";
      m.stoppingUntil = undefined;
    }
    if (m.power !== "on") {
      buf.push(sampleAt(m, t, { on: false, mode: "normal" }));
      continue;
    }
    const s = sampleAt(m, t, { on: true, mode: m.mode, anomaly: m.anomaly });
    buf.push(s);
    const session = isAlwaysOn(m) ? undefined : d.activeSession(m.id);
    if (session) session.kwh += s.kw / 3600;

    const learning = m.learningUntil !== undefined && ms < m.learningUntil;
    m.outsideStreak = s.out && !learning ? m.outsideStreak + 1 : Math.max(0, m.outsideStreak - 1);
    const mean = meanFrac(m.type) * m.ratedKw;
    if (m.outsideStreak >= 3 && !m.activeAlertId) {
      const id = uid("e");
      d.addEvent({
        id,
        kind: "irregular",
        at: ms - (m.outsideStreak - 1) * 1000,
        locationId: m.locationId,
        machineId: m.id,
        sessionId: session?.id,
        anomaly: m.anomaly ?? (s.kw > s.hi ? "spike" : "sag"),
        factor: 0,
        n: 0,
        read: false,
      });
      m.activeAlertId = id;
    }
    const alert = m.activeAlertId ? d.w.events.find((e) => e.id === m.activeAlertId) : undefined;
    if (alert && !alert.outcome && m.mode === "anomaly") {
      const e = d.event(alert.id)!;
      const ratio = s.kw / mean;
      const n = e.n ?? 0;
      e.factor = e.anomaly === "erratic" ? Math.max(e.factor ?? 0, Math.abs(ratio - 1)) : ((e.factor ?? 0) * n + ratio) / (n + 1);
      e.n = n + 1;
    }

    if (m.mode === "idle" && m.modeSince !== undefined) {
      const idleFor = ms - m.modeSince;
      if (!m.activeIdleId && idleFor >= w.settings.idlePromptMin * MIN) {
        const id = uid("e");
        d.addEvent({
          id,
          kind: "idle",
          at: ms,
          locationId: m.locationId,
          machineId: m.id,
          sessionId: session?.id,
          idleSince: m.modeSince,
          drawKw: s.kw,
          bookingEnd: session ? bookingEnd(w, session, ms) : undefined,
          read: false,
        });
        m.activeIdleId = id;
      }
      const prompt = w.events.find((e) => e.id === m.activeIdleId);
      if (
        w.settings.autoOffIdle.enabled &&
        !m.neverAutoOff &&
        prompt?.outcome !== "kept-on" &&
        idleFor >= w.settings.autoOffIdle.minutes * MIN
      ) {
        stop(d, m, ms, "auto", "idle");
        continue;
      }
    }

    if (session && !session.pinMemberId) {
      const end = bookingEnd(w, session, ms);
      const already = w.events.some((e) => e.kind === "overrun" && e.sessionId === session.id);
      if (end !== undefined && session.start < end && ms >= end + 5 * MIN && !already) {
        d.addEvent({
          id: uid("e"),
          kind: "overrun",
          at: ms,
          locationId: m.locationId,
          machineId: m.id,
          sessionId: session.id,
          drawKw: s.kw,
          bookingEnd: end,
          read: false,
        });
      }
    }
  }

  const ds = w.settings.dailyShutdown;
  const close = atTime(ms, ds.time);
  if (ds.enabled && ms >= close && prevMs < close && !w.closedDays[dayKey(ms)]) closeDay(d, close);

  for (const id in live) if (live[id].length > WINDOW_SEC) live[id] = live[id].slice(-WINDOW_SEC);
}

export interface TickResult {
  world: World;
  live: Live;
  powerChanged: boolean;
}

/** Advance the simulation to `now`, one sample per second. Long gaps (a sleeping tab) are bridged in one step. */
export function tick(world: World, live: Live, now: number): TickResult {
  const from = Math.floor(world.lastTick / 1000) + 1;
  const to = Math.floor(now / 1000);
  if (to < from) return { world, live, powerChanged: false };
  const d = new Draft(world);
  const before = world.machines.map((m) => m.power === "on").join();
  const next: Live = {};
  for (const id in live) next[id] = live[id].slice();

  const gap = to - from;
  if (gap > 120) {
    for (const m of d.w.machines) {
      const s = m.power === "on" && !isAlwaysOn(m) ? d.activeSession(m.id) : undefined;
      if (s) s.kwh += (m.mode === "idle" ? TYPES[m.type].idleFrac : meanFrac(m.type)) * m.ratedKw * (gap / 3600);
    }
    stepSecond(d, next, to, world.lastTick);
    const rebuilt = backfill(d.w, now);
    d.w.lastTick = to * 1000;
    return { world: d.w, live: rebuilt, powerChanged: true };
  }
  for (let t = from; t <= to; t++) stepSecond(d, next, t, (t - 1) * 1000);
  d.w.lastTick = to * 1000;
  const after = d.w.machines.map((m) => m.power === "on").join();
  return { world: d.w, live: next, powerChanged: before !== after };
}

/* Owner and demo actions. Each returns a new world. */

export function startSession(world: World, machineId: string, pinMemberId: string | undefined, now: number): World {
  const d = new Draft(world);
  const m = d.machine(machineId);
  if (!m || isAlwaysOn(m) || m.power === "on") return world;
  m.power = "on";
  m.stoppingUntil = undefined;
  m.mode = "normal";
  m.modeSince = undefined;
  m.outsideStreak = 0;
  d.addSession({ id: uid("s"), machineId, start: now, pinMemberId, kwh: 0 });
  return d.w;
}

export function triggerIrregular(world: World, machineId: string, kind: AnomalyKind, now: number): World {
  let w = world;
  const m0 = w.machines.find((m) => m.id === machineId);
  if (!m0) return world;
  if (m0.power !== "on") w = startSession(w, machineId, undefined, now - 60_000);
  const d = new Draft(w);
  const m = d.machine(machineId)!;
  m.mode = "anomaly";
  m.anomaly = kind;
  m.modeSince = now;
  m.outsideStreak = 0;
  m.learningUntil = undefined;
  return d.w;
}

/** Puts the machine in flat standby, backdated so the idle prompt has a realistic history behind it. */
export function triggerIdle(world: World, live: Live, machineId: string, now: number): { world: World; live: Live } {
  let w = world;
  const m0 = w.machines.find((m) => m.id === machineId);
  if (!m0 || isAlwaysOn(m0)) return { world, live };
  const since = now - (w.settings.idlePromptMin + 15) * MIN;
  if (m0.power !== "on") w = startSession(w, machineId, undefined, since - 20 * MIN);
  const d = new Draft(w);
  const m = d.machine(machineId)!;
  const s = d.activeSession(machineId);
  if (s && s.start > since - 5 * MIN) s.start = since - 20 * MIN;
  m.mode = "idle";
  m.modeSince = since;
  m.anomaly = undefined;
  m.activeIdleId = undefined;
  m.outsideStreak = 0;
  return { world: d.w, live: { ...live, [machineId]: backfillMachine(d.w, m, now) } };
}

export function shutdown(world: World, machineId: string, now: number): World {
  const d = new Draft(world);
  const m = d.machine(machineId);
  if (!m || m.power !== "on") return world;
  stop(d, m, now, "owner");
  return d.w;
}

export function markOk(world: World, eventId: string, now: number): World {
  const d = new Draft(world);
  const e = d.event(eventId);
  if (!e) return world;
  resolve(d, eventId, "ok", now);
  const m = e.machineId ? d.machine(e.machineId) : undefined;
  if (m && m.activeAlertId === eventId) {
    m.mode = "normal";
    m.anomaly = undefined;
    m.modeSince = undefined;
    m.outsideStreak = 0;
    m.activeAlertId = undefined;
  }
  return d.w;
}

export function keepOn(world: World, eventId: string, now: number): World {
  const d = new Draft(world);
  resolve(d, eventId, "kept-on", now);
  return d.w;
}

export function requestTechnician(
  world: World,
  machineId: string,
  techId: string,
  note: string,
  eventId: string | undefined,
  now: number,
  packet?: { snapshot: Sample[]; items: string[] },
): World {
  const d = new Draft(world);
  if (eventId) {
    resolve(d, eventId, "technician", now);
    const e = d.event(eventId);
    if (e) e.techId = techId;
  }
  d.w.techRequests = [...d.w.techRequests, { id: uid("t"), machineId, techId, note, at: now, eventId, ...packet, status: "open" }];
  return d.w;
}

/** A service resets the service date and leaves a record in the history. */
export function logService(world: World, machineId: string, techId: string | undefined, note: string, now: number): World {
  if (!world.machines.some((m) => m.id === machineId)) return world;
  return {
    ...world,
    machines: world.machines.map((m) => (m.id === machineId ? { ...m, lastServiceAt: now } : m)),
    services: [...world.services, { id: uid("sv"), machineId, at: now, techId, note: note.trim() || undefined }],
  };
}

/** Closing a request as done logs the visit as a service, by that technician. */
export function closeTechRequest(world: World, id: string, how: "done" | "cancelled", now: number): World {
  const r = world.techRequests.find((x) => x.id === id);
  if (!r || (r.status ?? "open") !== "open") return world;
  const w = { ...world, techRequests: world.techRequests.map((x) => (x.id === id ? { ...x, status: how, closedAt: now } : x)) };
  return how === "done" ? logService(w, r.machineId, r.techId, "Visit after a request", now) : w;
}

export function markAllRead(world: World): World {
  if (!world.events.some((e) => !e.read)) return world;
  return { ...world, events: world.events.map((e) => (e.read ? e : { ...e, read: true })) };
}

/**
 * Close the day: running sessions finish, the rest of the day's usage is generated,
 * anything left on is stopped by the daily shutdown, and the daily report is generated.
 */
export function fastForward(world: World, now: number): { world: World; closeAt: number } | null {
  if (world.closedDays[dayKey(now)]) return null;
  const r = makeRng(Math.floor(now / 1000));
  const d = new Draft(world);
  const w = d.w;
  const close = Math.max(atTime(now, w.settings.dailyShutdown.time), now + MIN);
  const busyUntil = new Map<string, number>();

  for (const m of w.machines) {
    if (m.power === "stopping") m.power = "off";
    if (m.power !== "on" || isAlwaysOn(m)) continue;
    if (m.activeAlertId && !d.w.events.find((e) => e.id === m.activeAlertId)?.outcome) continue;
    const s = d.activeSession(m.id);
    let end = Math.min(now + r.between(10, 70) * MIN, close - MIN);
    if (m.mode === "idle" && m.modeSince !== undefined && w.settings.autoOffIdle.enabled && !m.neverAutoOff) {
      end = Math.min(close - MIN, Math.max(now + MIN, m.modeSince + w.settings.autoOffIdle.minutes * MIN));
      if (s) s.kwh += TYPES[m.type].idleFrac * m.ratedKw * ((end - now) / HOUR);
      stop(d, m, end, "auto", "idle");
    } else {
      if (s) s.kwh += meanFrac(m.type) * m.ratedKw * ((end - now) / HOUR);
      stop(d, m, end, "end");
    }
    busyUntil.set(m.id, end);
  }

  const wd = new Date(now).getDay();
  const factor = wd === 0 || wd === 6 ? 0.35 : 1;
  const running = w.sessions.filter((s) => s.end === undefined || s.end > now);
  const added = fillBookedWindows(w.machines, running, now, close, r, w.assignments);
  for (const m of w.machines) {
    if (m.power === "on") continue;
    let from = Math.max(now, busyUntil.get(m.id) ?? now);
    const booked = added.filter((s) => s.machineId === m.id).sort((a, b) => a.start - b.start);
    for (const b of booked) {
      added.push(...generateSessions(m, from, b.start - 5 * MIN, r, w.members, w.assignments, factor));
      from = b.end! + 5 * MIN;
    }
    added.push(...generateSessions(m, from, close - 10 * MIN, r, w.members, w.assignments, factor));
  }
  for (const s of added) d.addSession(s);

  // One long print still running at closing time, so the daily shutdown has something to catch.
  const printer = w.machines.find(
    (m) => m.type === "printer" && m.power === "off" && !d.w.sessions.some((s) => s.machineId === m.id && (s.end ?? close) > close - 3 * HOUR),
  );
  if (printer && close - now > 3 * HOUR) {
    const start = close - r.between(120, 170) * MIN;
    printer.power = "on";
    d.addSession({ id: uid("s"), machineId: printer.id, start, kwh: meanFrac("printer") * printer.ratedKw * ((close - start) / HOUR) });
  }

  for (const m of w.machines) {
    const s = m.power === "on" && !isAlwaysOn(m) ? d.activeSession(m.id) : undefined;
    if (s && s.start < now) s.kwh += meanFrac(m.type) * m.ratedKw * ((close - now) / HOUR);
  }

  closeDay(d, close);
  for (const m of w.machines) {
    const last = d.w.sessions.filter((s) => s.machineId === m.id && s.end !== undefined).reduce((a, s) => Math.max(a, s.end!), 0);
    if (m.power === "off" && last) m.offAt = last;
  }
  d.w.sessions.sort((a, b) => a.start - b.start);
  d.w.clockOffset = world.clockOffset + (close + 1000 - now);
  d.w.lastTick = close + 1000;
  return { world: d.w, closeAt: close };
}
