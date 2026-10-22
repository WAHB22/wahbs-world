import { describe, expect, it } from "vitest";
import { atTime, HOUR, MIN } from "../lib/time";
import { attribute } from "./attribution";
import { backfill, closeTechRequest, fastForward, logService, markOk, requestTechnician, shutdown, tick, triggerIdle, triggerIrregular } from "./engine";
import { activeSession, irregularReason, isInUse, ordinal, health, severity } from "./insights";
import { buildReport, rangeFor } from "./reports";
import { seedWorld } from "./seed";
import type { World } from "./types";

// A Wednesday afternoon, inside the Beta Inc. window (Tue to Thu, 13:00 to 17:00).
const NOW = new Date(2026, 9, 21, 14, 30, 0).getTime();

function run(w: World, from: number, seconds: number) {
  let live = backfill(w, from);
  let world = w;
  for (let i = 1; i <= seconds; i++) {
    const r = tick(world, live, from + i * 1000);
    world = r.world;
    live = r.live;
  }
  return { world, live };
}

describe("seed", () => {
  const w = seedWorld(NOW);
  it("has three locations of 6 to 14 machines and 8 to 10 members", () => {
    expect(w.locations).toHaveLength(3);
    for (const l of w.locations) {
      const n = w.machines.filter((m) => m.locationId === l.id).length;
      expect(n).toBeGreaterThanOrEqual(6);
      expect(n).toBeLessThanOrEqual(14);
    }
    expect(w.members.length).toBeGreaterThanOrEqual(8);
    expect(w.assignments).toHaveLength(2);
  });
  it("starts Makerspace 1 with three machines in use, one per attribution kind", () => {
    const inUse = w.machines.filter((m) => m.locationId === "ms1" && isInUse(m));
    expect(inUse.map((m) => m.name).sort()).toEqual(["3D printer 4", "CNC router", "Welder 2"]);
    const kinds = inUse.map((m) => attribute(activeSession(w, m.id)!, w.members, w.assignments).kind).sort();
    expect(kinds).toEqual(["assigned", "pin", "unassigned"]);
  });
  it("has 30 days of history and no overlapping sessions per machine", () => {
    expect(w.sessions.length).toBeGreaterThan(400);
    for (const m of w.machines) {
      const s = w.sessions.filter((x) => x.machineId === m.id);
      for (let i = 1; i < s.length; i++) expect(s[i].start).toBeGreaterThanOrEqual(s[i - 1].end ?? Infinity);
    }
  });
});

describe("attribution", () => {
  const w = seedWorld(NOW);
  it("a PIN overrides an assignment, an assignment covers its window, otherwise Unassigned", () => {
    const amira = w.members[0].id;
    expect(attribute({ machineId: "ms1-welder-2", start: NOW, pinMemberId: amira }, w.members, w.assignments).label).toBe("Amira Haddad");
    expect(attribute({ machineId: "ms1-welder-2", start: NOW }, w.members, w.assignments).label).toBe("Beta Inc.");
    expect(attribute({ machineId: "ms1-welder-2", start: atTime(NOW, "18:00") }, w.members, w.assignments).label).toBe("Unassigned");
  });
});

describe("live engine", () => {
  it("flags an irregularity within a few seconds and measures the spike", () => {
    const w0 = triggerIrregular(seedWorld(NOW), "ms1-welder-2", "spike", NOW);
    const { world } = run(w0, NOW, 6);
    const welder = world.machines.find((m) => m.id === "ms1-welder-2")!;
    const e = world.events.find((x) => x.id === welder.activeAlertId)!;
    expect(e.kind).toBe("irregular");
    expect(e.factor!).toBeGreaterThan(2.1);
    expect(e.factor!).toBeLessThan(2.5);
    expect(irregularReason(e, NOW + 6000)).toMatch(/^Spiked to 2\.\d× normal for \d s$/);
    const h = health(world, welder, NOW + 6000);
    expect(ordinal(h.irregularMonth)).toBe("3rd");
    expect(h.daysSinceService).toBe(74);
  });

  it("never raises an alert on normal noise", () => {
    const { world } = run(seedWorld(NOW), NOW, 120);
    expect(world.events.filter((e) => !e.read)).toHaveLength(0);
  });

  it("prompts on idle right away, and shutting down ends the session for good", () => {
    const w0 = seedWorld(NOW);
    const r = triggerIdle(w0, backfill(w0, NOW), "ms1-printer-4", NOW);
    let { world } = run(r.world, NOW, 2);
    const p = world.machines.find((m) => m.id === "ms1-printer-4")!;
    const prompt = world.events.find((e) => e.id === p.activeIdleId)!;
    expect(prompt.kind).toBe("idle");
    expect(Math.round((prompt.at - prompt.idleSince!) / MIN)).toBe(45);
    expect(prompt.drawKw!).toBeCloseTo(0.02, 2);
    world = shutdown(world, p.id, NOW + 3000);
    world = run(world, NOW + 3000, 5).world;
    expect(world.machines.find((m) => m.id === p.id)!.power).toBe("off");
    expect(world.events.find((e) => e.id === prompt.id)!.outcome).toBe("shutdown");
    expect(activeSession(world, p.id)).toBeUndefined();
  });

  it("Mark as OK clears the alert and the machine goes back to normal", () => {
    const w0 = triggerIrregular(seedWorld(NOW), "ms1-welder-2", "sag", NOW);
    let { world } = run(w0, NOW, 5);
    const id = world.machines.find((m) => m.id === "ms1-welder-2")!.activeAlertId!;
    world = markOk(world, id, NOW + 5000);
    world = run(world, NOW + 5000, 30).world;
    expect(world.events.filter((e) => e.kind === "irregular" && !e.read)).toHaveLength(1);
    expect(world.machines.find((m) => m.id === "ms1-welder-2")!.mode).toBe("normal");
  });
});

