"use client";

import { useEffect, useRef, useState } from "react";

const reduced = () =>
  typeof window !== "undefined" &&
  (document.documentElement.dataset.motion === "reduced" ||
    (document.documentElement.dataset.motion !== "full" && window.matchMedia("(prefers-reduced-motion: reduce)").matches));

/** A ring of heat leaves the button that was pressed: the check in landed. */
export function fire(el: HTMLElement | null) {
  if (!el || reduced()) return;
  const ring = document.createElement("span");
  ring.className = "fire-ring";
  el.appendChild(ring);
  el.classList.remove("fired");
  void el.offsetWidth; // restart the icon pop on rapid taps
  el.classList.add("fired");
  setTimeout(() => ring.remove(), 560);
}

/** Numbers that change count to their new value in about 400 ms, once, then stay still. */
export function useCountUp(value: number, ms = 420): number {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reduced() || from.current === value) { from.current = value; setShown(value); return; }
    const start = performance.now(), a = from.current, b = value;
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - start) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      setShown(a + (b - a) * e);
      if (k < 1) raf = requestAnimationFrame(step);
      else from.current = b;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}
