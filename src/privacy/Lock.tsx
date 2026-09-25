"use client";

import { LockSimple } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useWorld } from "@/data/runtime";
import { checkPasscode, getLock, type LockConfig } from "./passcode";

const HIDDEN_AT = "wahb:hidden-at";

/**
 * With a passcode set on this device, nothing shows until it is entered: on open, after the app
 * has been away longer than the chosen minutes, or when locked from Settings. Without one, this is
 * invisible. Five wrong tries in a row wait thirty seconds.
 */
export function Lock({ children }: { children: ReactNode }) {
  const { store } = useWorld();
  const [cfg, setCfg] = useState<LockConfig | null | undefined>(undefined);
  const [locked, setLocked] = useState(true);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);
  const fails = useRef(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!store) return;
    const load = () => void getLock(store).then((c) => { setCfg(c); if (!c) setLocked(false); });
    load();
    const lock = () => setLocked(true);
    window.addEventListener("wahb:lock-changed", load);
    window.addEventListener("wahb:lock", lock);
    return () => { window.removeEventListener("wahb:lock-changed", load); window.removeEventListener("wahb:lock", lock); };
  }, [store]);

  useEffect(() => {
    if (!cfg) return;
    const onVis = () => {
      if (document.visibilityState === "hidden") sessionStorage.setItem(HIDDEN_AT, String(Date.now()));
      else {
        const at = Number(sessionStorage.getItem(HIDDEN_AT) ?? 0);
        if (at && Date.now() - at > cfg.afterMinutes * 60_000) setLocked(true);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [cfg]);

  useEffect(() => { if (locked && cfg) input.current?.focus(); }, [locked, cfg]);
  useEffect(() => { if (wait <= 0) return; const id = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(id); }, [wait]);

  if (!store || cfg === undefined) return <div className="page-loading" aria-busy="true" />;
  if (!cfg || !locked) return <>{children}</>;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!cfg || wait > 0) return;
    if (await checkPasscode(cfg, code)) { fails.current = 0; setCode(""); setError(null); setLocked(false); return; }
    fails.current += 1;
    setCode("");
    if (fails.current >= 5) { fails.current = 0; setWait(30); setError("Five wrong tries. Wait thirty seconds."); }
    else setError("That passcode is not right.");
  }

  return (
    <main className="lock">
      <form className="lock-card panel" onSubmit={submit} aria-labelledby="lock-h">
        <span className="chrome-disc" style={{ width: 56, height: 56 }} aria-hidden="true"><LockSimple size={26} /></span>
        <h1 id="lock-h" className="lock-title">Wahb&apos;s World is locked</h1>
        <div className="field">
          <label htmlFor="passcode">Passcode</label>
          <input id="passcode" ref={input} type="password" inputMode="numeric" autoComplete="current-password" value={code} onChange={(e) => setCode(e.target.value)} disabled={wait > 0} />
        </div>
        {error && <p className="warn" role="alert">{wait > 0 ? `${error} ${wait}` : error}</p>}
        <button type="submit" className="btn btn-primary" disabled={!code || wait > 0}>Unlock</button>
      </form>
    </main>
  );
}
