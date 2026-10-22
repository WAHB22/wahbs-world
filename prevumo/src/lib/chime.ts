import { useSyncExternalStore } from "react";

/**
 * Alert chime made with the Web Audio API: two soft notes a rising fourth apart, a question rather than a siren.
 * Off by default, turned on only by a click in Settings, saved per device, never plays in a hidden tab.
 */
export type ChimeLevel = "warning" | "critical";
const KEY = "prevumo:alert-sound";
const listeners = new Set<() => void>();
let ctx: AudioContext | undefined;
let enabled = read();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

export const isSoundOn = () => enabled;
export const useSoundOn = () => useSyncExternalStore(subscribe, isSoundOn, () => false);

export function setSoundOn(on: boolean) {
  enabled = on;
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* lasts until the page closes */
  }
  listeners.forEach((l) => l());
  if (on) previewChime();
}

/** Browsers unlock audio only inside a click or key press. */
function unlock(): Promise<AudioContext | undefined> {
  if (!ctx) {
    const AC = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return Promise.resolve(undefined);
    ctx = new AC();
  }
  const c = ctx;
  return c.state === "running" ? Promise.resolve(c) : c.resume().then(() => c, () => undefined);
}

// Turned on during an earlier visit: the first click or key press of this visit unlocks it.
const wake = () => {
  if (enabled) void unlock();
};
window.addEventListener("pointerdown", wake, { once: true, capture: true });
window.addEventListener("keydown", wake, { once: true, capture: true });

function strike(c: AudioContext, out: AudioNode, freq: number, at: number, len: number) {
  for (const [mult, peak, decay] of [
    [1, 0.22, len],
    [2, 0.05, len * 0.4],
  ] as const) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = "sine";
    osc.frequency.value = freq * mult;
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    osc.connect(gain).connect(out);
    osc.start(at);
    osc.stop(at + decay + 0.05);
  }
}

function play(c: AudioContext, level: ChimeLevel) {
  const out = c.createGain();
  out.gain.value = 0.8;
  out.connect(c.destination);
  const t = c.currentTime + 0.03;
  const figure = (at: number) => {
    strike(c, out, 659.25, at, 0.45);
    strike(c, out, 880, at + 0.15, 0.7);
  };
  figure(t);
  if (level === "critical") figure(t + 0.75);
}

export function playChime(level: ChimeLevel) {
  const c = ctx;
  if (!enabled || !c || c.state !== "running" || document.visibilityState !== "visible") return;
  play(c, level);
}

export function previewChime(level: ChimeLevel = "warning") {
  void unlock().then((c) => {
    if (c && enabled) play(c, level);
  });
}
