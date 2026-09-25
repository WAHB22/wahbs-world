"use client";

import { useEffect } from "react";

/**
 * Moves the specular spot on whichever glass pane the pointer is over, like a light source
 * catching the surface (adapted from the Glass Card on 21st.dev). Mouse and pen only; one
 * listener for the whole app, written straight to the pane's custom properties.
 */
export function GlassLight() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    let last: HTMLElement | null = null;
    const move = (e: PointerEvent) => {
      const pane = (e.target as Element | null)?.closest?.<HTMLElement>(".glass") ?? null;
      if (last && last !== pane) { last.style.removeProperty("--mx"); last.style.removeProperty("--my"); }
      last = pane;
      if (!pane) return;
      const r = pane.getBoundingClientRect();
      pane.style.setProperty("--mx", `${e.clientX - r.left}px`);
      pane.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, []);
  return null;
}
