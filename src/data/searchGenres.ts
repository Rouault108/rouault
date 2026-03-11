import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { SourceNote } from './notes.js';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isSourceNote = (value: unknown): value is SourceNote => isRecord(value);

const readNotesFile = (filePath: string): SourceNote[] => {
  const parsed = JSON.parse(readFileSync(filePath, 'utf-8')) as unknown;
  return Array.isArray(parsed) ? parsed.filter(isSourceNote) : [];
};

export const buildSearchGenres = (
  notes: readonly SourceNote[],
  isProduction: boolean,
): string[] => {
  const visibleNotes = isProduction ? notes.filter((note) => note.draft !== true) : notes;
  const genres = new Set<string>();

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
};

export const loadSearchGenresData = (): string[] => {
  const velitePath = join(process.cwd(), '.velite', 'notes.json');
  if (!existsSync(velitePath)) {
    return [];
  }

  const notes = readNotesFile(velitePath);
  return buildSearchGenres(notes, process.env['NODE_ENV'] === 'production');
};
