import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { parseFragment, type DefaultTreeAdapterMap } from 'parse5';
import { describe, expect, it } from 'vitest';

import { buildStaticExploreResponse } from '../../build/search/build-static-explore-response.js';
import type { SearchState, StaticExploreSearchResponse } from '../../shared/search/search-types.js';
import {
  createSiteUrlContext,
  DEFAULT_SITE_URL_CONTEXT,
} from '../../shared/site/site-url-context.js';
import { renderSearchPageHtml } from '../../src/layouts/search-page-html.js';

type ChildNode = DefaultTreeAdapterMap['childNode'];
type ElementNode = DefaultTreeAdapterMap['element'];

interface ParentLike {
  readonly childNodes: readonly ChildNode[];
}

const isElementNode = (node: ChildNode): node is ElementNode => 'tagName' in node;

const getAttribute = (node: ElementNode, name: string): string | null =>
  node.attrs.find((attribute) => attribute.name === name)?.value ?? null;

const hasClass = (node: ElementNode, className: string): boolean =>
  (getAttribute(node, 'class') ?? '').split(/\s+/u).includes(className);

const collectElements = (
  node: ParentLike,
  predicate: (element: ElementNode) => boolean,
  matches: ElementNode[] = [],
): ElementNode[] => {
  for (const child of node.childNodes) {
    if (!isElementNode(child)) {
      continue;
    }
    if (predicate(child)) {
      matches.push(child);
    }
    collectElements(child, predicate, matches);
  }
  return matches;
};

const elementChildren = (node: ElementNode): ElementNode[] => node.childNodes.filter(isElementNode);

