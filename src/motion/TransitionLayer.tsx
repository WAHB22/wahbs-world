"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { runTransition, type Box, type Running, type TransitionKind } from "./transitions";

export type EnterWorld = { href: string; from: Box; accent: string; name: string; kind: TransitionKind; source?: HTMLElement | null };

let request: ((e: EnterWorld) => void) | null = null;

/** Called by a landing pane. Navigation starts at once; the overlay plays on top. */
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

/** Where a world page puts its title, so the morph can land on it. Mirrors .world-title in app.css. */
export function titleBox(): Box {
  const w = window.innerWidth;
  const gutter = Math.min(72, Math.max(16, w * 0.04));
  const size = Math.min(128, Math.max(44, w * 0.08));
  const top = 64 + Math.min(56, Math.max(20, w * 0.04));
  return { x: gutter, y: top, w: size * 4, h: size };
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
      router.push(e.href);
      target.current = e.href;
      if (!host.current) return;
      // While a transition plays, the world knows it (the morph hides the real title until the travelling one lands).
      document.documentElement.dataset.tx = prefersReduced() ? "reduced" : e.kind;
      running.current = runTransition({
        ...e,
        host: host.current,
        bounds: { x: 0, y: 0, w: window.innerWidth, h: window.innerHeight },
        title: titleBox(),
        reduced: prefersReduced(),
      });
      const mine = running.current;
      void mine.finished.then(() => {
        if (running.current === mine) {
          running.current = null;
          delete document.documentElement.dataset.tx;
        }
      });
    };
    return () => {
      request = null;
    };
  }, [router]);

  // Interruptible: going somewhere else (back button, another link) stops the overlay at once.
  useEffect(() => {
    if (running.current && target.current && pathname !== target.current) {
      running.current.cancel();
      running.current = null;
      delete document.documentElement.dataset.tx;
    }
  }, [pathname]);

  return (
    <div ref={host} className="tx-host" aria-hidden="true" />
  );
}
