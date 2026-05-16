import { createSearchCanonicalPathname } from './document-url.js';
import {
  createSearchDiagnosticCandidateRef,
  type SearchJsonParseDiagnosticSink,
} from './search-diagnostics.js';
import type { SearchCatalogItem } from './search-catalog.js';
import type {
  SearchCountMap,
  SearchDateValue,
  SearchDiagnostics,
  SearchReason,
  SearchSnippet,
  StaticExploreSearchResponse,
  StaticExploreSearchResultItem,
} from './search-types.js';
import type { SiteUrlContext } from '../site/site-url-context.js';

const normalizeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = new Map<string, string>();
  for (const item of value) {
    if (typeof item !== 'string') {
      continue;
    }
    const stringValue = item.trim();
    if (stringValue.length === 0) {
      continue;
    }
    const key = stringValue.toLocaleLowerCase('ja');
    if (!normalized.has(key)) {
      normalized.set(key, stringValue);
    }
  }
  return [...normalized.values()];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const candidateRefForIndex = (index: number) => {
  const candidateRef = createSearchDiagnosticCandidateRef(`item-${index.toString()}`);
  return candidateRef !== undefined ? { candidateRef } : {};
};

const emptyDiagnostics = (): SearchDiagnostics => ({
  degraded: false,
  activeSources: ['catalog'],
  failures: [],
  issues: [],
});

const normalizeDate = (value: unknown): SearchDateValue => {
  if (!isRecord(value)) {
    return { epochMs: null, original: null };
  }
  const epochMs = typeof value['epochMs'] === 'number' && Number.isFinite(value['epochMs'])
    ? value['epochMs']
    : null;
  const original = typeof value['original'] === 'string' && value['original'].trim().length > 0
    ? value['original'].trim()
    : null;
  return { epochMs, original };
};

const normalizeSnippet = (value: unknown): SearchSnippet | null => {
  if (!isRecord(value) || !Array.isArray(value['segments'])) {
    return null;
  }

  const segments = value['segments'].flatMap((segment): SearchSnippet['segments'] => {
    if (!isRecord(segment) || typeof segment['text'] !== 'string') {
      return [];
    }
    return [{ text: segment['text'], matched: segment['matched'] === true }];
  });

  return segments.length > 0 ? { segments } : null;
};

const normalizeReasons = (value: unknown): SearchReason[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((reason): SearchReason[] => {
    if (!isRecord(reason) || typeof reason['kind'] !== 'string') {
      return [];
    }
    return [
      {
        kind: reason['kind'] as SearchReason['kind'],
        ...(Array.isArray(reason['tokens']) ? { tokens: normalizeStringArray(reason['tokens']) } : {}),
        ...(reason['source'] === 'catalog' || reason['source'] === 'pagefind'
          ? { source: reason['source'] }
          : {}),
      },
    ];
  });
};

const buildCountMapFromItems = (
  items: readonly StaticExploreSearchResultItem[],
): SearchCountMap => {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const tag of item.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return Object.fromEntries(
    [...counts.entries()].sort((left, right) => left[0].localeCompare(right[0], 'ja')),
  );
};

export type ParseSearchCatalogJsonResult =
  | {
      readonly ok: true;
      readonly items: readonly SearchCatalogItem[];
      readonly droppedItemCount: number;
    }
  | { readonly ok: false; readonly reason: 'invalid-search-catalog-schema' };

export type ParseStaticExploreSearchResponseResult =
  | {
      readonly ok: true;
      readonly response: StaticExploreSearchResponse;
      readonly droppedItemCount: number;
    }
  | { readonly ok: false; readonly reason: 'invalid-static-response-schema' };

