"use client";

import { useRef } from "react";
import { useSceneActive } from "@/motion/useSceneActive";

/**
 * The School scene: a shell and tube heat exchanger with fluid moving through it, feeding a
 * reactor whose liquid level is the share of this term's graded work already done.
 * The pipes carry coolant for the world's accent; the hot side is flame.
 */
export function PlantScene({ conversion, label }: { conversion: number; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const active = useSceneActive(ref);
  const level = Math.max(0.04, Math.min(1, conversion));
  const top = 60 + 150 * (1 - level);
  return (
    <div ref={ref} className="scene plant-scene glass" data-active={active || undefined} role="img" aria-label={`Term progress: ${Math.round(conversion * 100)} percent of graded work done. ${label}`}>
      <svg viewBox="0 0 720 260" aria-hidden="true">
        <defs>
          <linearGradient id="shell" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="rgb(var(--rgb-frost) / 0.22)" />
            <stop offset="1" stopColor="rgb(var(--rgb-frost) / 0.04)" />
          </linearGradient>
          <linearGradient id="liquid" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--color-coolant)" stopOpacity="0.9" />
            <stop offset="1" stopColor="var(--color-lagoon)" stopOpacity="0.9" />
          </linearGradient>
          <clipPath id="vessel"><rect x="520" y="60" width="120" height="150" rx="34" /></clipPath>
        </defs>
        {/* hot feed in, cold out */}
        <path d="M20 90 H120" className="pipe hot" />
        <path className="flow hot" d="M20 90 H120" />
        <path d="M20 170 H120" className="pipe" />
        <path className="flow cold" d="M120 170 H20" />
        {/* the exchanger shell and its tubes */}
        <rect x="120" y="60" width="300" height="140" rx="70" fill="url(#shell)" stroke="rgb(var(--rgb-frost) / 0.35)" strokeWidth="2" />
        {[95, 115, 135, 155, 175].map((y, i) => (
          <g key={y}>
            <path d={`M150 ${y} H390`} className="tube" />
            <path d={`M150 ${y} H390`} className={`flow ${i % 2 ? "cold" : "hot"}`} style={{ animationDelay: `${i * -0.3}s` }} />
          </g>
        ))}
        <path d="M120 60 V200 M420 60 V200" stroke="rgb(var(--rgb-frost) / 0.3)" strokeWidth="6" />
        {/* line to the reactor */}
        <path d="M420 130 H520" className="pipe" />
        <path d="M420 130 H520" className="flow cold" />
        {/* the reactor: liquid level is conversion */}
        <g clipPath="url(#vessel)">
          <rect x="520" y={top} width="120" height="220" fill="url(#liquid)" />
          <path className="wave" d={`M500 ${top} q 20 -8 40 0 t 40 0 t 40 0 t 40 0 t 40 0 V300 H500 Z`} fill="var(--color-coolant)" opacity="0.5" />
        </g>
        <rect x="520" y="60" width="120" height="150" rx="34" fill="none" stroke="rgb(var(--rgb-frost) / 0.5)" strokeWidth="2" />
        <text x="580" y="240" textAnchor="middle" className="scene-num">{Math.round(conversion * 100)}%</text>
        {/* a gauge on the shell */}
        <circle cx="270" cy="38" r="18" fill="rgb(var(--rgb-midnight) / 0.9)" stroke="rgb(var(--rgb-frost) / 0.4)" strokeWidth="2" />
        <path d="M270 38 L282 30" stroke="var(--color-flame)" strokeWidth="3" strokeLinecap="round" className="needle" />
        <path d="M270 56 V60" stroke="rgb(var(--rgb-frost) / 0.4)" strokeWidth="3" />
      </svg>
    </div>
  );
}
