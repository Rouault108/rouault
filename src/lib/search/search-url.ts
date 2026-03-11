export interface SearchUrlState {
  query: string;
  tags: string[];
}

export function normalizeSearchQuery(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
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

  return { query, tags };
}

export function buildSearchHref(state: SearchUrlState): string {
  const query = normalizeSearchQuery(state.query);
  const tags = normalizeSearchTags(state.tags);
  const params = new URLSearchParams();

  if (query.length > 0) {
    params.set('q', query);
  }

  for (const tag of tags) {
    params.append('tag', tag);
  }

  const search = params.toString();
  return search.length > 0 ? `/search?${search}` : '/search';
}

export function buildTagHref(tag: string): string {
  return `/tags/${encodeURIComponent(tag.trim())}/`;
}
