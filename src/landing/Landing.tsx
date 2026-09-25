"use client";

import { useLiveQuery } from "dexie-react-hooks";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useWorld } from "@/data/runtime";
import { scheduleSnapshot } from "@/motion/snapshot";
import { enterWorld, prefersReduced } from "@/motion/TransitionLayer";
import type { TransitionKind } from "@/motion/transitions";
import { AuthGate } from "@/ui/AuthGate";
import { ObjectImage } from "@/ui/ObjectImage";
import { SyncBadge } from "@/ui/SyncBadge";
import { WORLDS, type WorldDef, type WorldSlug } from "@/worlds/registry";
import { useWorldStatus } from "@/worlds/useWorldStatus";
import type { CabinetApi, Point } from "./cabinet/Cabinet";
import { TinyWorld } from "./TinyWorld";

// The glass cabinet is WebGL: loaded after the page is usable, with the card grid until then.
const Cabinet = dynamic(() => import("./cabinet/Cabinet"), { ssr: false });

/** If WebGL fails for any reason, the card grid stays. */
class GlassBoundary extends Component<{ children: ReactNode; onFail: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFail(); }
  render() { return this.state.failed ? null : this.props.children; }
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
function moment(d = new Date()): string {
  const h = d.getHours();
  const part = h < 5 ? "late night" : h < 11 ? "opening" : h < 17 ? "service" : h < 22 ? "closing time" : "late night";
  return `${DAYS[d.getDay()]}, ${part}`;
}

function useTransitionKind(): TransitionKind {
  const { store } = useWorld();
  const s = useLiveQuery(async () => (store ? (await store.all("settings"))[0] : undefined), [store]);
  return (s?.transition as TransitionKind | undefined) ?? "shatter";
}

function canUseGlass(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!c.getContext("webgl2") && !window.matchMedia("(prefers-reduced-transparency: reduce)").matches;
  } catch { return false; }
}

export function Landing() {
  const status = useWorldStatus();
  const kind = useTransitionKind();
  const root = useRef<HTMLDivElement>(null);
  const vitrine = useRef<HTMLDivElement>(null);
  const api = useRef<CabinetApi | null>(null);
  const [gl, setGl] = useState(false);
  const [ready, setReady] = useState(false);
  const [plaques, setPlaques] = useState<Partial<Record<WorldSlug, Point>>>({});
  const [hover, setHover] = useState<WorldSlug | null>(null);
  const [still, setStill] = useState(false);
  const [breaking, setBreaking] = useState(false);
  const going = useRef(false);

  useEffect(() => {
    setStill(prefersReduced());
    if (!canUseGlass()) return;
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (idle) idle(() => setGl(true), { timeout: 800 }); else setTimeout(() => setGl(true), 200);
  }, []);

  // Without the cabinet, the flat shatter needs a picture of the page (taken while idle).
  useEffect(() => { if (!gl && kind === "shatter") scheduleSnapshot(root.current, 1200); }, [gl, status, kind]);

  const onLayout = useCallback((p: Record<WorldSlug, Point>) => setPlaques(p), []);

  function go(w: WorldDef, el: HTMLElement | null) {
    if (going.current) return;
    const reduced = prefersReduced();
    const box = vitrine.current?.getBoundingClientRect();
    if (gl && ready && kind === "shatter" && !reduced && api.current && box) {
      // The object breaks first, on the press; the light of the break carries you into the world.
      const at = api.current.shatter(w.slug);
      if (at) {
        going.current = true;
        setBreaking(true);
        const x = box.left + at.x, y = box.top + at.y;
        window.setTimeout(() => {
          // Test hook: lets a screenshot script watch the break without leaving the page.
          if ((window as Window & { __holdEntry?: boolean }).__holdEntry) return;
          const ok = enterWorld({ href: `/${w.slug}`, from: { x: x - 20, y: y - 20, w: 40, h: 40 }, accent: w.accent, name: w.name, kind: "glass", navigateAt: 300 });
          if (!ok) window.location.assign(`/${w.slug}`);
        }, 360);
        return;
      }
    }
    const r = (el ?? document.querySelector<HTMLElement>(`[data-world="${w.slug}"]`))?.getBoundingClientRect();
    const ok = r && enterWorld({ href: `/${w.slug}`, from: { x: r.left, y: r.top, w: r.width, h: r.height }, accent: w.accent, name: w.name, kind, source: root.current });
    if (!ok) window.location.assign(`/${w.slug}`);
  }

  const today = WORLDS[0];
  const placed = gl && ready && Object.keys(plaques).length === WORLDS.length;

  return (
    <AuthGate>
      <div className="landing-root" ref={root}>
        <header className="topbar landing-top">
          <span className="brand">WAHB'S WORLD</span>
          <div className="top-right">
            <SyncBadge />
            <Link href="/settings" className="btn btn-small icon-btn" aria-label="Settings">
              <ObjectImage name="gear" size={24} />
              <span className="icon-btn-text">Settings</span>
            </Link>
          </div>
        </header>
        <main className="hall">
          <section className="hall-intro">
            <div className="hall-title">
              <h1 className="world-word">WORLD</h1>
              <TinyWorld />
            </div>
            <p className="soft hall-moment">{moment()}</p>
            <button className="btn btn-primary hall-enter" data-testid="enter-today" onClick={() => go(today, null)}>Enter Today</button>
          </section>

          <div className="vitrine" ref={vitrine} data-glass={placed || undefined} data-breaking={breaking || undefined}>
            {gl && (
              <GlassBoundary onFail={() => { setGl(false); setReady(false); }}>
                <Cabinet api={api} still={still} onLayout={onLayout} onReady={() => setReady(true)}
                  onPick={(slug) => go(WORLDS.find((w) => w.slug === slug)!, null)} onHover={setHover} />
              </GlassBoundary>
            )}
            <nav className={placed ? "plaques" : "shelf-cards"} aria-label="Worlds">
              {WORLDS.map((w) => {
                const p = plaques[w.slug];
                return (
                  <a
                    key={w.slug}
                    href={`/${w.slug}`}
                    data-world={w.slug}
                    data-hover={hover === w.slug || undefined}
                    className={placed ? "plaque" : "shelf-card glass"}
                    style={placed && p ? { left: p.x, top: p.y } : { ["--accent-rgb" as string]: `var(--rgb-${w.accent})` }}
                    onPointerEnter={() => { api.current?.touch(w.slug); setHover(w.slug); }}
                    onPointerLeave={() => setHover(null)}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                      e.preventDefault();
                      go(w, e.currentTarget);
                    }}
                  >
                    {!placed && <ObjectImage name={w.object} size={64} />}
                    <span className="plaque-name">{w.name}</span>
                    <span className="plaque-line">{status[w.slug] ?? w.blurb}</span>
                    {w.opensIn && <span className="plaque-soon">Phase {w.opensIn}</span>}
                  </a>
                );
              })}
            </nav>
          </div>
        </main>
      </div>
    </AuthGate>
  );
}
