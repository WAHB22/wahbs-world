import type { ObjectName } from "@/ui/ObjectImage";

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
  /** the real object that stands for it in the glass cabinet and on cards */
  object: ObjectName;
};

export const WORLDS: WorldDef[] = [
  { slug: "today", name: "Today", accent: "ember", text: "glow", blurb: "The pass: what needs you now.", opensIn: null, object: "hourglass" },
  { slug: "school", name: "School", accent: "coolant", text: "coolant", blurb: "Courses, deadlines, the new term.", opensIn: null, object: "test-tube" },
  { slug: "work", name: "Work", accent: "flame", text: "peach", blurb: "Shifts as tickets, hours and pay.", opensIn: null, object: "bell" },
  { slug: "money", name: "Money", accent: "lagoon", text: "coolant", blurb: "The jar, the bill, recurring bills.", opensIn: null, object: "jar" },
  { slug: "projects", name: "Projects", accent: "cobalt", text: "sky", blurb: "Blueprints, tasks, dependencies.", opensIn: 4, object: "ruler" },
  { slug: "career", name: "Career", accent: "sky", text: "sky", blurb: "Experience to opportunity.", opensIn: 4, object: "compass" },
  { slug: "knowledge", name: "Knowledge", accent: "frost", text: "frost", blurb: "A constellation of what you learn.", opensIn: 4, object: "crystal-ball" },
  { slug: "training", name: "Training", accent: "signal", text: "sky", blurb: "Sessions, and showing up.", opensIn: 4, object: "lifting" },
  { slug: "life", name: "Life", accent: "glow", text: "glow", blurb: "Moments worth keeping.", opensIn: 4, object: "wine-glass" },
];

export const worldBySlug = (slug: string) => WORLDS.find((w) => w.slug === slug);
