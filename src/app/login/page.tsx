"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SYNC_MODE } from "@/data/config";
import { useWorld } from "@/data/runtime";
import { supabase } from "@/data/supabase";

/** Sign in with a six digit code by email. A code works inside the installed iPhone app; a link would open Safari. */
export default function Login() {
  const { auth } = useWorld();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.state === "signed-in" || auth.state === "not-needed") router.replace("/");
  }, [auth.state, router]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase().auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: false } });
    setBusy(false);
    if (error) setError(error.message.includes("rate") ? "Too many codes asked for. Wait a few minutes and try again." : "That address cannot sign in here.");
    else setStep("code");
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase().auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    setBusy(false);
    if (error) setError("That code did not work. Check the latest email, or ask for a new code.");
  }

  if (SYNC_MODE !== "supabase") return null;
  return (
    <main className="page login">
      <h1 className="wahb small">WAHB</h1>
      <form className="glass pane login-pane" onSubmit={step === "email" ? send : verify}>
        {step === "email" ? (
          <div className="field">
            <label htmlFor="email">Your email</label>
            <input id="email" type="email" autoComplete="email" autoCapitalize="none" autoCorrect="off" required value={email} onChange={(e) => setEmail(e.target.value)} />
            <p className="hint">You will get a six digit code.</p>
          </div>
        ) : (
          <div className="field">
            <label htmlFor="code">The code from your email</label>
            <input id="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={10} required value={code} onChange={(e) => setCode(e.target.value)} />
            <button type="button" className="linkish" onClick={() => setStep("email")}>Use another address, or send a new code</button>
          </div>
        )}
        {error && <p className="warn" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>{step === "email" ? "Send the code" : "Sign in"}</button>
      </form>
    </main>
  );
}
