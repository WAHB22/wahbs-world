"use client";

import { ArrowRight, GearSix } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
import { INTENSITY_LABEL } from "@/living/intensity";
import { useIntensity } from "@/living/LivingSystem";
import { enterWorld, prefersReduced } from "@/motion/TransitionLayer";
import type { TransitionKind } from "@/motion/transitions";
import { AuthGate } from "@/ui/AuthGate";
import { SyncBadge } from "@/ui/SyncBadge";
import { useSettings } from "@/ui/useSettings";
import { WorldMark } from "@/ui/WorldIcon";
import { COURSES, WORLDS, type WorldDef } from "@/worlds/registry";
import { useWorldStatus } from "@/worlds/useWorldStatus";
import { useWeek } from "./useWeek";

// The chrome is WebGL: it loads after the page is usable and never blocks it.
const ChromeScene = dynamic(() => import("./ChromeScene"), { ssr: false });

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const EASE = [0.23, 1, 0.32, 1] as const;

function canRender3D(): boolean {
  try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; }
}

export function Home() {
  const status = useWorldStatus();
  const settings = useSettings();
  const intensity = useIntensity();
  const week = useWeek();
  const reduce = useReducedMotion() ?? false;
  const [gl, setGl] = useState(false);
  const [still, setStill] = useState(false);
  useEffect(() => {
    setStill(prefersReduced());
    if (!canRender3D()) return;
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (idle) idle(() => setGl(true), { timeout: 600 }); else setTimeout(() => setGl(true), 150);
  }, []);

  const kind = (settings?.transition ?? "liquid") as TransitionKind;
  function go(w: WorldDef, el: Element | null) {
    const r = (el?.querySelector(".chrome-disc") ?? el)?.getBoundingClientRect();
    if (!r || !enterWorld({ href: `/${w.slug}`, from: { x: r.left, y: r.top, w: r.width, h: r.height }, name: w.name, kind })) window.location.assign(`/${w.slug}`);
  }
  const now = new Date();
  const today = WORLDS[0];
  const rise = (i: number) => (reduce ? {} : { initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.8, delay: 0.08 + i * 0.08, ease: EASE } });

  return (
    <AuthGate>
      <div className="home">
        <header className="nav home-nav">
          <span className="nav-brand">Wahb&apos;s World</span>
          <div className="nav-right">
            <SyncBadge />
            <Link href="/settings" className="btn btn-ghost btn-small" aria-label="Settings"><GearSix size={18} aria-hidden="true" /><span className="nav-label">Settings</span></Link>
          </div>
        </header>

        <section className="hero" aria-labelledby="hero-title">
          {gl && <ChromeScene still={still} />}
          <div className="hero-copy">
            <motion.span className="pill-label" {...rise(0)}>{DAYS[now.getDay()]}, {INTENSITY_LABEL[intensity].toLowerCase()}</motion.span>
            <h1 id="hero-title" className="hero-title">
              <motion.span {...rise(1)}>Wahb&apos;s</motion.span>{" "}
              <motion.span className="chrome-text" {...rise(2)}>World.</motion.span>
            </h1>
            <motion.p className="hero-sub" {...rise(3)}>
              {status.today ? <>Plat du jour: {status.today.line.replace(/^Next: /, "")}. {status.today.figure === "Clear" ? "Nothing else is pressing." : `${status.today.figure} in the next three days.`}</> : "Opening your world."}
            </motion.p>
            <motion.div className="hero-ctas" {...rise(4)}>
              <button className="btn btn-primary btn-large" data-testid="enter-today" onClick={(e) => go(today, e.currentTarget)}>Open Today</button>
              <a className="btn btn-large" href="#menu">See the menu</a>
            </motion.div>
          </div>
        </section>

        <section id="menu" className="carte" aria-labelledby="menu-h">
          <h2 id="menu-h" className="carte-title">The menu</h2>
          <nav aria-label="Worlds" className="carte-body">
            <a href="/today" data-world="today" className="dish dish-feature" onClick={(e) => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); go(today, e.currentTarget); }}>
              <WorldMark slug="today" size={72} />
              <span className="dish-text">
                <span className="dish-course">Plat du jour</span>
                <span className="dish-row"><span className="dish-name">Today</span><span className="dish-leader" aria-hidden="true" /><span className="dish-price">{status.today?.figure ?? ""}</span></span>
                <span className="dish-line">{status.today?.line ?? today.dish}</span>
              </span>
            </a>
            {COURSES.map((c) => (
              <div key={c.id} className="course">
                <h3 className="course-name">{c.name}</h3>
                <ul className="dishes">
                  {WORLDS.filter((w) => w.course === c.id && w.slug !== "today").map((w, i) => (
                    <li key={w.slug} style={{ ["--i" as string]: i }}>
                      <a href={`/${w.slug}`} data-world={w.slug} className="dish" onClick={(e) => { if (e.metaKey || e.ctrlKey) return; e.preventDefault(); go(w, e.currentTarget); }}>
                        <WorldMark slug={w.slug} size={48} />
                        <span className="dish-text">
                          <span className="dish-row"><span className="dish-name">{w.name}</span><span className="dish-leader" aria-hidden="true" /><span className="dish-price">{status[w.slug]?.figure ?? ""}</span></span>
                          <span className="dish-line">{status[w.slug]?.line ?? w.dish}</span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </section>

        <section className="week-board" aria-labelledby="week-h">
          <h2 id="week-h" className="carte-title">This week</h2>
          <div className="bento">
            <article className="tile tile-deadlines">
              <h3 className="tile-label">Deadlines ahead</h3>
              <p className="tile-figure">{week?.deadlines.length ?? 0}</p>
              <ul className="tile-list">
                {(week?.deadlines ?? []).slice(0, 3).map((d) => <li key={d.id}><span>{d.label}</span><span className="mono">{d.when}</span></li>)}
                {week && !week.deadlines.length && <li className="hint">Nothing due in the next seven days.</li>}
              </ul>
            </article>
            <article className="tile tile-ink">
              <h3 className="tile-label">Worked</h3>
              <p className="tile-figure">{status.work?.figure ?? "0 h"}</p>
              <p className="tile-note">{status.work?.line}</p>
            </article>
            <article className="tile tile-chrome">
              <h3 className="tile-label">Spent</h3>
              <p className="tile-figure">{status.money?.figure ?? "$0"}</p>
              <p className="tile-note">{week?.billsLeft ? `${week.billsLeft} ${week.billsLeft === 1 ? "bill" : "bills"} still to pay this month` : "No bills waiting"}</p>
            </article>
            <article className="tile">
              <h3 className="tile-label">Training</h3>
              <p className="tile-figure">{status.training?.figure ?? "0"}</p>
              <p className="tile-note">{status.training?.line}</p>
            </article>
            <article className="tile tile-links">
              <h3 className="tile-label">Look back</h3>
              <Link href="/recap" className="tile-link">This week&apos;s recap <ArrowRight size={18} aria-hidden="true" /></Link>
              <Link href="/chapter" className="tile-link">This month&apos;s chapter <ArrowRight size={18} aria-hidden="true" /></Link>
            </article>
          </div>
        </section>

        <footer className="home-foot">
          <span className="hint">Everything is saved on this device first, then synced when sync is on.</span>
          <Link href="/settings" className="hint">Settings and export</Link>
        </footer>
      </div>
    </AuthGate>
  );
}
