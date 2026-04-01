import { filterNotesBySurface, type IntrinsicNote, type IntrinsicNotesCollection } from '../../build/data/notes.js';

export type TagPageSourceNote = IntrinsicNote;

export interface TagPageNoteSummary {
  title: string;
  permalink: string;
  description: string;
  date: string;
  slug: string;
  genres: string[];
}

export interface TagPageEntry {
  tag: string;
  noteCount: number;
  notes: TagPageNoteSummary[];
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeGenres(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (typeof item !== 'string') {
      continue;
    }

    const genre = item.trim();
    if (genre.length === 0 || seen.has(genre)) {
      continue;
    }

    seen.add(genre);
    normalized.push(genre);
  }

  return normalized;
}

function toTagPageNoteSummary(note: TagPageSourceNote): TagPageNoteSummary | null {
  const title = normalizeString(note.title);
  const permalink = normalizeString(note.permalink);
  const slug = normalizeString(note.slug);

  if (title.length === 0 || permalink.length === 0 || slug.length === 0) {
    return null;
  }

  return {
    title,
    permalink,
    description: normalizeString(note.description),
    date: normalizeString(note.updated) || normalizeString(note.date),
    slug,
    genres: normalizeGenres(note.genre),
  };
}

function compareNoteSummaries(left: TagPageNoteSummary, right: TagPageNoteSummary): number {
  if (left.date !== right.date) {
    if (left.date.length === 0) return 1;
    if (right.date.length === 0) return -1;
    return right.date.localeCompare(left.date, 'ja');
  }

  const titleOrder = left.title.localeCompare(right.title, 'ja');
  if (titleOrder !== 0) {
    return titleOrder;
  }

  return left.permalink.localeCompare(right.permalink, 'ja');
}

export function buildTagPageProjection(
  notes: IntrinsicNotesCollection | readonly TagPageSourceNote[],
): TagPageEntry[] {
  const visibleNotes = filterNotesBySurface(notes, 'tags');
  const tags = new Map<string, TagPageNoteSummary[]>();

  for (const note of visibleNotes) {
    const summary = toTagPageNoteSummary(note);
    if (summary === null) {
      continue;
    }

    for (const tag of summary.genres) {
      const entries = tags.get(tag) ?? [];
      entries.push(summary);
      tags.set(tag, entries);
    }
  }

  return [...tags.entries()]
    .sort((left, right) => left[0].localeCompare(right[0], 'ja'))
    .map(([tag, summaries]) => {
      const notesForTag = [...summaries].sort(compareNoteSummaries);
      return {
        tag,
        noteCount: notesForTag.length,
        notes: notesForTag,
      } satisfies TagPageEntry;
    });
}
