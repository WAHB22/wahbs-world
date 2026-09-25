import { describe, expect, it } from "vitest";
import { capped, naturalIntensity, type Load } from "@/living/intensity";
import { schedule } from "@/worlds/knowledge/review";
import { checkPasscode, type LockConfig } from "@/privacy/passcode";

const idle: Load = { dueToday: 0, overdue: 0, dueSoon: 0, shiftNow: false, shiftToday: false };
const at = (h: number, m = 0) => new Date(2026, 8, 25, h, m);

describe("the day's pace", () => {
  it("follows the clock when nothing is due", () => {
    expect(naturalIntensity(at(3), idle)).toBe("calm");
    expect(naturalIntensity(at(8), idle)).toBe("opening");
    expect(naturalIntensity(at(14), idle)).toBe("service");
    expect(naturalIntensity(at(23), idle)).toBe("calm");
  });
  it("rises with what is due and with a shift under way", () => {
    expect(naturalIntensity(at(8), { ...idle, dueSoon: 1 })).toBe("service");
    expect(naturalIntensity(at(8), { ...idle, dueToday: 1 })).toBe("rush");
    expect(naturalIntensity(at(15), { ...idle, shiftNow: true })).toBe("rush");
  });
  it("never goes above the cap", () => {
    expect(capped("rush", "calm")).toBe("calm");
    expect(capped("opening", "service")).toBe("opening");
    expect(capped("rush", "rush")).toBe("rush");
  });
});

describe("spaced review", () => {
  it("pushes a remembered topic further out each time", () => {
    const first = schedule(1, 2.5, "good");
    expect(first).toEqual({ interval: 3, ease: 2.5 });
    const second = schedule(first.interval, first.ease, "good");
    expect(second.interval).toBe(8);
  });
  it("brings a forgotten topic back tomorrow and makes it harder", () => {
    expect(schedule(20, 2.5, "again")).toEqual({ interval: 1, ease: 2.3 });
    expect(schedule(20, 1.3, "again").ease).toBe(1.3);
  });
  it("gives easy the longest gap and caps the ease", () => {
    const easy = schedule(10, 3.2, "easy");
    expect(easy.interval).toBeGreaterThan(schedule(10, 3.2, "good").interval);
    expect(easy.ease).toBe(3.2);
  });
});

describe("passcode", () => {
  it("accepts the right code and refuses any other", async () => {
    const salt = new Uint8Array(16).fill(7);
    const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("4711"), "PBKDF2", false, ["deriveBits"]);
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 1000 }, key, 256);
    const cfg: LockConfig = { salt: btoa(String.fromCharCode(...salt)), hash: btoa(String.fromCharCode(...new Uint8Array(bits))), iterations: 1000, afterMinutes: 5 };
    expect(await checkPasscode(cfg, "4711")).toBe(true);
    expect(await checkPasscode(cfg, "4712")).toBe(false);
    expect(await checkPasscode(cfg, "")).toBe(false);
  });
});
