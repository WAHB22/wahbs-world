import type { WorldSlug } from "@/worlds/registry";

/** One small drawn mark per world, in the world's accent, glowing a little inside the glass. */
const PATHS: Record<WorldSlug, string> = {
  today: "M12 4v2M12 18v2M4 12h2M18 12h2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4M12 8.5a3.5 3.5 0 110 7 3.5 3.5 0 010-7z",
  school: "M9 3h6M10 3v6l-5 9a2 2 0 001.8 3h10.4A2 2 0 0019 18l-5-9V3M7.5 14h9",
  work: "M4 17h16M6 17a6 6 0 0112 0M12 8V6M10.5 6h3",
  money: "M8 5h8M7 8h10v10a2 2 0 01-2 2H9a2 2 0 01-2-2V8zM7 13h10",
  projects: "M4 20V8l5-4 5 4v12M14 12h6v8M4 20h16M8 12h2M8 16h2",
  career: "M12 3a9 9 0 110 18 9 9 0 010-18zM15.5 8.5l-2 5-5 2 2-5 5-2z",
  knowledge: "M5 7l4 3 5-5 5 4M9 10l2 7 6-3M5 7a1 1 0 100 .1M9 10a1 1 0 100 .1M14 5a1 1 0 100 .1M19 9a1 1 0 100 .1M11 17a1 1 0 100 .1M17 14a1 1 0 100 .1",
  training: "M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10",
  life: "M12 20s-7-4.4-7-10a4 4 0 017-2.6A4 4 0 0119 10c0 5.6-7 10-7 10z",
};

export function WorldIcon({ slug }: { slug: WorldSlug }) {
  return (
    <svg className="world-icon" viewBox="0 0 24 24" width="30" height="30" aria-hidden="true">
      <path d={PATHS[slug]} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
