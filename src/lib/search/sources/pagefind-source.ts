import { createFieldTokens } from '../tokenization/field-tokenizers.js';
import { addFailure, addIssue, createCandidateRef, type MutableDiagnostics } from '../diagnostics.js';
import {
  derivePathLabel,
  normalizeDocumentCanonicalUrl,
  validateResultUrl,
} from '../document-url.js';
import type { PreparedSearchQuery } from '../query-preprocessor.js';
import { snippetFromDescription, snippetFromExcerptHtml } from '../search-snippet.js';
import type { SearchCandidate, SearchCountMap, SearchRequest, SearchSourceBatch } from '../search-types.js';

type PagefindFilterExpression = string | string[] | Record<string, unknown>;

export interface PagefindFragmentData {
  url: string;
  excerpt?: string;
  meta?: Record<string, string>;
  raw_content?: string;
}

export interface PagefindSearchResult {
  data(): Promise<PagefindFragmentData>;
}

export interface PagefindSearchResponse {
  results: PagefindSearchResult[];
  unfilteredResultCount: number;
  filters?: Record<string, Record<string, number>>;
  totalFilters?: Record<string, Record<string, number>>;
}

export interface PagefindApi {
  filters(): Promise<Record<string, Record<string, number>>>;
  search(
    term: string | null,
    options?: {
      filters?: Record<string, PagefindFilterExpression>;
      sort?: Record<string, 'asc' | 'desc'>;
    },
  ): Promise<PagefindSearchResponse>;
}

export type PagefindLoader = () => Promise<PagefindApi>;

interface DefaultPagefindLoaderDependencies {
  fetchModule?: (moduleUrl: string) => Promise<{
    ok: boolean;
    status: number;
    text(): Promise<string>;
  }>;
  importModule?: (moduleUrl: string) => Promise<unknown>;
  createModuleUrl?: (moduleSource: string) => string;
  revokeModuleUrl?: (moduleUrl: string) => void;
}

const pagefindCapabilities = {
  providesBodyEvidence: true,
  providesCountMap: true,
  supportsTagPrefilter: true,
  supportsNativeAndSemantics: false,
  supportsNativeDateDescSort: false,
} as const;

function isPagefindModule(value: unknown): value is {
  filters: PagefindApi['filters'];
  search: PagefindApi['search'];
  options?: (options: { basePath: string }) => Promise<void> | void;
} {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<{
    filters: PagefindApi['filters'];
    search: PagefindApi['search'];
    options?: (options: { basePath: string }) => Promise<void> | void;
  }>;

  return typeof candidate.filters === 'function' && typeof candidate.search === 'function';
}

function createPagefindModuleUrl(moduleSource: string): string {
  const blob = new Blob([moduleSource], { type: 'text/javascript' });
  return URL.createObjectURL(blob);
}

async function importPagefindModule(moduleUrl: string): Promise<unknown> {
  return import(/* @vite-ignore */ moduleUrl);
}

export function createDefaultPagefindLoader(
  dependencies: DefaultPagefindLoaderDependencies = {},
): PagefindLoader {
  const fetchModule =
    dependencies.fetchModule ??
    (async (moduleUrl: string) => {
      const response = await fetch(moduleUrl, { cache: 'no-store' });
      return response;
    });
  const importModule = dependencies.importModule ?? importPagefindModule;
  const createModuleUrl = dependencies.createModuleUrl ?? createPagefindModuleUrl;
  const revokeModuleUrl =
    dependencies.revokeModuleUrl ??
    ((moduleUrl: string): void => {
      URL.revokeObjectURL(moduleUrl);
    });

  return async (): Promise<PagefindApi> => {
    const response = await fetchModule('/pagefind/pagefind.js');
    if (!response.ok) {
      throw new Error(`Pagefind module の読み込みに失敗しました: ${response.status.toString()}`);
    }

    const moduleSource = await response.text();
    const moduleUrl = createModuleUrl(moduleSource);

    try {
      const imported = await importModule(moduleUrl);
      if (!isPagefindModule(imported)) {
        throw new Error('Pagefind module shape is invalid.');
      }

      if (typeof imported.options === 'function') {
        await imported.options({ basePath: '/pagefind/' });
      }

      return {
        filters: imported.filters,
        search: imported.search,
      };
    } finally {
      revokeModuleUrl(moduleUrl);
    }
  };
}

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
    if (typeof rawTag !== 'string' || typeof rawCount !== 'number' || !Number.isSafeInteger(rawCount) || rawCount < 0) {
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

function createPagefindCandidate(data: PagefindFragmentData): SearchCandidate | null {
  const validatedUrl = validateResultUrl(normalizeString(data.url));
  if (!validatedUrl.ok) {
    return null;
  }

  const canonicalUrl = normalizeDocumentCanonicalUrl(validatedUrl.url);
  if (canonicalUrl === null) {
    return null;
  }

  const title = normalizeString(data.meta?.['title']) || derivePathLabel(canonicalUrl);
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
    canonicalUrl,
    url: validatedUrl.url,
    pathLabel: derivePathLabel(canonicalUrl),
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
      canonicalUrl,
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
}): Promise<SearchSourceBatch> {
  let pagefind: PagefindApi;

  try {
    pagefind = await input.loadPagefind();
  } catch {
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

  let response: PagefindSearchResponse;

  try {
    response = await pagefind.search(
      input.preparedQuery.segmentedQuery.length > 0 ? input.preparedQuery.segmentedQuery : null,
      {},
    );
  } catch {
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

  const rawResults = await Promise.all(response.results.map((result) => result.data()));
  const candidates = rawResults.flatMap((result) => {
    const candidate = createPagefindCandidate(result);
    if (candidate !== null) {
      return [candidate];
    }

    const stableInput = normalizeString(result.url) || JSON.stringify(result.meta ?? {});
    addIssue(input.diagnostics, {
      code: 'invalid-result-url',
      stage: 'validate',
      source: 'pagefind',
      candidateRef: createCandidateRef('pagefind', stableInput),
    });
    return [];
  });

  let countMap: SearchCountMap | null | undefined = undefined;
  if (input.request.mode === 'explore') {
    countMap = normalizeCountMap(response.totalFilters?.['genre']);

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
