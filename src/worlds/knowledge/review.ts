/**
 * Spaced review, SM-2 style: a correct answer pushes the next review out by the entry's ease;
 * a miss brings it back tomorrow and makes the entry a little harder.
 */
export type Grade = "again" | "hard" | "good" | "easy";

export function schedule(interval: number, ease: number, grade: Grade): { interval: number; ease: number } {
  const i = Math.max(1, interval || 1), e = ease || 2.5;
  if (grade === "again") return { interval: 1, ease: Math.max(1.3, e - 0.2) };
  if (grade === "hard") return { interval: Math.max(1, Math.round(i * 1.2)), ease: Math.max(1.3, e - 0.15) };
  if (grade === "good") return { interval: i <= 1 ? 3 : Math.round(i * e), ease: e };
  return { interval: Math.round((i <= 1 ? 3 : i * e) * 1.3), ease: Math.min(3.2, e + 0.15) };
}
