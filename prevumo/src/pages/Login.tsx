import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { ArrowRight } from "lucide-react";
import { logIn, useApp } from "../store/store";
import { sampleAt } from "../sim/signal";
import type { Sample } from "../sim/types";
import { Button, StatusBadge } from "../components/ui";
import { LiveNumber, Sparkline, Wordmark } from "../components/visuals";

const DEMO_MACHINE = { type: "welder" as const, ratedKw: 3.2, seed: 41 };

/** A welder's trace inside its learned band; every 40 s it spikes and the irregular points light up. */
function useTrace(): Sample[] {
  const [t, setT] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setT(Math.floor(Date.now() / 1000)), 1000);
    return () => window.clearInterval(id);
  }, []);
  const out: Sample[] = [];
  for (let i = t - 90; i <= t; i++) {
    const phase = i % 40;
    const anomaly = phase >= 28 && phase < 35;
    out.push(sampleAt(DEMO_MACHINE, i, { on: true, mode: anomaly ? "anomaly" : "normal", anomaly: "spike" }));
  }
  return out;
}

export function Login() {
  const { world } = useApp();
  const nav = useNavigate();
  const trace = useTrace();
  if (world.loggedIn) return <Navigate to="/" replace />;
  const irregular = trace.slice(-30).some((s) => s.out);

  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.25fr_1fr]">
      <section className="relative flex flex-col justify-between overflow-hidden px-6 pt-6 pb-8 sm:px-10 lg:px-14 lg:pt-10 lg:pb-12">
        <Wordmark />
        <div className="my-10 lg:my-0">
          <p className="max-w-[34ch] font-display text-[20px] leading-snug text-muted sm:text-[22px]">Booking software tells you who booked the machine.</p>
          <h1 className="mt-3 max-w-[18ch] text-[34px] font-semibold text-balance sm:text-[44px] lg:text-[52px]">PREVUMO tells you what happened to it, and when it's about to fail.</h1>
          <div className="mt-10 max-w-[680px]" aria-hidden>
            <div className="mb-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-[13px] text-muted">Welder 2, live draw</p>
                <p className="mt-1 leading-none">
                  <LiveNumber value={trace[trace.length - 1].kw} className="text-[30px] text-ink" />
                  <span className="num ml-1 text-[13px] text-muted">kW</span>
                </p>
              </div>
              <StatusBadge status={irregular ? "irregular" : "normal"} label={irregular ? "Outside its normal range" : "Inside its normal range"} />
            </div>
            <div className="rounded-[12px] border border-border bg-surface/70 px-3 py-3">
              <Sparkline samples={trace} stroke="var(--color-green)" height={150} />
            </div>
          </div>
        </div>
        <p className="text-[13px] text-muted">PREVUMO = PREVentive Usage MOnitor. A box on each machine's power line: keypad, current sensor and relay.</p>
      </section>

      <section className="flex items-center justify-center border-t border-border bg-surface px-6 py-12 lg:border-t-0 lg:border-l">
        <form
          className="w-full max-w-[380px]"
          onSubmit={(e) => {
            e.preventDefault();
            logIn();
            nav(world.locations.length === 1 ? `/l/${world.locations[0].id}` : "/locations");
          }}
        >
          <h2 className="text-[28px] font-semibold">Owner log in</h2>
          <p className="mt-1 text-[15px] text-muted">Your machines, live, in every space you run.</p>
          <div className="mt-8 flex items-center gap-3 rounded-[12px] border border-border bg-bg/60 px-4 py-3.5">
            <span className="flex size-11 items-center justify-center rounded-full bg-ink font-display text-[15px] font-semibold text-white">UE</span>
            <div className="min-w-0">
              <p className="text-[15px] font-medium">Owner: uOttawa Engineering</p>
              <p className="text-[13px] text-muted">Demo account · 3 locations</p>
            </div>
          </div>
          <p className="mt-5 text-[13px] font-medium">Password</p>
          <p className="mt-1.5 flex h-11 items-center rounded-[10px] border border-border bg-bg/60 px-3 text-[15px] text-muted">No password needed in the demo</p>
          <p className="mt-1.5 text-xs text-muted">Nothing is checked. This is a demo account.</p>
          <Button type="submit" variant="primary" size="lg" className="mt-7 w-full">
            Log in <ArrowRight className="size-4" />
          </Button>
        </form>
      </section>
    </main>
  );
}
