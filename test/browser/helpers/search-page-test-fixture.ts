import { expect } from 'vitest';

import { DEFAULT_SITE_URL_CONTEXT } from '../../../shared/site/site-url-context.js';
import type {
  ExploreSearchResponse,
  SearchState,
  StaticExploreSearchResponse,
} from '../../../shared/search/search-types.js';
import { enhanceSearchPage } from '../../../src/client/post-hydrate/search-page-enhancer.js';
import {
  buildSearchPageHistoryHref,
  type SearchPageController,
} from '../../../src/client/post-hydrate/search-page-controller.js';
import { renderSearchPageHtml } from '../../../src/layouts/search-page-html.js';
import { SEARCH_DEBOUNCE_MS } from '../../../src/search/search-constants.js';
import type { SearchCore } from '../../../src/search/search-core.js';
import { fetchCssText } from './fetch-css-text.js';

export const staticResponse: ExploreSearchResponse = {
  mode: 'explore',
  items: [],
  total: 0,
  rankingProfileId: 'rouault-search-v3',
  diagnostics: {
    degraded: false,
    activeSources: ['catalog'],
    failures: [],
    issues: [],
  },
  tagCounts: { architecture: 1, music: 1 },
  allTagCounts: { architecture: 1, music: 1 },
};

export const createSearchRuntime = (
  search: SearchCore['search'] = async () => staticResponse,
): SearchCore => ({ search });

export type SearchPageDisposable = Pick<SearchPageController, 'dispose'>;

export const appendSiteUrlContextMeta = (): void => {
  for (const [name, content] of [
    ['rouault-site-origin', DEFAULT_SITE_URL_CONTEXT.siteOrigin],
    ['rouault-base-path', DEFAULT_SITE_URL_CONTEXT.basePath],
  ] as const) {
    const meta = document.createElement('meta');
    meta.name = name;
    meta.content = content;
    document.head.append(meta);
  }
};

export const renderSearchPageFixture = (): HTMLElement => {
  const root = document.createElement('div');
  root.innerHTML = `
    <section data-search-page-root data-search-page-capability="static" data-search-page-surface="search">
      <section data-search-page-baseline aria-label="Static Explore"><p data-search-result-fixture>SSR result</p><a href="/tags/music/">music</a></section>
      <div class="hero" data-search-page-dynamic-hero hidden>
        <p class="eyebrow">Search / Filter</p>
        <h1>検索</h1>
        <p class="description">タグとキーワードを組み合わせ、複数タグはOR / ANDを切り替えて探索します。</p>
      </div>
      <form data-search-page-form hidden>
        <input name="q" value="" data-search-query-input>
        <button type="button" hidden data-search-query-clear>clear</button>
        <input type="hidden" name="tagMode" value="or" data-search-choice-value data-search-tag-mode-value>
        <input type="hidden" name="sort" value="relevance" data-search-choice-value data-search-sort-value>
        <details data-search-choice-menu="tag-mode">
          <summary aria-expanded="false" aria-labelledby="tag-mode-label tag-mode-current" data-static-choice-trigger>
            <span id="tag-mode-label">タグの組み合わせ</span>
            <span id="tag-mode-current" data-static-choice-current-label>いずれかに一致</span>
          </summary>
          <div data-static-choice-panel>
            <button type="button" data-static-choice-item data-value="or" data-selected="true" aria-pressed="true">いずれかに一致</button>
            <button type="button" data-static-choice-item data-value="and" data-selected="false" aria-pressed="false">すべてに一致</button>
          </div>
        </details>
        <p data-search-tag-mode-description></p>
        <details data-search-choice-menu="sort">
          <summary aria-expanded="false" aria-labelledby="sort-label sort-current" data-static-choice-trigger>
            <span id="sort-label">並び順</span>
            <span id="sort-current" data-static-choice-current-label>関連度順</span>
          </summary>
          <div data-static-choice-panel>
            <button type="button" data-static-choice-item data-value="relevance" data-selected="true" aria-pressed="true">関連度順</button>
            <button type="button" data-static-choice-item data-value="date-desc" data-selected="false" aria-pressed="false">新しい順</button>
          </div>
        </details>
        <div class="filter-summary-state"></div>
        <div class="filter-summary-detail"></div>
        <span data-selected-tags-count></span>
        <div data-selected-tags></div>
        <input data-search-filter-input>
        <button type="button" hidden data-search-filter-clear>filter clear</button>
        <div data-search-filter-list>
          <div data-filter-option data-filter-tag="architecture" data-filter-count="1">
            <input type="checkbox" name="tag" value="architecture" data-search-tag-checkbox>
            <span class="filter-option-count">1件</span>
          </div>
          <div data-filter-option data-filter-tag="music" data-filter-count="1">
            <input type="checkbox" name="tag" value="music" data-search-tag-checkbox>
            <span class="filter-option-count">1件</span>
          </div>
        </div>
        <span data-filter-visible-count></span>
        <p hidden data-search-filter-empty></p>
      </form>
      <span data-search-page-result-count>0件の結果</span>
      <div hidden data-search-page-loading></div>
      <div hidden data-search-page-error></div>
      <div hidden data-search-page-unavailable></div>
      <div data-search-page-results-section hidden></div>
    </section>
  `;
  const page = root.querySelector<HTMLElement>('[data-search-page-root]');
  page?.setAttribute(
    'initial-search-state-json',
    JSON.stringify({ q: '', tags: [], tagMode: 'or', sort: 'relevance' }),
  );
  page?.setAttribute('initial-search-response-json', JSON.stringify(staticResponse));
  document.body.append(root);
  return root;
};

