"use client";

import { useRef } from "react";
import { useSceneActive } from "@/motion/useSceneActive";

/**
 * The Money scene: a glass jar. Its level is what is left of the month's budget (or of the
 * month's income before any budget exists). Bubbles rise while it is on screen, and a drop
 * falls in each time something is saved.
 */
export function JarScene({ level, label, drop, caption }: { level: number; label: string; drop: number; caption: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const active = useSceneActive(ref);
  const l = Math.max(0.03, Math.min(1, level));
  const top = 78 + 150 * (1 - l);
  return (
    <div ref={ref} className="scene jar-scene glass" data-active={active || undefined} role="img" aria-label={label}>
      <svg viewBox="130 26 460 238" aria-hidden="true">
        <defs>
          <linearGradient id="jarLiquid" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--color-lagoon)" />
            <stop offset="1" stopColor="var(--color-cobalt)" />
          </linearGradient>
          <linearGradient id="jarGlass" x1="0" x2="1">
            <stop offset="0" stopColor="rgb(var(--rgb-frost) / 0.22)" />
            <stop offset="0.35" stopColor="rgb(var(--rgb-frost) / 0.04)" />
            <stop offset="1" stopColor="rgb(var(--rgb-frost) / 0.14)" />
          </linearGradient>
          <clipPath id="jarIn"><path d="M300 70 h120 q30 0 30 30 v120 q0 24 -24 24 h-132 q-24 0 -24 -24 v-120 q0 -30 30 -30 Z" /></clipPath>
        </defs>
        {/* shelf */}
        <rect x="170" y="244" width="380" height="8" rx="4" fill="rgb(var(--rgb-frost) / 0.18)" />
        <g clipPath="url(#jarIn)">
          <rect className="jar-fill" x="260" y={top} width="220" height="220" fill="url(#jarLiquid)" style={{ transition: "y 900ms var(--ease-out)" }} />
          <path className="jar-wave" d={`M240 ${top} q 25 -7 50 0 t 50 0 t 50 0 t 50 0 t 50 0 t 50 0 V260 H240 Z`} fill="var(--color-lagoon)" opacity="0.55" />
          {[312, 344, 372, 398, 426].map((x, i) => (
            <circle key={x} className="bubble" cx={x} cy="238" r={3 + (i % 3)} style={{ animationDelay: `${i * -0.9}s` }} />
          ))}
        </g>
        {drop > 0 && <circle key={drop} className="drop" cx="360" cy="18" r="7" style={{ ["--fall" as string]: `${top - 18}px` }} />}
        <path d="M300 70 h120 q30 0 30 30 v120 q0 24 -24 24 h-132 q-24 0 -24 -24 v-120 q0 -30 30 -30 Z" fill="url(#jarGlass)" stroke="rgb(var(--rgb-frost) / 0.5)" strokeWidth="2.5" />
        <rect x="292" y="52" width="136" height="22" rx="8" fill="rgb(var(--rgb-frost) / 0.3)" stroke="rgb(var(--rgb-frost) / 0.55)" strokeWidth="2" />
        <path d="M288 110 v90" stroke="rgb(255 255 255 / 0.45)" strokeWidth="6" strokeLinecap="round" />
        <text x="360" y="162" className="scene-num" textAnchor="middle">{Math.round(level * 100)}%</text>
        <text x="360" y="186" className="jar-caption" textAnchor="middle">{caption}</text>
      </svg>
    </div>
  );
}
