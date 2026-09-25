/** The nine worlds, set out like a menu: the dish of the day, the everyday courses, and the long ones. */
export type WorldSlug = "today" | "school" | "work" | "money" | "projects" | "career" | "knowledge" | "training" | "life";
export type Course = "daily" | "building" | "living";

export type WorldDef = {
  slug: WorldSlug;
  name: string;
  course: Course;
  /** what the world is for, in a few plain words */
  dish: string;
};

export const COURSES: { id: Course; name: string }[] = [
  { id: "daily", name: "Every day" },
  { id: "building", name: "Building" },
  { id: "living", name: "Living" },
];

export const WORLDS: WorldDef[] = [
  { slug: "today", name: "Today", course: "daily", dish: "The one thing, the day's service, check ins" },
  { slug: "school", name: "School", course: "daily", dish: "Courses, deadlines and the next term" },
  { slug: "work", name: "Work", course: "daily", dish: "Shifts, hours and pay" },
  { slug: "money", name: "Money", course: "daily", dish: "Spending, bills, budgets and goals" },
  { slug: "projects", name: "Projects", course: "building", dish: "Plans, tasks and the time they take" },
  { slug: "career", name: "Career", course: "building", dish: "Applications, evidence and stories" },
  { slug: "knowledge", name: "Knowledge", course: "building", dish: "What you learn, and reviewing it" },
  { slug: "training", name: "Training", course: "living", dish: "Sessions and showing up" },
  { slug: "life", name: "Life", course: "living", dish: "Moments, people and photos" },
];

export const worldBySlug = (slug: string) => WORLDS.find((w) => w.slug === slug);
