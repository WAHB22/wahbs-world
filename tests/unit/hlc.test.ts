import { describe, expect, it } from "vitest";
import { format, parse, receive, tick, SEED_HLC } from "@/data/hlc";

describe("hybrid clock", () => {
  it("formats so that text order is time order", () => {
    const a = format({ wall: 5, counter: 2, device: "a" });
    const b = format({ wall: 5, counter: 10, device: "a" });
    const c = format({ wall: 1_700_000_000_000, counter: 0, device: "a" });
    expect(a < b && b < c).toBe(true);
    expect(parse(b)).toEqual({ wall: 5, counter: 10, device: "a" });
  });
  it("never goes backwards when the wall clock does", () => {
    const first = tick({ wall: 0, counter: 0, device: "p" }, 1000);
    const second = tick(first, 500);
    expect(format(second) > format(first)).toBe(true);
  });
  it("moves past a remote stamp from a device whose clock is ahead", () => {
    const local = { wall: 1000, counter: 0, device: "phone" };
    const remote = format({ wall: 9000, counter: 3, device: "laptop" });
    const after = tick(receive(local, remote, 1000), 1000);
    expect(format(after) > remote).toBe(true);
  });
  it("seed stamps lose to any real edit", () => {
    expect(SEED_HLC < format(tick({ wall: 0, counter: 0, device: "x" }, 1))).toBe(true);
  });
});
