import { filterPublicNotes, type SourceNote } from './notes.js';

export interface SearchCatalogSourceNote extends SourceNote {
  title?: string;
  permalink?: string;
  description?: string;
  date?: string;
  updated?: string;
}

export interface SearchCatalogItem {
  title: string;
  url: string;
  path: string;
  description: string;
  date: string;
  keywords: string[];
  genres: string[];
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function dedupeStrings(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    if (normalized.length === 0 || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function buildSlugKeywords(slug: string): string[] {
  if (slug.length === 0) {
    return [];
  }

  const slashSegments = slug.split('/').filter((segment) => segment.length > 0);
  const hyphenSegments = slashSegments.flatMap((segment) =>
    segment.split('-').filter((part) => part.length > 0),
  );

  return dedupeStrings([slug, ...slashSegments, ...hyphenSegments]);
}

export function buildSearchCatalog(notes: readonly SearchCatalogSourceNote[]): SearchCatalogItem[] {
  return filterPublicNotes(notes).flatMap((note) => {
    const title = normalizeString(note.title);
    const permalink = normalizeString(note.permalink);
    if (title.length === 0 || permalink.length === 0) {
      return [];
    }

    const slug = normalizeString(note.slug);
    const genres = normalizeStringArray(note.genre);
    const keywords = dedupeStrings([
      ...buildSlugKeywords(slug),
      ...genres,
    ]);

    return [
      {
        title,
        url: permalink,
        path: permalink,
        description: normalizeString(note.description),
        date: normalizeString(note.updated) || normalizeString(note.date),
        keywords,
        genres,
      } satisfies SearchCatalogItem,
    ];
  });
}
