import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  beginNavigationIntent,
  initializeContentContext,
  adoptContentBinding,
  releaseContentContext,
} from '../../src/navigation/content-navigation-context.js';
import {
  adoptHistoryEntry,
  observeHistoryEntries,
  readAddress,
} from '../../src/navigation/history-entry.js';
import { userEvent } from 'vitest/browser';
import { renderSearchPageHtml } from '../../src/layouts/search-page-html.js';
import { enhanceSearchPage } from '../../src/client/post-hydrate/search-page-enhancer.js';
import type { SearchPageController } from '../../src/client/post-hydrate/search-page-controller.js';
import type { SearchCore } from '../../src/search/search-core.js';
import type { ExploreSearchResponse, SearchState } from '../../shared/search/search-types.js';
import { DEFAULT_SITE_URL_CONTEXT } from '../../shared/site/site-url-context.js';
import { normalizeSearchCanonicalPathname } from '../../shared/search/document-url.js';
import { buildSearchResultRenderHref } from '../../src/search/normalize-search-result-url.js';

const empty: ExploreSearchResponse = {
  mode: 'explore',
  items: [],
  total: 0,
  rankingProfileId: 'rouault-search-v3',
  tagCounts: { A: 1, B: 1 },
  allTagCounts: { A: 1, B: 1 },
  diagnostics: { activeSources: [], degraded: false, failures: [], issues: [] },
};
const result = (title: string, path: string): ExploreSearchResponse => {
  const canonicalPathname = normalizeSearchCanonicalPathname(path);
  if (!canonicalPathname) throw new Error('Invalid fixture');
  return {
    ...empty,
    total: 1,
    items: [
      {
        canonicalPathname,
        renderHref: buildSearchResultRenderHref({
          canonicalPathname,
          siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
        }),
        pathLabel: 'notes',
        title,
        description: '説明',
        tags: ['A'],
        date: { original: '2026-01-01', epochMs: Date.parse('2026-01-01') },
        snippet: null,
        reasons: [],
      },
    ],
  };
};
const controllers: SearchPageController[] = [];
let navigationRoot: HTMLElement | null = null;
let stopHistory: (() => void) | null = null;
afterEach(() => {
  stopHistory?.();
  stopHistory = null;
  for (const controller of controllers.splice(0)) controller.dispose();
  if (navigationRoot) releaseContentContext(navigationRoot);
  navigationRoot = null;
  document.body.replaceChildren();
  history.replaceState(history.state, '', '/');
});

