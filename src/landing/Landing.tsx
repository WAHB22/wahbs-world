"use client";

import { useLiveQuery } from "dexie-react-hooks";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useWorld } from "@/data/runtime";
import { scheduleSnapshot } from "@/motion/snapshot";
import { enterWorld, prefersReduced } from "@/motion/TransitionLayer";
import type { TransitionKind } from "@/motion/transitions";
import { AuthGate } from "@/ui/AuthGate";
import { SyncBadge } from "@/ui/SyncBadge";
import { DEPTH_FOLLOW, DEPTH_Z, WORLDS, type WorldDef } from "@/worlds/registry";
import { useWorldStatus } from "@/worlds/useWorldStatus";
import { pointer } from "./pointer";
import { TinyWorld } from "./TinyWorld";
import { WorldIcon } from "./WorldIcon";

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

function go(w: WorldDef, el: HTMLElement, kind: TransitionKind) {
  const r = el.getBoundingClientRect();
  const source = document.querySelector<HTMLElement>(".landing-root");
  return enterWorld({ href: `/${w.slug}`, from: { x: r.left, y: r.top, w: r.width, h: r.height }, accent: w.accent, name: w.name, kind, source });
}

export function Landing() {
  const [phone, setPhone] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px), (pointer: coarse) and (max-width: 1100px)");
    const on = () => setPhone(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const status = useWorldStatus();
  const kind = useTransitionKind();
  const root = useRef<HTMLDivElement>(null);
  // Keep a fresh picture of the landing for the glass shatter (taken when the page is idle).
  useEffect(() => { if (kind === "shatter") scheduleSnapshot(root.current, 1200); }, [phone, status, kind]);
  useEffect(() => {
    const again = () => scheduleSnapshot(root.current, 600);
    window.addEventListener("resize", again);
    window.addEventListener("wahb:landing-moved", again);
    return () => { window.removeEventListener("resize", again); window.removeEventListener("wahb:landing-moved", again); };
  }, []);

  return (
    <AuthGate>
      <div className="landing-root" ref={root} data-layout={phone === null ? "loading" : phone ? "phone" : "stage"}>
        <header className="topbar landing-top">
          <span className="brand">WAHB'S WORLD</span>
          <div className="top-right">
            <SyncBadge />
            <Link href="/settings" className="btn btn-small icon-btn" aria-label="Settings">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 15a3 3 0 100-6 3 3 0 000 6zm7.4-3a7.4 7.4 0 00-.1-1.2l2-1.6-2-3.4-2.4 1a7.3 7.3 0 00-2-1.2L14.5 3h-5l-.4 2.6a7.3 7.3 0 00-2 1.2l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 000 2.4l-2 1.6 2 3.4 2.4-1a7.3 7.3 0 002 1.2l.4 2.6h5l.4-2.6a7.3 7.3 0 002-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></svg>
              <span className="icon-btn-text">Settings</span>
            </Link>
          </div>
        </header>
        {phone ? <PhoneLanding status={status} kind={kind} /> : <StageLanding status={status} kind={kind} />}
      </div>
    </AuthGate>
  );
}

type Props = { status: Partial<Record<string, string>>; kind: TransitionKind };

function PaneBody({ w, line }: { w: WorldDef; line?: string }) {
  return (
    <span className="pane-plate">
      <WorldIcon slug={w.slug} />
      <span className="pane-name" style={{ color: `var(--color-${w.text})` }}>{w.name}</span>
      <span className="pane-line">{line ?? w.blurb}</span>
      {w.opensIn && <span className="pane-soon">Phase {w.opensIn}</span>}
    </span>
  );
}

