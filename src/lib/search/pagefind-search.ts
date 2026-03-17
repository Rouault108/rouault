import { prepareSearchQuery } from './query-preprocessor.js';
import {
  getSearchCatalog,
  mergeSearchDialogItems,
  searchSearchCatalog,
  type SearchCatalogItem,
} from './search-catalog.js';
import {
  normalizeSearchSort,
  normalizeSearchTags,
  type SearchSortMode,
} from './search-url.js';
import { normalizeSearchResultUrl } from './normalize-search-result-url.js';

export interface PagefindFragmentData {
  url: string;
  excerpt?: string;
  meta?: Record<string, string>;
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
      filters?: Record<string, string[]>;
      sort?: Record<string, 'asc' | 'desc'>;
    },
  ): Promise<PagefindSearchResponse>;
}

export interface SearchResultItem {
  title: string;
  url: string;
  path: string;
  excerptHtml: string;
  description: string;
  date: string;
}

export interface SearchResponse {
  items: SearchResultItem[];
  total: number;
  genreCounts: Record<string, number>;
  allGenreCounts: Record<string, number>;
}

export interface SearchAdapter {
  search(
    query: string,
    selectedGenres: readonly string[],
    sortMode: SearchSortMode,
  ): Promise<SearchResponse>;
  getAvailableGenres(): Promise<Record<string, number>>;
}

type PagefindLoader = () => Promise<PagefindApi>;

interface PagefindSearchDependencies {
  loadSearchCatalog?: () => Promise<readonly SearchCatalogItem[]>;
}

interface PagefindSearchOptions {
  filters?: Record<string, string[]>;
  sort?: Record<string, 'asc' | 'desc'>;
}

interface PagefindModule {
  filters: PagefindApi['filters'];
  search: PagefindApi['search'];
  options?: (options: { basePath: string }) => Promise<void> | void;
}

interface PagefindModuleResponse {
  ok: boolean;
  status: number;
  text(): Promise<string>;
}

interface DefaultPagefindLoaderDependencies {
  fetchModule?: (moduleUrl: string) => Promise<PagefindModuleResponse>;
  importModule?: (moduleUrl: string) => Promise<unknown>;
  createModuleUrl?: (moduleSource: string) => string;
  revokeModuleUrl?: (moduleUrl: string) => void;
}

const isPagefindModule = (value: unknown): value is PagefindModule => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<PagefindModule>;
  return typeof candidate.filters === 'function' && typeof candidate.search === 'function';
};

const EMPTY_COUNTS: Record<string, number> = {};

function normalizeCounts(value: Record<string, number> | undefined): Record<string, number> {
  if (!value) {
    return EMPTY_COUNTS;
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter((entry): entry is [string, number] => typeof entry[1] === 'number')
      .sort((left, right) => left[0].localeCompare(right[0], 'ja')),
  );
}

function hasOwnEntries(value: Record<string, number>): boolean {
  return Object.keys(value).length > 0;
}

function normalizeCatalogGenres(item: SearchCatalogItem): string[] {
  return Array.isArray(item.genres)
    ? item.genres.filter((genre): genre is string => typeof genre === 'string' && genre.trim().length > 0)
    : [];
}

function buildGenreCounts(items: readonly SearchCatalogItem[]): Record<string, number> {
  const counts = new Map<string, number>();

  for (const item of items) {
    for (const genre of normalizeCatalogGenres(item)) {
      counts.set(genre, (counts.get(genre) ?? 0) + 1);
    }
  }

  return normalizeCounts(Object.fromEntries(counts));
}

function sortCatalogItemsByDate(items: readonly SearchCatalogItem[]): SearchCatalogItem[] {
  return [...items].sort((left, right) => {
    const leftDate = left.date?.trim() ?? '';
    const rightDate = right.date?.trim() ?? '';

    if (leftDate !== rightDate) {
      if (leftDate.length === 0) return 1;
      if (rightDate.length === 0) return -1;
      return rightDate.localeCompare(leftDate, 'ja');
    }

    const titleOrder = left.title.localeCompare(right.title, 'ja');
    if (titleOrder !== 0) {
      return titleOrder;
    }

    return left.path.localeCompare(right.path, 'ja');
  });
}

function sortCatalogItemsByQuery(
  items: readonly SearchCatalogItem[],
  query: string,
): SearchCatalogItem[] {
  const ranked = mergeSearchDialogItems([], searchSearchCatalog(items, query), query);
  const itemsByUrl = new Map<string, SearchCatalogItem>(
    items.map((item) => [item.url, item] satisfies [string, SearchCatalogItem]),
  );

  return ranked.flatMap((item) => {
    const matched = itemsByUrl.get(item.url);
    return matched ? [matched] : [];
  });
}

function toCatalogSearchResultItem(item: SearchCatalogItem): SearchResultItem {
  const normalizedUrl = normalizeSearchResultUrl(item.url);

  return {
    title: item.title,
    url: normalizedUrl,
    path: normalizedUrl,
    excerptHtml: '',
    description: item.description?.trim() ?? '',
    date: item.date?.trim() ?? '',
  } satisfies SearchResultItem;
}

