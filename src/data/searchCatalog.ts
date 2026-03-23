import { filterPublicNotes, type SourceNote } from './notes.js';
import { tokenizeSearchText } from '../lib/search/query-preprocessor.js';

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
  tags: string[];
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
  const deduped = new Map<string, string>();

  for (const value of values) {
    const normalized = value.trim();
    if (normalized.length === 0) {
      continue;
    }

    const key = normalized.toLocaleLowerCase('ja');
    if (!deduped.has(key)) {
      deduped.set(key, normalized);
    }
  }

  return [...deduped.values()];
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

function buildTokenKeywords(value: string): string[] {
  return tokenizeSearchText(value).tokens;
}

export function buildSearchCatalog(notes: readonly SearchCatalogSourceNote[]): SearchCatalogItem[] {
  return filterPublicNotes(notes).flatMap((note) => {
    const title = normalizeString(note.title);
    const permalink = normalizeString(note.permalink);
    if (title.length === 0 || permalink.length === 0) {
      return [];
    }

    const slug = normalizeString(note.slug);
    const tags = normalizeStringArray(note.genre);
    const description = normalizeString(note.description);
    const keywords = dedupeStrings([
      ...buildSlugKeywords(slug),
      ...tags,
      ...buildTokenKeywords(title),
      ...buildTokenKeywords(description),
    ]);

    return [
      {
        title,
        url: permalink,
        path: permalink,
        description,
        date: normalizeString(note.updated) || normalizeString(note.date),
        keywords,
        tags,
      } satisfies SearchCatalogItem,
    ];
  });
}

export function serializeSearchCatalog(notes: readonly SearchCatalogSourceNote[]): string {
  return JSON.stringify(buildSearchCatalog(notes));
}