const mount = (kind: 'search' | 'tag' = 'search') => {
  const state: SearchState = {
    q: '',
    tags: kind === 'tag' ? ['A'] : [],
    tagMode: 'or',
    sort: 'relevance',
  };
  history.replaceState(history.state, '', kind === 'tag' ? '/tags/A/' : '/search/');
  const host = document.createElement('div');
  host.innerHTML = renderSearchPageHtml({
    surface:
      kind === 'tag'
        ? { kind: 'tag', tag: 'A' }
        : {
            kind: 'search',
            baseline: {
              tags: [{ label: 'A', href: '/tags/A/', noteCount: 1 }],
              corporaHref: '/corpora/',
            },
          },
    initialState: state,
    initialResponse:
      kind === 'tag'
        ? {
            ...result('元Aノート', '/notes/a/'),
            items: result('元Aノート', '/notes/a/').items.map(
              ({ renderHref: _renderHref, ...item }) => item,
            ),
          }
        : empty,
    siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
  });
  document.body.append(host);
  const page = host.querySelector<HTMLElement>('[data-search-page-root]');
  const baseline = host.querySelector<HTMLElement>('[data-search-page-baseline]');
  const form = host.querySelector<HTMLFormElement>('[data-search-page-form]');
  const input = host.querySelector<HTMLInputElement>('[data-search-query-input]');
  if (!page || !baseline || !form || !input) throw new Error('Missing SSR surface');
  return { host, page, baseline, form, input };
};
const enhance = (host: HTMLElement, core: SearchCore | null, bootstrapReady = core !== null) => {
  const controller = enhanceSearchPage(host, undefined, {
    siteUrlContextProvider: () => DEFAULT_SITE_URL_CONTEXT,
    bootstrapProvider: () =>
      core && bootstrapReady
        ? { status: 'ready', searchCore: core, isInternalDocumentPathname: () => true }
        : { status: 'unavailable', reason: 'search-runtime-unavailable' },
    searchRuntimeProvider: () => core,
  });
  if (!controller) throw new Error('Missing controller');
  controllers.push(controller);
  return controller;
};
const query = (input: HTMLInputElement, value: string) => {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

describe('Searchのfeature token再照合', () => {
  it.each(['before', 'after'] as const)(
    '%s observer再入後に旧search/focusを開始しない',
    (phase) => {
      const { host, page } = mount('tag');
      navigationRoot = host;
      initializeContentContext(host);
      adoptHistoryEntry();
      adoptContentBinding(readAddress());
      const search = vi.fn(async () => empty);
      enhance(host, { search });
      const focus = document.createElement('button');
      focus.textContent = '新intentのfocus';
      document.body.append(focus);
      const reenter = (): void => {
        beginNavigationIntent('navigation', '/notes/next/');
        focus.focus({ preventScroll: true });
      };
      const length = history.length;
      const url = readAddress();
      stopHistory = observeHistoryEntries(
        () => {
          if (phase === 'before') reenter();
        },
        () => {
          if (phase === 'after') reenter();
        },
      );
      const item = page.querySelector<HTMLButtonElement>(
        '[data-search-choice-menu="sort"] [data-static-choice-item][data-value="date-desc"]',
      );
      if (!item) throw new Error('sort item');
      item.click();
      expect(history.length).toBe(length + (phase === 'after' ? 1 : 0));
      expect(readAddress()).toBe(phase === 'before' ? url : '/search/?tag=A&sort=date-desc');
      expect(search).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(focus);
    },
  );
  it('同epoch/同addressでも新intent後の旧Search結果を採用しない', async () => {
    const { host, input, page } = mount('tag');
    navigationRoot = host;
    initializeContentContext(host);
    adoptHistoryEntry();
    adoptContentBinding(readAddress());
    let release!: (value: ExploreSearchResponse) => void;
    const pending = new Promise<ExploreSearchResponse>((resolve) => {
      release = resolve;
    });
    const search = vi.fn(() => pending);
    enhance(host, { search });
    query(input, 'old');
    await vi.waitFor(() => expect(search).toHaveBeenCalledTimes(1));
    beginNavigationIntent('navigation', '/notes/next/');
    release(result('旧intentの結果', '/notes/old/'));
    await pending;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    expect(page.querySelector('[data-search-page-results-section]')?.textContent).not.toContain(
      '旧intentの結果',
    );
  });
});

describe('SSR baseline / capability / request outcome', () => {
  it('baseline linkにfocusがあるready移行は操作可能なqueryへfocusを引き継ぐ', () => {
    const { host, baseline, input } = mount();
    baseline.querySelector<HTMLAnchorElement>('a')?.focus();
    enhance(host, { search: async () => empty });
    expect(document.activeElement).toBe(input);
  });

  it.each(['runtime-null', 'bootstrap-null', 'throws', 'handler-missing'] as const)(
    '%s初期化不能時は操作面を解禁しない',
    (failure) => {
      const { host, page, form, baseline } = mount('tag');
      const search = vi.fn(async () => empty);
      const core = { search };
      if (failure === 'handler-missing') form.remove();
      const controller = enhanceSearchPage(host, undefined, {
        siteUrlContextProvider: () => DEFAULT_SITE_URL_CONTEXT,
        bootstrapProvider: () => {
          if (failure === 'throws') throw new Error('Initialization failed');
          return failure === 'bootstrap-null'
            ? null
            : { status: 'ready', searchCore: core, isInternalDocumentPathname: () => true };
        },
        searchRuntimeProvider: () => (failure === 'runtime-null' ? null : core),
      });
      if (controller) controllers.push(controller);
      expect(page.dataset['searchPageCapability']).toBe('unavailable');
      expect(baseline.hidden).toBe(false);
      expect(form.hidden).toBe(true);
      expect(search).not.toHaveBeenCalled();
    },
  );

  it.each(['search', 'tag'] as const)(
    '%sはprobeなしでreadyとなりvalid SSR adoptionでは検索を省略する',
    (kind) => {
      const { host, page, baseline, form } = mount(kind);
      expect(page.dataset['searchPageCapability']).toBe('static');
      expect(form.hidden).toBe(true);
      expect(baseline.hidden).toBe(false);
      const search = vi.fn(async () => empty);
      enhance(host, { search });
      expect(search).not.toHaveBeenCalled();
      expect(page.dataset['searchPageCapability']).toBe('ready');
      expect(form.hidden).toBe(false);
      expect(baseline.hidden).toBe(true);
      expect(new FormData(form).get('tagMode')).toBe('or');
      expect(new FormData(form).get('sort')).toBe('relevance');
    },
  );

  it.each(['search', 'tag'] as const)(
    '%sのunavailableはbaselineを保持しdynamic controlsをfocus / accessibilityから退避する',
    async (kind) => {
      const { host, page, baseline, form } = mount(kind);
      const html = baseline.innerHTML;
      enhance(host, null);
      expect(page.dataset['searchPageCapability']).toBe('unavailable');
      expect(form.hidden).toBe(true);
      for (const control of form.querySelectorAll<HTMLElement>(
        'input:not([type="hidden"]), button, summary',
      )) {
        expect(control.getClientRects().length).toBe(0);
        control.focus();
        expect(document.activeElement).not.toBe(control);
      }
      for (const path of [
        '/search/?q=other&tag=B&tagMode=and&sort=date-desc',
        '/tags/B/',
        '/tags/A/',
      ]) {
        history.pushState(history.state, '', path);
        window.dispatchEvent(new PopStateEvent('popstate'));
        expect(baseline.innerHTML).toBe(html);
        expect(baseline.hidden).toBe(false);
      }
      expect(new FormData(form).get('sort')).toBe('relevance');
      for (const input of form.querySelectorAll<HTMLInputElement>('input[type="hidden"]'))
        expect(input.disabled).toBe(false);
      const link = baseline.querySelector<HTMLAnchorElement>('a');
      if (!link) throw new Error('Missing static navigation');
      link.focus();
      expect(document.activeElement).toBe(link);
      // native Tabがリンクを辿る設定はbrowserに依存するが、検索formへは到達させない。
      await userEvent.tab();
      expect(form.contains(document.activeElement)).toBe(false);
    },
  );

  it.each(['lexical', 'catalog', 'store', 'zero', 'empty'] as const)(
    '%sのresponseをreadyのまま受け付ける',
    async (outcome) => {
      const { host, page, input, form } = mount();
      const response: ExploreSearchResponse =
        outcome === 'zero' || outcome === 'empty'
          ? {
              ...empty,
              diagnostics: {
                ...empty.diagnostics,
                activeSources: outcome === 'zero' ? ['lexical'] : [],
              },
            }
          : {
              ...result('現在結果', '/notes/current/'),
              diagnostics: {
                activeSources: [outcome === 'catalog' ? 'catalog' : 'lexical'],
                degraded: outcome !== 'lexical',
                failures: outcome === 'catalog' ? ['lexical-load-failed'] : [],
                issues:
                  outcome === 'store'
                    ? [
                        {
                          code: 'lexical-snippet-unavailable',
                          severity: 'warn',
                          stage: 'fetch',
                          source: 'lexical',
                          count: 1,
                        },
                      ]
                    : [],
              },
            };
      const search = vi.fn(async () => response);
      enhance(host, { search });
      query(input, outcome === 'empty' ? '' : 'next');
      await vi.waitFor(() => expect(search).toHaveBeenCalledTimes(1));
      await vi.waitFor(() =>
        expect(host.querySelector('[data-search-page-result-count]')?.textContent).toContain(
          outcome === 'zero' || outcome === 'empty' ? '0 ' : '1 ',
        ),
      );
      expect(page.dataset['searchPageCapability']).toBe('ready');
      expect(form.hidden).toBe(false);
      expect(host.querySelector<HTMLElement>('[data-search-page-error]')?.hidden).toBe(true);
    },
  );

  it.each(['resolved', 'rejected'] as const)(
    '%s全source失敗はrequest errorで同じcoreへ次queryを送れる',
    async (failure) => {
      const { host, page, input, baseline, form } = mount('tag');
      const html = baseline.innerHTML;
      let calls = 0;
      const search = vi.fn(async () => {
        calls += 1;
        if (calls === 2) {
          if (failure === 'rejected') throw new Error('Request failed');
          return {
            ...empty,
            diagnostics: {
              ...empty.diagnostics,
              degraded: true,
              failures: ['all-sources-failed' as const],
            },
          };
        }
        return result('現在結果', '/notes/current/');
      });
      const core = { search };
      const controller = enhance(host, core);
      query(input, 'success');
      await vi.waitFor(() =>
        expect(host.querySelector('[data-search-page-results-section]')?.textContent).toContain(
          '現在結果',
        ),
      );
      query(input, 'fail');
      expect(host.querySelector('[data-search-page-results-section]')?.textContent).toBe('');
      await vi.waitFor(() =>
        expect(host.querySelector<HTMLElement>('[data-search-page-error]')?.hidden).toBe(false),
      );
      expect(host.querySelector('[data-search-page-result-count]')?.textContent).toBe('');
      expect(page.dataset['searchPageCapability']).toBe('ready');
      expect(form.hidden).toBe(false);
      expect(controller.state?.kind === 'ready' && controller.state.searchRuntime).toBe(core);
      expect(baseline.innerHTML).toBe(html);
      query(input, 'recovered');
      await vi.waitFor(() => expect(search).toHaveBeenCalledTimes(3));
      await vi.waitFor(() =>
        expect(host.querySelector<HTMLElement>('[data-search-page-error]')?.hidden).toBe(true),
      );
      controller.dispose();
      expect(baseline.hidden).toBe(false);
      expect(baseline.innerHTML).toBe(html);
      expect(baseline.textContent).toContain('現在のURLの検索条件は適用していません');
      expect(host.querySelector<HTMLElement>('[data-search-page-dynamic-hero]')?.hidden).toBe(true);
    },
  );

  it.each(['search', 'tag'] as const)(
    '%sのstate-only navigationとBack / Forwardはbaseline identityを変更しない',
    async (kind) => {
      const { host, baseline, input, page } = mount(kind);
      const html = baseline.innerHTML;
      const search = vi.fn(async () => result('現在結果', '/notes/current/'));
      const controller = enhance(host, { search });
      query(input, 'current');
      await vi.waitFor(() => expect(search).toHaveBeenCalledTimes(1));
      const current = location.href;
      history.pushState(history.state, '', '/tags/B/');
      window.dispatchEvent(new PopStateEvent('popstate'));
      expect(baseline.innerHTML).toBe(html);
      history.back();
      await vi.waitFor(() => expect(location.href).toBe(current));
      history.forward();
      await vi.waitFor(() => expect(location.pathname).toBe('/tags/B/'));
      expect(baseline.innerHTML).toBe(html);
      controller.dispose();
      expect(baseline.hidden).toBe(false);
      expect(page.dataset['searchPageSurface']).toBe(kind);
    },
  );

  it('stale / Abort / dispose後completionは新documentのbaselineへcommitしない', async () => {
    const first = mount('search');
    const responses: ((response: ExploreSearchResponse) => void)[] = [];
    const signals: AbortSignal[] = [];
    const core: SearchCore = {
      search: (_request, options) =>
        new Promise((resolve) => {
          responses.push(resolve);
          if (options?.signal) signals.push(options.signal);
        }),
    };
    const controller = enhance(first.host, core);
    query(first.input, 'first');
    await vi.waitFor(() => expect(responses).toHaveLength(1));
    query(first.input, 'second');
    await vi.waitFor(() => expect(responses).toHaveLength(2));
    responses[0]?.(result('stale', '/notes/stale/'));
    await Promise.resolve();
    expect(first.host.querySelector('[data-search-page-results-section]')?.textContent).toBe('');
    controller.dispose();
    first.host.remove();
    const second = mount('tag');
    const html = second.baseline.innerHTML;
    enhance(second.host, null);
    responses[1]?.(result('disposed', '/notes/disposed/'));
    await Promise.resolve();
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    expect(second.baseline.innerHTML).toBe(html);
    expect(second.page.dataset['searchPageSurface']).toBe('tag');
    expect(second.page.dataset['searchPageBaselineTag']).toBe('A');
    expect(second.page.dataset['searchPageCapability']).toBe('unavailable');
  });
});
