"use client";

/**
 * A tiny planet that turns slowly next to the title: a meadow with trees, a cottage with its
 * light on, a windmill, clouds drifting the other way, and a couple of stars. Pure SVG and CSS,
 * paused under reduced motion.
 */
const TREES: { a: number; kind: "pine" | "round"; s: number }[] = [
  { a: 20, kind: "pine", s: 1 }, { a: 34, kind: "round", s: 0.8 }, { a: 62, kind: "pine", s: 0.8 },
  { a: 110, kind: "round", s: 1 }, { a: 128, kind: "pine", s: 1.1 }, { a: 150, kind: "pine", s: 0.75 },
  { a: 200, kind: "round", s: 0.9 }, { a: 222, kind: "pine", s: 1 }, { a: 250, kind: "round", s: 0.75 },
  { a: 300, kind: "pine", s: 0.9 }, { a: 322, kind: "round", s: 1.05 }, { a: 342, kind: "pine", s: 0.7 },
];

export function TinyWorld({ className = "" }: { className?: string }) {
  return (
    <svg className={`tiny-world ${className}`} viewBox="0 0 260 260" role="img" aria-label="A small planet with trees, a cottage and a windmill, turning slowly">
      <defs>
        <radialGradient id="tw-halo" cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor="rgb(var(--rgb-sky) / 0.35)" />
          <stop offset="100%" stopColor="rgb(var(--rgb-sky) / 0)" />
        </radialGradient>
        <radialGradient id="tw-ground" cx="38%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#B8F2A6" />
          <stop offset="45%" stopColor="var(--color-leaf)" />
          <stop offset="100%" stopColor="#2F8F66" />
        </radialGradient>
        <radialGradient id="tw-shade" cx="70%" cy="78%" r="60%">
          <stop offset="0%" stopColor="rgb(var(--rgb-abyss) / 0.45)" />
          <stop offset="100%" stopColor="rgb(var(--rgb-abyss) / 0)" />
        </radialGradient>
      </defs>

      <circle cx="130" cy="130" r="128" fill="url(#tw-halo)" />
      {/* stars */}
      <g className="tw-stars" fill="#fff">
        <path d="M34 44l2 5 5 2-5 2-2 5-2-5-5-2 5-2z" />
        <path d="M222 52l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" />
        <circle cx="210" cy="214" r="2" /><circle cx="46" cy="200" r="1.6" /><circle cx="236" cy="128" r="1.4" />
      </g>

      {/* the turning planet */}
      <g className="tw-spin">
        <circle cx="130" cy="130" r="72" fill="url(#tw-ground)" />
        {/* a pond and paths */}
        <ellipse cx="108" cy="146" rx="16" ry="9" fill="var(--color-coolant)" opacity="0.85" />
        <path d="M84 108 q 30 -14 58 6 t 40 30" fill="none" stroke="#E9FFD9" strokeWidth="3" strokeLinecap="round" opacity="0.6" strokeDasharray="1 7" />
        {TREES.map((t, i) => (
          <g key={i} transform={`rotate(${t.a} 130 130) translate(130 ${58 + 2}) scale(${t.s})`}>
            {t.kind === "pine" ? (
              <>
                <rect x="-1.6" y="-4" width="3.2" height="6" fill="#6B4A2E" />
                <path d="M0 -26 L9 -4 H-9 Z" fill="#2E9E6A" />
                <path d="M0 -32 L7 -14 H-7 Z" fill="#3DBA7C" />
              </>
            ) : (
              <>
                <rect x="-1.6" y="-6" width="3.2" height="8" fill="#6B4A2E" />
                <circle cx="0" cy="-14" r="10" fill="#4CC57F" />
                <circle cx="-3" cy="-17" r="4" fill="#8BE3A2" opacity="0.8" />
              </>
            )}
          </g>
        ))}
        {/* the cottage, its window lit */}
        <g transform="rotate(-8 130 130) translate(130 58)">
          <rect x="-11" y="-16" width="22" height="16" rx="1.5" fill="#FFF3E0" />
          <path d="M-14 -15 L0 -28 L14 -15 Z" fill="var(--color-ember)" />
          <rect x="-3" y="-9" width="6" height="9" fill="#8A5A3B" />
          <rect x="5" y="-12" width="4.5" height="4.5" fill="var(--color-glow)" className="tw-window" />
          <path className="tw-smoke" d="M8 -26 q -4 -6 0 -10 q 4 -4 0 -9" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" opacity="0.7" />
        </g>
        {/* the windmill */}
        <g transform="rotate(80 130 130) translate(130 58)">
          <path d="M-5 0 L-3 -26 H3 L5 0 Z" fill="#FFF3E0" />
          <g className="tw-blades" transform="translate(0 -26)">
            <path d="M0 0 L2 -16 L-2 -16 Z M0 0 L16 2 L16 -2 Z M0 0 L-2 16 L2 16 Z M0 0 L-16 -2 L-16 2 Z" fill="var(--color-petal)" />
            <circle r="2.2" fill="var(--color-ember)" />
          </g>
        </g>
        <circle cx="130" cy="130" r="72" fill="url(#tw-shade)" />
      </g>

      {/* clouds drifting around the other way */}
      <g className="tw-clouds" fill="#fff">
        <g opacity="0.95"><ellipse cx="56" cy="92" rx="18" ry="8" /><ellipse cx="66" cy="86" rx="11" ry="9" /><ellipse cx="48" cy="88" rx="8" ry="6" /></g>
        <g opacity="0.85"><ellipse cx="206" cy="176" rx="15" ry="7" /><ellipse cx="214" cy="170" rx="9" ry="8" /></g>
      </g>

      {/* two birds crossing */}
      <g className="tw-birds" fill="none" stroke="var(--color-abyss)" strokeWidth="2" strokeLinecap="round">
        <path className="tw-bird" d="M0 0 q 5 -5 10 0 q 5 -5 10 0" />
        <path className="tw-bird" d="M16 10 q 4 -4 8 0 q 4 -4 8 0" />
      </g>
    </svg>
  );
}
