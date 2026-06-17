import type {
  PagefindApi,
  PagefindFragmentData,
  PagefindLoader,
  PagefindSearchResponse,
} from '../../../shared/search/search-loaders.js';
import { createFieldTokens } from '../../../shared/search/field-tokenizers.js';
import {
  addFailure,
  addIssue,
  createCandidateRef,
  type MutableDiagnostics,
} from '../diagnostics.js';
import { isAbortError, throwIfAborted } from '../abort.js';
import {
  derivePathLabel,
  validateSearchResultRenderHref,
} from '../../../shared/search/document-url.js';
import { isSearchVisibleCanonicalPathname } from '../../../shared/search/search-visibility.js';
import type { PreparedSearchQuery } from '../../../shared/search/query-preprocessor.js';
import { snippetFromDescription, snippetFromExcerptHtml } from '../search-snippet.js';
import type {
  SearchCandidate,
  SearchCountMap,
  SearchRequest,
  SearchSourceBatch,
} from '../../../shared/search/search-types.js';
import type { SiteUrlContext } from '../../../shared/site/site-url-context.js';

const pagefindCapabilities = {
  providesBodyEvidence: true,
  providesCountMap: true,
  supportsTagPrefilter: true,
  supportsNativeAndSemantics: false,
  supportsNativeDateDescSort: false,
} as const;

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeStringArray(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function normalizeCountMap(value: unknown): SearchCountMap | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const countMap = new Map<string, number>();

  for (const [rawTag, rawCount] of Object.entries(value as Record<string, unknown>)) {
    if (
      typeof rawTag !== 'string' ||
      typeof rawCount !== 'number' ||
      !Number.isSafeInteger(rawCount) ||
      rawCount < 0
    ) {
      return null;
    }

    countMap.set(rawTag, rawCount);
  }

  return Object.fromEntries(
    [...countMap.entries()].sort((left, right) => left[0].localeCompare(right[0], 'ja')),
  );
}

function emptyFeatureScores() {
  return {
    titleExactScore: 0,
    titlePrefixScore: 0,
    titleTokenCoverageScore: 0,
    bodyScore: 0,
    pathScore: 0,
    keywordScore: 0,
    freshnessScore: 0,
    sourceReliabilityScore: 1,
    matchEvidenceScore: 0,
  } as const;
}

function normalizeDateValue(value: string) {
  const original = value.trim();
  if (original.length === 0) {
    return { epochMs: null, original: null };
  }

  const epochMs = Date.parse(original);
  return {
    epochMs: Number.isFinite(epochMs) ? epochMs : null,
    original,
  };
}

function createPagefindCandidate(
  data: PagefindFragmentData,
  siteUrlContext: SiteUrlContext,
): SearchCandidate | null {
  const validatedUrl = validateSearchResultRenderHref(normalizeString(data.url), {
    siteUrlContext,
  });
  if (!validatedUrl.ok) {
    return null;
  }

  const canonicalPathname = validatedUrl.canonicalPathname;
  if (!isSearchVisibleCanonicalPathname(canonicalPathname)) {
    return null;
  }

  const title = normalizeString(data.meta?.['title']) || derivePathLabel(canonicalPathname);
  if (title.length === 0) {
    return null;
  }

  const description = normalizeString(data.meta?.['description']);
  const tags = normalizeStringArray(normalizeString(data.meta?.['genre']));
  const rawContent = normalizeString(data.raw_content);
  const bodyText =
    rawContent.length > 0
      ? rawContent
      : normalizeString(data.excerpt).replace(/<[^>]+>/g, ' ') || description;
  const snippet =
    snippetFromExcerptHtml(normalizeString(data.excerpt)) ?? snippetFromDescription(description);

  return {
    canonicalPathname,
    pathLabel: derivePathLabel(canonicalPathname),
    title,
    description,
    date: normalizeDateValue(normalizeString(data.meta?.['date'])),
    tags,
    snippet,
    matchedSources: ['pagefind'],
    matchedFields: [],
    matchedTokens: [],
    featureScores: { ...emptyFeatureScores() },
    fieldTokens: createFieldTokens({
      canonicalPathname,
      title,
      body: bodyText,
      keywords: [...tags],
    }),
  };
}

