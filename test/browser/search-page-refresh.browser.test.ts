import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SITE_URL_CONTEXT } from '../../shared/site/site-url-context.js';
import { normalizeSearchCanonicalPathname } from '../../shared/search/document-url.js';
import type {
  ExploreSearchResponse,
  SearchState,
  StaticExploreSearchResponse,
} from '../../shared/search/search-types.js';
import {
  buildSearchPageHistoryHref,
  type SearchPageController,
} from '../../src/client/post-hydrate/search-page-controller.js';
import { enhanceSearchPage } from '../../src/client/post-hydrate/search-page-enhancer.js';
import { renderSearchPageHtml } from '../../src/layouts/search-page-html.js';
import { buildSearchResultRenderHref } from '../../src/search/normalize-search-result-url.js';
import { SEARCH_DEBOUNCE_MS } from '../../src/search/search-constants.js';
import type { SearchCore } from '../../src/search/search-core.js';
import { waitForStyleRecalc } from './harness/browser-test-utilities.js';
import { ensureMainCssLoaded } from './helpers/load-main-css.js';

const staticResponse: ExploreSearchResponse = {
  mode: 'explore',
  items: [],
  total: 0,
  rankingProfileId: 'rouault-search-v3',
  diagnostics: { degraded: false, activeSources: ['catalog'], failures: [], issues: [] },
  tagCounts: { architecture: 1, music: 1 },
  allTagCounts: { architecture: 1, music: 1 },
};
const controllers: SearchPageController[] = [];
const setSearchFixtureUrl = (href = '/search/') => {
  if (new URL(href, location.href).href !== location.href)
    history.replaceState(history.state, '', href);
};
const renderResultsFixture = (
  response: StaticExploreSearchResponse,
  tags: readonly string[] = [],
) => {
  const initialState: SearchState = { q: '', tags: [...tags], tagMode: 'or', sort: 'relevance' };
  setSearchFixtureUrl(buildSearchPageHistoryHref(initialState, DEFAULT_SITE_URL_CONTEXT));
  const root = document.createElement('div');
  root.innerHTML = renderSearchPageHtml({
    surface: { kind: 'search', baseline: { tags: [], corporaHref: '/corpora/' } },
    initialState,
    initialResponse: response,
    siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
  });
  document.body.append(root);
  return root;
};
const renderSearchPageFixture = () => {
  setSearchFixtureUrl();
  const root = document.createElement('div');
  root.innerHTML = renderSearchPageHtml({
    surface: { kind: 'search', baseline: { tags: [], corporaHref: '/corpora/' } },
    initialState: { q: '', tags: [], tagMode: 'or', sort: 'relevance' },
    initialResponse: staticResponse,
    siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
  });
  document.body.append(root);
  return root;
};
const createSearchRuntime = (search: SearchCore['search']): SearchCore => ({ search });
const enhanceWithRuntime = (
  root: ParentNode,
  signal: AbortSignal | undefined,
  core: SearchCore,
) => {
  const controller = enhanceSearchPage(root, signal, {
    siteUrlContextProvider: () => DEFAULT_SITE_URL_CONTEXT,
    bootstrapProvider: () => ({
      status: 'ready',
      searchCore: core,
      isInternalDocumentPathname: () => true,
    }),
    searchRuntimeProvider: () => core,
  });
  if (controller) controllers.push(controller);
  return controller;
};
const expectElement = <T extends Element>(element: T | null, label: string): T => {
  expect(element, label).not.toBeNull();
  if (!element) throw new Error(`Missing ${label}`);
  return element;
};
const waitForDebounce = () =>
  new Promise<void>((resolve) => window.setTimeout(resolve, SEARCH_DEBOUNCE_MS + 30));
afterEach(() => {
  vi.restoreAllMocks();
  for (const controller of controllers.splice(0)) controller.dispose();
  document.body.replaceChildren();
  setSearchFixtureUrl();
});

