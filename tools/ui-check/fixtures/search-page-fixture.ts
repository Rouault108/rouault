import { normalizeSearchCanonicalPathname } from '../../../shared/search/document-url.js';
import type {
  SearchCanonicalPathname,
  SearchState,
  StaticExploreSearchResponse,
} from '../../../shared/search/search-types.js';
import { DEFAULT_SITE_URL_CONTEXT } from '../../../shared/site/site-url-context.js';

const canonicalPathname = (pathname: string): SearchCanonicalPathname => {
  const normalized = normalizeSearchCanonicalPathname(pathname);
  if (normalized === null) {
    throw new Error(`Invalid search canonical pathname fixture: ${pathname}`);
  }
  return normalized;
};

const items: StaticExploreSearchResponse['items'] = [
  {
    canonicalPathname: canonicalPathname('/notes/ui-check/search-controls-renderer/'),
    pathLabel: 'notes / ui-check / search-controls-renderer',
    title: 'Search controls renderer fixture',
    description: 'Renderer-derived UI check fixture for the search controls surface.',
    date: { epochMs: 1_798_502_400_000, original: '2027-01-01' },
    tags: ['UI', '静的検査'],
    snippet: {
      segments: [
        { text: 'Renderer-derived ', matched: false },
        { text: 'search controls', matched: true },
        { text: ' fixture for visual inspection.', matched: false },
      ],
    },
    reasons: [{ kind: 'title-token-coverage', tokens: ['search', 'controls'] }],
  },
  {
    canonicalPathname: canonicalPathname('/notes/ui-check/filter-details-open-variant/'),
    pathLabel: 'notes / ui-check / filter-details-open-variant',
    title: 'Filter details open variant',
    description: 'Stable fixture item that keeps selected tags and filter controls visible.',
    date: { epochMs: 1_795_910_400_000, original: '2026-11-13' },
    tags: ['UI', 'accessibility'],
    snippet: {
      segments: [
        { text: 'Stable fixture item with ', matched: false },
        { text: 'filter', matched: true },
        { text: ' controls visible.', matched: false },
      ],
    },
    reasons: [{ kind: 'tag-filter-match', tokens: ['UI'] }],
  },
  {
    canonicalPathname: canonicalPathname('/notes/ui-check/static-results-section/'),
    pathLabel: 'notes / ui-check / static-results-section',
    title: 'Static results section',
    description: 'Representative result card for deterministic ui-check screenshots.',
    date: { epochMs: 1_791_331_200_000, original: '2026-09-22' },
    tags: ['静的検査', 'renderer'],
    snippet: {
      segments: [
        { text: 'Representative result card for ', matched: false },
        { text: 'deterministic', matched: true },
        { text: ' screenshots.', matched: false },
      ],
    },
    reasons: [{ kind: 'body-match', tokens: ['deterministic'], source: 'catalog' }],
  },
];

export const searchPageFixture: {
  readonly initialState: SearchState;
  readonly initialResponse: StaticExploreSearchResponse;
  readonly siteUrlContext: typeof DEFAULT_SITE_URL_CONTEXT;
} = {
  initialState: {
    q: 'search controls',
    tags: ['UI', '静的検査'],
    tagMode: 'and',
    sort: 'date-desc',
  },
  initialResponse: {
    mode: 'explore',
    items,
    total: items.length,
    rankingProfileId: 'rouault-search-v1',
    diagnostics: {
      degraded: false,
      activeSources: ['catalog'],
      failures: [],
      issues: [],
    },
    tagCounts: {
      UI: 2,
      静的検査: 2,
      accessibility: 1,
      renderer: 1,
    },
    allTagCounts: {
      UI: 2,
      静的検査: 2,
      accessibility: 1,
      renderer: 1,
      Markdown: 0,
      navigation: 0,
    },
  },
  siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
};
