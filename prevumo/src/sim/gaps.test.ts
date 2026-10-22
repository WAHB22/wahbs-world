import { describe, expect, it } from "vitest";
import { backfill, fastForward, tick, triggerIdle } from "./engine";
import { isInUse } from "./insights";
import { seedWorld } from "./seed";

const NOW = new Date(2026, 9, 21, 14, 30, 0).getTime();

describe("edges", () => {
  it("a tab that sleeps past closing time still closes that day", () => {
    const w = seedWorld(NOW);
    const r = tick(w, backfill(w, NOW), new Date(2026, 9, 22, 9, 0, 0).getTime());
    expect(r.world.closedDays["2026-10-21"]).toBeDefined();
    expect(r.world.machines.filter(isInUse)).toHaveLength(0);
  });
  it("fast forward leaves no prompt waiting and honours a disabled daily shutdown", () => {
    let w = seedWorld(NOW);
    w = { ...w, settings: { ...w.settings, autoOffIdle: { enabled: false, minutes: 60 } } };
    const idle = triggerIdle(w, backfill(w, NOW), "ms1-printer-4", NOW);
    const r = tick(idle.world, idle.live, NOW + 2000);
    const ff = fastForward(r.world, NOW + 2000)!.world;
    expect(ff.events.filter((e) => (e.kind === "idle" || e.kind === "overrun") && !e.outcome)).toHaveLength(0);
    const off = { ...seedWorld(NOW) };
    off.settings = { ...off.settings, dailyShutdown: { enabled: false, time: "22:00" } };
    expect(fastForward(off, NOW)!.world.events.some((e) => e.autoReason === "daily" && e.at > NOW)).toBe(false);
  });
});