export const parseSearchCatalogJson = (options: {
  readonly value: unknown;
  readonly siteUrlContext: SiteUrlContext;
  readonly isInternalDocumentPathname: (
    normalizedPathnameWithoutBasePath: string,
  ) => boolean;
  readonly diagnostics: SearchJsonParseDiagnosticSink;
}): ParseSearchCatalogJsonResult => {
  if (!Array.isArray(options.value)) {
    options.diagnostics.addIssue({
      code: 'invalid-search-catalog-schema',
      artifactSource: 'search-catalog-json',
    });
    return { ok: false, reason: 'invalid-search-catalog-schema' };
  }

  const items: SearchCatalogItem[] = [];
  let droppedItemCount = 0;

  for (const [index, entry] of options.value.entries()) {
    if (!isRecord(entry)) {
      droppedItemCount += 1;
      options.diagnostics.addIssue({
        code: 'invalid-catalog-item',
        artifactSource: 'search-catalog-json',
        ...candidateRefForIndex(index),
      });
      continue;
    }

    const canonical = createSearchCanonicalPathname({
      pathname: normalizeString(entry['canonicalPathname']),
      isInternalDocumentPathname: options.isInternalDocumentPathname,
    });
    if (!canonical.ok) {
      droppedItemCount += 1;
      options.diagnostics.addIssue({
        code: 'allowlist-miss',
        artifactSource: 'search-catalog-json',
        ...candidateRefForIndex(index),
      });
      continue;
    }

    items.push({
      title: normalizeString(entry['title']),
      canonicalPathname: canonical.canonicalPathname,
      description: normalizeString(entry['description']),
      date: normalizeString(entry['date']),
      keywords: normalizeStringArray(entry['keywords']),
      tags: normalizeStringArray(entry['tags'] ?? entry['genres']),
    });
  }

  options.diagnostics.addSummary({
    code: 'search-json-dropped-items',
    artifactSource: 'search-catalog-json',
    droppedItemCount,
  });

  return { ok: true, items, droppedItemCount };
};

export const parseStaticExploreSearchResponseJson = (options: {
  readonly value: unknown;
  readonly siteUrlContext: SiteUrlContext;
  readonly isInternalDocumentPathname: (
    normalizedPathnameWithoutBasePath: string,
  ) => boolean;
  readonly diagnostics: SearchJsonParseDiagnosticSink;
}): ParseStaticExploreSearchResponseResult => {
  if (!isRecord(options.value) || options.value['mode'] !== 'explore') {
    options.diagnostics.addIssue({
      code: 'invalid-static-response-schema',
      artifactSource: 'static-explore-response-json',
    });
    return { ok: false, reason: 'invalid-static-response-schema' };
  }

  const rawItems = options.value['items'];
  if (!Array.isArray(rawItems)) {
    options.diagnostics.addIssue({
      code: 'invalid-static-response-schema',
      artifactSource: 'static-explore-response-json',
    });
    return { ok: false, reason: 'invalid-static-response-schema' };
  }

  const items: StaticExploreSearchResultItem[] = [];
  let droppedItemCount = 0;

  for (const [index, item] of rawItems.entries()) {
    if (!isRecord(item) || 'renderHref' in item) {
      droppedItemCount += 1;
      options.diagnostics.addIssue({
        code: 'invalid-catalog-item',
        artifactSource: 'static-explore-response-json',
        ...candidateRefForIndex(index),
      });
      continue;
    }

    const canonical = createSearchCanonicalPathname({
      pathname: normalizeString(item['canonicalPathname']),
      isInternalDocumentPathname: options.isInternalDocumentPathname,
    });
    if (!canonical.ok) {
      droppedItemCount += 1;
      options.diagnostics.addIssue({
        code: 'allowlist-miss',
        artifactSource: 'static-explore-response-json',
        ...candidateRefForIndex(index),
      });
      continue;
    }

    items.push({
      canonicalPathname: canonical.canonicalPathname,
      pathLabel: normalizeString(item['pathLabel']),
      title: normalizeString(item['title']),
      description: normalizeString(item['description']),
      date: normalizeDate(item['date']),
      tags: normalizeStringArray(item['tags']),
      snippet: normalizeSnippet(item['snippet']),
      reasons: normalizeReasons(item['reasons']),
    });
  }

  options.diagnostics.addSummary({
    code: 'search-json-dropped-items',
    artifactSource: 'static-explore-response-json',
    droppedItemCount,
  });

  const response: StaticExploreSearchResponse = {
    mode: 'explore',
    items,
    total: items.length,
    rankingProfileId: 'rouault-search-v1',
    tagCounts: buildCountMapFromItems(items),
    allTagCounts: buildCountMapFromItems(items),
    diagnostics: emptyDiagnostics(),
  };

  return { ok: true, response, droppedItemCount };
};
