import { useSyncExternalStore } from "react";
import { flushSync } from "react-dom";
import * as engine from "../sim/engine";
import type { Live } from "../sim/engine";
import { LEARNING_DAYS, TYPES } from "../sim/catalog";
import { seedWorld, uid, WORLD_VERSION } from "../sim/seed";
import type { AnomalyKind, Assignment, Machine, MachineType, Member, Sample, Settings, World } from "../sim/types";
import { DAY } from "../lib/time";

export type Overlay =
  | { type: "alert"; eventId: string }
  | { type: "shutdown"; machineId: string }
  | { type: "tech"; machineId: string; eventId?: string }
  | { type: "assign"; assignmentId?: string; machineIds?: string[] }
  | { type: "machine"; machineId: string }
  | null;

export interface Toast {
  id: string;
  text: string;
  action?: { label: string; run: () => void };
}

export interface AppState {
  world: World;
  live: Live;
  now: number;
  overlay: Overlay;
  toasts: Toast[];
  demoOpen: boolean;
}

const KEY = "prevumo:world";

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;
const HM = /^\d{2}:\d{2}$/;
/** Every row is an object with a string id that passes `ok`. */
const rows = (v: unknown, ok: (r: Record<string, unknown>) => boolean) => Array.isArray(v) && v.every((r) => isObj(r) && isStr(r.id) && ok(r));
const isFrame = (f: unknown) =>
  isObj(f) &&
  (f.kind === "always" ||
    (f.kind === "schedule" && DAY_KEY.test(String(f.from)) && DAY_KEY.test(String(f.to)) && HM.test(String(f.start)) && HM.test(String(f.end)) && Array.isArray(f.days)));

/** Use a stored world only when every field the screens read has the right type; anything else starts a fresh demo. */
function isWorld(v: unknown): v is World {
  if (!isObj(v)) return false;
  const s = v.settings;
  return (
    v.version === WORLD_VERSION &&
    isNum(v.lastTick) &&
    isNum(v.clockOffset) &&
    Math.abs(v.clockOffset) < 400 * DAY &&
    rows(v.locations, (l) => isStr(l.name)) &&
    (v.locations as unknown[]).length > 0 &&
    rows(v.machines, (m) => isStr(m.name) && isStr(m.locationId) && Object.hasOwn(TYPES, String(m.type)) && isNum(m.ratedKw)) &&
    rows(v.members, (m) => isStr(m.name) && isStr(m.pin) && isStr(m.email)) &&
    rows(v.assignments, (a) => isStr(a.name) && isStr(a.email) && Array.isArray(a.machineIds) && isFrame(a.frame)) &&
    rows(v.sessions, (x) => isStr(x.machineId) && isNum(x.start) && isNum(x.kwh) && (x.end === undefined || isNum(x.end))) &&
    rows(v.events, (e) => isStr(e.kind) && isNum(e.at)) &&
    rows(v.techRequests, (r) => isStr(r.machineId) && isNum(r.at)) &&
    rows(v.services, (r) => isStr(r.machineId) && isNum(r.at)) &&
    isObj(v.closedDays) &&
    Object.values(v.closedDays).every(isNum) &&
    isObj(s) &&
    isNum(s.idlePromptMin) &&
    isObj(s.autoOffIdle) &&
    isNum(s.autoOffIdle.minutes) &&
    isObj(s.dailyShutdown) &&
    HM.test(String(s.dailyShutdown.time))
  );
}

function load(): World {
  try {
    const url = new URL(location.href);
    if (url.searchParams.has("reset")) {
      // Escape hatch: open any page with ?reset to start the demo again.
      localStorage.removeItem(KEY);
      url.searchParams.delete("reset");
      history.replaceState(null, "", url);
    }
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const w: unknown = JSON.parse(raw);
      if (isWorld(w)) return w;
      localStorage.removeItem(KEY);
    }
  } catch {
    /* fall through to a fresh demo */
  }
  return seedWorld(Date.now());
}

function save(w: World) {
  try {
    localStorage.setItem(KEY, JSON.stringify(w));
  } catch {
    /* storage full or blocked: the demo keeps running in memory */
  }
}

