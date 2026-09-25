/** The nine worlds. Structure lives in code; everything they show lives in data. */
export type WorldSlug = "today" | "school" | "work" | "money" | "projects" | "career" | "knowledge" | "training" | "life";

export type WorldDef = {
  slug: WorldSlug;
  name: string;
  /** fill accent (design/TOKENS.md section 7) */
  accent: string;
  /** accent that passes contrast as text on navy */
  text: string;
  blurb: string;
  /** the phase that builds it; null when it is built */
  opensIn: number | null;
  /** landing layout: position in percent of the stage, and depth */
  at: { x: number; y: number; depth: "near" | "mid" | "far" };
};

export const WORLDS: WorldDef[] = [
  { slug: "today", name: "Today", accent: "ember", text: "glow", blurb: "The pass: what needs you now.", opensIn: null, at: { x: 50, y: 22, depth: "near" } },
  { slug: "school", name: "School", accent: "coolant", text: "coolant", blurb: "Courses, deadlines, the new term.", opensIn: null, at: { x: 15, y: 40, depth: "mid" } },
  { slug: "work", name: "Work", accent: "flame", text: "peach", blurb: "Shifts as tickets, hours and pay.", opensIn: null, at: { x: 85, y: 40, depth: "mid" } },
  { slug: "money", name: "Money", accent: "lagoon", text: "coolant", blurb: "The jar, the bill, recurring bills.", opensIn: null, at: { x: 18, y: 76, depth: "mid" } },
  { slug: "projects", name: "Projects", accent: "cobalt", text: "sky", blurb: "Blueprints, tasks, dependencies.", opensIn: 4, at: { x: 68, y: 82, depth: "mid" } },
  { slug: "career", name: "Career", accent: "sky", text: "sky", blurb: "Experience to opportunity.", opensIn: 4, at: { x: 22, y: 12, depth: "far" } },
  { slug: "knowledge", name: "Knowledge", accent: "frost", text: "frost", blurb: "A constellation of what you learn.", opensIn: 4, at: { x: 79, y: 12, depth: "far" } },
  { slug: "training", name: "Training", accent: "signal", text: "sky", blurb: "Sessions, and showing up.", opensIn: 4, at: { x: 42, y: 88, depth: "mid" } },
  { slug: "life", name: "Life", accent: "glow", text: "glow", blurb: "Moments worth keeping.", opensIn: 4, at: { x: 90, y: 68, depth: "far" } },
];

export const worldBySlug = (slug: string) => WORLDS.find((w) => w.slug === slug);
export const DEPTH_Z = { near: 90, mid: 0, far: -160 } as const;
/** how strongly each depth follows the pointer (far moves slower) */
export const DEPTH_FOLLOW = { near: 1, mid: 0.6, far: 0.3 } as const;
