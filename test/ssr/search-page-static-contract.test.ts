import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { buildStaticExploreResponse } from '../../build/search/build-static-explore-response.js';
import type { SearchState } from '../../shared/search/search-types.js';
import { createSiteUrlContext, DEFAULT_SITE_URL_CONTEXT } from '../../shared/site/site-url-context.js';
import { renderSearchPageHtml } from '../../src/layouts/search-page-html.js';

describe('renderSearchPageHtml static contract', () => {
  it('production templates require and pass siteUrlContext without renderer fallback', () => {
    const searchTemplate = readFileSync(resolve(process.cwd(), 'src/search.11ty.ts'), 'utf8');
    const tagsTemplate = readFileSync(resolve(process.cwd(), 'src/tags.11ty.ts'), 'utf8');
    const renderer = readFileSync(resolve(process.cwd(), 'src/layouts/search-page-html.ts'), 'utf8');
    const rendererFunctions = renderer.slice(
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
    expect(rendered).toContain('class="tag-mode-select-wrapper" data-static-select');
    expect(rendered).toContain('name="tagMode"');
    expect(rendered).toContain('class="sort-select-wrapper" data-static-select');
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
    expect(rendered).toContain('class="sort-select__chevron static-icon"');
    expect(rendered).toContain('class="tag-mode-select__chevron static-icon"');
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
      initialState,
      initialResponse,
      siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
    });
    expect(idle).toContain('hidden data-search-page-loading');
    expect(idle).toContain('hidden data-search-page-error');
    expect(idle).toContain('hidden data-search-page-unavailable');

    const loading = renderSearchPageHtml({
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
      initialState: emptyState,
      initialResponse: buildStaticExploreResponse({ state: emptyState }),
      siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
    });
    const filteredRendered = renderSearchPageHtml({
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
