import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export default function () {
  const velitePath = join(process.cwd(), '.velite', 'notes.json');
  if (!existsSync(velitePath)) {
    return [];
  }

  const notes = JSON.parse(readFileSync(velitePath, 'utf-8'));
  const isProduction = process.env.NODE_ENV === 'production';
  const visibleNotes = isProduction ? notes.filter((note) => !note.draft) : notes;
  const genres = new Set();

  for (const note of visibleNotes) {
    const values = Array.isArray(note.genre) ? note.genre : [];
    for (const value of values) {
      if (typeof value !== 'string') {
        continue;
      }

      const normalized = value.trim();
      if (normalized.length > 0) {
        genres.add(normalized);
      }
    }
  }

  return [...genres].sort((left, right) => left.localeCompare(right, 'ja'));
}