export const waitForDebounce = (): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, SEARCH_DEBOUNCE_MS + 30));

export const expectElement = <T extends Element>(
  element: T | null | undefined,
  label: string,
): T => {
  expect(element, label).to.not.equal(null);
  expect(element, label).to.not.equal(undefined);
  return element as T;
};

export const setSearchFixtureUrl = (href = '/search/'): void => {
  if (new URL(href, location.href).href !== location.href) {
    history.replaceState(history.state, '', href);
  }
};

export const renderTagOrderFixture = async (
  response: StaticExploreSearchResponse,
  tags: readonly string[] = [],
  tagMode: SearchState['tagMode'] = 'or',
): Promise<HTMLElement> => {
  const initialState: SearchState = { q: '', tags: [...tags], tagMode, sort: 'relevance' };
  setSearchFixtureUrl(buildSearchPageHistoryHref(initialState, DEFAULT_SITE_URL_CONTEXT));
  const root = document.createElement('div');
  root.innerHTML = renderSearchPageHtml({
    surface: { kind: 'search', baseline: { tags: [], corporaHref: '/corpora/' } },
    initialState,
    initialResponse: response,
    siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
  });
  const iconStyle = document.createElement('style');
  iconStyle.textContent = (
    await Promise.all([
      fetchCssText('/src/assets/css/tokens.css'),
      fetchCssText('/src/assets/css/static-icons.css'),
      fetchCssText('/src/assets/css/search-page.css'),
    ])
  ).join('\n');
  root.prepend(iconStyle);
  document.body.append(root);
  const details = expectElement(
    root.querySelector<HTMLDetailsElement>('.filter-details'),
    'filter details',
  );
  details.open = true;
  return root;
};

export const tagSequence = (root: ParentNode): string[] =>
  [...root.querySelectorAll<HTMLElement>('[data-filter-option]')].map(
    (row) => row.dataset['filterTag'] ?? '',
  );

export const tagInput = (root: ParentNode, tag: string): HTMLInputElement =>
  expectElement(
    [...root.querySelectorAll<HTMLInputElement>('[data-search-tag-checkbox]')].find(
      (input) => input.value === tag,
    ),
    tag,
  );

export const deferredTagRuntime = () => {
  const pending: ((response: ExploreSearchResponse) => void)[] = [];
  return {
    core: createSearchRuntime(() => new Promise((resolve) => pending.push(resolve))),
    async finish(root: ParentNode, response: ExploreSearchResponse): Promise<void> {
      await expect.poll(() => pending.length).toBe(1);
      const resolve = pending.shift();
      if (!resolve) throw new Error('Missing pending search');
      resolve(response);
      await expect
        .poll(() => root.querySelector<HTMLElement>('[data-search-page-loading]')?.hidden)
        .toBe(true);
    },
  };
};

export const createSearchPageTestContext = () => {
  const controllers = new Set<SearchPageDisposable>();

  const ownSearchPageController = <T extends SearchPageController | null>(controller: T): T => {
    if (controller) controllers.add(controller);
    return controller;
  };

  const disposeSearchPageControllers = (owned: Set<SearchPageDisposable>): void => {
    let firstError: unknown;
    let failed = false;
    try {
      for (const controller of owned) {
        try {
          controller.dispose();
        } catch (error: unknown) {
          if (!failed) firstError = error;
          failed = true;
        }
      }
    } finally {
      owned.clear();
    }
    if (failed) throw firstError;
  };

  const enhanceOwnedSearchPage = (
    ...args: Parameters<typeof enhanceSearchPage>
  ): ReturnType<typeof enhanceSearchPage> => ownSearchPageController(enhanceSearchPage(...args));

  const enhanceWithRuntime = (
    root: ParentNode,
    signal?: AbortSignal,
    searchRuntime = createSearchRuntime(),
  ) =>
    enhanceOwnedSearchPage(root, signal, {
      siteUrlContextProvider: () => DEFAULT_SITE_URL_CONTEXT,
      bootstrapProvider: () => ({
        status: 'ready',
        searchCore: searchRuntime,
        isInternalDocumentPathname: () => true,
      }),
      searchRuntimeProvider: () => searchRuntime,
    });

  const cleanupSearchPageTest = (
    owned: Set<SearchPageDisposable> = controllers,
    restoreFixture: () => void = () => {
      document.body.replaceChildren();
      document.head.replaceChildren();
      setSearchFixtureUrl();
    },
  ): void => {
    try {
      disposeSearchPageControllers(owned);
    } finally {
      restoreFixture();
    }
  };

  return { cleanupSearchPageTest, enhanceOwnedSearchPage, enhanceWithRuntime };
};
