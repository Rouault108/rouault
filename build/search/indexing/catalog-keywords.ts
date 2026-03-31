import { tokenizeSearchText } from '../../../shared/search/tokenize-text.js';

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
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

export function buildSlugKeywords(slug: string): string[] {
  if (slug.length === 0) {
    return [];
  }

  const slashSegments = slug.split('/').filter((segment) => segment.length > 0);
  const hyphenSegments = slashSegments.flatMap((segment) =>
    segment.split('-').filter((part) => part.length > 0),
  );

  return dedupeStrings([slug, ...slashSegments, ...hyphenSegments]);
}

export function buildTokenKeywords(value: string): string[] {
  return tokenizeSearchText(normalizeString(value)).tokens;
}

export function buildCatalogKeywords(input: {
  slug: string;
  title: string;
  description: string;
  tags: readonly string[];
}): string[] {
  return dedupeStrings([
    ...buildSlugKeywords(input.slug),
    ...input.tags,
    ...buildTokenKeywords(input.title),
    ...buildTokenKeywords(input.description),
  ]);
}
