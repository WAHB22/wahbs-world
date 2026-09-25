/**
 * Sound, synthesised with Web Audio: no files, nothing to license. Off by default; the audio
 * context is only created by a sound that answers something the user did (a tap, a check in).
 * "subtle" plays only the important moments; "full" also plays small confirmations.
 */
export type SoundName = "enter" | "check" | "done" | "tick" | "undo";
type Profile = "off" | "subtle" | "full";

let profile: Profile = "off";
let volume = 0.6;
let ctx: AudioContext | null = null;

export function configureSound(p: Profile, v: number) { profile = p; volume = Math.max(0, Math.min(1, v)); }

const IMPORTANT: SoundName[] = ["enter", "done", "check"];

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  ctx ??= new AC();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** A struck metal partial: fast attack, exponential decay. */
function partial(ac: AudioContext, out: AudioNode, freq: number, at: number, len: number, gain: number, type: OscillatorType = "sine") {
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  o.connect(g).connect(out);
  o.start(at);
  o.stop(at + len + 0.02);
}

export function playSound(name: SoundName) {
  if (profile === "off" || (profile === "subtle" && !IMPORTANT.includes(name))) return;
  const ac = audio();
  if (!ac) return;
  const out = ac.createGain();
  out.gain.value = volume * (profile === "subtle" ? 0.5 : 0.8);
  out.connect(ac.destination);
  const t = ac.currentTime + 0.005;
  if (name === "enter") {
    // A small chrome bowl: a fundamental and two inharmonic partials.
    partial(ac, out, 880, t, 0.9, 0.12); partial(ac, out, 880 * 2.76, t, 0.5, 0.05); partial(ac, out, 880 * 5.4, t, 0.25, 0.02);
  } else if (name === "done") {
    partial(ac, out, 659.25, t, 0.45, 0.12); partial(ac, out, 987.77, t + 0.09, 0.6, 0.11);
  } else if (name === "check") {
    partial(ac, out, 523.25, t, 0.28, 0.12, "triangle"); partial(ac, out, 1046.5, t + 0.04, 0.22, 0.05);
  } else if (name === "undo") {
    partial(ac, out, 587.33, t, 0.2, 0.08, "triangle"); partial(ac, out, 440, t + 0.07, 0.25, 0.07, "triangle");
  } else {
    partial(ac, out, 1760, t, 0.06, 0.05, "square");
  }
}