/* Laptop: panes float at three depths around WAHB and answer the pointer. */
function StageLanding({ status, kind }: Props) {
  const stage = useRef<HTMLDivElement>(null);
  const panes = useRef<(HTMLAnchorElement | null)[]>([]);
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const reduced = prefersReduced();
    // Entrance: panes settle from a little depth, staggered. Short, and skipped under reduced motion.
    if (!reduced) {
      panes.current.forEach((p, i) => p?.firstElementChild?.animate(
        [{ opacity: 0, transform: "translateZ(-80px) scale(0.96)" }, { opacity: 1, transform: "none" }],
        { duration: 460, delay: 60 + i * 40, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "backwards" },
      ));
    }

    let raf = 0;
    let box = el.getBoundingClientRect();
    const layout = () => {
      pointer.x += (pointer.tx - pointer.x) * 0.12;
      pointer.y += (pointer.ty - pointer.y) * 0.12;
      WORLDS.forEach((w, i) => {
        const p = panes.current[i];
        if (!p) return;
        const f = DEPTH_FOLLOW[w.at.depth];
        const shiftX = pointer.x * 26 * f, shiftY = pointer.y * 18 * f;
        const tilt = w.at.depth === "near" ? 8 : w.at.depth === "mid" ? 5 : 3;
        // Nearby panes lean toward the pointer; the reflection slides across the glass.
        const px = ((pointer.cx - (box.left + (box.width * w.at.x) / 100)) / window.innerWidth) * 2;
        const py = ((pointer.cy - (box.top + (box.height * w.at.y) / 100)) / window.innerHeight) * 2;
        const near = Math.max(0, 1 - Math.hypot(px, py) * 1.4);
        p.style.transform = `translate(-50%, -50%) translate3d(${shiftX}px, ${shiftY}px, ${DEPTH_Z[w.at.depth] + near * 24}px) rotateX(${-py * tilt * near}deg) rotateY(${px * tilt * near}deg)`;
        p.style.setProperty("--lx", `${50 + px * 40}%`);
        p.style.setProperty("--ly", `${50 + py * 40}%`);
        pointer.panes[i] = { x: shiftX, y: shiftY, z: DEPTH_Z[w.at.depth] + near * 24, rx: -py * tilt * near, ry: px * tilt * near };
      });
      pointer.version++;
      pointer.notify?.();
      const settled = Math.abs(pointer.tx - pointer.x) < 0.001 && Math.abs(pointer.ty - pointer.y) < 0.001;
      raf = settled ? 0 : requestAnimationFrame(layout);
      if (settled) window.dispatchEvent(new Event("wahb:landing-moved"));
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(layout); };
    const move = (e: PointerEvent) => {
      if (reduced || e.pointerType !== "mouse") return;
      pointer.tx = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / window.innerHeight) * 2 - 1;
      pointer.cx = e.clientX;
      pointer.cy = e.clientY;
      kick();
    };
    const leave = () => { pointer.tx = 0; pointer.ty = 0; kick(); };
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    const resize = () => { box = el.getBoundingClientRect(); kick(); };
    window.addEventListener("resize", resize);
    kick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
      window.removeEventListener("resize", resize);
    };
  }, []);

  const today = WORLDS[0];
  return (
    <main className="stage" ref={stage}>
      <div className="stage-title">
        <h1 className="world-word">WORLD</h1>
        <TinyWorld />
      </div>
      <nav className="stage-panes" aria-label="Worlds">
        {WORLDS.map((w, i) => (
          <a
            key={w.slug}
            ref={(n) => { panes.current[i] = n; }}
            href={`/${w.slug}`}
            className="pane3d"
            data-depth={w.at.depth}
            data-world={w.slug}
            style={{ left: `${w.at.x}%`, top: `${w.at.y}%`, "--acc": `var(--color-${w.accent})`, "--acc-rgb": `var(--rgb-${w.accent})`, "--accent-rgb": `var(--rgb-${w.accent})` } as CSSProperties}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
              e.preventDefault();
              if (!go(w, e.currentTarget, kind)) window.location.assign(`/${w.slug}`);
            }}
          >
            <span className="pane-glass glass"><PaneBody w={w} line={status[w.slug]} /></span>
          </a>
        ))}
      </nav>
      <footer className="stage-foot">
        <span className="soft">{moment()}</span>
        <button className="btn btn-primary" data-testid="enter-today"
          onClick={(e) => { const el = document.querySelector<HTMLElement>('[data-world="today"]'); if (!el || !go(today, el, kind)) window.location.assign("/today"); e.currentTarget.blur(); }}>
          Enter Today
        </button>
      </footer>
    </main>
  );
}

/* Phone: a stacked depth carousel. The front pane is full size; the next ones wait behind it.
   Swipe up or down, use the arrow buttons, the arrow keys, or scroll to turn the panes. */
