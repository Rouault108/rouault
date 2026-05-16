import { filterNotesBySurface, type SourceNote } from '../../src/data/notes.js';
import type { SearchCatalogItem } from '../../shared/search/search-catalog.js';
import { createSearchCanonicalPathname } from '../../shared/search/document-url.js';
import { buildCatalogKeywords } from './indexing/catalog-keywords.js';

export interface SearchCatalogSourceNote extends SourceNote {
  title?: string;
  permalink?: string;
  description?: string;
  date?: string;
  updated?: string;
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

export function buildSearchCatalog(notes: readonly SearchCatalogSourceNote[]): SearchCatalogItem[] {
  return filterNotesBySurface(notes, 'search').flatMap((note) => {
    const title = normalizeString(note.title);
    const permalink = normalizeString(note.permalink);
    if (title.length === 0 || permalink.length === 0) {
      return [];
    }

    const slug = normalizeString(note.slug);
    const tags = normalizeStringArray(note.genre);
    const description = normalizeString(note.description);

    const canonical = createSearchCanonicalPathname({ pathname: permalink });
    if (!canonical.ok) {
      return [];
    }

    return [
      {
        title,
        canonicalPathname: canonical.canonicalPathname,
        description,
        date: normalizeString(note.updated) || normalizeString(note.date),
        keywords: buildCatalogKeywords({
          slug,
          title,
          description,
          tags,
        }),
        tags,
      } satisfies SearchCatalogItem,
    ];
  });
}

export function serializeSearchCatalog(notes: readonly SearchCatalogSourceNote[]): string {
  return JSON.stringify(buildSearchCatalog(notes));
}