function boot(world: World): AppState {
  const now = Date.now() + world.clockOffset;
  const caught = engine.tick(world, engine.backfill(world, Math.min(now, world.lastTick)), now);
  return { world: caught.world, live: engine.backfill(caught.world, now), now, overlay: null, toasts: [], demoOpen: false };
}

function init(): AppState {
  try {
    return boot(load());
  } catch {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    return boot(seedWorld(Date.now()));
  }
}

let state: AppState = init();
const listeners = new Set<() => void>();
let lastSave = 0;

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function emit(transition: boolean) {
  const run = () => listeners.forEach((l) => l());
  if (transition && typeof document.startViewTransition === "function" && !reducedMotion() && !document.hidden) {
    document.startViewTransition(() => flushSync(run));
  } else {
    run();
  }
}

function set(next: Partial<AppState>, opts: { transition?: boolean; persist?: boolean } = {}) {
  state = { ...state, ...next };
  if (opts.persist) {
    save(state.world);
    lastSave = Date.now();
  }
  emit(opts.transition ?? false);
}

export function getState(): AppState {
  return state;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function useApp(): AppState {
  return useSyncExternalStore(subscribe, getState);
}

export function simNow(): number {
  return Date.now() + state.world.clockOffset;
}

/* The clock: one sample per second for every machine. */

let timer: number | undefined;
export function startClock() {
  if (timer !== undefined) return;
  const step = () => {
    const now = simNow();
    const r = engine.tick(state.world, state.live, now);
    if (r.world === state.world) return;
    set({ world: r.world, live: r.live, now }, { transition: r.powerChanged });
    if (Date.now() - lastSave > 4000) {
      save(state.world);
      lastSave = Date.now();
    }
  };
  // Fire just after each whole second, when the new sample exists, so the sparklines never stall.
  const schedule = () => {
    timer = window.setTimeout(() => {
      step();
      schedule();
    }, 1000 - (simNow() % 1000) + 10);
  };
  schedule();
  const flush = () => save(state.world);
  window.addEventListener("pagehide", flush);
  document.addEventListener("visibilitychange", () => document.hidden && flush());
}

function apply(world: World, transition = false) {
  set({ world }, { persist: true, transition });
}

/* UI */

export function openOverlay(overlay: Overlay) {
  set({ overlay });
}

export function closeOverlay() {
  set({ overlay: null });
}

export function toast(text: string, action?: Toast["action"]) {
  const t = { id: uid("toast"), text, action };
  set({ toasts: [...state.toasts, t] });
  window.setTimeout(() => set({ toasts: state.toasts.filter((x) => x.id !== t.id) }), action ? 8000 : 4500);
}

export function dismissToast(id: string) {
  set({ toasts: state.toasts.filter((x) => x.id !== id) });
}

export function setDemoOpen(demoOpen: boolean) {
  set({ demoOpen });
}

/* Session and account */

export function logIn() {
  apply({ ...state.world, loggedIn: true });
}

export function logOut() {
  apply({ ...state.world, loggedIn: false });
}

export function resetDemo() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  const world = { ...seedWorld(Date.now()), loggedIn: true };
  const now = Date.now();
  set({ world, live: engine.backfill(world, now), now, overlay: null, toasts: [] }, { persist: true });
  toast("Demo data reset");
}

/* Owner decisions */

export function shutdownMachine(machineId: string) {
  const m = state.world.machines.find((x) => x.id === machineId);
  apply(engine.shutdown(state.world, machineId, simNow()));
  set({ overlay: null });
  if (m) toast(`${m.name} is shutting down. It won't restart on its own.`);
}

export function markOk(eventId: string) {
  apply(engine.markOk(state.world, eventId, simNow()));
  set({ overlay: null });
  toast("Marked as OK and logged");
}

export function keepOn(eventId: string) {
  apply(engine.keepOn(state.world, eventId, simNow()));
}

export function requestTechnician(machineId: string, techId: string, note: string, eventId?: string, packet?: { snapshot: Sample[]; items: string[] }) {
  apply(engine.requestTechnician(state.world, machineId, techId, note, eventId, simNow(), packet));
}

