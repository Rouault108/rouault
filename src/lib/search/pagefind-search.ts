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
    selectedTags: readonly string[],
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
      selectedTags: readonly string[],
      sortMode: SearchSortMode,
      tagMode: SearchTagMode = 'or',
    ): Promise<SearchResponse> {
      const response = await core.search({
        mode: 'explore',
        q: query,
        tags: [...selectedTags],
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
      const counts = new Map<string, number>();

      try {
        for (const item of await loadSearchCatalog()) {
          for (const tag of item.tags ?? []) {
            counts.set(tag, (counts.get(tag) ?? 0) + 1);
          }
        }
      } catch {
        // カタログ取得不可でも explore 検索本体は別経路で縮退する。
      }

      return Object.fromEntries(
        [...counts.entries()].sort((left, right) => left[0].localeCompare(right[0], 'ja')),
      );
    },
  };
}

const defaultAdapter = createPagefindSearchAdapter();

export const pagefindSearchAdapter = {
  search(
    query: string,
    selectedTags: readonly string[],
    sortMode: SearchSortMode,
    tagMode: SearchTagMode = 'or',
  ) {
    return defaultAdapter.search(query, selectedTags, sortMode, tagMode);
  },
  getAvailableGenres() {
    return defaultAdapter.getAvailableGenres();
  },
};

export { searchCore };
