import { addFailure, addIssue, createDiagnostics, finalizeDiagnostics } from './diagnostics.js';
import {
  normalizeDocumentCanonicalUrl,
  validateResultUrl,
} from './document-url.js';
import { prepareSearchQuery } from './query-preprocessor.js';
import { stableSortCandidates } from './ranking/stable-sort.js';
import {
  computeMatchedFields,
  computeMatchedTokens,
  computeReasons,
  extractFeatureScores,
} from './ranking/scoring.js';
import { getSearchCatalog, type SearchCatalogItem } from './search-catalog.js';
import {
  loadCatalogSourceBatch,
} from './sources/catalog-source.js';
import {
  createDefaultPagefindLoader,
  loadPagefindSourceBatch,
  type PagefindApi,
  type PagefindFragmentData,
  type PagefindLoader,
  type PagefindSearchResponse,
  type PagefindSearchResult,
} from './sources/pagefind-source.js';
import {
  normalizeSearchQuery,
  normalizeSearchSort,
  normalizeSearchTags,
  normalizeSearchTagMode,
} from './search-url.js';
import type {
  ExploreSearchResponse,
  NavigateSearchResponse,
  SearchCandidate,
  SearchCountMap,
  SearchDiagnostics,
  SearchRequest,
  SearchResponse,
  SearchResultItem,
  SearchSourceBatch,
  SearchSourceKind,
} from './search-types.js';

export type { PagefindApi, PagefindFragmentData, PagefindSearchResponse, PagefindSearchResult };
export { createDefaultPagefindLoader };

interface SearchCoreDependencies {
  loadPagefind?: PagefindLoader;
  loadSearchCatalog?: () => Promise<readonly SearchCatalogItem[]>;
  now?: () => number;
}

interface MergedCandidateUrlEntry {
  source: SearchSourceKind;
  url: string;
}



const NAVIGATE_LIMIT = 20;

function buildEmptyResponse(
  request: SearchRequest,
  diagnostics: SearchDiagnostics,
): SearchResponse {
  const base = {
    items: [],
    total: 0,
    rankingProfileId: 'rouault-search-v1' as const,
    diagnostics,
  };

  if (request.mode === 'navigate') {
    return {
      ...base,
      mode: 'navigate',
    } satisfies NavigateSearchResponse;
  }

  return {
    ...base,
    mode: 'explore',
    tagCounts: {},
    allTagCounts: {},
  } satisfies ExploreSearchResponse;
}

