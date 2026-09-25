/**
 * The device passcode. Kept only on this device (in the local meta table, which never syncs and is
 * not part of exports): a random salt and a PBKDF2 SHA-256 hash, never the passcode itself.
 */
import type { Store } from "@/data/store";

export type LockConfig = { salt: string; hash: string; iterations: number; afterMinutes: number };
const KEY = "lock";
const b64 = (u: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(u instanceof Uint8Array ? u : new Uint8Array(u))));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(code: string, salt: Uint8Array, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(code), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations }, key, 256);
  return b64(bits);
}

export async function getLock(store: Store): Promise<LockConfig | null> {
  return (await store.getMeta<LockConfig | null>(KEY)) ?? null;
}

export async function setPasscode(store: Store, code: string, afterMinutes = 5): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iterations = 210_000;
  await store.setMeta(KEY, { salt: b64(salt), hash: await derive(code, salt, iterations), iterations, afterMinutes } satisfies LockConfig);
}

export async function setAutoLock(store: Store, afterMinutes: number): Promise<void> {
  const cfg = await getLock(store);
  if (cfg) await store.setMeta(KEY, { ...cfg, afterMinutes });
}

export async function removePasscode(store: Store): Promise<void> { await store.setMeta(KEY, null); }

export async function checkPasscode(cfg: LockConfig, code: string): Promise<boolean> {
  const got = await derive(code, unb64(cfg.salt), cfg.iterations);
  // constant time compare
  let diff = got.length ^ cfg.hash.length;
  for (let i = 0; i < Math.min(got.length, cfg.hash.length); i++) diff |= got.charCodeAt(i) ^ cfg.hash.charCodeAt(i);
  return diff === 0;
}

/** Lock the app now (from Settings); the Lock component listens. */
export const lockNow = () => window.dispatchEvent(new Event("wahb:lock"));
export const passcodeChanged = () => window.dispatchEvent(new Event("wahb:lock-changed"));
