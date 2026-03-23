import { prepareSearchQuery } from './query-preprocessor.js';
import {
  derivePathLabel,
  normalizeDocumentCanonicalUrl,
  validateResultUrl,
} from './document-url.js';
import {
  getSearchCatalog,
  type SearchCatalogItem,
} from './search-catalog.js';
import {
  DEFAULT_SEARCH_SORT_MODE,
  normalizeSearchSort,
  normalizeSearchTags,
  normalizeSearchTagMode,
  normalizeSearchQuery,
  type SearchState,
} from './search-url.js';
import { snippetFromDescription, snippetFromExcerptHtml } from './search-snippet.js';
import type {
  ExploreSearchResponse,
  NavigateSearchResponse,
  SearchDateValue,
  SearchDiagnosticIssue,
  SearchFailureKind,
  SearchRequest,
  SearchResponse,
  SearchResultItem,
  SearchSourceKind,
  SearchReason,
} from './search-types.js';

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

type PagefindLoader = () => Promise<PagefindApi>;

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

interface SearchCoreDependencies {
  loadPagefind?: PagefindLoader;
  loadSearchCatalog?: () => Promise<readonly SearchCatalogItem[]>;
}

interface RankedCandidate {
  item: SearchResultItem;
  score: number;
}

interface MutableDiagnostics {
  failures: SearchFailureKind[];
  issues: SearchDiagnosticIssue[];
  activeSources: SearchSourceKind[];
}

