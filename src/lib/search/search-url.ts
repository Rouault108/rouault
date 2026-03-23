import type { SearchSortMode, SearchState, SearchTagMode } from './search-types.js';
export type { SearchSortMode, SearchState, SearchTagMode } from './search-types.js';

export const DEFAULT_SEARCH_SORT_MODE: SearchSortMode = 'relevance';
export const DEFAULT_SEARCH_TAG_MODE: SearchTagMode = 'or';

export function normalizeSearchQuery(value: string): string {
  return value.normalize('NFKC').replace(/\s+/g, ' ').trim();
}

export function normalizeSearchSort(value: string): SearchSortMode {
  return value === 'date-desc' ? 'date-desc' : DEFAULT_SEARCH_SORT_MODE;
}

export function normalizeSearchTagMode(value: string): SearchTagMode {
  return value === 'and' ? 'and' : DEFAULT_SEARCH_TAG_MODE;
}

export function normalizeSearchTags(values: readonly string[]): string[] {
  const normalized = new Map<string, string>();

  for (const value of values) {
    const tag = value.trim();
    if (tag.length === 0) {
      continue;
    }

    const key = tag.toLocaleLowerCase('ja');
    if (!normalized.has(key)) {
      normalized.set(key, tag);
    }
  }

  return [...normalized.values()].sort((left, right) => left.localeCompare(right, 'ja'));
}

function parseTagFromPathname(pathname: string): string[] {
  const match = pathname.match(/^\/tags\/([^/]+)\/$/u);
  if (!match) {
    return [];
  }

  const matchedTag = match[1];
  if (!matchedTag) {
    return [];
  }

  try {
    return normalizeSearchTags([decodeURIComponent(matchedTag)]);
  } catch {
    return normalizeSearchTags([matchedTag]);
  }
}

export function parseSearchStateFromUrl(url: URL): SearchState {
  const pathname = url.pathname;
  const fromTagPath = parseTagFromPathname(pathname);
  const q = normalizeSearchQuery(url.searchParams.get('q') ?? '');
  const tags =
    fromTagPath.length > 0 ? fromTagPath : normalizeSearchTags(url.searchParams.getAll('tag'));
  const tagMode =
    fromTagPath.length > 0
      ? DEFAULT_SEARCH_TAG_MODE
      : normalizeSearchTagMode(url.searchParams.get('tagMode') ?? '');
  const sort =
    fromTagPath.length > 0
      ? DEFAULT_SEARCH_SORT_MODE
      : normalizeSearchSort(url.searchParams.get('sort') ?? '');

  return { q, tags, tagMode, sort };
}

export function buildSearchStateUrl(state: SearchState): string {
  const q = normalizeSearchQuery(state.q);
  const tags = normalizeSearchTags(state.tags);
  const tagMode = normalizeSearchTagMode(state.tagMode);
  const sort = normalizeSearchSort(state.sort);
  const params = new URLSearchParams();

  if (q.length > 0) {
    params.set('q', q);
  }

  for (const tag of tags) {
    params.append('tag', tag);
  }

  if (tagMode !== DEFAULT_SEARCH_TAG_MODE) {
    params.set('tagMode', tagMode);
  }

  if (sort !== DEFAULT_SEARCH_SORT_MODE) {
    params.set('sort', sort);
  }

  const search = params.toString();
  return search.length > 0 ? `/search?${search}` : '/search';
}

export function buildSearchHref(state: {
  query: string;
  tags: string[];
  sort: SearchSortMode;
}): string {
  return buildSearchStateUrl({
    q: state.query,
    tags: state.tags,
    tagMode: DEFAULT_SEARCH_TAG_MODE,
    sort: state.sort,
  });
}

export function buildTagHref(tag: string): string {
  return `/tags/${encodeURIComponent(tag.trim())}/`;
}

export function isSingleTagDefaultState(state: SearchState): boolean {
  return (
    normalizeSearchQuery(state.q).length === 0 &&
    normalizeSearchSort(state.sort) === DEFAULT_SEARCH_SORT_MODE &&
    normalizeSearchTagMode(state.tagMode) === DEFAULT_SEARCH_TAG_MODE &&
    normalizeSearchTags(state.tags).length === 1
  );
}

export function buildUrlForSearchState(state: SearchState): string {
  const normalizedState: SearchState = {
    q: normalizeSearchQuery(state.q),
    tags: normalizeSearchTags(state.tags),
    tagMode: normalizeSearchTagMode(state.tagMode),
    sort: normalizeSearchSort(state.sort),
  };

  if (isSingleTagDefaultState(normalizedState)) {
    const [tag] = normalizedState.tags;
    return tag ? buildTagHref(tag) : '/search';
  }

  return buildSearchStateUrl(normalizedState);
}

export function normalizeSearchStateUrl(input: string | URL): string {
  const url = input instanceof URL ? new URL(input.toString()) : new URL(input, 'https://rouault.invalid');
  const state = parseSearchStateFromUrl(url);

  if (url.pathname.startsWith('/tags/')) {
    return buildTagHref(state.tags[0] ?? '');
  }

  return buildSearchStateUrl(state);
}
