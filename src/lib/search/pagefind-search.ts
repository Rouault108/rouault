import { normalizeSearchQuery, normalizeSearchTags } from './search-url.js';

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
  search(query: string, selectedGenres: readonly string[]): Promise<SearchResponse>;
  getAvailableGenres(): Promise<Record<string, number>>;
}

type PagefindLoader = () => Promise<PagefindApi>;

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

function normalizePath(url: string): string {
  try {
    const resolved = new URL(url, window.location.origin);
    return `${resolved.pathname}${resolved.search}${resolved.hash}`;
  } catch {
    return url;
  }
}

async function loadDefaultPagefindModule(): Promise<PagefindApi> {
  const modulePath = '/pagefind/pagefind.js';
  const module = await import(/* @vite-ignore */ modulePath);

  return {
    filters: module.filters,
    search: module.search,
  } satisfies PagefindApi;
}

export function createPagefindSearchAdapter(loadPagefind: PagefindLoader = loadDefaultPagefindModule): SearchAdapter {
  let pagefindPromise: Promise<PagefindApi> | null = null;
  let availableGenresPromise: Promise<Record<string, number>> | null = null;

  const getPagefind = async (): Promise<PagefindApi> => {
    pagefindPromise ??= loadPagefind();
    return pagefindPromise;
  };

  const getAvailableGenres = async (): Promise<Record<string, number>> => {
    availableGenresPromise ??= (async () => {
      const pagefind = await getPagefind();
      const filters = await pagefind.filters();
      return normalizeCounts(filters['genre']);
    })();

    return availableGenresPromise;
  };

  return {
    getAvailableGenres,

    async search(query: string, selectedGenres: readonly string[]): Promise<SearchResponse> {
      const normalizedQuery = normalizeSearchQuery(query);
      const normalizedGenres = normalizeSearchTags(selectedGenres);
      const allGenreCounts = await getAvailableGenres();

      if (normalizedQuery.length === 0 && normalizedGenres.length === 0) {
        return {
          items: [],
          total: 0,
          genreCounts: EMPTY_COUNTS,
          allGenreCounts,
        };
      }

      const pagefind = await getPagefind();
      const term = normalizedQuery.length > 0 ? normalizedQuery : null;
      const filters =
        normalizedGenres.length > 0
          ? {
              genre: normalizedGenres,
            }
          : undefined;
      const response = await pagefind.search(term, { filters });

      const items = await Promise.all(
        response.results.map(async (result) => {
          const data = await result.data();
          const title = data.meta?.['title']?.trim() || normalizePath(data.url);

          return {
            title,
            url: data.url,
            path: normalizePath(data.url),
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
    },
  };
}

export const pagefindSearchAdapter = createPagefindSearchAdapter();