describe('renderSearchPageHtml static contract', () => {
  it('tag browse order は allTagCounts、日本語照合、code unit に従い表示件数は tagCounts に従うこと', () => {
    const initialState: SearchState = {
      q: '',
      tags: ['security', 'absent'],
      tagMode: 'or',
      sort: 'relevance',
    };
    const initialResponse: StaticExploreSearchResponse = {
      ...buildStaticExploreResponse({ state: initialState }),
      allTagCounts: {
        music: 4,
        architecture: 3,
        security: 1,
        é: 1,
        'e\u0301': 1,
        建築: 1,
        音楽: 1,
        Ａ: 1,
        A: 1,
      },
      tagCounts: { architecture: 2, music: 0 },
    };
    const rendered = parseFragment(
      renderSearchPageHtml({
        surface: { kind: 'search', baseline: { tags: [], corporaHref: '/corpora/' } },
        initialState,
        initialResponse,
        siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
      }),
    );
    const rows = collectElements(
      rendered,
      (node) => getAttribute(node, 'data-filter-option') !== null,
    );
    expect(rows.map((row) => getAttribute(row, 'data-filter-tag'))).toEqual([
      'music',
      'architecture',
      'A',
      'Ａ',
      'e\u0301',
      'é',
      'security',
      '音楽',
      '建築',
      'absent',
    ]);
    for (const row of rows) {
      const tag = getAttribute(row, 'data-filter-tag') ?? '';
      const selected = initialState.tags.includes(tag);
      const count = initialResponse.tagCounts[tag] ?? 0;
      const input = collectElements(row, (node) => node.tagName === 'input')[0];
      expect(input).toBeDefined();
      if (!input) throw new Error('Missing tag checkbox');
      expect(getAttribute(input, 'name')).toBe('tag');
      expect(getAttribute(input, 'type')).toBe('checkbox');
      expect(getAttribute(input, 'value')).toBe(tag);
      expect(getAttribute(input, 'checked') !== null).toBe(selected);
      expect(getAttribute(input, 'disabled') !== null).toBe(!selected && count === 0);
      expect(getAttribute(row, 'data-filter-count')).toBe(String(count));
      expect(
        collectElements(row, (node) => hasClass(node, 'filter-option-count'))[0]?.childNodes,
      ).toMatchObject([{ nodeName: '#text', value: `${String(count)}件` }]);
      expect(collectElements(row, (node) => node.tagName === 'label')).toHaveLength(1);
    }
  });

  it('production templates require and pass siteUrlContext without renderer fallback', () => {
    const searchTemplate = readFileSync(resolve(process.cwd(), 'src/search.11ty.ts'), 'utf8');
    const tagsTemplate = readFileSync(resolve(process.cwd(), 'src/tags.11ty.ts'), 'utf8');
    const renderer = readFileSync(
      resolve(process.cwd(), 'src/layouts/search-page-html.ts'),
      'utf8',
    );
    const rendererFunctions =
      renderer.slice(
        renderer.indexOf('const renderResults ='),
        renderer.indexOf('export const renderSearchPageHtml'),
      ) + renderer.slice(renderer.indexOf('export const renderSearchPageHtml'));

    expect(searchTemplate).toContain('siteUrlContext: SiteUrlContext | null;');
    expect(tagsTemplate).toContain('siteUrlContext: SiteUrlContext | null;');
    expect(searchTemplate).toContain('siteUrlContext: data.siteUrlContext,');
    expect(tagsTemplate).toContain('siteUrlContext: data.siteUrlContext,');
    expect(rendererFunctions).not.toContain('rouault.invalid');
    expect(rendererFunctions).not.toContain("basePath: ''");
  });

  it('FormData と静的 recipe に必要な control 名と lower-level UI surface を出力すること', () => {
    const initialState: SearchState = {
      q: 'router',
      tags: ['architecture'],
      tagMode: 'and',
      sort: 'date-desc',
    };
    const rendered = renderSearchPageHtml({
      surface: { kind: 'search', baseline: { tags: [], corporaHref: '/corpora/' } },
      initialState,
      initialResponse: buildStaticExploreResponse({
        state: initialState,
        notes: [
          {
            title: 'Router',
            permalink: '/notes/router/',
            description: 'Router contract',
            date: '2026-01-01',
            tags: ['architecture', 'ui'],
          },
        ],
      }),
      siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
    });

    expect(rendered).toContain('class="search-input-field" data-static-search-field');
    expect(rendered).toContain('class="search-input-clear"');
    expect(rendered).toContain('data-search-query-clear');
    expect(rendered).toContain('name="q"');
    expect(rendered).toContain('data-search-choice-menu="tag-mode"');
    expect(rendered).toContain('data-search-tag-mode-value');
    expect(rendered).toContain('name="tagMode"');
    expect(rendered).toContain('data-search-choice-menu="sort"');
    expect(rendered).toContain('data-search-sort-value');
    expect(rendered).toContain('name="sort"');
    expect(rendered).toContain('class="filter-search-field" data-static-search-field');
    expect(rendered).toContain('class="filter-search-field__clear"');
    expect(rendered).toContain('name="tag"');
    expect(rendered).toContain('class="filter-option-checkbox__control"');
    expect(rendered).toContain('class="filter-option-checkbox__icon static-icon"');
    expect(rendered).toContain('class="selected-tag"');
    expect(rendered).toContain('class="selected-tag__remove-icon static-icon"');
    expect(rendered).toContain('class="search-input-field__icon static-icon"');
    expect(rendered).toContain('class="search-input-clear__icon static-icon"');
    expect(rendered).toContain('class="filter-search-field__icon static-icon"');
    expect(rendered).toContain('class="filter-search-field__clear-icon static-icon"');
    expect(rendered).toContain('class="static-choice-menu__chevron static-icon"');
    expect(rendered).toContain('class="filter-details__chevron static-icon"');
    expect(rendered).toContain('<svg ');
    expect(rendered).toContain('data-search-page-loading');
    expect(rendered).toContain('data-search-page-error');
    expect(rendered).toContain('data-search-page-unavailable');
    expect(rendered).toContain('data-search-page-result-count');
    expect(rendered).toContain('data-search-page-results-section');
    expect(rendered).not.toContain('data-search-results-section');
    expect(rendered).toContain('role="status"');
    expect(rendered).toContain('aria-live="polite"');
  });

  it('status containers は常時 SSR 出力し、loading 入力だけ hidden を外すこと', () => {
    const initialState: SearchState = {
      q: '',
      tags: [],
      tagMode: 'or',
      sort: 'relevance',
    };
    const initialResponse = buildStaticExploreResponse({ state: initialState });

    const idle = renderSearchPageHtml({
      surface: { kind: 'search', baseline: { tags: [], corporaHref: '/corpora/' } },
      initialState,
      initialResponse,
      siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
    });
    expect(idle).toContain('hidden data-search-page-loading');
    expect(idle).toContain('hidden data-search-page-error');
    expect(idle).toContain('hidden data-search-page-unavailable');

    const loading = renderSearchPageHtml({
      surface: { kind: 'search', baseline: { tags: [], corporaHref: '/corpora/' } },
      initialState,
      initialResponse,
      siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
      loading: true,
    });
    expect(loading).toContain('class="search-page__loading"');
    expect(loading).toContain('class="search-page__spinner"');
    expect(loading).toContain('class="search-page__loading-label"');
    expect(loading).toContain('data-search-page-loading');
    expect(loading).not.toContain('hidden data-search-page-loading');
  });

  it('SSR result href は siteUrlContext の basePath を反映し、snippet matched segment を mark にすること', () => {
    const initialState: SearchState = {
      q: 'router',
      tags: [],
      tagMode: 'or',
      sort: 'relevance',
    };
    const initialResponse = buildStaticExploreResponse({
      state: initialState,
      notes: [
        {
          title: 'Router',
          permalink: '/notes/router/',
          description: 'Router contract',
          date: '2026-01-01',
          tags: [],
        },
      ],
    });
    const [firstItem] = initialResponse.items;
    expect(firstItem).toBeDefined();
    if (firstItem === undefined) {
      throw new Error('Expected static search response item.');
    }
    const initialResponseWithSnippet = {
      ...initialResponse,
      items: [
        {
          ...firstItem,
          snippet: {
            segments: [
              { text: 'Router ', matched: true },
              { text: 'contract', matched: false },
            ],
          },
        },
      ],
    };

    const rendered = renderSearchPageHtml({
      surface: { kind: 'tag', tag: 'router' },
      initialState,
      initialResponse: initialResponseWithSnippet,
      siteUrlContext: createSiteUrlContext({
        siteOrigin: 'https://example.com',
        basePath: '/rouault',
      }),
    });

    expect(rendered).toContain('href="/rouault/notes/router/"');
    expect(rendered).toContain('<mark>Router </mark>contract');
    expect(rendered).not.toContain('https://rouault.invalid');
  });

  it('result card は article 直下の a.result-link をカード全面リンク面として出力すること', () => {
    const initialState: SearchState = {
      q: 'router',
      tags: [],
      tagMode: 'or',
      sort: 'relevance',
    };
    const rendered = renderSearchPageHtml({
      surface: { kind: 'tag', tag: 'router' },
      initialState,
      initialResponse: buildStaticExploreResponse({
        state: initialState,
        notes: [
          {
            title: 'Router',
            permalink: '/notes/router/',
            description: 'Router contract',
            date: '2026-01-01',
            tags: [],
          },
        ],
      }),
      siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
    });
    const fragment = parseFragment(rendered);
    const cards = collectElements(
      fragment,
      (element) => element.tagName === 'article' && hasClass(element, 'result-card'),
    );

    expect(cards).toHaveLength(1);
    for (const card of cards) {
      const children = elementChildren(card);
      expect(children).toHaveLength(1);
      const [link] = children;
      expect(link?.tagName).toBe('a');
      expect(link ? hasClass(link, 'result-link') : false).toBe(true);
      expect(link ? getAttribute(link, 'data-link-surface') : null).toBe('card');
    }
  });

  it('empty state は条件なしと条件ありで文言を分岐し、空 icon を hidden にすること', () => {
    const emptyState: SearchState = {
      q: '',
      tags: [],
      tagMode: 'or',
      sort: 'relevance',
    };
    const filteredState: SearchState = {
      q: 'missing',
      tags: ['unknown'],
      tagMode: 'and',
      sort: 'relevance',
    };
    const emptyRendered = renderSearchPageHtml({
      surface: { kind: 'tag', tag: 'unknown' },
      initialState: emptyState,
      initialResponse: buildStaticExploreResponse({ state: emptyState }),
      siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
    });
    const filteredRendered = renderSearchPageHtml({
      surface: { kind: 'tag', tag: 'unknown' },
      initialState: filteredState,
      initialResponse: buildStaticExploreResponse({ state: filteredState }),
      siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
    });

    expect(emptyRendered).toContain('キーワードまたはタグで絞り込めます');
    expect(filteredRendered).toContain('一致するメモが見つかりません');
    expect(filteredRendered).toContain(
      '検索語を変えるか、タグの組み合わせや演算子を見直してください。',
    );
    expect(filteredRendered).toContain('class="empty-hint__icon" aria-hidden="true" hidden');
  });
});
