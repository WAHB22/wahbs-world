export type MachineType =
  | "welder"
  | "laser"
  | "printer"
  | "cnc"
  | "bandsaw"
  | "drill"
  | "sander"
  | "lathe"
  | "oven"
  | "mixer"
  | "fridge"
  | "freezer"
  | "centrifuge"
  | "hotplate"
  | "fumehood"
  | "sewing";

export type AnomalyKind = "spike" | "sag" | "erratic";

export interface Location {
  id: string;
  name: string;
}

export interface Machine {
  id: string;
  name: string;
  type: MachineType;
  locationId: string;
  ratedKw: number;
  neverAutoOff: boolean;
  createdAt: number;
  /** Set while the box is still learning the normal pattern (7 days). */
  learningUntil?: number;
  lastServiceAt: number;
  seed: number;
  power: "off" | "on" | "stopping";
  stoppingUntil?: number;
  offAt?: number;
  mode: "normal" | "idle" | "anomaly";
  modeSince?: number;
  anomaly?: AnomalyKind;
  /** Consecutive seconds outside the normal band. */
  outsideStreak: number;
  activeAlertId?: string;
  activeIdleId?: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  pin: string;
}

export type Frame =
  | { kind: "always" }
  | { kind: "schedule"; from: string; to: string; days: number[]; start: string; end: string };

export interface Assignment {
  id: string;
  name: string;
  email: string;
  machineIds: string[];
  frame: Frame;
  createdAt: number;
  removedAt?: number;
}

export interface Session {
  id: string;
  machineId: string;
  start: number;
  end?: number;
  pinMemberId?: string;
  kwh: number;
}

export type EventKind = "irregular" | "idle" | "overrun" | "auto-off" | "report";
export type Outcome = "shutdown" | "technician" | "ok" | "kept-on" | "auto-off" | "generated";

export interface AppEvent {
  id: string;
  kind: EventKind;
  at: number;
  locationId: string;
  machineId?: string;
  sessionId?: string;
  anomaly?: AnomalyKind;
  /** Measured draw divided by the expected draw over the episode (erratic: the widest swing). */
  factor?: number;
  /** Samples measured in the episode so far. */
  n?: number;
  /** Seconds the episode lasted, frozen once the owner decides. */
  durationSec?: number;
  /** Idle prompts: when the flat draw started and what it drew. */
  idleSince?: number;
  drawKw?: number;
  bookingEnd?: number;
  autoReason?: "idle" | "daily";
  outcome?: Outcome;
  outcomeAt?: number;
  techId?: string;
  read: boolean;
}

export interface TechRequest {
  id: string;
  machineId: string;
  techId: string;
  note: string;
  at: number;
  eventId?: string;
  /** The power trace and summary sent with the request, frozen when it was sent. */
  snapshot?: Sample[];
  items?: string[];
  /** Undefined reads as open. */
  status?: "open" | "done" | "cancelled";
  closedAt?: number;
}

export interface ServiceRecord {
  id: string;
  machineId: string;
  at: number;
  techId?: string;
  note?: string;
}

export interface Settings {
  idlePromptMin: number;
  autoOffIdle: { enabled: boolean; minutes: number };
  dailyShutdown: { enabled: boolean; time: string };
}

export interface World {
  version: number;
  loggedIn: boolean;
  clockOffset: number;
  lastTick: number;
  locations: Location[];
  machines: Machine[];
  members: Member[];
  assignments: Assignment[];
  sessions: Session[];
  events: AppEvent[];
  techRequests: TechRequest[];
  services: ServiceRecord[];
  settings: Settings;
  /** Day key (YYYY-MM-DD) to the time its daily report was generated. */
  closedDays: Record<string, number>;
  hideDemoButton: boolean;
}

export interface Sample {
  /** Epoch seconds. */
  t: number;
  kw: number;
  lo: number;
  hi: number;
  out: boolean;
}
