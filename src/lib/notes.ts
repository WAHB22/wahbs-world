/**
 * The History note for one save, built from the notes of the changes it carries.
 * One note: itself. Two: 'A, B'. More: 'A and 2 more'. At most 120 characters.
 */

export const NOTE_MAX = 120;

/** Cut to max characters, ending with an ellipsis when something was cut. */
function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, Math.max(0, max - 1)).trimEnd() + '…';
}

export function joinNotes(notes: string[]): string {
  const list = notes.map((n) => n.trim()).filter(Boolean);
  if (list.length === 0) return '';
  if (list.length === 1) return clip(list[0], NOTE_MAX);
  if (list.length === 2) return clip(`${list[0]}, ${list[1]}`, NOTE_MAX);
  // Keep the count readable even when the first note is long.
  const tail = ` and ${list.length - 1} more`;
  return clip(list[0], NOTE_MAX - tail.length) + tail;
}
