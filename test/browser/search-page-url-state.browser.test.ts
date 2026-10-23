import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  beginNavigationIntent,
  initializeContentContext,
  releaseContentContext,
} from '../../src/navigation/content-navigation-context.js';
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
  let ownedRoot: HTMLElement | null = null;
  beforeEach(() => history.replaceState(history.state, '', '/search/'));
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
});
