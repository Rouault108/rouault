import { searchCore } from '../../lib/search/search-core.js';
import type { ExploreSearchResponse, SearchRequest } from '../../lib/search/search-types.js';

const ORIGINAL_SEARCH = searchCore.search.bind(searchCore);

interface MockSearchItem {
  canonicalUrl: string;
  title: string;
  url: string;
  pathLabel: string;
  snippet: string;
  description: string;
  date: string;
  tags: readonly string[];
}

const MOCK_ITEMS: readonly MockSearchItem[] = [
  {
    canonicalUrl: '/notes/router-design/',
    title: 'Router 設計メモ',
    url: '/notes/router-design',
    pathLabel: 'notes / router-design',
    snippet: 'Router の設計と遷移制御をまとめたメモです。',
    description: 'Router の設計ノート',
    date: '2026-03-01',
    tags: ['router', 'architecture'],
  },
  {
    canonicalUrl: '/notes/lit-performance/',
    title: 'Lit レンダリング最適化',
    url: '/notes/lit-performance',
    pathLabel: 'notes / lit-performance',
    snippet: 'Lit の描画最適化と差分更新をまとめています。',
    description: 'Lit の描画最適化メモ',
    date: '2026-02-12',
    tags: ['lit', 'performance'],
  },
  {
    canonicalUrl: '/notes/a11y-log/',
    title: 'アクセシビリティ実装ログ',
    url: '/notes/a11y-log',
    pathLabel: 'notes / a11y-log',
    snippet: 'フォーム操作とラベル設計を検証したメモです。',
    description: 'A11y 実装の記録',
    date: '2026-01-22',
    tags: ['a11y', 'architecture'],
  },
  {
    canonicalUrl: '/notes/router-event-boundary/',
    title: 'Router イベント境界の設計',
    url: '/notes/router-event-boundary',
    pathLabel: 'notes / router-event-boundary',
    snippet: 'Router のイベント境界と購読戦略を整理しています。',
    description: 'Router のイベント境界設計メモ',
    date: '2026-01-11',
    tags: ['architecture', 'eventing'],
  },
];

const ALL_GENRE_COUNTS = buildGenreCounts(MOCK_ITEMS);

export const SEARCH_PAGE_STORY_WAIT_MS = 210;

function buildGenreCounts(
  items: readonly MockSearchItem[],
  options: {
    includeAllKnownTags?: boolean;
  } = {},
): Record<string, number> {
  const counts = new Map<string, number>();

  if (options.includeAllKnownTags === true) {
    for (const tag of Object.keys(ALL_GENRE_COUNTS)) {
      counts.set(tag, 0);
    }
  }

  for (const item of items) {
    for (const tag of item.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return Object.fromEntries(
    [...counts.entries()].sort((left, right) => left[0].localeCompare(right[0], 'ja')),
  );
}

function createSearchResponse(
  query: string,
  selectedGenres: readonly string[],
  sortMode: string,
  tagMode: 'or' | 'and' = 'or',
): ExploreSearchResponse {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length === 0 && selectedGenres.length === 0) {
    return {
      mode: 'explore',
      rankingProfileId: 'rouault-search-v1',
      total: 0,
      items: [],
      tagCounts: {},
      allTagCounts: ALL_GENRE_COUNTS,
      diagnostics: {
        degraded: false,
        activeSources: ['catalog'],
        failures: [],
        issues: [],
      },
    } satisfies ExploreSearchResponse;
  }

  const queryMatchedItems = MOCK_ITEMS.filter((item) => {
    if (normalizedQuery.length === 0) {
      return true;
    }

    const haystacks = [item.title, item.description, ...item.tags].map((value) =>
      value.toLowerCase(),
    );
    return haystacks.some((value) => value.includes(normalizedQuery));
  });

  const filteredItems =
    selectedGenres.length > 0
      ? queryMatchedItems.filter((item) =>
          tagMode === 'and'
            ? selectedGenres.every((tag) => item.tags.includes(tag))
            : selectedGenres.some((tag) => item.tags.includes(tag)),
        )
      : queryMatchedItems;

  const sortedItems =
    sortMode === 'date-desc'
      ? [...filteredItems].sort((left, right) => right.date.localeCompare(left.date, 'ja'))
      : filteredItems;

  return {
    mode: 'explore',
    rankingProfileId: 'rouault-search-v1',
    total: sortedItems.length,
    items: sortedItems.map((item) => ({
      canonicalUrl: item.canonicalUrl,
      title: item.title,
      url: item.url,
      pathLabel: item.pathLabel,
      description: item.description,
      date: {
        epochMs: Date.parse(item.date),
        original: item.date,
      },
      tags: [...item.tags],
      snippet: {
        segments: [{ text: item.snippet, matched: false }],
      },
      reasons: [{ kind: 'title-prefix', tokens: [query] }],
    })),
    tagCounts: buildGenreCounts(sortedItems),
    allTagCounts: buildGenreCounts(queryMatchedItems, { includeAllKnownTags: true }),
    diagnostics: {
      degraded: false,
      activeSources: ['catalog'],
      failures: [],
      issues: [],
    },
  } satisfies ExploreSearchResponse;
}

export function installSearchPageStorySearchMock(): void {
  searchCore.search = (request: SearchRequest) =>
    Promise.resolve(createSearchResponse(request.q, request.tags, request.sort, request.tagMode));
}

export function restoreSearchPageStorySearchMock(): void {
  searchCore.search = ORIGINAL_SEARCH;
}