async function searchWithCatalogFallback(
  loadCatalog: () => Promise<readonly SearchCatalogItem[]>,
  query: string,
  selectedGenres: readonly string[],
  sortMode: SearchSortMode,
): Promise<SearchResponse> {
  const catalog = await loadCatalog();
  const preparedQuery = prepareSearchQuery(query);
  const normalizedGenres = normalizeSearchTags(selectedGenres);
  const normalizedSortMode = normalizeSearchSort(sortMode);

  const queryMatchedItems =
    preparedQuery.rawQuery.length > 0 ? sortCatalogItemsByQuery(catalog, query) : [...catalog];
  const allGenreCounts = buildGenreCounts(queryMatchedItems);

  const filteredItems =
    normalizedGenres.length > 0
      ? queryMatchedItems.filter((item) =>
          normalizeCatalogGenres(item).some((genre) => normalizedGenres.includes(genre)),
        )
      : queryMatchedItems;

  const sortedItems =
    normalizedSortMode === 'date-desc' || preparedQuery.rawQuery.length === 0
      ? sortCatalogItemsByDate(filteredItems)
      : filteredItems;

  return {
    items: sortedItems.map(toCatalogSearchResultItem),
    total: sortedItems.length,
    genreCounts: buildGenreCounts(sortedItems),
    allGenreCounts,
  };
}

function createPagefindModuleUrl(moduleSource: string): string {
  const blob = new Blob([moduleSource], {
    type: 'text/javascript',
  });
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
    (async (moduleUrl: string): Promise<PagefindModuleResponse> => {
      const response = await fetch(moduleUrl, {
        cache: 'no-store',
      });

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
    const modulePath = '/pagefind/pagefind.js';
    const response = await fetchModule(modulePath);
    if (!response.ok) {
      throw new Error(`Pagefind module の読み込みに失敗しました: ${response.status.toString()}`);
    }

    const moduleSource = await response.text();
    const moduleUrl = createModuleUrl(moduleSource);

    try {
      const importedModule: unknown = await importModule(moduleUrl);
      if (!isPagefindModule(importedModule)) {
        throw new Error('Pagefind module shape is invalid.');
      }

      if (typeof importedModule.options === 'function') {
        await importedModule.options({ basePath: '/pagefind/' });
      }

      return {
        filters: importedModule.filters,
        search: importedModule.search,
      } satisfies PagefindApi;
    } finally {
      revokeModuleUrl(moduleUrl);
    }
  };
}

const loadDefaultPagefindModule = createDefaultPagefindLoader();

export function createPagefindSearchAdapter(
  loadPagefind: PagefindLoader = loadDefaultPagefindModule,
  dependencies: PagefindSearchDependencies = {},
): SearchAdapter {
  let pagefindPromise: Promise<PagefindApi> | null = null;
  let availableGenresPromise: Promise<Record<string, number>> | null = null;
  const loadCatalog = dependencies.loadSearchCatalog ?? getSearchCatalog;

  const getPagefind = async (): Promise<PagefindApi | null> => {
    pagefindPromise ??= loadPagefind();

    try {
      return await pagefindPromise;
    } catch {
      return null;
    }
  };

  const getAvailableGenres = async (): Promise<Record<string, number>> => {
    availableGenresPromise ??= (async () => {
      const pagefind = await getPagefind();
      if (pagefind === null) {
        return buildGenreCounts(await loadCatalog());
      }

      const filters = await pagefind.filters();
      return normalizeCounts(filters['genre']);
    })();

    return availableGenresPromise;
  };

  return {
    getAvailableGenres,

    async search(
      query: string,
      selectedGenres: readonly string[],
      sortMode: SearchSortMode,
    ): Promise<SearchResponse> {
      try {
        const preparedQuery = prepareSearchQuery(query);
        const normalizedGenres = normalizeSearchTags(selectedGenres);
        const normalizedSortMode = normalizeSearchSort(sortMode);
        const allGenreCounts = await getAvailableGenres();

        if (preparedQuery.rawQuery.length === 0 && normalizedGenres.length === 0) {
          return {
            items: [],
            total: 0,
            genreCounts: EMPTY_COUNTS,
            allGenreCounts,
          };
        }

        const pagefind = await getPagefind();
        if (pagefind === null) {
          return await searchWithCatalogFallback(loadCatalog, query, selectedGenres, sortMode);
        }

        const term = preparedQuery.segmentedQuery.length > 0 ? preparedQuery.segmentedQuery : null;
        const filters =
          normalizedGenres.length > 0
            ? {
                genre: normalizedGenres,
              }
            : undefined;
        const searchOptions: PagefindSearchOptions = {};
        if (filters !== undefined) {
          searchOptions.filters = filters;
        }
        if (normalizedSortMode === 'date-desc') {
          searchOptions.sort = { date: 'desc' };
        }
        const response = await pagefind.search(term, searchOptions);

        const items = await Promise.all(
          response.results.map(async (result) => {
            const data = await result.data();
            const normalizedUrl = normalizeSearchResultUrl(data.url);
            const title = data.meta?.['title']?.trim() ?? normalizedUrl;

            return {
              title,
              url: normalizedUrl,
              path: normalizedUrl,
              excerptHtml: data.excerpt ?? '',
              description: data.meta?.['description']?.trim() ?? '',
              date: data.meta?.['date']?.trim() ?? '',
            } satisfies SearchResultItem;
          }),
        );

        const allCountsFromSearch = normalizeCounts(response.totalFilters?.['genre']);

        return {
          items,
          total: response.unfilteredResultCount,
          genreCounts: normalizeCounts(response.filters?.['genre']),
          allGenreCounts: hasOwnEntries(allCountsFromSearch) ? allCountsFromSearch : allGenreCounts,
        };
      } catch (error: unknown) {
        if (error instanceof Error) {
          return await searchWithCatalogFallback(loadCatalog, query, selectedGenres, sortMode);
        }

        throw error;
      }
    },
  };
}

export const pagefindSearchAdapter = createPagefindSearchAdapter();
