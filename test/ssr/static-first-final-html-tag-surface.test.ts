import { describe, expect, it } from 'vitest';
import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';

import { STATIC_FIRST_REMOVED_OR_REDUCED_LEGACY_TAGS } from '../../build/content/static-first-removed-or-reduced-tags.js';
import { buildNoteNavigationModel } from '../../build/navigation/index.js';
import { buildNotePageProjection } from '../../build/projections/note-page-projection.js';
import { buildPagefindDocumentData } from '../../build/search/build-pagefind-document-data.js';
import type { CorpusPageEntry } from '../../src/data/corpusPages.js';
import type { CorporaOverviewData } from '../../src/data/corporaOverview.js';
import { NoteLayout } from '../../src/layouts/NoteLayout.11ty.js';
import { renderCorporaOverviewHtml } from '../../src/layouts/corpora-overview-html.js';
import { renderCorpusPageHtml } from '../../src/layouts/corpus-page-html.js';
import { renderSearchPageHtml } from '../../src/layouts/search-page-html.js';
import type { IntrinsicNote } from '../../build/data/notes.js';
import { createSearchCanonicalPathname } from '../../shared/search/document-url.js';
import type { SearchState, StaticExploreSearchResponse } from '../../shared/search/search-types.js';
import { DEFAULT_SITE_URL_CONTEXT } from '../../shared/site/site-url-context.js';

type ChildNode = DefaultTreeAdapterMap['childNode'];
type ElementNode = DefaultTreeAdapterMap['element'];

interface ParentLike {
  readonly childNodes: readonly ChildNode[];
}

const removedOrReducedLegacyTags = new Set<string>(STATIC_FIRST_REMOVED_OR_REDUCED_LEGACY_TAGS);

const isElementNode = (node: ChildNode): node is ElementNode => 'tagName' in node;

const collectElementTagNames = (parent: ParentLike, tags: Set<string>): void => {
  for (const child of parent.childNodes) {
    if (!isElementNode(child)) {
      continue;
    }

    tags.add((child.tagName || child.nodeName).toLowerCase());
    collectElementTagNames(child, tags);
  }
};

const getElementTagNames = (html: string): Set<string> => {
  const fragment = parseFragment(html);
  const tags = new Set<string>();
  collectElementTagNames(fragment, tags);
  return tags;
};

const expectNoRemovedOrReducedLegacyTags = (label: string, html: string): void => {
  const tags = getElementTagNames(html);
  const presentForbiddenTags = [...removedOrReducedLegacyTags].filter((tag) => tags.has(tag));

  expect(presentForbiddenTags, label).toEqual([]);
};

const searchState: SearchState = {
  q: 'static',
  tags: ['test-local'],
  tagMode: 'or',
  sort: 'relevance',
};

const createCanonicalPathnameFixture = (pathname: string) => {
  const result = createSearchCanonicalPathname({ pathname });
  if (!result.ok) {
    throw new Error(`Invalid canonical pathname fixture: ${pathname}`);
  }
  return result.canonicalPathname;
};

const searchResponse: StaticExploreSearchResponse = {
  mode: 'explore',
  items: [
    {
      canonicalPathname: createCanonicalPathnameFixture('/notes/test-local/static-first/'),
      pathLabel: 'test-local / static-first',
      title: 'Static first note',
      description:
        'ui-pagination class text, ui-select prose, and ui-icon prose must not count as tags.',
      date: { epochMs: 1_700_000_000_000, original: '2024-01-01' },
      tags: ['test-local'],
      snippet: {
        segments: [
          { text: 'class="ui-pagination" and data-ui-select are text fixtures', matched: false },
        ],
      },
      reasons: [{ kind: 'catalog-fallback', source: 'catalog' }],
    },
  ],
  total: 1,
  rankingProfileId: 'rouault-search-v1',
  diagnostics: {
    degraded: false,
    activeSources: ['catalog'],
    failures: [],
    issues: [],
  },
  tagCounts: { 'test-local': 1 },
  allTagCounts: { 'test-local': 1, 'ui-checkbox prose': 0 },
};

const corpusPage: CorpusPageEntry = {
  key: 'test-local',
  label: 'Test Local',
  href: '/corpora/test-local/',
  noteCount: 1,
  latestUpdatedDate: '2024-01-01',
  notes: [
    {
      title: 'Static first note',
      permalink: '/notes/test-local/static-first/',
      renderHref: '/notes/test-local/static-first/',
      description: 'Representative corpus output with ui-empty-state prose.',
      date: '2024-01-01',
      slug: 'test-local/static-first',
      genres: ['test-local'],
    },
  ],
};

const corporaOverview: CorporaOverviewData = {
  corpusCount: 1,
  noteCount: 1,
  latestUpdatedDate: '2024-01-01',
  corpora: [
    {
      key: 'test-local',
      label: 'Test Local',
      href: '/corpora/test-local/',
      renderHref: '/corpora/test-local/',
      noteCount: 1,
      latestUpdatedDate: '2024-01-01',
    },
  ],
};

const renderTestLocalNoteHtml = (): string => {
  const note: IntrinsicNote = {
    rawSlug: 'test-local/static-first',
    slug: 'test-local/static-first',
    permalink: '/notes/test-local/static-first/',
    noteKind: 'leaf',
    sortIndex: 0,
    tocHeadings: [],
    tocCapabilities: {
      activeTracking: false,
      dynamicScopes: false,
      mobilePanel: false,
    },
    tocCapabilitySource: 'inferred',
    kind: 'reader',
    title: 'Static first note',
    genre: ['test-local'],
    content: `
      <p>ui-icon, ui-select, ui-kbd, ui-checkbox are text only.</p>
      <nav class="ui-pagination" aria-label="ui-pagination text fixture" data-ui-select="text">
        <span>Current</span>
      </nav>
      <!-- ui-empty-state comment fixture -->
    `,
  };

  const notePage = buildNotePageProjection({
    note,
    navigation: buildNoteNavigationModel({ currentNote: note, notes: [note] }),
    pagefindDocument: buildPagefindDocumentData({
      title: note.title,
      description: 'test-local representative final HTML',
      date: '2024-01-01',
      updated: '2024-01-01',
      tags: ['test-local'],
    }),
  });

  return new NoteLayout().render({ notePage });
};

describe('static-first representative final HTML tag surface', () => {
  it('keeps removed-or-reduced legacy tags out of representative page and note outputs', () => {
    const outputs = new Map<string, string>([
      [
        'search-page',
        renderSearchPageHtml({
          initialState: searchState,
          initialResponse: searchResponse,
          siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
        }),
      ],
      ['corpus-page', renderCorpusPageHtml(corpusPage)],
      ['corpora-overview', renderCorporaOverviewHtml(corporaOverview)],
      ['test-local-note', renderTestLocalNoteHtml()],
    ]);

    for (const [label, html] of outputs) {
      expectNoRemovedOrReducedLegacyTags(label, html);
    }
  });
});
