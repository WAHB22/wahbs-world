"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { playSound } from "@/living/sound";
import { DROP_COVERED, PLAYS, runTransition, type Box, type Running, type TransitionKind } from "./transitions";

export type EnterWorld = { href: string; from: Box; name: string; kind: TransitionKind };

let request: ((e: EnterWorld) => void) | null = null;

/** Called by the menu. The drop plays on top; the route changes once the view is covered. */
export function enterWorld(e: EnterWorld): boolean {
  if (!request) return false;
  request(e);
  return true;
}

export function prefersReduced(): boolean {
  const pref = document.documentElement.dataset.motion;
  if (pref === "reduced") return true;
  if (pref === "full") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Where a world page puts its title. Mirrors .world-title in app.css. */
export function titleBox(): Box {
  const w = window.innerWidth;
  const gutter = Math.min(64, Math.max(20, w * 0.04));
  const size = Math.min(104, Math.max(48, w * 0.068));
  return { x: gutter + 76, y: 64 + 40, w: size * 4, h: size };
}

export function TransitionLayer() {
  const router = useRouter();
  const pathname = usePathname();
  const host = useRef<HTMLDivElement>(null);
  const running = useRef<Running | null>(null);
  const target = useRef<string | null>(null);

  useEffect(() => {
    request = (e) => {
      running.current?.cancel();
      const reduced = prefersReduced();
      const drop = !reduced && PLAYS[e.kind] === "drop";
      target.current = e.href;
      if (drop) window.setTimeout(() => router.push(e.href), DROP_COVERED); else router.push(e.href);
      if (!host.current) return;
      playSound("enter");
      document.documentElement.dataset.tx = reduced ? "reduced" : PLAYS[e.kind];
      running.current = runTransition({ ...e, host: host.current, bounds: { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight }, title: titleBox(), reduced });
      const mine = running.current;
      void mine.finished.then(() => {
        if (running.current === mine) { running.current = null; delete document.documentElement.dataset.tx; }
      });
    };
    return () => { request = null; };
  }, [router]);

  // Interruptible: going somewhere else stops the overlay at once.
  useEffect(() => {
    if (running.current && target.current && pathname !== target.current && pathname !== "/") {
      running.current.cancel();
      running.current = null;
      delete document.documentElement.dataset.tx;
    }
  }, [pathname]);

  return <div ref={host} className="tx-host" aria-hidden="true" />;
}
