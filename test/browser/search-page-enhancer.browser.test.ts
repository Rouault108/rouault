import { expect } from '@open-wc/testing';

import { DEFAULT_SITE_URL_CONTEXT } from '../../shared/site/site-url-context.js';
import type { ExploreSearchResponse } from '../../shared/search/search-types.js';
import { enhanceSearchPage } from '../../src/client/post-hydrate/search-page-enhancer.js';
import {
  areSearchStatesCanonicallyEqual,
  buildSearchPageHistoryHref,
} from '../../src/client/post-hydrate/search-page-controller.js';
import type { SearchCore } from '../../src/search/search-core.js';
import { SEARCH_DEBOUNCE_MS } from '../../src/search/search-constants.js';

const staticResponse: ExploreSearchResponse = {
  mode: 'explore',
  items: [],
  total: 0,
  rankingProfileId: 'rouault-search-v1',
  diagnostics: {
    degraded: false,
    activeSources: ['catalog'],
    failures: [],
    issues: [],
  },
  tagCounts: { architecture: 1, music: 1 },
  allTagCounts: { architecture: 1, music: 1 },
};

const createSearchRuntime = (
  search: SearchCore['search'] = async () => staticResponse,
): SearchCore => ({ search });

const appendSiteUrlContextMeta = (): void => {
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

const renderSearchPageFixture = (): HTMLElement => {
  const root = document.createElement('div');
  root.innerHTML = `
    <section data-search-page-root>
      <h1>#architecture</h1>
      <form data-search-page-form>
        <input name="q" value="" data-search-query-input>
        <button type="button" hidden data-search-query-clear>clear</button>
        <select name="tagMode" data-search-tag-mode-select>
          <option value="or" selected>or</option>
          <option value="and">and</option>
        </select>
        <select name="sort" data-search-sort-select>
          <option value="relevance" selected>relevance</option>
          <option value="date-desc">date-desc</option>
        </select>
        <div class="filter-summary-state"></div>
        <div class="filter-summary-detail"></div>
        <span data-selected-tags-count></span>
        <div data-selected-tags></div>
        <input data-search-filter-input>
        <button type="button" hidden data-search-filter-clear>filter clear</button>
        <div data-filter-option data-filter-tag="architecture" data-filter-count="1">
          <input type="checkbox" name="tag" value="architecture" data-search-tag-checkbox>
        </div>
        <div data-filter-option data-filter-tag="music" data-filter-count="1">
          <input type="checkbox" name="tag" value="music" data-search-tag-checkbox>
        </div>
        <span data-filter-visible-count></span>
        <p hidden data-search-filter-empty></p>
      </form>
      <div hidden data-search-page-unavailable></div>
      <div data-search-results-section><p data-search-result-fixture>SSR result</p></div>
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

const enhanceWithRuntime = (
  root: ParentNode,
  signal?: AbortSignal,
  searchRuntime = createSearchRuntime(),
) =>
  enhanceSearchPage(root, signal, {
    siteUrlContextProvider: () => DEFAULT_SITE_URL_CONTEXT,
    bootstrapProvider: () => null,
    searchRuntimeProvider: () => searchRuntime,
  });

const waitForDebounce = (): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, SEARCH_DEBOUNCE_MS + 30));

const expectElement = <T extends Element>(element: T | null | undefined, label: string): T => {
  expect(element, label).to.not.equal(null);
  expect(element, label).to.not.equal(undefined);
  return element as T;
};

describe('search-page-enhancer', () => {
  beforeEach(() => {
    document.head.replaceChildren();
    appendSiteUrlContextMeta();
  });

  afterEach(() => {
    document.body.replaceChildren();
    document.head.replaceChildren();
    history.replaceState(history.state, '', '/');
  });

  it('clear button の hidden 同期と FormData 契約に沿った URL 同期を行うこと', () => {
    const root = renderSearchPageFixture();
    const page = root.querySelector<HTMLElement>('[data-search-page-root]');
    const query = root.querySelector<HTMLInputElement>('[data-search-query-input]');
    const queryClear = root.querySelector<HTMLButtonElement>('[data-search-query-clear]');
    const filter = root.querySelector<HTMLInputElement>('[data-search-filter-input]');
    const filterClear = root.querySelector<HTMLButtonElement>('[data-search-filter-clear]');
    const music = [...root.querySelectorAll<HTMLInputElement>('[data-search-tag-checkbox]')].find(
      (input) => input.value === 'music',
    );

    expectElement(page, 'page');
    const queryInput = expectElement(query, 'query');
    const queryClearButton = expectElement(queryClear, 'queryClear');
    const filterInput = expectElement(filter, 'filter');
    const filterClearButton = expectElement(filterClear, 'filterClear');
    const musicCheckbox = expectElement(music, 'music');

    enhanceWithRuntime(root);
    expect(queryClear?.hidden).to.equal(true);

    queryInput.value = 'Router';
    queryInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(queryClear?.hidden).to.equal(false);
    expect(location.search).to.contain('q=router');

    musicCheckbox.checked = true;
    musicCheckbox.dispatchEvent(new Event('change', { bubbles: true }));
    expect(location.search).to.contain('tag=music');

    filterInput.value = 'zzz';
    filterInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(filterClear?.hidden).to.equal(false);
    expect(root.querySelector<HTMLElement>('[data-search-filter-empty]')?.hidden).to.equal(false);

    queryClearButton.click();
    filterClearButton.click();
    expect(queryInput.value).to.equal('');
    expect(filterInput.value).to.equal('');
    expect(queryClear?.hidden).to.equal(true);
    expect(filterClear?.hidden).to.equal(true);
  });

  it('AbortSignal で listener を解除し、abort 後に再有効化できること', () => {
    const root = renderSearchPageFixture();
    const page = root.querySelector<HTMLElement>('[data-search-page-root]');
    const query = root.querySelector<HTMLInputElement>('[data-search-query-input]');
    const first = new AbortController();
    const second = new AbortController();

    enhanceWithRuntime(root, first.signal);
    expect(page?.dataset['enhanced']).to.equal('true');

    first.abort();
    expect(page?.dataset['enhanced']).to.equal(undefined);

    const queryInput = expectElement(query, 'query');
    queryInput.value = 'after abort';
    queryInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(location.search).to.equal('');

    enhanceWithRuntime(root, second.signal);
    queryInput.value = 'after abort';
    queryInput.dispatchEvent(new Event('input', { bubbles: true }));
    expect(location.search).to.contain('q=after+abort');
  });

  it('同一 root は二重 enhance せず、dispose 後に再有効化できること', () => {
    const root = renderSearchPageFixture();
    const page = root.querySelector<HTMLElement>('[data-search-page-root]');
    const first = enhanceWithRuntime(root);
    const duplicate = enhanceWithRuntime(root);

    expect(first).not.to.equal(null);
    expect(duplicate).to.equal(first);
    expect(page?.dataset['enhanced']).to.equal('true');

    first?.dispose();
    expect(page?.dataset['enhanced']).to.equal(undefined);

    const second = enhanceWithRuntime(root);
    expect(second).not.to.equal(first);
  });

  it('provider injection で ready state を作り bootstrap と runtime を保持すること', () => {
    const root = renderSearchPageFixture();
    const bootstrapState = { status: 'unavailable' as const, reason: 'search-runtime-unavailable' as const };
    const searchRuntime = null;
    const controller = enhanceSearchPage(root, undefined, {
      siteUrlContextProvider: () => DEFAULT_SITE_URL_CONTEXT,
      bootstrapProvider: () => bootstrapState,
      searchRuntimeProvider: () => searchRuntime,
    });

    expect(controller?.state).to.deep.equal({
      kind: 'ready',
      siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
      bootstrapState,
      searchRuntime,
    });
  });

  it('siteUrlContext provider が null の場合は SSR unavailable container を再利用して dynamic controls を disabled にすること', () => {
    const root = renderSearchPageFixture();
    const page = root.querySelector<HTMLElement>('[data-search-page-root]');
    const unavailableBefore = root.querySelector<HTMLElement>('[data-search-page-unavailable]');
    const controller = enhanceSearchPage(root, undefined, {
      siteUrlContextProvider: () => null,
    });
    const unavailableAfter = root.querySelector<HTMLElement>('[data-search-page-unavailable]');

    expect(controller?.state?.kind).to.equal('site-url-context-unavailable');
    expect(unavailableAfter).to.equal(unavailableBefore);
    expect(root.querySelectorAll('[data-search-page-unavailable]')).to.have.length(1);
    expect(unavailableAfter?.hidden).to.equal(false);
    expect(unavailableAfter?.textContent).to.equal(
      'サイト URL 情報を読み込めないため、検索ページの動的機能を利用できません。通常リンクはそのまま利用できます。',
    );
    expect(page?.querySelector<HTMLInputElement>('[data-search-query-input]')?.disabled).to.equal(
      true,
    );
    expect(
      page?.querySelector<HTMLSelectElement>('[data-search-sort-select]')?.disabled,
    ).to.equal(true);
  });

  it('siteUrlContext provider が null の場合は bootstrap と search runtime を参照しないこと', () => {
    const root = renderSearchPageFixture();
    let bootstrapReads = 0;
    let runtimeReads = 0;
    const controller = enhanceSearchPage(root, undefined, {
      siteUrlContextProvider: () => null,
      bootstrapProvider: () => {
        bootstrapReads += 1;
        return null;
      },
      searchRuntimeProvider: () => {
        runtimeReads += 1;
        return createSearchRuntime();
      },
    });

    expect(controller?.state?.kind).to.equal('site-url-context-unavailable');
    expect(bootstrapReads).to.equal(0);
    expect(runtimeReads).to.equal(0);
  });

  it('選択済みタグの解除 button を static icon 契約で生成すること', () => {
    const root = renderSearchPageFixture();
    const architecture = expectElement(
      root.querySelector<HTMLInputElement>('[data-search-tag-checkbox][value="architecture"]'),
      'architecture',
    );
    enhanceWithRuntime(root);
    architecture.checked = true;
    architecture.dispatchEvent(new Event('change', { bubbles: true }));

    const remove = expectElement(
      root.querySelector<HTMLButtonElement>(
        'button.selected-tag__remove[data-search-selected-tag-remove][type="button"]',
      ),
      'selected tag remove',
    );

    expect(remove.getAttribute('aria-label')).to.equal('architecture を解除');
    expect(remove.querySelector('.selected-tag__remove-icon.static-icon > svg')).not.to.equal(null);
    expect(remove.hasAttribute('data-selected-tag-remove')).to.equal(false);
    expect(root.querySelector('[data-filter-option]')?.getAttribute('data-selected')).to.equal(
      'true',
    );
    expect(root.querySelector('.filter-option--selected')).to.equal(null);
  });

  it('valid initial payload は初回検索を省略し、URL state 不一致なら検索すること', () => {
    const requests: unknown[] = [];
    const runtime = createSearchRuntime(async (request) => {
      requests.push(request);
      return staticResponse;
    });
    const root = renderSearchPageFixture();

    enhanceWithRuntime(root, undefined, runtime);
    expect(requests).to.have.length(0);

    document.body.replaceChildren();
    history.replaceState(history.state, '', '/search/?q=router');
    const mismatchedRoot = renderSearchPageFixture();
    enhanceWithRuntime(mismatchedRoot, undefined, runtime);
    expect(requests).to.deep.equal([
      { mode: 'explore', q: 'router', tags: [], tagMode: 'or', sort: 'relevance' },
    ]);
  });

  it('q は表示値を維持して replaceState + debounce、tag は pushState + 即時検索にすること', async () => {
    const requests: unknown[] = [];
    const runtime = createSearchRuntime(async (request) => {
      requests.push(request);
      return staticResponse;
    });
    const root = renderSearchPageFixture();
    const query = expectElement(
      root.querySelector<HTMLInputElement>('[data-search-query-input]'),
      'query',
    );
    const music = expectElement(
      root.querySelector<HTMLInputElement>('[data-search-tag-checkbox][value="music"]'),
      'music',
    );
    const originalReplaceState = history.replaceState.bind(history);
    const originalPushState = history.pushState.bind(history);
    let replaceCount = 0;
    let pushCount = 0;
    history.replaceState = (...args) => {
      replaceCount += 1;
      originalReplaceState(...args);
    };
    history.pushState = (...args) => {
      pushCount += 1;
      originalPushState(...args);
    };
    try {
      enhanceWithRuntime(root, undefined, runtime);
      query.value = 'Router';
      query.dispatchEvent(new Event('input', { bubbles: true }));
      expect(query.value).to.equal('Router');
      expect(new URL(location.href).searchParams.get('q')).to.equal('router');
      expect(replaceCount).to.equal(1);
      expect(requests).to.have.length(0);
      await waitForDebounce();
      expect(requests).to.have.length(1);

      music.checked = true;
      music.dispatchEvent(new Event('change', { bubbles: true }));
      expect(pushCount).to.equal(1);
      expect(requests).to.have.length(2);
    } finally {
      history.replaceState = originalReplaceState;
      history.pushState = originalPushState;
    }
  });

  it('basePath 付き search / tag URL を pathname と search を分離して生成すること', () => {
    const context = { siteOrigin: 'https://example.com', basePath: '/base' };
    expect(
      buildSearchPageHistoryHref(
        { q: 'Router', tags: [], tagMode: 'or', sort: 'relevance' },
        context,
      ),
    ).to.equal('/base/search/?q=router');
    expect(
      buildSearchPageHistoryHref(
        { q: '', tags: ['music'], tagMode: 'or', sort: 'relevance' },
        context,
      ),
    ).to.equal('/base/tags/music/');
  });

  it('basePath 付き tag URL を strip して URL state から検索すること', () => {
    const requests: unknown[] = [];
    const runtime = createSearchRuntime(async (request) => {
      requests.push(request);
      return staticResponse;
    });
    history.replaceState(history.state, '', '/base/tags/music/');
    const root = renderSearchPageFixture();
    root
      .querySelector<HTMLElement>('[data-search-page-root]')
      ?.setAttribute('initial-search-response-json', '{');

    enhanceSearchPage(root, undefined, {
      siteUrlContextProvider: () => ({ siteOrigin: 'https://example.com', basePath: '/base' }),
      bootstrapProvider: () => null,
      searchRuntimeProvider: () => runtime,
    });

    expect(requests).to.deep.equal([
      { mode: 'explore', q: '', tags: ['music'], tagMode: 'or', sort: 'relevance' },
    ]);
  });

  it('bootstrap unavailable でも valid initial payload を維持し、invalid payload は unavailable state にすること', () => {
    const bootstrapState = {
      status: 'unavailable' as const,
      reason: 'search-runtime-unavailable' as const,
    };
    const root = renderSearchPageFixture();
    const controller = enhanceSearchPage(root, undefined, {
      siteUrlContextProvider: () => DEFAULT_SITE_URL_CONTEXT,
      bootstrapProvider: () => bootstrapState,
      searchRuntimeProvider: () => null,
    });

    expect(controller?.state?.kind).to.equal('ready');
    expect(root.querySelector<HTMLInputElement>('[data-search-query-input]')?.disabled).to.equal(
      true,
    );
    expect(root.querySelector<HTMLElement>('[data-search-page-unavailable]')?.hidden).to.equal(
      false,
    );
    expect(root.querySelector('[data-search-result-fixture]')).not.to.equal(null);

    document.body.replaceChildren();
    const invalidRoot = renderSearchPageFixture();
    invalidRoot
      .querySelector<HTMLElement>('[data-search-page-root]')
      ?.setAttribute('initial-search-response-json', '{');
    const invalidController = enhanceSearchPage(invalidRoot, undefined, {
      siteUrlContextProvider: () => DEFAULT_SITE_URL_CONTEXT,
      bootstrapProvider: () => bootstrapState,
      searchRuntimeProvider: () => null,
    });
    expect(invalidController?.state?.kind).to.equal('bootstrap-unavailable');
    expect(invalidRoot.querySelector('[data-search-result-fixture]')).to.equal(null);
  });

  it('bootstrap unavailable 中の popstate は form を復元し、旧 SSR results を破棄すること', () => {
    const root = renderSearchPageFixture();
    const controller = enhanceSearchPage(root, undefined, {
      siteUrlContextProvider: () => DEFAULT_SITE_URL_CONTEXT,
      bootstrapProvider: () => ({
        status: 'unavailable',
        reason: 'search-runtime-unavailable',
      }),
      searchRuntimeProvider: () => null,
    });

    expect(controller?.state?.kind).to.equal('ready');
    expect(root.querySelector('[data-search-result-fixture]')).not.to.equal(null);

    history.pushState(history.state, '', '/search/?q=router&tag=music');
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(controller?.state?.kind).to.equal('bootstrap-unavailable');
    expect(root.querySelector<HTMLInputElement>('[data-search-query-input]')?.value).to.equal(
      'router',
    );
    expect(
      root.querySelector<HTMLInputElement>('[data-search-tag-checkbox][value="music"]')?.checked,
    ).to.equal(true);
    expect(root.querySelector('[data-search-result-fixture]')).to.equal(null);
  });

  it('canonical state 比較は query と tag の表記差を吸収すること', () => {
    expect(
      areSearchStatesCanonicallyEqual(
        { q: ' Router ', tags: [' Music ', 'jazz'], tagMode: 'or', sort: 'relevance' },
        { q: 'router', tags: ['JAZZ', 'music', 'music'], tagMode: 'or', sort: 'relevance' },
      ),
    ).to.equal(true);
  });

  it('新しい検索と dispose で in-flight を abort し、stale result を破棄すること', async () => {
    const abortSignals: AbortSignal[] = [];
    const resolvers: ((response: ExploreSearchResponse) => void)[] = [];
    const runtime = createSearchRuntime(
      (_request, options) =>
        new Promise((resolve) => {
          if (options?.signal) {
            abortSignals.push(options.signal);
          }
          resolvers.push(resolve);
        }),
    );
    const root = renderSearchPageFixture();
    history.replaceState(history.state, '', '/search/?q=first');
    const controller = enhanceWithRuntime(root, undefined, runtime);
    expect(abortSignals).to.have.length(1);

    const query = expectElement(
      root.querySelector<HTMLInputElement>('[data-search-query-input]'),
      'query',
    );
    query.value = 'second';
    query.dispatchEvent(new Event('input', { bubbles: true }));
    expect(abortSignals[0]?.aborted).to.equal(true);
    await waitForDebounce();
    expect(abortSignals).to.have.length(2);

    controller?.dispose();
    expect(abortSignals[1]?.aborted).to.equal(true);
    resolvers[0]?.(staticResponse);
    resolvers[1]?.(staticResponse);
    await Promise.resolve();
  });

  it('popstate で URL state を復元して即時検索すること', () => {
    const requests: unknown[] = [];
    const runtime = createSearchRuntime(async (request) => {
      requests.push(request);
      return staticResponse;
    });
    const root = renderSearchPageFixture();
    enhanceWithRuntime(root, undefined, runtime);

    history.pushState(history.state, '', '/search/?q=router&tag=music');
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(
      root.querySelector<HTMLInputElement>('[data-search-query-input]')?.value,
    ).to.equal('router');
    expect(requests).to.deep.equal([
      { mode: 'explore', q: 'router', tags: ['music'], tagMode: 'or', sort: 'relevance' },
    ]);
  });
});
