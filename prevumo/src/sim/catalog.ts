import type { MachineType } from "./types";

/** How a machine draws power while it is doing normal work, as fractions of its rated power. */
export type Pattern =
  | { kind: "steady"; level: number; noise: number; wobble: number; band: number }
  | { kind: "load"; min: number; max: number; seg: number; noise: number }
  | { kind: "duty"; on: number; off: number; period: number; duty: number; noise: number };

export interface TypeSpec {
  label: string;
  pattern: Pattern;
  /** Flat standby draw when the machine is on but not working. */
  idleFrac: number;
  volts: number;
  /** Typical session length in minutes, and sessions on a busy weekday. */
  minutes: [number, number];
  perDay: number;
  serviceDays: number;
  alwaysOn?: boolean;
}

export const TYPES: Record<MachineType, TypeSpec> = {
  welder: {
    label: "Welder",
    pattern: { kind: "steady", level: 0.78, noise: 0.05, wobble: 0.06, band: 0.2 },
    idleFrac: 0.03, volts: 240, minutes: [20, 90], perDay: 2.2, serviceDays: 90,
  },
  laser: {
    label: "Laser cutter",
    pattern: { kind: "load", min: 0.55, max: 0.8, seg: 18, noise: 0.03 },
    idleFrac: 0.06, volts: 120, minutes: [15, 70], perDay: 3.5, serviceDays: 60,
  },
  printer: {
    label: "3D printer",
    pattern: { kind: "steady", level: 0.6, noise: 0.05, wobble: 0.1, band: 0.24 },
    idleFrac: 0.1, volts: 120, minutes: [90, 380], perDay: 1.4, serviceDays: 120,
  },
  cnc: {
    label: "CNC",
    pattern: { kind: "load", min: 0.45, max: 0.8, seg: 24, noise: 0.03 },
    idleFrac: 0.05, volts: 240, minutes: [30, 140], perDay: 1.4, serviceDays: 90,
  },
  bandsaw: {
    label: "Band saw",
    pattern: { kind: "load", min: 0.5, max: 0.85, seg: 12, noise: 0.04 },
    idleFrac: 0.12, volts: 120, minutes: [10, 45], perDay: 2.5, serviceDays: 120,
  },
  drill: {
    label: "Drill press",
    pattern: { kind: "load", min: 0.4, max: 0.75, seg: 9, noise: 0.04 },
    idleFrac: 0.1, volts: 120, minutes: [5, 30], perDay: 2.8, serviceDays: 180,
  },
  sander: {
    label: "Belt sander",
    pattern: { kind: "load", min: 0.55, max: 0.85, seg: 10, noise: 0.04 },
    idleFrac: 0.15, volts: 120, minutes: [10, 40], perDay: 1.8, serviceDays: 150,
  },
  lathe: {
    label: "Lathe",
    pattern: { kind: "load", min: 0.4, max: 0.75, seg: 20, noise: 0.03 },
    idleFrac: 0.08, volts: 240, minutes: [30, 120], perDay: 1.2, serviceDays: 120,
  },
  oven: {
    label: "Oven",
    pattern: { kind: "duty", on: 0.94, off: 0.03, period: 96, duty: 0.55, noise: 0.02 },
    idleFrac: 0.02, volts: 240, minutes: [60, 240], perDay: 1.1, serviceDays: 180,
  },
  mixer: {
    label: "Mixer",
    pattern: { kind: "load", min: 0.45, max: 0.8, seg: 15, noise: 0.03 },
    idleFrac: 0.05, volts: 120, minutes: [10, 45], perDay: 2, serviceDays: 180,
  },
  fridge: {
    label: "Fridge",
    pattern: { kind: "duty", on: 0.9, off: 0.04, period: 120, duty: 0.45, noise: 0.02 },
    idleFrac: 0.04, volts: 120, minutes: [0, 0], perDay: 0, serviceDays: 365, alwaysOn: true,
  },
  freezer: {
    label: "Freezer",
    pattern: { kind: "duty", on: 0.92, off: 0.04, period: 140, duty: 0.55, noise: 0.02 },
    idleFrac: 0.04, volts: 120, minutes: [0, 0], perDay: 0, serviceDays: 365, alwaysOn: true,
  },
  centrifuge: {
    label: "Centrifuge",
    pattern: { kind: "steady", level: 0.7, noise: 0.03, wobble: 0.04, band: 0.18 },
    idleFrac: 0.04, volts: 120, minutes: [10, 40], perDay: 2.4, serviceDays: 180,
  },
  hotplate: {
    label: "Hot plate",
    pattern: { kind: "duty", on: 0.9, off: 0.05, period: 60, duty: 0.6, noise: 0.02 },
    idleFrac: 0.03, volts: 120, minutes: [30, 120], perDay: 1.6, serviceDays: 240,
  },
  fumehood: {
    label: "Fume hood",
    pattern: { kind: "steady", level: 0.72, noise: 0.02, wobble: 0.02, band: 0.15 },
    idleFrac: 0.3, volts: 120, minutes: [60, 240], perDay: 1.3, serviceDays: 180,
  },
  sewing: {
    label: "Sewing machine",
    pattern: { kind: "load", min: 0.3, max: 0.7, seg: 6, noise: 0.05 },
    idleFrac: 0.1, volts: 120, minutes: [30, 120], perDay: 1.5, serviceDays: 240,
  },
};

/** Average draw while working, as a fraction of rated power. Used for history and energy estimates. */
export function meanFrac(type: MachineType): number {
  const p = TYPES[type].pattern;
  if (p.kind === "steady") return p.level;
  if (p.kind === "load") return (p.min + p.max) / 2;
  return p.on * p.duty + p.off * (1 - p.duty);
}

export const LEARNING_DAYS = 7;

export const TECHNICIANS = [
  {
    id: "volt",
    name: "Volt Repair Ottawa",
    specialty: "Welders, saws and power tools",
    rating: 4.8,
    km: 3.2,
    response: "Usually within 2 h",
    fits: ["welder", "bandsaw", "drill", "sander", "lathe"] as MachineType[],
  },
  {
    id: "rideau",
    name: "Rideau Shop Services",
    specialty: "CNC, laser cutters and 3D printers",
    rating: 4.6,
    km: 5.9,
    response: "Same day",
    fits: ["cnc", "laser", "printer", "sewing"] as MachineType[],
  },
  {
    id: "capital",
    name: "Capital Lab Equipment",
    specialty: "Ovens, fridges and lab equipment",
    rating: 4.7,
    km: 8.4,
    response: "Next morning",
    fits: ["oven", "fridge", "freezer", "centrifuge", "hotplate", "fumehood", "mixer"] as MachineType[],
  },
];

export type Technician = (typeof TECHNICIANS)[number];

export function bestTechnician(type: MachineType): Technician {
  return TECHNICIANS.find((t) => t.fits.includes(type)) ?? TECHNICIANS[0];
}
