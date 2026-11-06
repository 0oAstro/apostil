import type { Note } from "./types";

export function locateQuote(text: string, quote: string, near: number): { from: number; to: number } | null {
  const needle = quote.trim();
  if (!needle) return null;

  let best: number | null = null;
  let index = text.indexOf(needle);
  while (index !== -1) {
    if (best === null || Math.abs(index - near) < Math.abs(best - near)) best = index;
    index = text.indexOf(needle, index + 1);
  }
  return best === null ? null : { from: best, to: best + needle.length };
}

export function searchNotes(notes: Note[], query: string): Note[] {
  const needle = query.trim().toLowerCase();
  const byNewest = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
  if (!needle) return byNewest;
  const inTitle = byNewest.filter((note) => note.title.toLowerCase().includes(needle));
  const inText = byNewest.filter((note) => !inTitle.includes(note) && note.text.toLowerCase().includes(needle));
  return [...inTitle, ...inText];
}
