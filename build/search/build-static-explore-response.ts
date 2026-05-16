import {
  DEFAULT_SEARCH_SORT_MODE,
  DEFAULT_SEARCH_TAG_MODE,
  normalizeSearchQuery,
  normalizeSearchSort,
  normalizeSearchTags,
  normalizeSearchTagMode,
} from '../../shared/search/search-url.js';
import {
  derivePathLabel,
  normalizeSearchCanonicalPathname,
  type SearchCanonicalPathname,
} from '../../shared/search/document-url.js';
import type {
  SearchState,
  SearchSourceKind,
  SearchDiagnostics,
} from '../../shared/search/search-types.js';

export interface StaticExploreResponseNote {
  title: string;
  permalink: string;
  description?: string;
  date?: string;
  tags?: readonly string[];
}

export interface StaticExploreResponseInput {
  state?: Partial<SearchState>;
  notes?: readonly StaticExploreResponseNote[];
  activeSources?: readonly SearchSourceKind[];
  diagnostics?: SearchDiagnostics;
}

export interface StaticExploreSearchResultItem {
  readonly canonicalPathname: SearchCanonicalPathname;
  readonly pathLabel: string;
  readonly title: string;
  readonly description: string;
  readonly date: {
    readonly epochMs: number | null;
    readonly original: string | null;
  };
  readonly tags: string[];
  readonly snippet: { readonly segments: readonly { readonly text: string; readonly matched: boolean }[] } | null;
  readonly reasons: readonly { readonly kind: 'tag-filter-match'; readonly tokens: readonly string[] }[];
}

export interface StaticExploreSearchResponse {
  readonly mode: 'explore';
  readonly items: StaticExploreSearchResultItem[];
  readonly total: number;
  readonly rankingProfileId: 'rouault-search-v1';
  readonly tagCounts: Record<string, number>;
  readonly allTagCounts: Record<string, number>;
  readonly diagnostics: SearchDiagnostics;
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeTagList(value: readonly string[] | undefined): string[] {
  return normalizeSearchTags(value === undefined ? [] : Array.from(value));
}

function toEpochMs(value: string): number | null {
  const normalized = value.trim();
  if (normalized.length === 0) {
    return null;
  }

  const epochMs = Date.parse(normalized);
  return Number.isFinite(epochMs) ? epochMs : null;
}

function buildCountMapFromTags(tagLists: readonly (readonly string[])[]): Record<string, number> {
  const counts = new Map<string, number>();

  for (const tags of tagLists) {
    for (const tag of normalizeTagList(tags)) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return Object.fromEntries(
    [...counts.entries()].sort((left, right) => left[0].localeCompare(right[0], 'ja')),
  ) as Record<string, number>;
}

function buildDefaultDiagnostics(
  activeSources: readonly SearchSourceKind[] = [],
): SearchDiagnostics {
  return {
    degraded: false,
    activeSources: [...activeSources],
    failures: [],
    issues: [],
  };
}

export function buildStaticSearchState(state: Partial<SearchState> = {}): SearchState {
  return {
    q: normalizeSearchQuery(state.q ?? ''),
    tags: normalizeSearchTags(state.tags ?? []),
    tagMode: normalizeSearchTagMode(state.tagMode ?? DEFAULT_SEARCH_TAG_MODE),
    sort: normalizeSearchSort(state.sort ?? DEFAULT_SEARCH_SORT_MODE),
  };
}

export function buildStaticExploreResponse(
  input: StaticExploreResponseInput = {},
): StaticExploreSearchResponse {
  const state = buildStaticSearchState(input.state);
  const notes = input.notes ?? [];
  type ExploreItem = StaticExploreSearchResultItem;
  const items = notes.flatMap((note): ExploreItem[] => {
    const canonicalPathname = normalizeSearchCanonicalPathname(note.permalink);
    if (canonicalPathname === null) {
      return [];
    }

    const description = normalizeString(note.description);
    return [
      {
        canonicalPathname,
        pathLabel: derivePathLabel(canonicalPathname),
        title: note.title,
        description,
        date: {
          epochMs: toEpochMs(normalizeString(note.date)),
          original: normalizeString(note.date) || null,
        },
        tags: normalizeTagList(note.tags),
        snippet:
          description.length > 0
            ? {
                segments: [{ text: description, matched: false }],
              }
            : null,
        reasons:
          state.tags.length > 0
            ? [{ kind: 'tag-filter-match' as const, tokens: [...state.tags] }]
            : [],
      },
    ];
  });

  return {
    mode: 'explore',
    items,
    total: items.length,
    rankingProfileId: 'rouault-search-v1',
    tagCounts: buildCountMapFromTags(items.map((item) => item.tags)),
    allTagCounts: buildCountMapFromTags(items.map((item) => item.tags)),
    diagnostics: input.diagnostics ?? buildDefaultDiagnostics(input.activeSources ?? ['catalog']),
  };
}
