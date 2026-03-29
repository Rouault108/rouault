import { normalizeDocumentCanonicalUrl } from '../document-url.js';
import type { SearchFieldTokens } from '../search-types.js';
import { tokenizeSearchText } from './tokenize-text.js';

function dedupe(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export function tokenizeTitle(value: string): string[] {
  return tokenizeSearchText(value).tokens;
}

export function tokenizeBody(value: string): string[] {
  return tokenizeSearchText(value).tokens;
}

export function tokenizeKeywords(values: readonly string[]): string[] {
  return dedupe(values.flatMap((value) => tokenizeSearchText(value).tokens));
}

export function tokenizePath(documentCanonicalUrl: string): string[] {
  const canonicalUrl = normalizeDocumentCanonicalUrl(documentCanonicalUrl);
  if (canonicalUrl === null) {
    return [];
  }

  const normalizedPath = canonicalUrl.replace(/^\/+|\/+$/g, '');
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

export function createFieldTokens(input: {
  canonicalUrl: string;
  title: string;
  body: string;
  keywords: readonly string[];
}): SearchFieldTokens {
  return {
    titleTokens: tokenizeTitle(input.title),
    bodyTokens: tokenizeBody(input.body),
    pathTokens: tokenizePath(input.canonicalUrl),
    keywordTokens: tokenizeKeywords(input.keywords),
  };
}
