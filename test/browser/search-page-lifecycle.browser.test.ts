import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DEFAULT_SITE_URL_CONTEXT } from '../../shared/site/site-url-context.js';
import { normalizeSearchCanonicalPathname } from '../../shared/search/document-url.js';
import type { ExploreSearchResponse } from '../../shared/search/search-types.js';
import { buildSearchResultRenderHref } from '../../src/search/normalize-search-result-url.js';

import {
  appendSiteUrlContextMeta,
  createSearchPageTestContext,
  createSearchRuntime,
  type SearchPageDisposable,
  expectElement,
  renderSearchPageFixture,
  setSearchFixtureUrl,
  staticResponse,
} from './helpers/search-page-test-fixture.js';

const { cleanupSearchPageTest, enhanceOwnedSearchPage, enhanceWithRuntime } =
  createSearchPageTestContext();

describe('search-page lifecycle', () => {
  beforeEach(() => {
    document.head.replaceChildren();
    appendSiteUrlContextMeta();
  });

  afterEach(() => {
    cleanupSearchPageTest();
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
    expect(location.search).to.contain('q=Router');

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

  it('cleanup 中に例外が発生しても全 controller を dispose して registry を空にすること', () => {
    const calls: string[] = [];
    let restored = false;
    const failure = new Error('expected cleanup failure');
    const owned = new Set<SearchPageDisposable>([
      {
        dispose: () => {
          calls.push('first');
          throw failure;
        },
      },
      {
        dispose: () => {
          calls.push('second');
        },
      },
    ]);

    expect(() =>
      cleanupSearchPageTest(owned, () => {
        restored = true;
      }),
    ).toThrow(failure);
    expect(calls).to.deep.equal(['first', 'second']);
    expect(owned.size).to.equal(0);
    expect(restored).to.equal(true);
  });

  it('dispose 後の global event は旧 controller を更新せず、後継 controller だけが処理すること', () => {
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
    const choiceMenu = expectElement(
      root.querySelector<HTMLDetailsElement>('[data-search-choice-menu="tag-mode"]'),
      'choice menu',
    );
    const first = enhanceWithRuntime(root, undefined, runtime);

    first?.dispose();
    choiceMenu.open = true;
    const hrefBeforePointerdown = location.href;
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(location.href).to.equal(hrefBeforePointerdown);
    history.pushState(history.state, '', '/search/?q=disposed');
    const hrefBeforePopstate = location.href;
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(location.href).to.equal(hrefBeforePopstate);

    expect(choiceMenu.open).to.equal(true);
    expect(query.value).to.equal('');
    expect(requests).to.deep.equal([]);

    setSearchFixtureUrl();
    choiceMenu.open = false;
    const second = enhanceWithRuntime(root, undefined, runtime);
    expect(second).not.to.equal(first);
    choiceMenu.open = true;
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    history.pushState(history.state, '', '/search/?q=active');
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(choiceMenu.open).to.equal(false);
    expect(query.value).to.equal('active');
    expect(requests).to.deep.equal([
      { mode: 'explore', q: 'active', tags: [], tagMode: 'or', sort: 'relevance' },
    ]);
  });

  it('dispose は pending 検索を abort し、遅い完了を旧 DOM へ反映せず後継を保つこと', async () => {
    let resolvePending: ((response: ExploreSearchResponse) => void) | undefined;
    let pendingSignal: AbortSignal | undefined;
    const pendingRuntime = createSearchRuntime(
      (_request, options) =>
        new Promise((resolve) => {
          resolvePending = resolve;
          pendingSignal = options?.signal;
        }),
    );
    history.replaceState(history.state, '', '/search/?q=pending');
    const oldRoot = renderSearchPageFixture();
    oldRoot
      .querySelector<HTMLElement>('[data-search-page-root]')
      ?.setAttribute('initial-search-response-json', '{');
    const oldController = enhanceWithRuntime(oldRoot, undefined, pendingRuntime);
    expect(pendingSignal).not.to.equal(undefined);

    oldController?.dispose();
    expect(pendingSignal?.aborted).to.equal(true);
    expect(oldRoot.querySelector('[data-search-page-result-count]')?.textContent).to.equal('');

    oldRoot.remove();
    setSearchFixtureUrl();
    const successorRequests: unknown[] = [];
    const successorRuntime = createSearchRuntime(async (request) => {
      successorRequests.push(request);
      return staticResponse;
    });
    const successorRoot = renderSearchPageFixture();
    enhanceWithRuntime(successorRoot, undefined, successorRuntime);
    history.pushState(history.state, '', '/search/?q=successor');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(successorRequests).to.have.length(1);

    resolvePending?.(staticResponse);
    await Promise.resolve();
    await Promise.resolve();

    expect(oldRoot.querySelector('[data-search-page-result-count]')?.textContent).to.equal('');
    expect(
      successorRoot.querySelector<HTMLInputElement>('[data-search-query-input]')?.value,
    ).to.equal('successor');
    expect(successorRequests).to.deep.equal([
      { mode: 'explore', q: 'successor', tags: [], tagMode: 'or', sort: 'relevance' },
    ]);
  });

  it('bootstrap不成立はreadyにせずbaselineを保持すること', () => {
    const root = renderSearchPageFixture();
    const bootstrapState = {
      status: 'unavailable' as const,
      reason: 'search-runtime-unavailable' as const,
    };
    const searchRuntime = null;
    const controller = enhanceOwnedSearchPage(root, undefined, {
      siteUrlContextProvider: () => DEFAULT_SITE_URL_CONTEXT,
      bootstrapProvider: () => bootstrapState,
      searchRuntimeProvider: () => searchRuntime,
    });

    expect(controller?.state?.kind).to.equal('bootstrap-unavailable');
    expect(root.querySelector<HTMLFormElement>('[data-search-page-form]')?.hidden).to.equal(true);
  });

  it('siteUrlContext provider が null の場合は SSR unavailable container を再利用して dynamic controls を disabled にすること', () => {
    const root = renderSearchPageFixture();
    const page = root.querySelector<HTMLElement>('[data-search-page-root]');
    const unavailableBefore = root.querySelector<HTMLElement>('[data-search-page-unavailable]');
    const controller = enhanceOwnedSearchPage(root, undefined, {
      siteUrlContextProvider: () => null,
    });
    const unavailableAfter = root.querySelector<HTMLElement>('[data-search-page-unavailable]');

    expect(controller?.state?.kind).to.equal('site-url-context-unavailable');
    expect(unavailableAfter).to.equal(unavailableBefore);
    expect(root.querySelectorAll('[data-search-page-unavailable]')).to.have.length(1);
    expect(unavailableAfter?.hidden).to.equal(false);
    expect(unavailableAfter?.textContent).to.equal(
      'サイトURL情報を読み込めないため、検索ページの動的機能を利用できません。通常リンクはそのまま利用できます。',
    );
    expect(page?.querySelector<HTMLInputElement>('[data-search-query-input]')?.disabled).to.equal(
      true,
    );
    expect(
      page
        ?.querySelector<HTMLElement>('[data-search-choice-menu="sort"] summary')
        ?.getAttribute('aria-disabled'),
    ).to.equal('true');
    expect(page?.querySelector<HTMLInputElement>('[data-search-sort-value]')?.disabled).to.equal(
      false,
    );
  });

  it('siteUrlContext provider が null の場合は bootstrap と search runtime を参照しないこと', () => {
    const root = renderSearchPageFixture();
    let bootstrapReads = 0;
    let runtimeReads = 0;
    const controller = enhanceOwnedSearchPage(root, undefined, {
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

    enhanceOwnedSearchPage(root, undefined, {
      siteUrlContextProvider: () => ({ siteOrigin: 'https://example.com', basePath: '/base' }),
      bootstrapProvider: () => ({
        status: 'ready',
        searchCore: runtime,
        isInternalDocumentPathname: () => true,
      }),
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
    const controller = enhanceOwnedSearchPage(root, undefined, {
      siteUrlContextProvider: () => DEFAULT_SITE_URL_CONTEXT,
      bootstrapProvider: () => bootstrapState,
      searchRuntimeProvider: () => null,
    });

    expect(controller?.state?.kind).to.equal('bootstrap-unavailable');
    expect(root.querySelector<HTMLInputElement>('[data-search-query-input]')?.disabled).to.equal(
      true,
    );
    expect(root.querySelector<HTMLElement>('[data-search-page-unavailable]')?.hidden).to.equal(
      false,
    );
    for (const selector of [
      '[data-search-query-input]',
      '[data-search-query-clear]',
      '[data-search-tag-checkbox]',
    ]) {
      expect(root.querySelector<HTMLInputElement>(selector)?.disabled, selector).to.equal(true);
    }
    expect(root.querySelector<HTMLInputElement>('[data-search-tag-mode-value]')?.disabled).to.equal(
      false,
    );
    expect(root.querySelector<HTMLInputElement>('[data-search-sort-value]')?.disabled).to.equal(
      false,
    );
    expect(
      root.querySelector<HTMLElement>('[data-search-choice-menu="tag-mode"] summary')?.dataset[
        'disabled'
      ],
    ).to.equal('true');
    expect(
      root.querySelector<HTMLFormElement>('[data-search-page-form]')?.hasAttribute('disabled'),
    ).to.equal(false);
    expect(root.querySelector<HTMLInputElement>('[data-search-filter-input]')?.disabled).to.equal(
      true,
    );
    expect(root.querySelector('[data-search-result-fixture]')).not.to.equal(null);

    document.body.replaceChildren();
    const invalidRoot = renderSearchPageFixture();
    invalidRoot
      .querySelector<HTMLElement>('[data-search-page-root]')
      ?.setAttribute('initial-search-response-json', '{');
    const invalidController = enhanceOwnedSearchPage(invalidRoot, undefined, {
      siteUrlContextProvider: () => DEFAULT_SITE_URL_CONTEXT,
      bootstrapProvider: () => bootstrapState,
      searchRuntimeProvider: () => null,
    });
    expect(invalidController?.state?.kind).to.equal('bootstrap-unavailable');
    expect(invalidRoot.querySelector('[data-search-result-fixture]')).not.to.equal(null);
    expect(invalidRoot.querySelector<HTMLElement>('[data-search-page-baseline]')?.hidden).to.equal(
      false,
    );
  });

  it('bootstrap unavailable 中の popstate はhidden formを復元し、元SSR baselineを保持すること', () => {
    const root = renderSearchPageFixture();
    const controller = enhanceOwnedSearchPage(root, undefined, {
      siteUrlContextProvider: () => DEFAULT_SITE_URL_CONTEXT,
      bootstrapProvider: () => ({
        status: 'unavailable',
        reason: 'search-runtime-unavailable',
      }),
      searchRuntimeProvider: () => null,
    });

    expect(controller?.state?.kind).to.equal('bootstrap-unavailable');
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
    expect(root.querySelector('[data-search-result-fixture]')).not.to.equal(null);
    expect(root.querySelector<HTMLElement>('[data-search-page-baseline]')?.hidden).to.equal(false);
  });

  it('bootstrap unavailable 中の同一 canonical state popstate は SSR results を維持すること', () => {
    const root = renderSearchPageFixture();
    const controller = enhanceOwnedSearchPage(root, undefined, {
      siteUrlContextProvider: () => DEFAULT_SITE_URL_CONTEXT,
      bootstrapProvider: () => ({
        status: 'unavailable',
        reason: 'search-runtime-unavailable',
      }),
      searchRuntimeProvider: () => null,
    });

    history.pushState(history.state, '', '/search/');
    window.dispatchEvent(new PopStateEvent('popstate'));

    expect(controller?.state?.kind).to.equal('bootstrap-unavailable');
    expect(root.querySelector('[data-search-result-fixture]')).not.to.equal(null);
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

    expect(root.querySelector<HTMLInputElement>('[data-search-query-input]')?.value).to.equal(
      'router',
    );
    expect(requests).to.deep.equal([
      { mode: 'explore', q: 'router', tags: ['music'], tagMode: 'or', sort: 'relevance' },
    ]);
  });

  it('client-side results は textContent と mark element で描画し card link 契約を維持すること', async () => {
    const canonicalPathname = normalizeSearchCanonicalPathname('/notes/xss/');
    if (canonicalPathname === null) {
      throw new Error('Expected valid canonical pathname fixture.');
    }
    const response: ExploreSearchResponse = {
      ...staticResponse,
      total: 1,
      items: [
        {
          canonicalPathname,
          renderHref: buildSearchResultRenderHref({
            canonicalPathname,
            siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
          }),
          pathLabel: '<img src=x onerror=alert(1)>',
          title: '<script>window.__searchXss = true</script>',
          description: 'fallback',
          date: { epochMs: 0, original: '<b>2026-01-01</b>' },
          tags: ['security'],
          snippet: {
            segments: [
              { text: '<img src=x onerror=alert(1)>', matched: true },
              { text: '<script>alert(1)</script>', matched: false },
            ],
          },
          reasons: [],
        },
      ],
      tagCounts: { security: 1 },
      allTagCounts: { security: 1 },
    };
    history.replaceState(history.state, '', '/search/?q=xss');
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

    const card = expectElement(
      root.querySelector<HTMLElement>('[data-search-result-card]'),
      'result card',
    );
    const link = expectElement(card.querySelector<HTMLAnchorElement>('a'), 'result link');
    expect(link.dataset['linkKind']).to.equal('internal-document');
    expect(link.dataset['linkSurface']).to.equal('card');
    expect(link.querySelector('.result-title')?.textContent).to.equal(
      '<script>window.__searchXss = true</script>',
    );
    expect(link.querySelector('script')).to.equal(null);
    expect(link.querySelector('img')).to.equal(null);
    expect(link.querySelector('mark')?.textContent).to.equal('<img src=x onerror=alert(1)>');
    expect(root.querySelector('[data-search-page-result-count]')?.textContent).to.equal(
      '1 件の結果',
    );
  });

  it('client-side empty state は文言とwrapperを保ち装飾用の円要素を生成しないこと', async () => {
    history.replaceState(history.state, '', '/search/?q=missing');
    const root = renderSearchPageFixture();
    root
      .querySelector<HTMLElement>('[data-search-page-root]')
      ?.setAttribute('initial-search-response-json', '{');
    enhanceWithRuntime(
      root,
      undefined,
      createSearchRuntime(async () => staticResponse),
    );

    await expect.poll(() => root.querySelector('[data-search-empty-state]')).not.toBeNull();
    const empty = expectElement(
      root.querySelector<HTMLElement>('[data-search-empty-state]'),
      'search empty state',
    );
    expect(empty.querySelector('.empty-hint__message')?.getAttribute('data-announce')).to.equal(
      'off',
    );
    expect(empty.querySelector('.empty-hint__heading')?.textContent).to.equal(
      '一致するメモが見つかりません',
    );
    expect(empty.querySelector('.empty-hint__description')?.textContent).to.equal(
      '検索語を変えるか、タグの組み合わせを見直してください。',
    );
    expect(empty.querySelector('.empty-hint__actions')?.hasAttribute('hidden')).to.equal(true);
    expect(empty.querySelector('.empty-hint__icon')).to.equal(null);
  });

  it('bootstrap unavailable 中も tag filter input / clear は URL と results を変えないこと', () => {
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
    const initialUrl = location.href;
    const initialResults = root.querySelector('[data-search-page-results-section]')?.innerHTML;
    const filter = expectElement(
      root.querySelector<HTMLInputElement>('[data-search-filter-input]'),
      'filter',
    );
    filter.value = 'music';
    filter.dispatchEvent(new Event('input', { bubbles: true }));
    expect(location.href).to.equal(initialUrl);
    expect(root.querySelector('[data-search-page-results-section]')?.innerHTML).to.equal(
      initialResults,
    );
    expect(root.querySelector<HTMLFormElement>('[data-search-page-form]')?.hidden).to.equal(true);
    expect(
      root.querySelector<HTMLInputElement>('[data-search-tag-checkbox][value="architecture"]')
        ?.disabled,
    ).to.equal(true);
    expect(
      root.querySelector<HTMLButtonElement>('[data-search-selected-tag-remove="architecture"]')
        ?.disabled,
    ).to.equal(true);
    root.querySelector<HTMLButtonElement>('[data-search-filter-clear]')?.click();
    expect(location.href).to.equal(initialUrl);
    expect(root.querySelector('[data-search-page-results-section]')?.innerHTML).to.equal(
      initialResults,
    );
    expect(
      root.querySelector<HTMLInputElement>('[data-search-tag-checkbox][value="architecture"]')
        ?.disabled,
    ).to.equal(true);
    expect(
      root.querySelector<HTMLButtonElement>('[data-search-selected-tag-remove="architecture"]')
        ?.disabled,
    ).to.equal(true);
  });
});
