import { describe, expect, it } from 'vitest';

import { buildStaticExploreResponse } from '../../build/search/build-static-explore-response.js';
import type { SearchState } from '../../shared/search/search-types.js';
import { renderSearchPageHtml } from '../../src/layouts/search-page-html.js';

describe('renderSearchPageHtml static contract', () => {
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
    expect(rendered).toContain('<svg ');
    expect(rendered).not.toContain('data-search-page-loading');
  });

  it('loading は renderer 入力で明示された場合だけ spinner HTML を出力すること', () => {
    const initialState: SearchState = {
      q: '',
      tags: [],
      tagMode: 'or',
      sort: 'relevance',
    };
    const initialResponse = buildStaticExploreResponse({ state: initialState });

    expect(renderSearchPageHtml({ initialState, initialResponse })).not.toContain(
      'data-search-page-loading',
    );

    const loading = renderSearchPageHtml({ initialState, initialResponse, loading: true });
    expect(loading).toContain('class="search-page__loading"');
    expect(loading).toContain('class="search-page__spinner"');
    expect(loading).toContain('class="search-page__loading-label"');
  });
});
