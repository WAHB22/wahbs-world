"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SYNC_MODE } from "@/data/config";
import { useWorld } from "@/data/runtime";
import { supabase } from "@/data/supabase";

/** One password, once per device. After that the world opens straight away. */
export default function Login() {
  const { auth } = useWorld();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.state === "signed-in" || auth.state === "not-needed") router.replace("/");
  }, [auth.state, router]);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/unlock", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "Could not open.");
      const { error } = await supabase().auth.setSession({ access_token: data.access_token, refresh_token: data.refresh_token });
      if (error) throw new Error(error.message);
    } catch (err) {
      setError(err instanceof TypeError ? "No connection. The first unlock on a device needs the internet." : (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (SYNC_MODE !== "supabase") return null;
  return (
    <main className="page login">
      <h1 className="wahb small">WAHB</h1>
      <form className="glass pane login-pane" onSubmit={unlock}>
        <div className="field">
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="hint">Only once on this device. After that it opens straight into your world.</p>
        </div>
        {/* hidden username so iCloud Keychain can save and fill the password */}
        <input type="text" name="username" autoComplete="username" value="wahb" readOnly hidden />
        {error && <p className="warn" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Opening" : "Open my world"}</button>
      </form>
    </main>
  );
}
