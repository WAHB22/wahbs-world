"use client";

import { useEffect, useState } from "react";
import { useWorld } from "@/data/runtime";
import { toast } from "@/ui/kit/toast";
import { getLock, lockNow, passcodeChanged, removePasscode, setAutoLock, setPasscode, type LockConfig } from "./passcode";

/** Settings panel for the device passcode: set, change, remove, lock after, lock now. */
export function PasscodeSettings() {
  const { store } = useWorld();
  const [cfg, setCfg] = useState<LockConfig | null | undefined>(undefined);
  const [editing, setEditing] = useState(false);
  const [a, setA] = useState(""), [b, setB] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (store) void getLock(store).then(setCfg); }, [store]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!store) return;
    if (a.length < 4) return setError("Use at least four characters.");
    if (a !== b) return setError("The two entries are different.");
    await setPasscode(store, a, cfg?.afterMinutes ?? 5);
    setA(""); setB(""); setEditing(false); setError(null);
    setCfg(await getLock(store));
    passcodeChanged();
    toast("Passcode set. This device now asks for it.");
  }

  async function remove() {
    if (!store) return;
    await removePasscode(store);
    setCfg(null);
    passcodeChanged();
    toast("Passcode removed from this device.");
  }

  if (cfg === undefined) return null;
  return (
    <div className="stack">
      <p className="soft">{cfg ? "This device asks for a passcode when the app opens, and after it has been away for a while." : "Add a passcode so this device asks for it before showing anything. It is kept only here and never synced."}</p>
      {cfg && (
        <div className="field">
          <label htmlFor="after">Lock after being away for</label>
          <select id="after" value={cfg.afterMinutes} onChange={async (e) => { if (!store) return; await setAutoLock(store, Number(e.target.value)); setCfg(await getLock(store)); passcodeChanged(); }}>
            {[1, 5, 15, 60].map((m) => <option key={m} value={m}>{m === 60 ? "1 hour" : `${m} ${m === 1 ? "minute" : "minutes"}`}</option>)}
          </select>
        </div>
      )}
      {editing ? (
        <form className="stack" onSubmit={save}>
          <div className="field"><label htmlFor="pc1">New passcode</label><input id="pc1" type="password" autoComplete="new-password" value={a} onChange={(e) => setA(e.target.value)} /></div>
          <div className="field"><label htmlFor="pc2">Type it again</label><input id="pc2" type="password" autoComplete="new-password" value={b} onChange={(e) => setB(e.target.value)} /></div>
          {error && <p className="warn" role="alert">{error}</p>}
          <div className="row-actions"><button className="btn btn-primary" type="submit" data-testid="passcode-save">Save passcode</button><button className="btn" type="button" onClick={() => { setEditing(false); setError(null); }}>Cancel</button></div>
        </form>
      ) : (
        <div className="row-actions">
          <button className="btn" onClick={() => setEditing(true)} data-testid="passcode-set">{cfg ? "Change passcode" : "Set a passcode"}</button>
          {cfg && <button className="btn" onClick={lockNow} data-testid="lock-now">Lock now</button>}
          {cfg && <button className="btn btn-ghost btn-danger" onClick={remove}>Remove passcode</button>}
        </div>
      )}
    </div>
  );
}
