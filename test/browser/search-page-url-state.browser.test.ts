import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  beginNavigationIntent,
  initializeContentContext,
  releaseContentContext,
} from '../../src/navigation/content-navigation-context.js';
import { normalizeSearchCanonicalPathname } from '../../shared/search/document-url.js';
import { buildSearchResultRenderHref } from '../../src/search/normalize-search-result-url.js';
import { observeHistoryEntries } from '../../src/navigation/history-entry.js';
import { SEARCH_DEBOUNCE_MS } from '../../src/search/search-constants.js';
import { DEFAULT_SITE_URL_CONTEXT } from '../../shared/site/site-url-context.js';
import type { ExploreSearchResponse } from '../../shared/search/search-types.js';
import {
  areSearchStatesCanonicallyEqual,
  buildSearchPageHistoryHref,
} from '../../src/client/post-hydrate/search-page-controller.js';

import {
  appendSiteUrlContextMeta,
  createSearchPageTestContext,
  createSearchRuntime,
  expectElement,
  renderSearchPageFixture,
  staticResponse,
  waitForDebounce,
} from './helpers/search-page-test-fixture.js';

const { cleanupSearchPageTest, enhanceOwnedSearchPage, enhanceWithRuntime } =
  createSearchPageTestContext();

describe('search-page URL state', () => {
  beforeEach(() => {
    document.head.replaceChildren();
    appendSiteUrlContextMeta();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    cleanupSearchPageTest();
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
      expect(new URL(location.href).searchParams.get('q')).to.equal('Router');
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
    ).to.equal('/base/search/?q=Router');
    expect(
      buildSearchPageHistoryHref(
        { q: '', tags: ['music'], tagMode: 'or', sort: 'relevance' },
        context,
      ),
    ).to.equal('/base/tags/music/');
  });

  it('bootstrap unavailable 中はSSR selected-tag removeもhidden form内でdisabledにすること', () => {
    history.replaceState(history.state, '', '/tags/architecture/');
    const root = renderSearchPageFixture();
    root
      .querySelector('[data-selected-tags]')
      ?.insertAdjacentHTML(
        'beforeend',
        '<button type="button" data-search-selected-tag-remove="architecture">解除</button>',
      );
    root
      .querySelector<HTMLElement>('[data-search-page-root]')
      ?.setAttribute(
        'initial-search-state-json',
        JSON.stringify({ q: '', tags: ['architecture'], tagMode: 'or', sort: 'relevance' }),
      );
    enhanceOwnedSearchPage(root, undefined, {
      siteUrlContextProvider: () => DEFAULT_SITE_URL_CONTEXT,
      bootstrapProvider: () => ({
        status: 'unavailable',
        reason: 'search-runtime-unavailable',
      }),
      searchRuntimeProvider: () => null,
    });

    expect(
      root.querySelector<HTMLButtonElement>('[data-search-selected-tag-remove="architecture"]')
        ?.disabled,
    ).to.equal(true);
  });

  it('state比較はtrimとtag表記差を吸収し、queryの大小文字を区別すること', () => {
    expect(
      areSearchStatesCanonicallyEqual(
        { q: ' Router ', tags: [' Music ', 'jazz'], tagMode: 'or', sort: 'relevance' },
        { q: 'Router', tags: ['JAZZ', 'music', 'music'], tagMode: 'or', sort: 'relevance' },
      ),
    ).to.equal(true);
    expect(
      areSearchStatesCanonicallyEqual(
        { q: 'LangVersion', tags: [], tagMode: 'or', sort: 'relevance' },
        { q: 'langversion', tags: [], tagMode: 'or', sort: 'relevance' },
      ),
    ).to.equal(false);
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

    const countStatus = () =>
      root.querySelector<HTMLElement>('[data-filter-option][data-filter-tag="music"]')?.dataset[
        'countStatus'
      ];
    const countText = () =>
      root.querySelector('[data-filter-option][data-filter-tag="music"] .filter-option-count')
        ?.textContent;
    expect(countStatus()).to.equal('pending');
    resolvers[0]?.({
      ...staticResponse,
      tagCounts: { architecture: 91, music: 91 },
      allTagCounts: { architecture: 91, music: 91 },
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(countStatus()).to.equal('pending');
    expect(countText()).to.equal('件数を計算中');

    resolvers[1]?.({
      ...staticResponse,
      tagCounts: { architecture: 7, music: 7 },
      allTagCounts: { architecture: 7, music: 7 },
    });
    await expect.poll(countStatus).toBe('ready');
    expect(countText()).to.equal('7件');

    controller?.dispose();
    expect(abortSignals[1]?.aborted).to.equal(false);
    await Promise.resolve();
  });

  it('tagCounts / allTagCounts から option count、disabled、visible count を更新すること', async () => {
    const response: ExploreSearchResponse = {
      ...staticResponse,
      tagCounts: { architecture: 2, music: 0 },
      allTagCounts: { architecture: 3, music: 4, security: 1 },
    };
    history.replaceState(history.state, '', '/search/?q=counts&tagMode=and');
    const root = renderSearchPageFixture();
    root
      .querySelector<HTMLElement>('[data-search-page-root]')
      ?.setAttribute('initial-search-response-json', '{');
    enhanceWithRuntime(
      root,
      undefined,
      createSearchRuntime(async () => response),
    );
    await Promise.resolve();

    expect(
      root.querySelector(
        '[data-filter-option][data-filter-tag="architecture"] .filter-option-count',
      )?.textContent,
    ).to.equal('2件');
    expect(
      root.querySelector<HTMLInputElement>(
        '[data-filter-option][data-filter-tag="music"] [data-search-tag-checkbox]',
      )?.disabled,
    ).to.equal(true);
    expect(root.querySelector('[data-filter-option][data-filter-tag="security"]')).not.to.equal(
      null,
    );
    expect(root.querySelector('[data-filter-visible-count]')?.textContent).to.equal('3 / 3タグ');
  });

  it('status region は SSR container を再利用し loading / error / unavailable を排他的に表示すること', async () => {
    let rejectSearch: ((reason: Error) => void) | undefined;
    history.replaceState(history.state, '', '/search/?q=error&tag=architecture');
    const root = renderSearchPageFixture();
    root
      .querySelector<HTMLElement>('[data-search-page-root]')
      ?.setAttribute('initial-search-response-json', '{');
    const loading = root.querySelector<HTMLElement>('[data-search-page-loading]');
    const error = root.querySelector<HTMLElement>('[data-search-page-error]');
    const unavailable = root.querySelector<HTMLElement>('[data-search-page-unavailable]');
    enhanceWithRuntime(
      root,
      undefined,
      createSearchRuntime(
        () =>
          new Promise((_resolve, reject) => {
            rejectSearch = reject;
          }),
      ),
    );

    expect(loading?.hidden).to.equal(false);
    expect(error?.hidden).to.equal(true);
    expect(unavailable?.hidden).to.equal(true);
    expect(loading?.dataset['statusVariant']).to.equal('loading');
    expect(
      root.querySelector<HTMLElement>('[data-search-filter-list]')?.getAttribute('aria-busy'),
    ).to.equal('true');
    expect(
      root.querySelector<HTMLElement>('[data-filter-option][data-filter-tag="architecture"]')
        ?.dataset['state'],
    ).to.equal('selected');
    expect(
      root.querySelector<HTMLInputElement>(
        '[data-filter-option][data-filter-tag="architecture"] [data-search-tag-checkbox]',
      )?.disabled,
    ).to.equal(false);
    expect(
      root.querySelector(
        '[data-filter-option][data-filter-tag="architecture"] .filter-option-count',
      )?.textContent,
    ).to.equal('選択中・件数を計算中');
    rejectSearch?.(new Error('failure'));
    await Promise.resolve();
    await Promise.resolve();
    expect(loading?.hidden).to.equal(true);
    expect(error?.hidden).to.equal(false);
    expect(error?.textContent).to.equal(
      '検索の読み込みに失敗しました。検索語や条件を変更して再入力できます。',
    );
    expect(error?.dataset['statusVariant']).to.equal('error');
    expect(unavailable?.hidden).to.equal(true);
    expect(
      root.querySelector<HTMLElement>('[data-search-filter-list]')?.getAttribute('aria-busy'),
    ).to.equal('false');
    expect(
      root.querySelector<HTMLElement>('[data-filter-option][data-filter-tag="architecture"]')
        ?.dataset['state'],
    ).to.equal('selected');
    expect(
      root.querySelector<HTMLInputElement>(
        '[data-filter-option][data-filter-tag="architecture"] [data-search-tag-checkbox]',
      )?.disabled,
    ).to.equal(false);
    expect(
      root.querySelector(
        '[data-filter-option][data-filter-tag="architecture"] .filter-option-count',
      )?.textContent,
    ).to.equal('選択中・件数を取得できません');
    expect(
      root.querySelector<HTMLElement>('[data-filter-option][data-filter-tag="music"]')?.dataset[
        'state'
      ],
    ).to.equal('error');
    expect(
      root.querySelector<HTMLInputElement>(
        '[data-filter-option][data-filter-tag="music"] [data-search-tag-checkbox]',
      )?.disabled,
    ).to.equal(false);
    expect(
      root.querySelector('[data-filter-option][data-filter-tag="music"] .filter-option-count')
        ?.textContent,
    ).to.equal('件数を取得できません');
  });
});

describe('search-page semantic admission', () => {
  // 同じWebKit sessionの前後suiteへHistory API quotaを持ち越さず、全履歴assertionを実行する。
  const waitForHistoryBudget = async (milliseconds: number): Promise<void> => {
    if (navigator.userAgent.includes('WebKit') && !navigator.userAgent.includes('Chrome')) {
      await new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));
    }
  };
  beforeAll(() => waitForHistoryBudget(11_000), 20_000);
  afterAll(() => waitForHistoryBudget(11_000), 20_000);
  let ownedRoot: HTMLElement | null = null;
  beforeEach(async () => {
    await waitForHistoryBudget(500);
    history.replaceState(history.state, '', '/search/');
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    if (ownedRoot) releaseContentContext(ownedRoot);
    ownedRoot = null;
    cleanupSearchPageTest();
  });

  const mount = (search = createSearchRuntime()) => {
    const root = renderSearchPageFixture();
    ownedRoot = root;
    initializeContentContext(root);
    const controller = enhanceWithRuntime(root, undefined, search);
    const query = expectElement(
      root.querySelector<HTMLInputElement>('[data-search-query-input]'),
      'query',
    );
    const input = (value: string) => {
      query.value = value;
      query.dispatchEvent(new Event('input', { bubbles: true }));
    };
    const choice = (value: string) => {
      const menu = expectElement(
        root.querySelector<HTMLDetailsElement>('[data-search-choice-menu="sort"]'),
        'sort menu',
      );
      menu.open = true;
      const item = expectElement(
        menu.querySelector<HTMLButtonElement>(`[data-value="${value}"]`),
        'sort item',
      );
      item.click();
      return menu;
    };
    return { root, query, input, choice, controller };
  };

  it('matching SSR and successful conditions reuse result DOM without history or a live token', async () => {
    vi.useFakeTimers();
    const search = vi.fn(async () => staticResponse);
    const { root, query, input, choice } = mount(createSearchRuntime(search));
    const section = expectElement(
      root.querySelector('[data-search-page-results-section]'),
      'results',
    );
    const initial = section.firstChild;
    const push = vi.spyOn(history, 'pushState');
    const replace = vi.spyOn(history, 'replaceState');
    input('   ');
    expect(query.value).toBe('   ');
    expect(root.querySelector<HTMLButtonElement>('[data-search-query-clear]')?.hidden).toBe(false);
    const menu = choice('relevance');
    expect(menu.open).toBe(false);
    expect(document.activeElement).toBe(menu.querySelector('[data-static-choice-trigger]'));
    expect(section.firstChild).toBe(initial);
    expect(search).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    input('Router');
    await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
    expect(search).toHaveBeenCalledTimes(1);
    const result = section.firstChild;
    push.mockClear();
    replace.mockClear();
    beginNavigationIntent('navigation', location.href);
    input(' Router ');
    choice('relevance');
    await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
    expect(search).toHaveBeenCalledTimes(1);
    expect(section.firstChild).toBe(result);
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('same pending trim preserves deadline, request, clear state, and latest raw input after response', async () => {
    vi.useFakeTimers();
    let finish!: (response: ExploreSearchResponse) => void;
    let signal: AbortSignal | undefined;
    const search = vi.fn((_request, options) => {
      signal = options?.signal;
      return new Promise<ExploreSearchResponse>((resolve) => {
        finish = resolve;
      });
    });
    const { root, query, input, choice } = mount(createSearchRuntime(search));
    const replace = vi.spyOn(history, 'replaceState');
    input('Router');
    await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS - 10);
    input(' Router ');
    choice('relevance');
    await vi.advanceTimersByTimeAsync(10);
    expect(search).toHaveBeenCalledTimes(1);
    expect(replace).toHaveBeenCalledTimes(1);
    input('  Router  ');
    query.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    query.click();
    expect(signal?.aborted).toBe(false);
    finish(staticResponse);
    await vi.advanceTimersByTimeAsync(0);
    expect(query.value).toBe('  Router  ');
    expect(root.querySelector<HTMLButtonElement>('[data-search-query-clear]')?.hidden).toBe(false);
    await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it.each(['scheduled', 'running'] as const)(
    'expired %s job cannot reclaim ownership; the next same operation starts fresh without history',
    async (phase) => {
      vi.useFakeTimers();
      const resolvers: ((response: ExploreSearchResponse) => void)[] = [];
      const signals: AbortSignal[] = [];
      const search = vi.fn((_request, options) => {
        if (options?.signal) signals.push(options.signal);
        return new Promise<ExploreSearchResponse>((resolve) => resolvers.push(resolve));
      });
      const { root, input } = mount(createSearchRuntime(search));
      input('Router');
      if (phase === 'running') await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
      beginNavigationIntent('navigation', location.href);
      if (phase === 'scheduled') await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
      else {
        resolvers[0]?.(staticResponse);
        await vi.advanceTimersByTimeAsync(0);
        expect(root.querySelector('[data-search-page-results-section]')?.childNodes.length).toBe(0);
      }
      const replace = vi.spyOn(history, 'replaceState');
      input(' Router ');
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
      expect(search).toHaveBeenCalledTimes(phase === 'running' ? 2 : 1);
      expect(replace).not.toHaveBeenCalled();
      if (phase === 'running') expect(signals[0]?.aborted).toBe(true);
      resolvers.at(-1)?.(staticResponse);
      await vi.advanceTimersByTimeAsync(0);
      expect(
        root.querySelector('[data-search-page-results-section]')?.childNodes.length,
      ).toBeGreaterThan(0);
    },
  );

  it('sort error with ready counts retries the same choice without history', async () => {
    let fail!: (reason: Error) => void;
    const search = vi.fn(
      () =>
        new Promise<ExploreSearchResponse>((_resolve, reject) => {
          fail = reject;
        }),
    );
    const { root, choice } = mount(createSearchRuntime(search));
    choice('date-desc');
    expect(root.querySelector<HTMLElement>('[data-filter-option]')?.dataset['countStatus']).toBe(
      'ready',
    );
    fail(new Error('failed'));
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    expect(root.querySelector<HTMLElement>('[data-search-page-error]')?.hidden).toBe(false);
    const push = vi.spyOn(history, 'pushState');
    const menu = choice('date-desc');
    expect(search).toHaveBeenCalledTimes(2);
    expect(push).not.toHaveBeenCalled();
    expect(menu.open).toBe(false);
  });

  it('a stale URL rejects input and choice before history, hidden fields, or result changes', () => {
    const search = vi.fn(async () => staticResponse);
    const { root, input, choice } = mount(createSearchRuntime(search));
    const result = root.querySelector('[data-search-page-results-section]')?.firstChild;
    history.replaceState(history.state, '', '/notes/elsewhere/');
    const push = vi.spyOn(history, 'pushState');
    const replace = vi.spyOn(history, 'replaceState');
    input('stale');
    const menu = choice('date-desc');
    expect(menu.open).toBe(true);
    expect(root.querySelector<HTMLInputElement>('[data-search-sort-value]')?.value).toBe(
      'relevance',
    );
    expect(root.querySelector('[data-search-page-results-section]')?.firstChild).toBe(result);
    expect(search).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it.each(['results-section', 'result-count'] as const)(
    'rescues only focused removed descendants of %s synchronously with preventScroll',
    (region) => {
      const search = vi.fn(async () => staticResponse);
      const { root, query, input } = mount(createSearchRuntime(search));
      const section = expectElement(
        root.querySelector<HTMLElement>(`[data-search-page-${region}]`),
        'region',
      );
      const link = document.createElement('a');
      link.href = '#removed';
      link.textContent = 'old result';
      section.append(link);
      link.focus();
      const focus = vi.spyOn(query, 'focus');
      input('new');
      expect(link.isConnected).toBe(false);
      expect(document.activeElement).toBe(query);
      expect(focus).toHaveBeenCalledExactlyOnceWith({ preventScroll: true });
      expect(root.querySelector('[data-search-page-results-section]')?.childNodes.length).toBe(0);
      expect(root.querySelector('[data-search-page-result-count]')?.childNodes.length).toBe(0);
      expect(search).not.toHaveBeenCalled();
    },
  );

  it.each(['container', 'control', 'external', 'body'] as const)(
    'does not rescue retained %s focus',
    (target) => {
      const { root, query, input } = mount();
      const section = expectElement(
        root.querySelector<HTMLElement>('[data-search-page-results-section]'),
        'results',
      );
      section.tabIndex = -1;
      const external = document.createElement('button');
      document.body.append(external);
      const control = expectElement(
        root.querySelector<HTMLInputElement>('[data-search-filter-input]'),
        'filter',
      );
      const active =
        target === 'container'
          ? section
          : target === 'control'
            ? control
            : target === 'external'
              ? external
              : document.body;
      if (target === 'body')
        document.activeElement instanceof HTMLElement && document.activeElement.blur();
      else active.focus();
      const focus = vi.spyOn(query, 'focus');
      input('new');
      expect(document.activeElement).toBe(active);
      expect(focus).not.toHaveBeenCalled();
    },
  );

  it.each(['disabled', 'hidden', 'inert', 'display', 'visibility', 'opacity', 'detached'] as const)(
    'unavailable %s query skips rescue and continues immediate search',
    (unavailable) => {
      const search = vi.fn(async () => staticResponse);
      const { root, query, choice } = mount(createSearchRuntime(search));
      if (unavailable === 'disabled') query.disabled = true;
      if (unavailable === 'hidden') query.hidden = true;
      if (unavailable === 'inert') query.inert = true;
      if (unavailable === 'display') query.style.display = 'none';
      if (unavailable === 'visibility') query.style.visibility = 'hidden';
      if (unavailable === 'opacity') query.style.opacity = '0';
      if (unavailable === 'detached') query.remove();
      const section = expectElement(
        root.querySelector('[data-search-page-results-section]'),
        'results',
      );
      const link = document.createElement('a');
      link.href = '#removed';
      section.append(link);
      link.focus();
      const focus = vi.spyOn(query, 'focus');
      choice('date-desc');
      expect(search).toHaveBeenCalledTimes(1);
      expect(focus).not.toHaveBeenCalled();
    },
  );

  it.each(['search', 'navigation', 'dispose'] as const)(
    'rescue focus handler %s prevents every old continuation',
    async (action) => {
      vi.useFakeTimers();
      const finishers: ((response: ExploreSearchResponse) => void)[] = [];
      const search = vi.fn(
        (_request: Parameters<ReturnType<typeof createSearchRuntime>['search']>[0]) =>
          new Promise<ExploreSearchResponse>((resolve) => finishers.push(resolve)),
      );
      const { root, query, input, choice, controller } = mount(createSearchRuntime(search));
      const section = expectElement(
        root.querySelector('[data-search-page-results-section]'),
        'results',
      );
      const link = document.createElement('a');
      link.href = '#removed';
      section.append(link);
      link.focus();
      const external = document.createElement('button');
      document.body.append(external);
      query.addEventListener(
        'focus',
        () => {
          if (action === 'search') choice('date-desc');
          if (action === 'navigation') beginNavigationIntent('navigation', '/notes/next/');
          if (action === 'dispose') controller?.dispose();
          external.focus();
        },
        { once: true },
      );
      input('old');
      const loading = root.querySelector<HTMLElement>('[data-search-page-loading]');
      expect(loading?.hidden).toBe(action !== 'search');
      expect(document.activeElement).toBe(external);
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
      expect(search).toHaveBeenCalledTimes(action === 'search' ? 1 : 0);
      if (action === 'search') {
        expect(search.mock.calls[0]?.[0]).toMatchObject({ sort: 'date-desc' });
        finishers[0]?.(staticResponse);
        await vi.advanceTimersByTimeAsync(0);
        expect(loading?.hidden).toBe(true);
        // 新jobのfinally後も成功結果を同条件として再利用できる。
        choice('date-desc');
        expect(search).toHaveBeenCalledTimes(1);
      }
      expect(document.activeElement).toBe(
        action === 'search'
          ? root.querySelector('[data-search-choice-menu="sort"] [data-static-choice-trigger]')
          : external,
      );
    },
  );

  it.each(['success', 'zero', 'error'] as const)(
    'user focus after initial clear survives debounce and later %s response',
    async (outcome) => {
      vi.useFakeTimers();
      let finish!: (response: ExploreSearchResponse) => void;
      let fail!: (reason: Error) => void;
      const search = vi.fn(
        () =>
          new Promise<ExploreSearchResponse>((resolve, reject) => {
            finish = resolve;
            fail = reject;
          }),
      );
      const { root, query, input } = mount(createSearchRuntime(search));
      const section = expectElement(
        root.querySelector('[data-search-page-results-section]'),
        'results',
      );
      const link = document.createElement('a');
      link.href = '#removed';
      section.append(link);
      link.focus();
      const focus = vi.spyOn(query, 'focus');
      input('new');
      const filter = expectElement(
        root.querySelector<HTMLInputElement>('[data-search-filter-input]'),
        'filter',
      );
      filter.focus();
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
      expect(document.activeElement).toBe(filter);
      const canonicalPathname = normalizeSearchCanonicalPathname('/notes/new/');
      if (!canonicalPathname) throw new Error('Invalid fixture');
      if (outcome === 'error') fail(new Error('failed'));
      else
        finish(
          outcome === 'zero'
            ? staticResponse
            : {
                ...staticResponse,
                total: 1,
                items: [
                  {
                    canonicalPathname,
                    renderHref: buildSearchResultRenderHref({
                      canonicalPathname,
                      siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
                    }),
                    title: 'new',
                    description: 'new',
                    pathLabel: 'new',
                    tags: [],
                    date: { original: null, epochMs: null },
                    snippet: null,
                    reasons: [],
                  },
                ],
              },
        );
      await vi.advanceTimersByTimeAsync(0);
      expect(document.activeElement).toBe(filter);
      expect(focus).toHaveBeenCalledTimes(1);
    },
  );

  it('focus gained during removal skips rescue while a valid search continues', async () => {
    vi.useFakeTimers();
    const search = vi.fn(async () => staticResponse);
    const { root, query, input } = mount(createSearchRuntime(search));
    const external = document.createElement('button');
    document.body.append(external);
    const name = `search-focus-on-remove-${crypto.randomUUID()}`;
    customElements.define(
      name,
      class extends HTMLElement {
        disconnectedCallback() {
          external.focus();
        }
      },
    );
    const element = document.createElement(name);
    const link = document.createElement('a');
    link.href = '#removed';
    element.append(link);
    root.querySelector('[data-search-page-results-section]')?.append(element);
    link.focus();
    const focus = vi.spyOn(query, 'focus');
    input('new');
    expect(document.activeElement).toBe(external);
    expect(focus).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it.each(['navigation', 'dispose'] as const)(
    'second clear rescue %s prevents request start and loading projection',
    async (action) => {
      vi.useFakeTimers();
      const search = vi.fn(async () => staticResponse);
      const { root, query, input, controller } = mount(createSearchRuntime(search));
      input('new');
      const link = document.createElement('a');
      link.href = '#removed';
      root.querySelector('[data-search-page-results-section]')?.append(link);
      link.focus();
      query.addEventListener(
        'focus',
        () => {
          if (action === 'navigation') beginNavigationIntent('navigation', '/notes/next/');
          else controller?.dispose();
        },
        { once: true },
      );
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
      expect(search).not.toHaveBeenCalled();
      expect(root.querySelector<HTMLElement>('[data-search-page-loading]')?.hidden).toBe(true);
    },
  );

  it('old completion and finally cannot replace the pending job started by a rescue focus handler', async () => {
    vi.useFakeTimers();
    const finishers: ((response: ExploreSearchResponse) => void)[] = [];
    const signals: AbortSignal[] = [];
    const search = vi.fn((_request, options) => {
      if (options?.signal) signals.push(options.signal);
      return new Promise<ExploreSearchResponse>((resolve) => finishers.push(resolve));
    });
    const { root, query, input, choice } = mount(createSearchRuntime(search));
    choice('date-desc');
    expect(search).toHaveBeenCalledTimes(1);
    const link = document.createElement('a');
    link.href = '#removed';
    root.querySelector('[data-search-page-results-section]')?.append(link);
    link.focus();
    query.addEventListener('focus', () => choice('relevance'), { once: true });
    input('next');
    expect(search).toHaveBeenCalledTimes(2);
    expect(signals[0]?.aborted).toBe(true);
    finishers[0]?.(staticResponse);
    await vi.advanceTimersByTimeAsync(0);
    expect(root.querySelector('[data-search-page-results-section]')?.childNodes.length).toBe(0);
    expect(root.querySelector<HTMLElement>('[data-search-page-loading]')?.hidden).toBe(false);
    input(' next ');
    await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
    expect(search).toHaveBeenCalledTimes(2);
    expect(signals[1]?.aborted).toBe(false);
    finishers[1]?.(staticResponse);
    await vi.advanceTimersByTimeAsync(0);
    expect(query.value).toBe(' next ');
    expect(root.querySelector<HTMLElement>('[data-search-page-loading]')?.hidden).toBe(true);
  });

  it('a superseded caller cannot cancel a newer job created during synchronous form projection', async () => {
    vi.useFakeTimers();
    const search = vi.fn(
      async (_request: Parameters<ReturnType<typeof createSearchRuntime>['search']>[0]) =>
        staticResponse,
    );
    const { root, input, query } = mount(createSearchRuntime(search));
    const name = `search-reenter-projection-${crypto.randomUUID()}`;
    customElements.define(
      name,
      class extends HTMLElement {
        disconnectedCallback() {
          input('winner');
        }
      },
    );
    root.querySelector('[data-static-choice-current-label]')?.append(document.createElement(name));
    input('superseded');
    await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
    expect(search).toHaveBeenCalledTimes(1);
    expect(search.mock.calls[0]?.[0]).toMatchObject({ q: 'winner' });
    expect(query.value).toBe('winner');
  });

  it.each(['query-clear', 'selected-tag-remove'] as const)(
    '%s admits its candidate before projecting input changes',
    (control) => {
      const { root, query, input } = mount();
      input('original');
      const tag = expectElement(
        root.querySelector<HTMLInputElement>('[data-search-tag-checkbox][value="music"]'),
        'music',
      );
      if (control === 'selected-tag-remove') {
        tag.checked = true;
        tag.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const button = expectElement(
        root.querySelector<HTMLButtonElement>(`[data-search-${control}]`),
        'button',
      );
      button.addEventListener(
        'click',
        () => history.replaceState(history.state, '', '/notes/elsewhere/'),
        { capture: true },
      );
      button.click();
      expect(query.value).toBe('original');
      if (control === 'selected-tag-remove') expect(tag.checked).toBe(true);
    },
  );

  it.each(['search', 'navigation', 'dispose'] as const)(
    'response tag-focus %s stops old projection writes',
    async (action) => {
      vi.useFakeTimers();
      let finish!: (response: ExploreSearchResponse) => void;
      const search = vi.fn(
        () =>
          new Promise<ExploreSearchResponse>((resolve) => {
            finish = resolve;
          }),
      );
      const { root, query, input, controller } = mount(createSearchRuntime(search));
      input('original');
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
      const music = expectElement(
        root.querySelector<HTMLInputElement>('[data-search-tag-checkbox][value="music"]'),
        'music',
      );
      music.focus();
      const clear = expectElement(
        root.querySelector<HTMLButtonElement>('[data-search-query-clear]'),
        'clear',
      );
      const hidden = vi.spyOn(clear, 'hidden', 'set');
      let reentered = false;
      music.addEventListener(
        'focus',
        () => {
          reentered = true;
          if (action === 'search') input('winner');
          if (action === 'navigation') beginNavigationIntent('navigation', '/notes/next/');
          if (action === 'dispose') controller?.dispose();
          hidden.mockClear();
        },
        { once: true },
      );
      finish({
        ...staticResponse,
        tagCounts: { architecture: 1, music: 3 },
        allTagCounts: { architecture: 1, music: 3 },
      });
      await vi.advanceTimersByTimeAsync(0);
      expect(reentered).toBe(true);
      expect(hidden).not.toHaveBeenCalled();
      if (action === 'search') {
        expect(query.value).toBe('winner');
        await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
        expect(search).toHaveBeenCalledTimes(2);
      }
    },
  );

  it.each(['search', 'navigation', 'dispose'] as const)(
    'error tag-focus %s cannot overwrite newer status',
    async (action) => {
      vi.useFakeTimers();
      let fail!: (reason: Error) => void;
      const search = vi.fn(
        () =>
          new Promise<ExploreSearchResponse>((_resolve, reject) => {
            fail = reject;
          }),
      );
      const { root, input, choice, controller } = mount(createSearchRuntime(search));
      input('original');
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
      const music = expectElement(
        root.querySelector<HTMLInputElement>('[data-search-tag-checkbox][value="music"]'),
        'music',
      );
      const list = expectElement(root.querySelector('[data-search-filter-list]'), 'list');
      // 公開DOMの空白nodeも正規化時の再構成対象となる。
      list.append(document.createTextNode(' '));
      music.focus();
      let reentered = false;
      music.addEventListener(
        'focus',
        () => {
          reentered = true;
          if (action === 'search') choice('date-desc');
          if (action === 'navigation') beginNavigationIntent('navigation', '/notes/next/');
          if (action === 'dispose') controller?.dispose();
        },
        { once: true },
      );
      fail(new Error('failed'));
      await vi.advanceTimersByTimeAsync(0);
      expect(reentered).toBe(true);
      expect(root.querySelector<HTMLElement>('[data-search-page-error]')?.hidden).toBe(true);
      if (action === 'search') {
        expect(root.querySelector<HTMLElement>('[data-search-page-loading]')?.hidden).toBe(false);
        expect(search).toHaveBeenCalledTimes(2);
      }
    },
  );

  it.each(['before', 'after'] as const)(
    'a rejected %s-history operation retries with the matching URL and no duplicate history',
    async (phase) => {
      vi.useFakeTimers();
      const search = vi.fn(async () => staticResponse);
      const { input } = mount(createSearchRuntime(search));
      let intervene = true;
      const interrupt = () => {
        if (!intervene) return;
        intervene = false;
        beginNavigationIntent('navigation', '/notes/next/');
      };
      const stop = observeHistoryEntries(
        () => {
          if (phase === 'before') interrupt();
        },
        () => {
          if (phase === 'after') interrupt();
        },
      );
      try {
        input('retry');
      } finally {
        stop();
      }
      expect(new URL(location.href).searchParams.get('q')).toBe(
        phase === 'before' ? null : 'retry',
      );
      expect(search).not.toHaveBeenCalled();
      const replace = vi.spyOn(history, 'replaceState');
      input('retry');
      await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);
      expect(new URL(location.href).searchParams.get('q')).toBe('retry');
      expect(replace).toHaveBeenCalledTimes(phase === 'before' ? 1 : 0);
      expect(search).toHaveBeenCalledTimes(1);
    },
  );
});
