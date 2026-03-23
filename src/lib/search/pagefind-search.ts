import {
  createDefaultPagefindLoader,
  createSearchCore,
  searchCore,
  type PagefindApi,
  type PagefindFragmentData,
  type PagefindSearchResponse,
  type PagefindSearchResult,
} from './search-core.js';
import type { SearchCatalogItem } from './search-catalog.js';
import { getSearchCatalog } from './search-catalog.js';
import { normalizeSearchTags } from './search-url.js';
import type {
  ExploreSearchResponse,
  SearchResultItem as CoreSearchResultItem,
  SearchSortMode,
  SearchTagMode,
} from './search-types.js';

export type { PagefindApi, PagefindFragmentData, PagefindSearchResponse, PagefindSearchResult };
export { createDefaultPagefindLoader };

export interface SearchResultItem {
  canonicalUrl: string;
  url: string;
  pathLabel: string;
  title: string;
  description: string;
  date: {
    epochMs: number | null;
    original: string | null;
  };
  tags: string[];
  snippet: CoreSearchResultItem['snippet'];
  reasons: CoreSearchResultItem['reasons'];
}

export interface SearchResponse extends ExploreSearchResponse {}

export interface SearchAdapter {
  search(
    query: string,
    selectedGenres: readonly string[],
    sortMode: SearchSortMode,
    tagMode?: SearchTagMode,
  ): Promise<SearchResponse>;
  getAvailableGenres(): Promise<Record<string, number>>;
}

interface PagefindSearchDependencies {
  loadSearchCatalog?: () => Promise<readonly SearchCatalogItem[]>;
  loadPagefind?: () => Promise<PagefindApi>;
}

function toSearchResultItem(item: CoreSearchResultItem): SearchResultItem {
  return {
    canonicalUrl: item.canonicalUrl,
    url: item.url,
    pathLabel: item.pathLabel,
    title: item.title,
    description: item.description,
    date: item.date,
    tags: item.tags,
    snippet: item.snippet,
    reasons: item.reasons,
  };
}

export function createPagefindSearchAdapter(
  loadPagefind?: () => Promise<PagefindApi>,
  dependencies: PagefindSearchDependencies = {},
): SearchAdapter {
  const loadSearchCatalog = dependencies.loadSearchCatalog ?? getSearchCatalog;
  const resolvedLoadPagefind = loadPagefind ?? dependencies.loadPagefind;
  const core = createSearchCore({
    ...(resolvedLoadPagefind ? { loadPagefind: resolvedLoadPagefind } : {}),
    loadSearchCatalog,
  });

  return {
    async search(
      query: string,
      selectedGenres: readonly string[],
      sortMode: SearchSortMode,
      tagMode: SearchTagMode = 'or',
    ): Promise<SearchResponse> {
      const response = await core.search({
        mode: 'explore',
        q: query,
        tags: [...selectedGenres],
        tagMode,
        sort: sortMode,
      });

      if (response.mode !== 'explore') {
        throw new Error('explore モードの検索応答が必要です。');
      }

      return {
        ...response,
        items: response.items.map(toSearchResultItem),
      };
    },
    async getAvailableGenres(): Promise<Record<string, number>> {
      const pagefindCounts = await (async () => {
        if (!resolvedLoadPagefind) {
          return {};
        }

        try {
          const pagefind = await resolvedLoadPagefind();
          return pagefind.filters().then((filters) => filters['genre'] ?? {});
        } catch {
          return {};
        }
      })();
      const catalogCounts = new Map<string, number>();

      try {
        for (const item of await loadSearchCatalog()) {
          for (const tag of normalizeSearchTags(item.genres ?? [])) {
            catalogCounts.set(tag, (catalogCounts.get(tag) ?? 0) + 1);
          }
        }
      } catch {
        // 検索カタログが利用できない場合でも Pagefind 側の facet 情報で継続する。
      }

      for (const [tag, count] of Object.entries(pagefindCounts)) {
        if (Number.isSafeInteger(count) && count >= 0) {
          catalogCounts.set(tag, Math.max(catalogCounts.get(tag) ?? 0, count));
        }
      }

      return Object.fromEntries(
        [...catalogCounts.entries()].sort((left, right) => left[0].localeCompare(right[0], 'ja')),
      );
    },
  };
}

const defaultAdapter = createPagefindSearchAdapter();

export const pagefindSearchAdapter = {
  search(
    query: string,
    selectedGenres: readonly string[],
    sortMode: SearchSortMode,
    tagMode: SearchTagMode = 'or',
  ) {
    return defaultAdapter.search(query, selectedGenres, sortMode, tagMode);
  },
  getAvailableGenres() {
    return defaultAdapter.getAvailableGenres();
  },
};

export { searchCore };