const NAVIGATE_LIMIT = 20;
const STAGE_ORDER = ['fetch', 'normalize', 'validate', 'merge', 'rank', 'filter', 'navigate'];
const SEVERITY_ORDER = ['error', 'warn', 'info'];

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeDateValue(value: string): SearchDateValue {
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

function normalizeCountMap(value: Record<string, number> | undefined): Record<string, number> {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const counts = new Map<string, number>();

  for (const [rawTag, rawCount] of Object.entries(value)) {
    const [tag] = normalizeSearchTags([rawTag]);
    if (!tag || !Number.isSafeInteger(rawCount) || rawCount < 0) {
      continue;
    }

    counts.set(tag, (counts.get(tag) ?? 0) + rawCount);
  }

  return Object.fromEntries(
    [...counts.entries()].sort((left, right) => left[0].localeCompare(right[0], 'ja')),
  );
}

function buildTagCounts(items: readonly SearchResultItem[]): Record<string, number> {
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

function uniqueArray<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

function mergeReasons(left: readonly SearchReason[], right: readonly SearchReason[]): SearchReason[] {
  const merged = new Map<string, SearchReason>();

  for (const reason of [...left, ...right]) {
    const key = JSON.stringify(reason);
    if (!merged.has(key)) {
      merged.set(key, reason);
    }
  }

  return [...merged.values()];
}

function addFailure(diagnostics: MutableDiagnostics, failure: SearchFailureKind): void {
  if (!diagnostics.failures.includes(failure)) {
    diagnostics.failures.push(failure);
  }
}

function issueSeverity(code: SearchDiagnosticIssue['code']): SearchDiagnosticIssue['severity'] {
  switch (code) {
    case 'invalid-catalog-item':
    case 'source-degraded':
      return 'warn';
    case 'invalid-result-url':
    case 'unsupported-url-scheme':
    case 'cross-origin-url':
    case 'url-with-credentials':
    case 'invalid-document-canonical-url':
    case 'catalog-path-url-mismatch':
    case 'source-failed':
      return 'error';
  }
}

function addIssue(
  diagnostics: MutableDiagnostics,
  issue: Omit<SearchDiagnosticIssue, 'severity' | 'count'> & { severity?: SearchDiagnosticIssue['severity'] },
): void {
  const severity = issue.severity ?? issueSeverity(issue.code);
  const existing = diagnostics.issues.find(
    (candidate) =>
      candidate.code === issue.code &&
      candidate.stage === issue.stage &&
      candidate.source === issue.source &&
      candidate.candidateRef === issue.candidateRef,
  );

  if (existing) {
    existing.count += 1;
    return;
  }

  diagnostics.issues.push({
    ...issue,
    severity,
    count: 1,
  });
}

function finalizeDiagnostics(diagnostics: MutableDiagnostics) {
  const activeSources = uniqueArray(diagnostics.activeSources);
  const issues = [...diagnostics.issues].sort((left, right) => {
    const severityOrder =
      SEVERITY_ORDER.indexOf(left.severity) - SEVERITY_ORDER.indexOf(right.severity);
    if (severityOrder !== 0) {
      return severityOrder;
    }

    const stageOrder = STAGE_ORDER.indexOf(left.stage) - STAGE_ORDER.indexOf(right.stage);
    if (stageOrder !== 0) {
      return stageOrder;
    }

    const codeOrder = left.code.localeCompare(right.code, 'ja');
    if (codeOrder !== 0) {
      return codeOrder;
    }

    const sourceOrder = (left.source ?? '~').localeCompare(right.source ?? '~', 'ja');
    if (sourceOrder !== 0) {
      return sourceOrder;
    }

    return (left.candidateRef ?? '~').localeCompare(right.candidateRef ?? '~', 'ja');
  });

  const degraded =
    diagnostics.failures.length > 0 ||
    issues.some((issue) => issue.code === 'source-degraded' && activeSources.includes(issue.source!));

  return {
      degraded,
      activeSources,
    failures: [...diagnostics.failures],
    issues: issues.slice(0, 100),
  };
}

function buildFilterExpression(tags: readonly string[], tagMode: SearchState['tagMode']) {
  if (tags.length === 0) {
    return undefined;
  }

  return {
    genre: tagMode === 'or' ? ({ any: [...tags] } satisfies Record<string, unknown>) : [...tags],
  };
}

function hasAllTags(itemTags: readonly string[], tags: readonly string[]): boolean {
  return tags.every((tag) => itemTags.includes(tag));
}

function hasAnyTag(itemTags: readonly string[], tags: readonly string[]): boolean {
  return tags.some((tag) => itemTags.includes(tag));
}

function applyTagFilter(
  items: readonly SearchResultItem[],
  tags: readonly string[],
  tagMode: SearchState['tagMode'],
): SearchResultItem[] {
  if (tags.length === 0) {
    return [...items];
  }

  return items.filter((item) =>
    tagMode === 'and' ? hasAllTags(item.tags, tags) : hasAnyTag(item.tags, tags),
  );
}

function computeReasons(
  title: string,
  description: string,
  pathLabel: string,
  tags: readonly string[],
  tokens: readonly string[],
  selectedTags: readonly string[],
  source: SearchSourceKind,
  snippetAvailable: boolean,
): SearchReason[] {
  const normalizedTitle = title.toLocaleLowerCase('ja');
  const normalizedDescription = description.toLocaleLowerCase('ja');
  const normalizedPath = pathLabel.toLocaleLowerCase('ja');
  const normalizedTags = tags.map((tag) => tag.toLocaleLowerCase('ja'));
  const normalizedTokens = tokens.map((token) => token.toLocaleLowerCase('ja'));
  const reasons: SearchReason[] = [];

  if (normalizedTokens.length > 0 && normalizedTitle === normalizedTokens.join(' ')) {
    reasons.push({ kind: 'title-exact', tokens: [...tokens], source });
  } else if (
    normalizedTokens.length > 0 &&
    normalizedTitle.startsWith(normalizedTokens[0] ?? '')
  ) {
    reasons.push({ kind: 'title-prefix', tokens: [...tokens], source });
  } else if (
    normalizedTokens.length > 0 &&
    normalizedTokens.every((token) => normalizedTitle.includes(token))
  ) {
    reasons.push({ kind: 'title-token-coverage', tokens: [...tokens], source });
  }

  if (normalizedTokens.some((token) => normalizedPath.includes(token))) {
    reasons.push({ kind: 'path-match', tokens: [...tokens], source });
  }

  if (normalizedTokens.some((token) => normalizedDescription.includes(token))) {
    reasons.push({ kind: 'body-match', tokens: [...tokens], source });
  }

  if (
    normalizedTokens.some((token) => normalizedTags.some((tag) => tag.includes(token)))
  ) {
    reasons.push({ kind: 'keyword-match', tokens: [...tokens], source });
  }

  if (selectedTags.length > 0) {
    reasons.push({ kind: 'tag-filter-match', tokens: [...selectedTags], source });
  }

  if (!snippetAvailable && source === 'catalog') {
    reasons.push({ kind: 'catalog-fallback', source });
  }

  return reasons;
}

function computeScore(item: SearchResultItem, tokens: readonly string[], mode: SearchRequest['mode']): number {
  const normalizedTitle = item.title.toLocaleLowerCase('ja');
  const normalizedDescription = item.description.toLocaleLowerCase('ja');
  const normalizedPath = item.pathLabel.toLocaleLowerCase('ja');
  const normalizedTokens = tokens.map((token) => token.toLocaleLowerCase('ja'));
  const titleExact = normalizedTokens.length > 0 && normalizedTitle === normalizedTokens.join(' ');
  const titlePrefix =
    normalizedTokens.length > 0 && normalizedTitle.startsWith(normalizedTokens[0] ?? '');
  const titleCoverage =
    normalizedTokens.length > 0 &&
    normalizedTokens.every((token) => normalizedTitle.includes(token));
  const bodyScore = normalizedTokens.some((token) => normalizedDescription.includes(token)) ? 1 : 0;
  const pathScore = normalizedTokens.some((token) => normalizedPath.includes(token)) ? 1 : 0;
  const freshnessScore =
    item.date.epochMs === null ? 0 : Math.max(0, Math.min(1, item.date.epochMs / 4102444800000));

  const navigateWeights =
    mode === 'navigate'
      ? { titleExact: 5, titlePrefix: 3, titleCoverage: 2, body: 1, path: 1, freshness: 0.3 }
      : { titleExact: 4, titlePrefix: 2, titleCoverage: 2, body: 1.2, path: 1, freshness: 0.6 };

  return (
    (titleExact ? navigateWeights.titleExact : 0) +
    (titlePrefix ? navigateWeights.titlePrefix : 0) +
    (titleCoverage ? navigateWeights.titleCoverage : 0) +
    bodyScore * navigateWeights.body +
    pathScore * navigateWeights.path +
    freshnessScore * navigateWeights.freshness
  );
}

function stableSortCandidates(
  items: readonly SearchResultItem[],
  tokens: readonly string[],
  mode: SearchRequest['mode'],
  sort: SearchState['sort'],
): SearchResultItem[] {
  const ranked: RankedCandidate[] = items.map((item) => ({
    item,
    score: computeScore(item, tokens, mode),
  }));

  return ranked
    .sort((left, right) => {
      if (sort === 'date-desc') {
        const epochOrder = (right.item.date.epochMs ?? -1) - (left.item.date.epochMs ?? -1);
        if (epochOrder !== 0) {
          return epochOrder;
        }
      } else {
        const scoreOrder = right.score - left.score;
        if (scoreOrder !== 0) {
          return scoreOrder;
        }
      }

      const titleOrder = left.item.title.localeCompare(right.item.title, 'ja');
      if (titleOrder !== 0) {
        return titleOrder;
      }

      return left.item.canonicalUrl.localeCompare(right.item.canonicalUrl, 'ja');
    })
    .map((entry) => entry.item);
}

function createEmptyDiagnostics() {
  return {
    failures: [] as SearchFailureKind[],
    issues: [] as SearchDiagnosticIssue[],
    activeSources: [] as SearchSourceKind[],
  } satisfies MutableDiagnostics;
}

function createEmptyResponse(request: SearchRequest, diagnostics = finalizeDiagnostics(createEmptyDiagnostics())): SearchResponse {
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

const defaultPagefindLoader = createDefaultPagefindLoader();

function createCatalogItem(
  item: SearchCatalogItem,
  preparedQuery: ReturnType<typeof prepareSearchQuery>,
  selectedTags: readonly string[],
  diagnostics: MutableDiagnostics,
): SearchResultItem | null {
  const title = normalizeString(item.title);
  const description = normalizeString(item.description);
  const tags = normalizeSearchTags(item.genres ?? []);
  const canonicalUrl = normalizeDocumentCanonicalUrl(normalizeString(item.path));
  const validatedUrl = validateResultUrl(normalizeString(item.url));
  const normalizedUrlCanonical =
    validatedUrl.ok ? normalizeDocumentCanonicalUrl(validatedUrl.url) : null;

  if (title.length === 0) {
    addIssue(diagnostics, { code: 'invalid-catalog-item', stage: 'normalize', source: 'catalog' });
    return null;
  }

  if (canonicalUrl === null) {
    addIssue(diagnostics, {
      code: 'invalid-document-canonical-url',
      stage: 'validate',
      source: 'catalog',
    });
    return null;
  }

  if (!validatedUrl.ok) {
    addIssue(diagnostics, {
      code: validatedUrl.code,
      stage: 'validate',
      source: 'catalog',
      candidateRef: canonicalUrl,
    });
    return null;
  }

  if (normalizedUrlCanonical === null) {
    addIssue(diagnostics, {
      code: 'invalid-document-canonical-url',
      stage: 'validate',
      source: 'catalog',
      candidateRef: canonicalUrl,
    });
    return null;
  }

  if (normalizedUrlCanonical !== canonicalUrl) {
    addIssue(diagnostics, {
      code: 'catalog-path-url-mismatch',
      stage: 'validate',
      source: 'catalog',
      candidateRef: canonicalUrl,
    });
    return null;
  }

  const pathLabel = derivePathLabel(canonicalUrl);
  const snippet = snippetFromDescription(description);

  return {
    canonicalUrl,
    url: validatedUrl.url,
    pathLabel,
    title,
    description,
    date: normalizeDateValue(normalizeString(item.date)),
    tags,
    snippet,
    reasons: computeReasons(
      title,
      description,
      pathLabel,
      tags,
      preparedQuery.tokens,
      selectedTags,
      'catalog',
      snippet !== null,
    ),
  };
}

function createPagefindItem(
  data: PagefindFragmentData,
  preparedQuery: ReturnType<typeof prepareSearchQuery>,
  selectedTags: readonly string[],
  diagnostics: MutableDiagnostics,
): SearchResultItem | null {
  const validatedUrl = validateResultUrl(normalizeString(data.url));
  if (!validatedUrl.ok) {
    addIssue(diagnostics, {
      code: validatedUrl.code,
      stage: 'validate',
      source: 'pagefind',
    });
    return null;
  }

  const canonicalUrl = normalizeDocumentCanonicalUrl(validatedUrl.url);
  if (canonicalUrl === null) {
    addIssue(diagnostics, {
      code: 'invalid-document-canonical-url',
      stage: 'validate',
      source: 'pagefind',
    });
    return null;
  }

  const title = normalizeString(data.meta?.['title']) || derivePathLabel(canonicalUrl);
  const description = normalizeString(data.meta?.['description']);
  const tags = normalizeSearchTags(
    normalizeString(data.meta?.['genre'])
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0),
  );
  const pathLabel = derivePathLabel(canonicalUrl);
  const snippet =
    snippetFromExcerptHtml(normalizeString(data.excerpt)) ?? snippetFromDescription(description);

  return {
    canonicalUrl,
    url: validatedUrl.url,
    pathLabel,
    title,
    description,
    date: normalizeDateValue(normalizeString(data.meta?.['date'])),
    tags,
    snippet,
    reasons: computeReasons(
      title,
      description,
      pathLabel,
      tags,
      preparedQuery.tokens,
      selectedTags,
      'pagefind',
      snippet !== null,
    ),
  };
}

function mergeItems(pagefindItems: readonly SearchResultItem[], catalogItems: readonly SearchResultItem[]) {
  const merged = new Map<string, SearchResultItem>();

  for (const item of [...catalogItems, ...pagefindItems]) {
    const existing = merged.get(item.canonicalUrl);
    if (!existing) {
      merged.set(item.canonicalUrl, item);
      continue;
    }

    const preferredSnippet = existing.snippet ?? item.snippet;
    const preferredDescription =
      existing.description.length >= item.description.length ? existing.description : item.description;
    const preferredDate =
      (existing.date.epochMs ?? -1) >= (item.date.epochMs ?? -1) ? existing.date : item.date;
    const mergedTags = normalizeSearchTags([...existing.tags, ...item.tags]);
    const preferredUrl =
      normalizeDocumentCanonicalUrl(existing.url) === existing.canonicalUrl ? existing.url : item.url;

    merged.set(item.canonicalUrl, {
      ...existing,
      url: preferredUrl,
      description: preferredDescription,
      date: preferredDate,
      tags: mergedTags,
      snippet: preferredSnippet,
      reasons: mergeReasons(existing.reasons, item.reasons),
    });
  }

  return [...merged.values()];
}

function createNavigateResponse(
  items: readonly SearchResultItem[],
  diagnostics: MutableDiagnostics,
): NavigateSearchResponse {
  return {
    mode: 'navigate',
    items: items.slice(0, NAVIGATE_LIMIT),
    total: items.length,
    rankingProfileId: 'rouault-search-v1',
    diagnostics: finalizeDiagnostics(diagnostics),
  };
}

function createExploreResponse(
  items: readonly SearchResultItem[],
  queryMatchedItems: readonly SearchResultItem[],
  diagnostics: MutableDiagnostics,
): ExploreSearchResponse {
  return {
    mode: 'explore',
    items: [...items],
    total: items.length,
    rankingProfileId: 'rouault-search-v1',
    tagCounts: buildTagCounts(items),
    allTagCounts: buildTagCounts(queryMatchedItems),
    diagnostics: finalizeDiagnostics(diagnostics),
  };
}

export interface SearchCore {
  search(request: SearchRequest): Promise<SearchResponse>;
}

export function createSearchCore(dependencies: SearchCoreDependencies = {}): SearchCore {
  const loadPagefind = dependencies.loadPagefind ?? defaultPagefindLoader;
  const loadCatalog = dependencies.loadSearchCatalog ?? getSearchCatalog;

  let pagefindPromise: Promise<PagefindApi> | null = null;

  async function getPagefind(): Promise<PagefindApi | null> {
    pagefindPromise ??= loadPagefind();

    try {
      return await pagefindPromise;
    } catch {
      return null;
    }
  }

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
      const diagnostics = createEmptyDiagnostics();

      if (preparedQuery.rawQuery.length === 0 && normalizedRequest.tags.length === 0) {
        return createEmptyResponse(normalizedRequest);
      }

      const pagefind = await getPagefind();
      let pagefindItems: SearchResultItem[] = [];
      let pagefindQueryMatches: SearchResultItem[] = [];
      let pagefindAllTagCounts: Record<string, number> = {};
      let pagefindTagCounts: Record<string, number> = {};

      if (pagefind === null) {
        addFailure(diagnostics, 'pagefind-load-failed');
        addIssue(diagnostics, {
          code: 'source-failed',
          stage: 'fetch',
          source: 'pagefind',
        });
      } else {
        try {
          const searchOptions: Parameters<PagefindApi['search']>[1] = {};
          const pagefindFilters = buildFilterExpression(
            normalizedRequest.tags,
            normalizedRequest.tagMode,
          );
          if (pagefindFilters) {
            searchOptions.filters = pagefindFilters;
          }
          if (normalizedRequest.sort === 'date-desc') {
            searchOptions.sort = { date: 'desc' };
          }
          const response = await pagefind.search(
            preparedQuery.segmentedQuery.length > 0 ? preparedQuery.segmentedQuery : null,
            searchOptions,
          );

          diagnostics.activeSources.push('pagefind');

          const rawItems = await Promise.all(response.results.map((result) => result.data()));
          pagefindItems = rawItems
            .map((data) =>
              createPagefindItem(data, preparedQuery, normalizedRequest.tags, diagnostics),
            )
            .filter((item): item is SearchResultItem => item !== null);
          pagefindQueryMatches = [...pagefindItems];
          pagefindTagCounts = normalizeCountMap(response.filters?.['genre']);
          pagefindAllTagCounts = normalizeCountMap(response.totalFilters?.['genre']);

          if (
            normalizedRequest.mode === 'explore' &&
            pagefindItems.length > 0 &&
            Object.keys(pagefindAllTagCounts).length === 0
          ) {
            addFailure(diagnostics, 'pagefind-filter-read-failed');
            addIssue(diagnostics, {
              code: 'source-degraded',
              stage: 'filter',
              source: 'pagefind',
            });
          }
        } catch {
          addFailure(diagnostics, 'pagefind-search-failed');
          addIssue(diagnostics, {
            code: 'source-failed',
            stage: 'fetch',
            source: 'pagefind',
          });
        }
      }

      let catalogItems: SearchResultItem[] = [];
      let catalogQueryMatches: SearchResultItem[] = [];

      try {
        const catalog = await loadCatalog();
        diagnostics.activeSources.push('catalog');

        catalogQueryMatches = catalog
          .map((item) => createCatalogItem(item, preparedQuery, normalizedRequest.tags, diagnostics))
          .filter((item): item is SearchResultItem => item !== null)
          .filter((item) => {
            if (preparedQuery.tokens.length === 0) {
              return true;
            }

            const haystacks = [item.title, item.description, item.pathLabel, ...item.tags].map((value) =>
              value.toLocaleLowerCase('ja'),
            );
            return preparedQuery.tokens.some((token) =>
              haystacks.some((haystack) => haystack.includes(token.toLocaleLowerCase('ja'))),
            );
          });

        catalogItems = applyTagFilter(
          catalogQueryMatches,
          normalizedRequest.tags,
          normalizedRequest.tagMode,
        );
      } catch {
        addFailure(diagnostics, 'catalog-fetch-failed');
        addIssue(diagnostics, {
          code: 'source-failed',
          stage: 'fetch',
          source: 'catalog',
        });
      }

      const queryMatchedItems = mergeItems(pagefindQueryMatches, catalogQueryMatches);
      const filteredItems = applyTagFilter(
        mergeItems(pagefindItems, catalogItems),
        normalizedRequest.tags,
        normalizedRequest.tagMode,
      );
      const sortedItems = stableSortCandidates(
        filteredItems,
        preparedQuery.tokens,
        normalizedRequest.mode,
        normalizedRequest.sort,
      );

      if (diagnostics.activeSources.length === 0) {
        addFailure(diagnostics, 'all-sources-failed');
        return createEmptyResponse(normalizedRequest, finalizeDiagnostics(diagnostics));
      }

      if (normalizedRequest.mode === 'navigate') {
        return createNavigateResponse(sortedItems, diagnostics);
      }

      const response = createExploreResponse(
        sortedItems,
        stableSortCandidates(
          queryMatchedItems,
          preparedQuery.tokens,
          'explore',
          DEFAULT_SEARCH_SORT_MODE,
        ),
        diagnostics,
      );

      if (Object.keys(pagefindTagCounts).length > 0) {
        response.tagCounts = pagefindTagCounts;
      }
      if (Object.keys(pagefindAllTagCounts).length > 0) {
        response.allTagCounts = pagefindAllTagCounts;
      }

      return response;
    },
  };
}

export const searchCore = createSearchCore();
