import { normalizeSearchCanonicalPathname } from './document-url.js';
import type { CatalogFieldTokens } from './search-types.js';
import { tokenizeSearchText } from './tokenize-text.js';

function dedupe(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export function createCatalogFieldTokens(input: {
  canonicalPathname: string;
  title: string;
  description: string;
  keywords: readonly string[];
}): CatalogFieldTokens {
  return {
    titleTokens: tokenizeTitle(input.title),
    descriptionTokens: tokenizeSearchText(input.description).tokens,
    pathTokens: tokenizePath(input.canonicalPathname),
    keywordTokens: tokenizeKeywords(input.keywords),
  };
}

export function tokenizeTitle(value: string): string[] {
  return tokenizeSearchText(value).tokens;
}

export function tokenizeKeywords(values: readonly string[]): string[] {
  return dedupe(values.flatMap((value) => tokenizeSearchText(value).tokens));
}

export function tokenizePath(documentCanonicalPathname: string): string[] {
  const canonicalPathname = normalizeSearchCanonicalPathname(documentCanonicalPathname);
  if (canonicalPathname === null) {
    return [];
  }

  const normalizedPath = canonicalPathname.replace(/^\/+|\/+$/gu, '');
  if (normalizedPath.length === 0) {
    return [];
  }

  return dedupe(
    normalizedPath
      .split('/')
      .flatMap((segment) => segment.split('-'))
      .flatMap((segment) => tokenizeSearchText(segment).tokens),
  );
}
