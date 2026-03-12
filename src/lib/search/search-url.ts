export interface SearchUrlState {
  query: string;
  tags: string[];
  sort: SearchSortMode;
}

export type SearchSortMode = 'relevance' | 'date-desc';

export const DEFAULT_SEARCH_SORT_MODE: SearchSortMode = 'relevance';

export function normalizeSearchQuery(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function normalizeSearchSort(value: string): SearchSortMode {
  return value === 'date-desc' ? 'date-desc' : DEFAULT_SEARCH_SORT_MODE;
}

export function normalizeSearchTags(values: readonly string[]): string[] {
  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const value of values) {
    const tag = value.trim();
    if (tag.length === 0 || seen.has(tag)) {
      continue;
    }

    seen.add(tag);
    normalized.push(tag);
  }

  return normalized;
}

export function parseSearchStateFromUrl(url: URL): SearchUrlState {
  const query = normalizeSearchQuery(url.searchParams.get('q') ?? '');
  const tags = normalizeSearchTags(url.searchParams.getAll('tag'));
  const sort = normalizeSearchSort(url.searchParams.get('sort') ?? '');

  return { query, tags, sort };
}

export function buildSearchHref(state: SearchUrlState): string {
  const query = normalizeSearchQuery(state.query);
  const tags = normalizeSearchTags(state.tags);
  const sort = normalizeSearchSort(state.sort);
  const params = new URLSearchParams();

  if (query.length > 0) {
    params.set('q', query);
  }

  for (const tag of tags) {
    params.append('tag', tag);
  }

  if (sort !== DEFAULT_SEARCH_SORT_MODE) {
    params.set('sort', sort);
  }

  const search = params.toString();
  return search.length > 0 ? `/search?${search}` : '/search';
}

export function buildTagHref(tag: string): string {
  return `/tags/${encodeURIComponent(tag.trim())}/`;
}
