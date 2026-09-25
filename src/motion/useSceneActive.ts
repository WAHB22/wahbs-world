"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * A scene animates only while it is on screen and the tab is visible (brief: nothing runs
 * off screen). Returns whether it should move; CSS pauses everything else.
 */
export function useSceneActive(ref: RefObject<Element | null>): boolean {
  const [inView, setInView] = useState(false);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    const vis = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", vis);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", vis); };
  }, [ref]);
  return inView && visible;
}