describe("end of day", () => {
  it("closes the day, stops everything and reports per machine and per member", () => {
    const w0 = seedWorld(NOW);
    const r = fastForward(w0, NOW)!;
    expect(r.closeAt).toBe(atTime(NOW, "22:00"));
    const w = r.world;
    expect(w.machines.filter((m) => isInUse(m))).toHaveLength(0);
    expect(w.events.filter((e) => e.kind === "report")).toHaveLength(3);
    const now = r.closeAt + 1000;
    const report = buildReport(w, "ms1", rangeFor("today", now), now);
    expect(report.hours).toBeGreaterThan(5);
    expect(report.members.at(-1)!.label).toBe("Unassigned");
    expect(report.members.some((m) => m.label === "Beta Inc.")).toBe(true);
    const kwh = report.machines.reduce((a, m) => a + m.kwh, 0);
    expect(kwh).toBeCloseTo(report.kwh, 5);
    expect(fastForward(w, now)).toBeNull();
  });

  it("reports this month across 30 days of history", () => {
    const w = seedWorld(NOW);
    const report = buildReport(w, "ms1", rangeFor("month", NOW), NOW);
    expect(report.hours).toBeGreaterThan(50);
    expect(report.irregular).toBeGreaterThanOrEqual(2);
    expect(HOUR).toBe(3_600_000);
  });
});

describe("maintenance and alerts", () => {
  it("a logged service clears the age and irregularity penalties", () => {
    const w0 = seedWorld(NOW);
    const welder = w0.machines.find((m) => m.id === "ms1-welder-2")!;
    const before = health(w0, welder, NOW);
    expect(before.irregularSinceService).toBe(2);
    const w1 = logService(w0, welder.id, "volt", "Replaced the liner", NOW);
    const after = health(w1, w1.machines.find((m) => m.id === welder.id)!, NOW + 1000);
    expect(after.score).toBe(100);
    expect(after.dueInDays).toBe(90);
    expect(w1.services.filter((s) => s.machineId === welder.id).at(-1)?.note).toBe("Replaced the liner");
  });

  it("closing a technician request as done logs the visit as a service", () => {
    const w0 = requestTechnician(seedWorld(NOW), "ms1-cnc", "rideau", "", undefined, NOW);
    const req = w0.techRequests[0];
    expect(req.status).toBe("open");
    const w1 = closeTechRequest(w0, req.id, "done", NOW + HOUR);
    expect(w1.techRequests[0].status).toBe("done");
    expect(w1.services.at(-1)).toMatchObject({ machineId: "ms1-cnc", techId: "rideau" });
    expect(closeTechRequest(w1, req.id, "cancelled", NOW + 2 * HOUR)).toBe(w1);
  });

  it("rates a spike past the nameplate as critical and a sag as a warning", () => {
    const spike = run(triggerIrregular(seedWorld(NOW), "ms1-welder-2", "spike", NOW), NOW, 6).world;
    const sag = run(triggerIrregular(seedWorld(NOW), "ms1-welder-2", "sag", NOW), NOW, 6).world;
    const e = (w: World) => w.events.find((x) => x.id === w.machines.find((m) => m.id === "ms1-welder-2")!.activeAlertId)!;
    const m = (w: World) => w.machines.find((x) => x.id === "ms1-welder-2")!;
    expect(severity(e(spike), m(spike))).toBe("critical");
    expect(severity(e(sag), m(sag))).toBe("warning");
  });
});