export async function loadPagefindSourceBatch(input: {
  loadPagefind: PagefindLoader;
  request: SearchRequest;
  preparedQuery: PreparedSearchQuery;
  diagnostics: MutableDiagnostics;
  signal?: AbortSignal | undefined;
  siteUrlContext: SiteUrlContext;
}): Promise<SearchSourceBatch> {
  let pagefind: PagefindApi;

  throwIfAborted(input.signal);

  try {
    pagefind = await input.loadPagefind();
  } catch (error: unknown) {
    if (isAbortError(error)) {
      throw error;
    }

    throwIfAborted(input.signal);

    addFailure(input.diagnostics, 'pagefind-load-failed');
    addIssue(input.diagnostics, {
      code: 'source-failed',
      stage: 'fetch',
      source: 'pagefind',
    });
    return {
      source: 'pagefind',
      status: 'failed',
      failure: 'pagefind-load-failed',
      capabilities: pagefindCapabilities,
      candidates: [],
    };
  }

  throwIfAborted(input.signal);

  let response: PagefindSearchResponse;

  try {
    throwIfAborted(input.signal);
    response = await pagefind.search(
      input.preparedQuery.segmentedQuery.length > 0 ? input.preparedQuery.segmentedQuery : null,
      {},
    );
  } catch (error: unknown) {
    if (isAbortError(error)) {
      throw error;
    }

    throwIfAborted(input.signal);

    addFailure(input.diagnostics, 'pagefind-search-failed');
    addIssue(input.diagnostics, {
      code: 'source-failed',
      stage: 'fetch',
      source: 'pagefind',
    });
    return {
      source: 'pagefind',
      status: 'failed',
      failure: 'pagefind-search-failed',
      capabilities: pagefindCapabilities,
      candidates: [],
    };
  }

  throwIfAborted(input.signal);

  let rawResults: PagefindFragmentData[];

  try {
    throwIfAborted(input.signal);
    rawResults = await Promise.all(response.results.map((result) => result.data()));
    throwIfAborted(input.signal);
  } catch (error: unknown) {
    if (isAbortError(error)) {
      throw error;
    }

    throwIfAborted(input.signal);

    addFailure(input.diagnostics, 'pagefind-search-failed');
    addIssue(input.diagnostics, {
      code: 'source-failed',
      stage: 'fetch',
      source: 'pagefind',
    });
    return {
      source: 'pagefind',
      status: 'failed',
      failure: 'pagefind-search-failed',
      capabilities: pagefindCapabilities,
      candidates: [],
    };
  }

  const candidates: SearchCandidate[] = [];

  for (const [index, result] of rawResults.entries()) {
    if (index % 64 === 0) {
      throwIfAborted(input.signal);
    }

    const candidate = createPagefindCandidate(result, input.siteUrlContext);
    if (candidate !== null) {
      candidates.push(candidate);
      continue;
    }

    const stableInput = normalizeString(result.url) || JSON.stringify(result.meta ?? {});
    addIssue(input.diagnostics, {
      code: 'invalid-result-url',
      stage: 'validate',
      source: 'pagefind',
      candidateRef: createCandidateRef('pagefind', stableInput),
    });
  }

  throwIfAborted(input.signal);

  let countMap: SearchCountMap | null | undefined = undefined;
  if (input.request.mode === 'explore') {
    throwIfAborted(input.signal);
    countMap = normalizeCountMap(
      (response as { readonly totalFilters?: Record<string, unknown> }).totalFilters?.['genre'] ??
        undefined,
    );
    throwIfAborted(input.signal);

    if (candidates.length > 0 && countMap === null) {
      addFailure(input.diagnostics, 'pagefind-filter-read-failed');
      addIssue(input.diagnostics, {
        code: 'source-degraded',
        stage: 'filter',
        source: 'pagefind',
      });
    }
  }

  return {
    source: 'pagefind',
    status: 'active',
    capabilities: pagefindCapabilities,
    candidates,
    ...(input.request.mode === 'explore' ? { countMap: countMap ?? null } : {}),
  };
}