function buildCountMap(items: readonly SearchCandidate[]): SearchCountMap {
  const counts = new Map<string, number>();

  for (const item of items) {
    for (const tag of item.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return Object.fromEntries(
    [...counts.entries()].sort((left, right) => left[0].localeCompare(right[0], 'ja')),
  );
}

function hasAllTags(itemTags: readonly string[], tags: readonly string[]): boolean {
  return tags.every((tag) => itemTags.includes(tag));
}

function hasAnyTags(itemTags: readonly string[], tags: readonly string[]): boolean {
  return tags.some((tag) => itemTags.includes(tag));
}

function applyTagFilter(
  items: readonly SearchCandidate[],
  tags: readonly string[],
  tagMode: SearchRequest['tagMode'],
): SearchCandidate[] {
  if (tags.length === 0) {
    return [...items];
  }

  return items.filter((item) =>
    tagMode === 'and' ? hasAllTags(item.tags, tags) : hasAnyTags(item.tags, tags),
  );
}

function pickPreferredUrl(
  canonicalUrl: string,
  urlEntries: readonly MergedCandidateUrlEntry[],
): string | null {
  const validEntries = urlEntries.filter((entry) => {
    const validated = validateResultUrl(entry.url);
    if (!validated.ok) {
      return false;
    }

    return normalizeDocumentCanonicalUrl(validated.url) === canonicalUrl;
  });

  if (validEntries.length === 0) {
    return null;
  }

  return [...validEntries].sort((left, right) => {
    const leftSourceOrder = left.source === 'pagefind' ? 0 : 1;
    const rightSourceOrder = right.source === 'pagefind' ? 0 : 1;
    if (leftSourceOrder !== rightSourceOrder) {
      return leftSourceOrder - rightSourceOrder;
    }

    const leftHasQueryOrHash = left.url.includes('?') || left.url.includes('#') ? 1 : 0;
    const rightHasQueryOrHash = right.url.includes('?') || right.url.includes('#') ? 1 : 0;
    if (leftHasQueryOrHash !== rightHasQueryOrHash) {
      return leftHasQueryOrHash - rightHasQueryOrHash;
    }

    return left.url.localeCompare(right.url, 'ja');
  })[0]?.url ?? null;
}

function mergeFieldTokens(left: SearchCandidate, right: SearchCandidate): SearchCandidate['fieldTokens'] {
  return {
    titleTokens: [...new Set([...left.fieldTokens.titleTokens, ...right.fieldTokens.titleTokens])],
    bodyTokens: [...new Set([...left.fieldTokens.bodyTokens, ...right.fieldTokens.bodyTokens])],
    pathTokens: [...new Set([...left.fieldTokens.pathTokens, ...right.fieldTokens.pathTokens])],
    keywordTokens: [
      ...new Set([...left.fieldTokens.keywordTokens, ...right.fieldTokens.keywordTokens]),
    ],
  };
}

function snippetMatchCount(candidate: SearchCandidate): number {
  return candidate.snippet?.segments.filter((segment) => segment.matched).length ?? 0;
}

function mergeCandidates(
  batches: readonly SearchSourceBatch[],
  diagnostics: ReturnType<typeof createDiagnostics>,
): SearchCandidate[] {
  const merged = new Map<
    string,
    SearchCandidate & {
      urlEntries: MergedCandidateUrlEntry[];
    }
  >();

  for (const batch of batches) {
    if (batch.status !== 'active') {
      continue;
    }

    for (const candidate of batch.candidates) {
      const existing = merged.get(candidate.canonicalUrl);
      if (!existing) {
        merged.set(candidate.canonicalUrl, {
          ...candidate,
          urlEntries: [{ source: batch.source, url: candidate.url }],
        });
        continue;
      }

      const preferredDescription =
        existing.matchedSources.includes('pagefind') && !candidate.matchedSources.includes('pagefind')
          ? existing.description
          : candidate.matchedSources.includes('pagefind') &&
              !existing.matchedSources.includes('pagefind')
            ? candidate.description
            : existing.description.length >= candidate.description.length
              ? existing.description
              : candidate.description;
      const preferredSnippet =
        existing.matchedSources.includes('pagefind') && !candidate.matchedSources.includes('pagefind')
          ? existing.snippet
          : candidate.matchedSources.includes('pagefind') &&
              !existing.matchedSources.includes('pagefind')
            ? candidate.snippet
            : snippetMatchCount(existing) >= snippetMatchCount(candidate)
              ? existing.snippet
              : candidate.snippet;
      const preferredDate =
        (existing.date.epochMs ?? -1) >= (candidate.date.epochMs ?? -1) ? existing.date : candidate.date;
      const preferredTitle =
        existing.title.length > 0
          ? existing.title
          : candidate.title.length > 0
            ? candidate.title
            : existing.title;

      merged.set(candidate.canonicalUrl, {
        ...existing,
        title: preferredTitle,
        description: preferredDescription,
        date: preferredDate,
        tags: normalizeSearchTags([...existing.tags, ...candidate.tags]),
        snippet: preferredSnippet,
        matchedSources: [...new Set([...existing.matchedSources, ...candidate.matchedSources])],
        fieldTokens: mergeFieldTokens(existing, candidate),
        featureScores: {
          ...existing.featureScores,
          sourceReliabilityScore: Math.max(
            existing.featureScores.sourceReliabilityScore,
            candidate.featureScores.sourceReliabilityScore,
          ),
          matchEvidenceScore: Math.max(
            existing.featureScores.matchEvidenceScore,
            candidate.featureScores.matchEvidenceScore,
          ),
        },
        urlEntries: [...existing.urlEntries, { source: batch.source, url: candidate.url }],
      });
    }
  }

  return [...merged.values()].flatMap((candidate) => {
    const preferredUrl = pickPreferredUrl(candidate.canonicalUrl, candidate.urlEntries);
    if (preferredUrl === null) {
      addIssue(diagnostics, {
        code: 'invalid-result-url',
        stage: 'merge',
        ...(candidate.matchedSources[0] ? { source: candidate.matchedSources[0] } : {}),
      });
      return [];
    }

    return [
      {
        canonicalUrl: candidate.canonicalUrl,
        url: preferredUrl,
        pathLabel: candidate.pathLabel,
        title: candidate.title,
        description: candidate.description,
        date: candidate.date,
        tags: candidate.tags,
        snippet: candidate.snippet,
        matchedSources: candidate.matchedSources,
        matchedFields: candidate.matchedFields,
        matchedTokens: candidate.matchedTokens,
        featureScores: candidate.featureScores,
        fieldTokens: candidate.fieldTokens,
      },
    ];
  });
}

function toResultItem(
  candidate: SearchCandidate,
  queryTokens: readonly string[],
  selectedTags: readonly string[],
): SearchResultItem {
  return {
    canonicalUrl: candidate.canonicalUrl,
    url: candidate.url,
    pathLabel: candidate.pathLabel,
    title: candidate.title,
    description: candidate.description,
    date: candidate.date,
    tags: candidate.tags,
    snippet: candidate.snippet,
    reasons: computeReasons(candidate, queryTokens, selectedTags),
  };
}

function isQueryMatch(candidate: SearchCandidate, normalizedQuery: string): boolean {
  if (normalizedQuery.length === 0) {
    return true;
  }

  return candidate.featureScores.matchEvidenceScore > 0;
}

export interface SearchCore {
  search(request: SearchRequest): Promise<SearchResponse>;
}

export function createSearchCore(dependencies: SearchCoreDependencies = {}): SearchCore {
  const loadPagefind = dependencies.loadPagefind ?? createDefaultPagefindLoader();
  const loadSearchCatalog = dependencies.loadSearchCatalog ?? getSearchCatalog;
  const now = dependencies.now ?? (() => Date.now());

  let pagefindPromise: Promise<PagefindApi> | null = null;

  const memoizedPagefindLoader: PagefindLoader = async () => {
    pagefindPromise ??= loadPagefind();
    return pagefindPromise;
  };

  return {
    async search(request: SearchRequest): Promise<SearchResponse> {
      const normalizedRequest: SearchRequest = {
        mode: request.mode,
        q: normalizeSearchQuery(request.q),
        tags: normalizeSearchTags(request.tags),
        tagMode: normalizeSearchTagMode(request.tagMode),
        sort: normalizeSearchSort(request.sort),
      };
      const preparedQuery = prepareSearchQuery(normalizedRequest.q);
      const diagnostics = createDiagnostics();
      const nowUtcMs = now();

      if (preparedQuery.normalizedQuery.length === 0 && normalizedRequest.tags.length === 0) {
        return buildEmptyResponse(normalizedRequest, finalizeDiagnostics(diagnostics, []));
      }

      const [pagefindBatch, catalogBatch] = await Promise.all([
        loadPagefindSourceBatch({
          loadPagefind: memoizedPagefindLoader,
          request: normalizedRequest,
          preparedQuery,
          diagnostics,
        }),
        loadCatalogSourceBatch({
          loadSearchCatalog,
          diagnostics,
        }),
      ]);

      const batches = [pagefindBatch, catalogBatch] satisfies SearchSourceBatch[];
      const activeBatches = batches.filter((batch) => batch.status === 'active');

      if (activeBatches.length === 0) {
        addFailure(diagnostics, 'all-sources-failed');
        return buildEmptyResponse(normalizedRequest, finalizeDiagnostics(diagnostics, batches));
      }

      const mergedCandidates = mergeCandidates(batches, diagnostics).map((candidate) => {
        const featureScores = extractFeatureScores(
          candidate,
          preparedQuery.tokens,
          preparedQuery.normalizedQuery,
          nowUtcMs,
        );

        return {
          ...candidate,
          featureScores,
          matchedTokens: computeMatchedTokens(candidate, preparedQuery.tokens),
          matchedFields: computeMatchedFields(candidate, preparedQuery.tokens, normalizedRequest.tags),
        };
      });

      const queryMatchedCandidates = mergedCandidates.filter((candidate) =>
        isQueryMatch(candidate, preparedQuery.normalizedQuery),
      );
      const filteredCandidates = applyTagFilter(
        queryMatchedCandidates,
        normalizedRequest.tags,
        normalizedRequest.tagMode,
      );
      const sortedCandidates = stableSortCandidates(
        filteredCandidates,
        normalizedRequest.mode,
        normalizedRequest.sort,
      );
      const diagnosticsResult = finalizeDiagnostics(diagnostics, batches);

      if (normalizedRequest.mode === 'navigate') {
        const items = sortedCandidates
          .slice(0, NAVIGATE_LIMIT)
          .map((candidate) => toResultItem(candidate, preparedQuery.tokens, normalizedRequest.tags));

        return {
          mode: 'navigate',
          items,
          total: sortedCandidates.length,
          rankingProfileId: 'rouault-search-v1',
          diagnostics: diagnosticsResult,
        } satisfies NavigateSearchResponse;
      }

      return {
        mode: 'explore',
        items: sortedCandidates.map((candidate) =>
          toResultItem(candidate, preparedQuery.tokens, normalizedRequest.tags),
        ),
        total: sortedCandidates.length,
        rankingProfileId: 'rouault-search-v1',
        tagCounts: buildCountMap(filteredCandidates),
        allTagCounts: buildCountMap(queryMatchedCandidates),
        diagnostics: diagnosticsResult,
      } satisfies ExploreSearchResponse;
    },
  };
}

export const searchCore = createSearchCore();
