import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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