export function closeTechRequest(id: string, how: "done" | "cancelled") {
  apply(engine.closeTechRequest(state.world, id, how, simNow()));
  if (how === "cancelled") return toast("Request cancelled");
  const sv = state.world.services.at(-1)!;
  toast("Visit logged. The service date is set to today.", { label: "Undo", run: () => removeService(sv.id) });
}

export function logService(machineId: string, techId: string | undefined, note: string) {
  const m = state.world.machines.find((x) => x.id === machineId);
  if (!m) return;
  apply(engine.logService(state.world, machineId, techId, note, simNow()));
  const sv = state.world.services.at(-1)!;
  toast(`${m.name} service logged. Next one due in ${TYPES[m.type].serviceDays} days.`, { label: "Undo", run: () => removeService(sv.id) });
}

export function removeService(id: string) {
  apply(engine.removeService(state.world, id));
  toast("Service removed. The previous service date is back.");
}

export function markAllRead() {
  const w = engine.markAllRead(state.world);
  if (w !== state.world) apply(w);
}

/* Assignments, machines, members, settings */

export function saveAssignment(a: Omit<Assignment, "id" | "createdAt"> & { id?: string }) {
  const w = state.world;
  const exists = a.id ? w.assignments.find((x) => x.id === a.id) : undefined;
  const assignments = exists
    ? w.assignments.map((x) => (x.id === a.id ? { ...x, ...a, id: x.id } : x))
    : [...w.assignments, { ...a, id: uid("as"), createdAt: simNow() }];
  apply({ ...w, assignments });
}

export function removeAssignment(id: string) {
  const now = simNow();
  apply({
    ...state.world,
    assignments: state.world.assignments.map((a) => (a.id === id ? { ...a, removedAt: now } : a)),
  });
}

export function addMachine(input: { name: string; type: MachineType; locationId: string; ratedKw: number; neverAutoOff: boolean }) {
  const now = simNow();
  const machine: Machine = {
    ...input,
    id: uid("m"),
    createdAt: now,
    learningUntil: now + LEARNING_DAYS * DAY,
    lastServiceAt: now,
    seed: Math.floor(Math.random() * 9000) + 1000,
    power: "off",
    mode: "normal",
    outsideStreak: 0,
  };
  const world = { ...state.world, machines: [...state.world.machines, machine] };
  const live = { ...state.live, [machine.id]: engine.backfillMachine(world, machine, now) };
  set({ world, live }, { persist: true });
  return machine;
}

export function updateMachine(id: string, patch: Partial<Pick<Machine, "name" | "ratedKw" | "neverAutoOff">>) {
  apply({ ...state.world, machines: state.world.machines.map((m) => (m.id === id ? { ...m, ...patch } : m)) });
}

export function setNeverAutoOff(ids: Set<string>) {
  apply({ ...state.world, machines: state.world.machines.map((m) => ({ ...m, neverAutoOff: ids.has(m.id) })) });
}

export function updateSettings(settings: Settings) {
  apply({ ...state.world, settings });
}

export function addMember(name: string, email: string): Member {
  const used = new Set(state.world.members.map((m) => m.pin));
  let pin: string;
  do pin = String(Math.floor(1000 + Math.random() * 9000));
  while (used.has(pin));
  const member = { id: uid("mem"), name, email, pin };
  apply({ ...state.world, members: [...state.world.members, member] });
  return member;
}

export function setHideDemoButton(hideDemoButton: boolean) {
  apply({ ...state.world, hideDemoButton });
}

/* Demo controls */

export function demoStartSession(machineId: string, pinMemberId?: string) {
  apply(engine.startSession(state.world, machineId, pinMemberId, simNow()), true);
}

export function demoIrregular(machineId: string, kind: AnomalyKind) {
  apply(engine.triggerIrregular(state.world, machineId, kind, simNow()), true);
}

export function demoIdle(machineId: string) {
  const r = engine.triggerIdle(state.world, state.live, machineId, simNow());
  set({ world: r.world, live: r.live }, { persist: true, transition: true });
}

/** Returns false when today was already closed. */
export function demoFastForward(): boolean {
  const r = engine.fastForward(state.world, simNow());
  if (!r) return false;
  const now = r.closeAt + 1000;
  set({ world: r.world, live: engine.backfill(r.world, now), now, overlay: null }, { persist: true });
  return true;
}
