"use client";

import { useRef } from "react";
import { DAYS } from "@/worlds/school/specs";
import { useSceneActive } from "@/motion/useSceneActive";
import type { ShiftView } from "./data";

/**
 * The Work scene: the pass. This week's shifts hang from the ticket rail, one slot per day,
 * each ticket as long as the shift. Worked shifts are solid and stamped; planned ones are
 * outlines. The bell rings when a shift is marked worked.
 */
export function PassScene({ days, shifts, worked, planned, ring }: { days: string[]; shifts: ShiftView[]; worked: number; planned: number; ring: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const active = useSceneActive(ref);
  const label = `This week: ${fmtHours(worked)} worked of ${fmtHours(planned)} on the rail.`;
  return (
    <div ref={ref} className="scene pass-scene glass" data-active={active || undefined} role="img" aria-label={label}>
      <svg viewBox="0 0 720 270" aria-hidden="true">
        <defs>
          <linearGradient id="rail" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="rgb(var(--rgb-frost) / 0.55)" />
            <stop offset="1" stopColor="rgb(var(--rgb-frost) / 0.12)" />
          </linearGradient>
          <linearGradient id="bell" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="var(--color-glow)" />
            <stop offset="0.55" stopColor="var(--color-flame)" />
            <stop offset="1" stopColor="var(--color-ember)" />
          </linearGradient>
        </defs>
        <rect x="24" y="34" width="560" height="10" rx="5" fill="url(#rail)" />
        {days.map((d, i) => {
          const x = 36 + i * 78;
          const mine = shifts.filter((s) => s.day === d);
          const hours = mine.reduce((n, s) => n + s.hours, 0);
          const h = Math.min(170, 26 + hours * 17);
          const done = mine.length > 0 && mine.every((s) => s.status === "worked");
          return (
            <g key={d} className="slot" style={{ ["--i" as string]: i }}>
              {mine.length > 0 && (
                <g className="hang">
                  <path d={`M${x} 44 h62 v${h - 8} l-6.2 8 l-6.2 -8 l-6.2 8 l-6.2 -8 l-6.2 8 l-6.2 -8 l-6.2 8 l-6.2 -8 l-6.2 8 l-6.2 -8 Z`}
                    className={done ? "tkt worked" : "tkt planned"} />
                  <text x={x + 31} y={70} className="tkt-num">{fmtHours(hours).replace(" hours", "h").replace(" hour", "h")}</text>
                  {done && <path d={`M${x + 18} ${44 + h / 2 + 6} l8 8 l18 -18`} className="tkt-check" />}
                </g>
              )}
              <text x={x + 31} y={250} className="slot-day">{DAYS[new Date(`${d}T12:00:00`).getDay()].slice(0, 3)}</text>
            </g>
          );
        })}
        <g className="bell-g" key={ring} data-ring={ring > 0 || undefined}>
          <path className="steam" d="M640 118 c-10 -16 10 -24 0 -40 c-10 -16 10 -24 0 -40" />
          <path className="steam s2" d="M662 122 c-10 -16 10 -24 0 -40 c-10 -16 10 -24 0 -36" />
          <circle cx="652" cy="138" r="6" fill="var(--color-glow)" />
          <path d="M608 196 a44 44 0 0 1 88 0 Z" fill="url(#bell)" />
          <path d="M620 176 a34 34 0 0 1 22 -30" fill="none" stroke="rgb(255 255 255 / 0.5)" strokeWidth="4" strokeLinecap="round" />
          <rect x="596" y="196" width="112" height="12" rx="6" fill="rgb(var(--rgb-frost) / 0.5)" />
        </g>
      </svg>
    </div>
  );
}

export function fmtHours(h: number): string {
  const r = Math.round(h * 4) / 4;
  return `${Number.isInteger(r) ? r : r.toFixed(2).replace(/0$/, "")} ${r === 1 ? "hour" : "hours"}`;
}
