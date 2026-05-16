import { normalizeSearchCanonicalPathname } from './document-url.js';
import type { SearchFieldTokens } from './search-types.js';
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

export function createFieldTokens(input: {
  canonicalPathname: string;
  title: string;
  body: string;
  keywords: readonly string[];
}): SearchFieldTokens {
  return {
    titleTokens: tokenizeTitle(input.title),
    bodyTokens: tokenizeBody(input.body),
    pathTokens: tokenizePath(input.canonicalPathname),
    keywordTokens: tokenizeKeywords(input.keywords),
  };
}