function PhoneLanding({ status, kind }: Props) {
  const [index, setIndex] = useState(0);
  const [drag, setDrag] = useState<number | null>(null); // progress in cards while a finger is down
  const deck = useRef<HTMLDivElement>(null);
  const start = useRef<{ y: number; t: number; moved: boolean } | null>(null);
  const wheelLock = useRef(0);
  const last = WORLDS.length - 1;
  const clamp = (n: number) => Math.max(0, Math.min(last, n));
  const pos = clamp(index + (drag ?? 0));
  const turn = (to: number) => setIndex(clamp(to));
  useEffect(() => { window.dispatchEvent(new Event("wahb:landing-moved")); }, [index]);

  const onDown = (e: React.PointerEvent) => { start.current = { y: e.clientY, t: performance.now(), moved: false }; };
  const onMove = (e: React.PointerEvent) => {
    const s0 = start.current;
    if (!s0) return;
    const dy = s0.y - e.clientY;
    if (!s0.moved && Math.abs(dy) < 8) return;
    if (!s0.moved) { s0.moved = true; deck.current?.setPointerCapture(e.pointerId); }
    setDrag(dy / 240);
  };
  const onUp = (e: React.PointerEvent) => {
    const s0 = start.current;
    start.current = null;
    if (!s0 || !s0.moved) return;
    const dy = s0.y - e.clientY;
    const v = dy / Math.max(1, performance.now() - s0.t); // px per ms
    const step = Math.abs(dy) > 70 || Math.abs(v) > 0.45 ? Math.sign(dy) * Math.max(1, Math.round(Math.abs(dy) / 240)) : 0;
    setDrag(null);
    turn(index + step);
  };

  return (
    <main className="phone-landing">
      <div className="phone-title">
        <h1 className="world-word">WORLD</h1>
        <TinyWorld />
      </div>
      <nav
        className={`deck${drag !== null ? " dragging" : ""}`}
        ref={deck}
        aria-label="Worlds"
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={() => { start.current = null; setDrag(null); }}
        onWheel={(e) => {
          const now = performance.now();
          if (now < wheelLock.current || Math.abs(e.deltaY) < 12) return;
          wheelLock.current = now + 320;
          turn(index + Math.sign(e.deltaY));
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); turn(index + 1); }
          if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); turn(index - 1); }
        }}
      >
        {WORLDS.map((w, k) => {
          const rel = k - pos;
          const behind = Math.max(0, rel);
          const hidden = rel < -1 || rel > 3.2;
          const style = {
            "--acc": `var(--color-${w.accent})`, "--acc-rgb": `var(--rgb-${w.accent})`, "--accent-rgb": `var(--rgb-${w.accent})`,
            transform: rel < 0 ? `translateY(${rel * 110}%) scale(1)` : `translateY(${behind * 18}px) scale(${1 - behind * 0.06})`,
            opacity: rel < 0 ? Math.max(0, 1 + rel * 1.6) : hidden ? 0 : 1 - Math.min(behind, 3) * 0.2,
            zIndex: 100 - k,
            visibility: hidden ? "hidden" : "visible",
          } as CSSProperties;
          return (
            <a
              key={w.slug}
              href={`/${w.slug}`}
              className="deck-card"
              data-world={w.slug}
              data-front={k === index || undefined}
              tabIndex={Math.abs(rel) < 0.5 ? 0 : -1}
              aria-current={k === index ? "true" : undefined}
              style={style}
              onFocus={() => turn(k)}
              onClick={(e) => {
                e.preventDefault();
                if (k !== index) return turn(k);
                if (!go(w, e.currentTarget, kind)) window.location.assign(`/${w.slug}`);
              }}
            >
              <span className="pane-glass glass"><PaneBody w={w} line={status[w.slug]} /></span>
            </a>
          );
        })}
      </nav>
      <div className="deck-controls">
        <button className="btn btn-small" aria-label="Previous world" onClick={() => turn(index - 1)} disabled={index === 0}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <span className="soft deck-count" aria-live="polite">{WORLDS[index].name}, {index + 1} of {WORLDS.length}</span>
        <button className="btn btn-small" aria-label="Next world" onClick={() => turn(index + 1)} disabled={index === last}>
          <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
      <div className="phone-cta">
        <button className="btn btn-primary" data-testid="enter-today"
          onClick={() => { const el = document.querySelector<HTMLElement>('[data-world="today"]'); if (!el || !go(WORLDS[0], el, kind)) window.location.assign("/today"); }}>
          Enter Today
        </button>
      </div>
    </main>
  );
}