describe('search page refresh', () => {
  const responseWith = (...titles: string[]): ExploreSearchResponse => ({
    ...staticResponse,
    total: titles.length,
    items: titles.map((title) => {
      const canonicalPathname = normalizeSearchCanonicalPathname(`/notes/${title}/`);
      if (canonicalPathname === null) throw new Error('Invalid fixture path');
      return {
        canonicalPathname,
        renderHref: buildSearchResultRenderHref({
          canonicalPathname,
          siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
        }),
        pathLabel: title,
        title,
        description: title,
        date: { epochMs: null, original: null },
        tags: ['music'],
        snippet: null,
        reasons: [],
      };
    }),
  });
  const mountResults = async (tags: readonly string[] = []) => {
    const response = responseWith('old');
    return renderResultsFixture(
      {
        ...response,
        items: response.items.map(({ renderHref: _renderHref, ...item }) => item),
      },
      tags,
    );
  };
  const queryInput = (root: ParentNode) =>
    expectElement(root.querySelector<HTMLInputElement>('[data-search-query-input]'), 'query');
  const resultsRoot = (root: ParentNode) =>
    expectElement(root.querySelector<HTMLElement>('[data-search-page-results-section]'), 'results');
  const choose = (root: ParentNode, value: 'and' | 'or') => {
    const menu = expectElement(
      root.querySelector<HTMLDetailsElement>('[data-search-choice-menu="tag-mode"]'),
      'menu',
    );
    const trigger = expectElement(
      menu.querySelector<HTMLElement>('[data-static-choice-trigger]'),
      'trigger',
    );
    trigger.click();
    menu.querySelector<HTMLButtonElement>(`[data-value="${value}"]`)?.click();
    expect(menu.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  };
  const enter = (root: ParentNode, value: string) => {
    const input = queryInput(root);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const deferred = () => {
    const requests: {
      request: Parameters<SearchCore['search']>[0];
      signal: AbortSignal | undefined;
      resolve: (response: ExploreSearchResponse) => void;
      reject: (error: Error) => void;
    }[] = [];
    return {
      requests,
      core: createSearchRuntime(
        (request, options) =>
          new Promise((resolve, reject) =>
            requests.push({ request, signal: options?.signal, resolve, reject }),
          ),
      ),
    };
  };
  const settled = async (root: ParentNode) => {
    await expect.poll(() => resultsRoot(root).dataset['resultsStatus']).toBe('ready');
  };

  it('タグ0/1/複数の成功後同値は結果node・履歴を維持し、異値だけ即時実行すること', async () => {
    for (const tags of [[], ['music'], ['architecture', 'music']]) {
      const root = await mountResults(tags);
      const runtime = deferred();
      const controller = enhanceWithRuntime(root, undefined, runtime.core);
      const push = vi.spyOn(history, 'pushState');
      const old = resultsRoot(root).firstChild;
      choose(root, 'or');
      expect(runtime.requests).toHaveLength(0);
      expect(push).not.toHaveBeenCalled();
      expect(resultsRoot(root).firstChild).toBe(old);
      choose(root, 'and');
      expect(runtime.requests).toHaveLength(1);
      expect(push).toHaveBeenCalledTimes(1);
      expect(runtime.requests[0]?.request).toMatchObject({ tagMode: 'and', tags });
      runtime.requests[0]?.resolve(responseWith('new'));
      await settled(root);
      const current = resultsRoot(root).firstChild;
      choose(root, 'and');
      expect(runtime.requests).toHaveLength(1);
      expect(push).toHaveBeenCalledTimes(1);
      expect(resultsRoot(root).firstChild).toBe(current);
      push.mockRestore();
      controller?.dispose();
      root.remove();
    }
  });

  it('入力150ms未満の同値選択はtimerを維持し未知のhistory stateを保持すること', async () => {
    const root = await mountResults();
    const runtime = deferred();
    enhanceWithRuntime(root, undefined, runtime.core);
    const previousHistoryState: unknown = history.state;
    history.replaceState({ foreign: { reading: 42 }, __routerUrl: '/search/' }, '', location.href);
    const push = vi.spyOn(history, 'pushState');
    const replace = vi.spyOn(history, 'replaceState');
    enter(root, 'latest');
    choose(root, 'or');
    expect(runtime.requests).toHaveLength(0);
    expect(push).not.toHaveBeenCalled();
    expect(replace).toHaveBeenCalledTimes(1);
    expect(history.state).toEqual({ foreign: { reading: 42 }, __routerUrl: '/search/?q=latest' });
    expect(resultsRoot(root).textContent).toContain('old');
    expect(resultsRoot(root).getAttribute('aria-busy')).toBe('true');
    expect(root.querySelector('[data-search-page-result-count]')?.textContent).toBe('更新中');
    await waitForDebounce();
    expect(runtime.requests).toHaveLength(1);
    expect(runtime.requests[0]?.request).toMatchObject({ q: 'latest', tagMode: 'or' });
    runtime.requests[0]?.resolve(responseWith('new'));
    await settled(root);
    history.replaceState(previousHistoryState, '', location.href);
  });

  it('in-flight同値連打は継続し異値は最新入力でabort・即時実行し遅い応答を捨てること', async () => {
    const root = await mountResults();
    const runtime = deferred();
    enhanceWithRuntime(root, undefined, runtime.core);
    enter(root, 'latest');
    choose(root, 'and');
    expect(runtime.requests).toHaveLength(1);
    expect(runtime.requests[0]?.request).toMatchObject({ q: 'latest', tagMode: 'and' });
    choose(root, 'and');
    choose(root, 'and');
    expect(runtime.requests).toHaveLength(1);
    expect(runtime.requests[0]?.signal?.aborted).toBe(false);
    choose(root, 'or');
    expect(runtime.requests).toHaveLength(2);
    expect(runtime.requests[0]?.signal?.aborted).toBe(true);
    runtime.requests[1]?.resolve(responseWith('winner'));
    await settled(root);
    runtime.requests[0]?.resolve(responseWith('stale'));
    await waitForDebounce();
    expect(runtime.requests).toHaveLength(2);
    expect(resultsRoot(root).textContent).toContain('winner');
    expect(resultsRoot(root).textContent).not.toContain('stale');
  });

  it('失敗後は旧条件を明示して旧リンクを保持し同値retryはpushせずpendingへ戻ること', async () => {
    const root = await mountResults();
    const runtime = deferred();
    enhanceWithRuntime(root, undefined, runtime.core);
    choose(root, 'and');
    runtime.requests[0]?.reject(new Error('failure'));
    await expect.poll(() => resultsRoot(root).dataset['resultsStatus']).toBe('error');
    expect(resultsRoot(root).getAttribute('aria-busy')).toBe('false');
    expect(resultsRoot(root).dataset['stale']).toBe('true');
    expect(resultsRoot(root).querySelector('a')?.getAttribute('href')).toBe('/notes/old/');
    expect(root.querySelector('[data-search-page-error]')?.textContent).toContain('直前の条件');
    expect(root.querySelector('[data-search-page-error]')?.textContent).toContain('いずれかに一致');
    expect(root.querySelector('[data-search-page-result-count]')?.textContent).toBe('取得失敗');
    const push = vi.spyOn(history, 'pushState');
    choose(root, 'and');
    expect(push).not.toHaveBeenCalled();
    expect(runtime.requests).toHaveLength(2);
    expect(root.querySelector('[data-search-filter-list]')?.getAttribute('aria-busy')).toBe('true');
    runtime.requests[1]?.resolve(responseWith());
    await settled(root);
    expect(resultsRoot(root).dataset['stale']).toBe('false');
    expect(root.querySelector('[data-search-page-result-count]')?.textContent).toBe('0 件の結果');
    expect(resultsRoot(root).querySelector('[data-search-empty-state]')).not.toBeNull();
    expect(root.querySelector('[data-search-page-announcement]')?.textContent).toBe('0 件の結果');
    expect(root.querySelectorAll('[role="status"]')).toHaveLength(1);
    expect(root.querySelectorAll('[aria-live]')).toHaveLength(1);
  });

  it('初回失敗・同期例外・同値retry・高速0件完了は確定件数を誤表示しないこと', async () => {
    const root = renderSearchPageFixture();
    root
      .querySelector('[data-search-page-root]')
      ?.setAttribute('initial-search-response-json', '{');
    let calls = 0;
    enhanceWithRuntime(
      root,
      undefined,
      createSearchRuntime(() => {
        calls += 1;
        if (calls === 1) throw new Error('sync failure');
        return Promise.resolve(responseWith());
      }),
    );
    expect(resultsRoot(root).children).toHaveLength(0);
    expect(resultsRoot(root).dataset['stale']).toBe('false');
    expect(root.querySelector('[data-search-page-error]')?.textContent).not.toContain('直前の条件');
    choose(root, 'or');
    await settled(root);
    expect(calls).toBe(2);
    expect(root.querySelector('[data-search-page-result-count]')?.textContent).toBe('0 件の結果');
  });

  it('同じrootの再enhanceで条件不一致なら旧sessionの結果を初回結果として残さないこと', async () => {
    const root = await mountResults();
    const first = deferred();
    const controller = enhanceWithRuntime(root, undefined, first.core);
    enter(root, 'different');
    choose(root, 'and');
    first.requests[0]?.resolve(responseWith('previous-session'));
    await settled(root);
    controller?.dispose();
    const next = deferred();
    enhanceWithRuntime(root, undefined, next.core);
    expect(next.requests).toHaveLength(1);
    expect(resultsRoot(root).children).toHaveLength(0);
    next.requests[0]?.reject(new Error('initial failure'));
    await expect.poll(() => resultsRoot(root).dataset['resultsStatus']).toBe('error');
    expect(resultsRoot(root).children).toHaveLength(0);
    expect(resultsRoot(root).dataset['stale']).toBe('false');
    expect(root.querySelector('[data-search-page-error]')?.textContent).not.toContain('直前の条件');
  });

  it('非ゼロscrollで旧結果の高さを保ち、focus復帰は先頭へ飛ばさず0件化の末尾補正だけを許すこと', async () => {
    await ensureMainCssLoaded();
    const titles = Array.from({ length: 40 }, (_, index) => `old-${index}`);
    const initialResponse = responseWith(...titles);
    const root = renderResultsFixture({
      ...initialResponse,
      items: initialResponse.items.map(({ renderHref: _renderHref, ...item }) => item),
    });
    const runtime = deferred();
    enhanceWithRuntime(root, undefined, runtime.core);

    const startUpdateFromResult = async (q: string, requestCount: number) => {
      const link = expectElement(
        resultsRoot(root).querySelectorAll('a')[20] ?? null,
        'middle link',
      );
      link.scrollIntoView({ block: 'center', behavior: 'instant' });
      link.focus({ preventScroll: true });
      await waitForStyleRecalc();
      expect(window.scrollY, 'fixture must actually scroll').toBeGreaterThan(0);
      const resultHeight = resultsRoot(root).getBoundingClientRect().height;
      enter(root, q);
      await expect.poll(() => runtime.requests.length).toBe(requestCount);
      await waitForStyleRecalc();
      expect(resultsRoot(root).dataset['resultsStatus']).toBe('pending');
      expect(resultsRoot(root).querySelectorAll('a')[20]).toBe(link);
      expect(resultsRoot(root).getBoundingClientRect().height).toBeCloseTo(resultHeight, 0);
      expect(window.scrollY, 'pending must retain a scrollable result list').toBeGreaterThan(0);
      expect(document.activeElement).toBe(link);
      return { scroll: window.scrollY, href: link.getAttribute('href') };
    };

    const sameLink = await startUpdateFromResult('same-link', 1);
    runtime.requests[0]?.resolve(responseWith(...titles));
    await settled(root);
    await waitForStyleRecalc();
    expect(document.activeElement).toBe(resultsRoot(root).querySelectorAll('a')[20]);
    expect(document.activeElement?.getAttribute('href')).toBe(sameLink.href);
    expect(window.scrollY).toBeCloseTo(sameLink.scroll, 0);

    const removedLink = await startUpdateFromResult('removed-link', 2);
    runtime.requests[1]?.resolve(
      responseWith(...titles.map((title) => title.replace('old-', 'new-'))),
    );
    await settled(root);
    await waitForStyleRecalc();
    expect(document.activeElement).toBe(queryInput(root));
    expect(window.scrollY).toBeCloseTo(removedLink.scroll, 0);

    const empty = await startUpdateFromResult('empty', 3);
    runtime.requests[2]?.resolve(responseWith());
    await settled(root);
    await waitForStyleRecalc();
    const scrollingElement = expectElement(document.scrollingElement, 'scrolling element');
    const maximumScroll = Math.max(
      0,
      scrollingElement.scrollHeight - scrollingElement.clientHeight,
    );
    expect(maximumScroll, 'zero results must exercise document height clamping').toBeLessThan(
      empty.scroll,
    );
    expect(document.activeElement).toBe(queryInput(root));
    expect(window.scrollY).toBeCloseTo(Math.min(empty.scroll, maximumScroll), 0);
    expect(resultsRoot(root).querySelectorAll('a')).toHaveLength(0);
    expect(root.querySelector('[data-search-page-result-count]')?.textContent).toBe('0 件の結果');
  });

  it('pending中のURL復元が入力timerと旧in-flightに勝ち未知stateへ書き込まないこと', async () => {
    const root = await mountResults();
    const runtime = deferred();
    enhanceWithRuntime(root, undefined, runtime.core);
    enter(root, 'queued');
    history.replaceState(history.state, '', '/search/?q=back');
    const push = vi.spyOn(history, 'pushState');
    const replace = vi.spyOn(history, 'replaceState');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(runtime.requests[0]?.request).toMatchObject({ q: 'back' });
    expect(queryInput(root).value).toBe('back');
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    replace.mockRestore();
    history.replaceState(history.state, '', '/search/?q=forward&tagMode=and');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(runtime.requests[0]?.signal?.aborted).toBe(true);
    expect(runtime.requests[1]?.request).toMatchObject({ q: 'forward', tagMode: 'and' });
    runtime.requests[1]?.resolve(responseWith('forward'));
    await settled(root);
    runtime.requests[0]?.resolve(responseWith('back'));
    await waitForDebounce();
    expect(runtime.requests).toHaveLength(2);
    expect(resultsRoot(root).textContent).toContain('forward');
  });
});
