import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { userEvent } from 'vitest/browser';
import { fetchCssText } from './helpers/fetch-css-text.js';

import { DEFAULT_SITE_URL_CONTEXT } from '../../shared/site/site-url-context.js';
import { normalizeSearchCanonicalPathname } from '../../shared/search/document-url.js';
import type {
  ExploreSearchResponse,
  SearchState,
  StaticExploreSearchResponse,
} from '../../shared/search/search-types.js';
import { renderSearchPageHtml } from '../../src/layouts/search-page-html.js';
import { enhanceSearchPage } from '../../src/client/post-hydrate/search-page-enhancer.js';
import {
  areSearchStatesCanonicallyEqual,
  buildSearchPageHistoryHref,
} from '../../src/client/post-hydrate/search-page-controller.js';
import type { SearchCore } from '../../src/search/search-core.js';
import { SEARCH_DEBOUNCE_MS } from '../../src/search/search-constants.js';
import { buildSearchResultRenderHref } from '../../src/search/normalize-search-result-url.js';

const staticResponse: ExploreSearchResponse = {
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

const enhanceWithRuntime = (
  root: ParentNode,
  signal?: AbortSignal,
  searchRuntime = createSearchRuntime(),
) =>
  enhanceSearchPage(root, signal, {
    siteUrlContextProvider: () => DEFAULT_SITE_URL_CONTEXT,
    bootstrapProvider: () => ({
      status: 'ready',
      searchCore: searchRuntime,
      isInternalDocumentPathname: () => true,
    }),
    searchRuntimeProvider: () => searchRuntime,
  });

const waitForDebounce = (): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, SEARCH_DEBOUNCE_MS + 30));

const expectElement = <T extends Element>(element: T | null | undefined, label: string): T => {
  expect(element, label).to.not.equal(null);
  expect(element, label).to.not.equal(undefined);
  return element as T;
};

// 未変更のURLへの書き込みもWebKitのHistory quotaを消費するため、
// fixtureの中立状態をproductionの検索URLにそろえて不要な書き込みを省く。
const setSearchFixtureUrl = (href = '/search/'): void => {
  if (new URL(href, location.href).href !== location.href) {
    history.replaceState(history.state, '', href);
  }
};

const renderTagOrderFixture = async (
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

const tagSequence = (root: ParentNode): string[] =>
  [...root.querySelectorAll<HTMLElement>('[data-filter-option]')].map(
    (row) => row.dataset['filterTag'] ?? '',
  );

const tagInput = (root: ParentNode, tag: string): HTMLInputElement =>
  expectElement(
    [...root.querySelectorAll<HTMLInputElement>('[data-search-tag-checkbox]')].find(
      (input) => input.value === tag,
    ),
    tag,
  );

const deferredTagRuntime = () => {
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

describe('search-page-enhancer', () => {
  beforeEach(() => {
    document.head.replaceChildren();
    appendSiteUrlContextMeta();
  });

  afterEach(() => {
    document.body.replaceChildren();
    document.head.replaceChildren();
    setSearchFixtureUrl();
  });

  it('light / dark の未選択・選択 checkbox 枠と check は合成後も識別でき、label は24pxの操作領域を持つこと', async () => {
    const response: ExploreSearchResponse = {
      ...staticResponse,
      allTagCounts: { music: 4, architecture: 3 },
      tagCounts: { music: 4, architecture: 3 },
    };
    const root = await renderTagOrderFixture(response);
    const controller = enhanceWithRuntime(root);
    const previousTheme = document.documentElement.dataset['theme'];
    const input = tagInput(root, 'music');
    const row = expectElement(input.closest<HTMLElement>('[data-filter-option]'), 'row');
    const label = expectElement(input.closest('label'), 'label');
    const control = expectElement(
      label.querySelector<HTMLElement>('.filter-option-checkbox__control'),
      'control',
    );
    const icon = expectElement(
      control.querySelector<HTMLElement>('.filter-option-checkbox__icon'),
      'icon',
    );
    const colorProbe = document.createElement('span');
    root.append(colorProbe);
    const resolvedColor = (token: string): string => {
      colorProbe.style.color = `var(${token})`;
      return getComputedStyle(colorProbe).color;
    };
    const luminance = (rgb: readonly number[]): number =>
      rgb
        .map((value) => value / 255)
        .map((value) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4))
        .reduce((sum, value, index) => sum + value * ([0.2126, 0.7152, 0.0722][index] ?? 0), 0);
    const composite = (...layers: string[]): number[] => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 1;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Missing color measurement context');
      // 透明な色のRGBだけを比較せず、背景へ描画して合成後のpixelを測る。
      for (const color of layers) {
        context.fillStyle = color;
        context.fillRect(0, 0, 1, 1);
      }
      const pixel = context.getImageData(0, 0, 1, 1).data;
      expect(pixel[3]).toBe(255);
      return [...pixel].slice(0, 3);
    };
    const contrast = (left: readonly number[], right: readonly number[]): number => {
      const a = luminance(left);
      const b = luminance(right);
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    };
    try {
      for (const theme of ['light', 'dark']) {
        document.documentElement.dataset['theme'] = theme;
        // theme transitionの途中色をcontrastの最終値として判定しない。
        await Promise.all(
          root
            .getAnimations({ subtree: true })
            .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
            .map((animation) => animation.finished),
        );
        for (const checked of [false, true]) {
          // CSS stateの観測だけを行い、選択操作のnative behaviorは別testで固定する。
          input.checked = checked;
          const rowStyle = getComputedStyle(row);
          const controlStyle = getComputedStyle(control);
          const outer = composite(rowStyle.backgroundColor);
          const inside = composite(rowStyle.backgroundColor, controlStyle.backgroundColor);
          const border = composite(
            rowStyle.backgroundColor,
            controlStyle.backgroundColor,
            controlStyle.borderTopColor,
          );
          expect(controlStyle.borderTopColor).toBe(resolvedColor('--fg-control-affordance'));
          expect(
            contrast(border, outer),
            `${theme}/${String(checked)} border/row`,
          ).toBeGreaterThanOrEqual(3);
          expect(
            contrast(border, inside),
            `${theme}/${String(checked)} border/inside`,
          ).toBeGreaterThanOrEqual(3);
          if (checked) {
            expect(getComputedStyle(icon).color).toBe(resolvedColor('--fg-default'));
            expect(
              contrast(
                composite(
                  rowStyle.backgroundColor,
                  controlStyle.backgroundColor,
                  getComputedStyle(icon).color,
                ),
                inside,
              ),
              `${theme} check/background`,
            ).toBeGreaterThanOrEqual(3);
          }
          expect(label.getBoundingClientRect().height).toBeGreaterThanOrEqual(24);
          expect(label.getBoundingClientRect().width).toBeGreaterThanOrEqual(24);
        }
      }
    } finally {
      controller?.dispose();
      if (previousTheme === undefined) delete document.documentElement.dataset['theme'];
      else document.documentElement.dataset['theme'] = previousTheme;
    }
  });

  it('selected tags は空・1行・解除で後続位置を固定し、wrap と remove icon の中央配置を保つこと', async () => {
    const tags = [
      'architecture',
      'continuous-alphanumeric-tag-1234567890',
      'music',
      'performance',
      'security',
    ];
    const counts = Object.fromEntries(tags.map((tag, index) => [tag, index + 1]));
    const response: ExploreSearchResponse = {
      ...staticResponse,
      allTagCounts: counts,
      tagCounts: counts,
    };
    const root = await renderTagOrderFixture(response);
    root.style.inlineSize = '320px';
    const controller = enhanceWithRuntime(root, undefined, createSearchRuntime(async () => response));
    const selectedTags = expectElement(
      root.querySelector<HTMLElement>('[data-selected-tags]'),
      'selected tags',
    );
    const filterInput = expectElement(
      root.querySelector<HTMLElement>('.filter-search-field'),
      'filter input field',
    );
    const initialSelectedHeight = selectedTags.getBoundingClientRect().height;
    const followingGap = (): number =>
      filterInput.getBoundingClientRect().top - selectedTags.getBoundingClientRect().bottom;
    const initialFollowingGap = followingGap();

    await userEvent.click(tagInput(root, 'architecture'));
    await expect.poll(() => selectedTags.querySelectorAll('[data-selected-tag]').length).toBe(1);
    expect(selectedTags.getBoundingClientRect().height).toBe(initialSelectedHeight);
    expect(Math.abs(followingGap() - initialFollowingGap)).toBeLessThan(0.5);

    const remove = expectElement(
      selectedTags.querySelector<HTMLButtonElement>('.selected-tag__remove'),
      'remove button',
    );
    const icon = expectElement(
      remove.querySelector<HTMLElement>('.selected-tag__remove-icon'),
      'remove icon',
    );
    const removeRect = remove.getBoundingClientRect();
    const iconRect = icon.getBoundingClientRect();
    expect(removeRect.width).toBeGreaterThanOrEqual(24);
    expect(removeRect.height).toBeGreaterThanOrEqual(24);
    expect(
      Math.abs(iconRect.left + iconRect.width / 2 - (removeRect.left + removeRect.width / 2)),
    ).toBeLessThan(0.5);
    expect(
      Math.abs(iconRect.top + iconRect.height / 2 - (removeRect.top + removeRect.height / 2)),
    ).toBeLessThan(0.5);

    remove.focus();
    await userEvent.keyboard(' ');
    await expect.poll(() => selectedTags.querySelectorAll('[data-selected-tag]').length).toBe(0);
    expect(selectedTags.getBoundingClientRect().height).toBe(initialSelectedHeight);
    expect(Math.abs(followingGap() - initialFollowingGap)).toBeLessThan(0.5);
    controller?.dispose();
    root.remove();

    const wrappedRoot = await renderTagOrderFixture(response, tags, 'or');
    wrappedRoot.style.inlineSize = '320px';
    const wrappedController = enhanceWithRuntime(
      wrappedRoot,
      undefined,
      createSearchRuntime(async () => response),
    );
    const wrappedSelectedTags = expectElement(
      wrappedRoot.querySelector<HTMLElement>('[data-selected-tags]'),
      'wrapped selected tags',
    );
    await expect
      .poll(() => wrappedSelectedTags.querySelectorAll('[data-selected-tag]').length)
      .toBe(5);
    expect(wrappedSelectedTags.getBoundingClientRect().height).toBeGreaterThan(initialSelectedHeight);
    expect(getComputedStyle(wrappedSelectedTags).overflow).toBe('visible');

    wrappedRoot.style.zoom = '2';
    const zoomedRemove = expectElement(
      wrappedSelectedTags.querySelector<HTMLButtonElement>('.selected-tag__remove'),
      'zoomed remove button',
    );
    expect(zoomedRemove.getBoundingClientRect().width).toBeGreaterThanOrEqual(48);
    expect(zoomedRemove.getBoundingClientRect().height).toBeGreaterThanOrEqual(48);
    wrappedController?.dispose();
  });

  it('selected / disabled / normal row は light / dark で意味どおりの面を使うこと', async () => {
    const root = await renderTagOrderFixture(
      {
        ...staticResponse,
        allTagCounts: { architecture: 4, music: 3, security: 2 },
        tagCounts: { architecture: 4, music: 0, security: 2 },
      },
      ['architecture'],
      'and',
    );
    const previousTheme = document.documentElement.dataset['theme'];
    const probe = document.createElement('span');
    root.append(probe);
    const colorFor = (token: string): string => {
      probe.style.background = `var(${token})`;
      return getComputedStyle(probe).backgroundColor;
    };
    try {
      for (const theme of ['light', 'dark']) {
        document.documentElement.dataset['theme'] = theme;
        await Promise.all(
          root
            .getAnimations({ subtree: true })
            .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
            .map((animation) => animation.finished),
        );
        const selected = expectElement(
          root.querySelector<HTMLElement>("[data-filter-tag='architecture']"),
          'selected row',
        );
        const disabled = expectElement(
          root.querySelector<HTMLElement>("[data-filter-tag='music']"),
          'disabled row',
        );
        const available = expectElement(
          root.querySelector<HTMLElement>("[data-filter-tag='security']"),
          'available row',
        );
        expect(getComputedStyle(selected).backgroundColor).toBe(colorFor('--bg-fill-muted'));
        expect(getComputedStyle(disabled).backgroundColor).toBe(colorFor('--bg-default'));
        expect(getComputedStyle(disabled).borderStyle).toBe('dashed');
        expect(getComputedStyle(available).backgroundColor).toBe(colorFor('--bg-surface-2'));
        expect(tagInput(root, 'architecture').checked).toBe(true);
        expect(tagInput(root, 'music').disabled).toBe(true);
      }
    } finally {
      if (previousTheme === undefined) delete document.documentElement.dataset['theme'];
      else document.documentElement.dataset['theme'] = previousTheme;
    }
  });

  it('production tag list は select / deselect / tagMode の即時同期と応答後にも sequence・node・focus・scroll を保つこと', async () => {
    const response: ExploreSearchResponse = {
      ...staticResponse,
      allTagCounts: { music: 4, architecture: 3, security: 1 },
      tagCounts: { music: 4, architecture: 3, security: 1 },
    };
    const root = await renderTagOrderFixture(response);
    const runtime = deferredTagRuntime();
    const controller = enhanceWithRuntime(root, undefined, runtime.core);
    await expect
      .poll(
        () =>
          root.querySelector<HTMLElement>('[data-search-page-root]')?.dataset[
            'searchPageCapability'
          ],
      )
      .toBe('ready');
    const expected = ['music', 'architecture', 'security'];
    expect(tagSequence(root)).toEqual(expected);
    const architecture = tagInput(root, 'architecture');
    const security = tagInput(root, 'security');
    const list = expectElement(
      root.querySelector<HTMLElement>('[data-search-filter-list]'),
      'list',
    );
    list.style.cssText = 'height: 60px; overflow-y: auto';
    for (const row of root.querySelectorAll<HTMLElement>('[data-filter-option]'))
      row.style.minHeight = '60px';
    await userEvent.click(expectElement(architecture.closest('label'), 'native label'));
    expect(architecture.checked).toBe(true);
    expect(document.activeElement).toBe(architecture);
    expect(tagSequence(root)).toEqual(expected);
    list.scrollTop = 40;
    await runtime.finish(root, {
      ...response,
      tagCounts: { music: 0, architecture: 2, security: 1 },
    });
    expect(tagSequence(root)).toEqual(expected);
    expect(tagInput(root, 'architecture')).toBe(architecture);
    expect(document.activeElement).toBe(architecture);
    expect(list.scrollTop).toBe(40);
    expect(
      root.querySelector('[data-filter-tag="architecture"]')?.getAttribute('data-selected'),
    ).toBe('true');
    await userEvent.keyboard(' ');
    expect(architecture.checked).toBe(false);
    expect(document.activeElement).toBe(architecture);
    expect(tagSequence(root)).toEqual(expected);
    await runtime.finish(root, response);
    expect(document.activeElement).toBe(architecture);
    await userEvent.tab();
    expect(document.activeElement).toBe(security);
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(architecture);
    await userEvent.click(
      expectElement(
        root.querySelector('[data-search-choice-menu="tag-mode"] summary'),
        'mode trigger',
      ),
    );
    await userEvent.click(
      expectElement(
        root.querySelector('[data-search-choice-menu="tag-mode"] [data-value="and"]'),
        'and',
      ),
    );
    expect(tagSequence(root)).toEqual(expected);
    await runtime.finish(root, response);
    expect(tagSequence(root)).toEqual(expected);
    expect(new URL(location.href).searchParams.get('tagMode')).toBe('and');
    controller?.dispose();
  });

  it('SSR と runtime は同じ identity・固定順を保ちOR候補件数はQを使うこと', async () => {
    const response: ExploreSearchResponse = {
      ...staticResponse,
      allTagCounts: {
        music: 4,
        architecture: 3,
        security: 1,
        é: 1,
        'e\u0301': 1,
        建築: 1,
        音楽: 1,
        Ａ: 1,
        A: 1,
      },
      tagCounts: { architecture: 2, music: 0 },
    };
    const root = await renderTagOrderFixture(response, ['security', 'absent']);
    const expected = [
      'music',
      'architecture',
      'A',
      'Ａ',
      'e\u0301',
      'é',
      'security',
      '音楽',
      '建築',
      'absent',
    ];
    expect(tagSequence(root)).toEqual(expected);
    const runtime = deferredTagRuntime();
    const controller = enhanceWithRuntime(root, undefined, runtime.core);
    expect(tagSequence(root)).toEqual(expected);
    expect(root.querySelector('[data-filter-tag="music"] .filter-option-count')?.textContent).toBe(
      '4件',
    );
    expect(tagInput(root, 'music').disabled).toBe(false);
    expect(tagInput(root, 'security').disabled).toBe(false);
    expect(tagInput(root, 'absent').disabled).toBe(false);
    await userEvent.click(
      expectElement(tagInput(root, 'security').closest('label'), 'selected zero label'),
    );
    expect(tagInput(root, 'security').checked).toBe(false);
    expect(tagInput(root, 'security').disabled).toBe(false);
    await runtime.finish(root, response);
    expect(tagSequence(root)).toEqual(expected);
    await userEvent.click(
      expectElement(
        root.querySelector('[data-search-selected-tag-remove="absent"]'),
        'absent chip',
      ),
    );
    expect(tagSequence(root)).toEqual(expected.filter((tag) => tag !== 'absent'));
    await runtime.finish(root, response);
    expect(tagSequence(root)).toEqual(expected.filter((tag) => tag !== 'absent'));
    controller?.dispose();
  });

  it('OR/AND 切替で候補件数の集合だけを切り替え、選択済み0件は解除可能に保つこと', async () => {
    const response: ExploreSearchResponse = {
      ...staticResponse,
      allTagCounts: { architecture: 9, music: 4, selectedZero: 0 },
      tagCounts: { architecture: 2, music: 0, selectedZero: 0 },
    };
    const root = await renderTagOrderFixture(response, ['selectedZero']);
    const runtime = deferredTagRuntime();
    const controller = enhanceWithRuntime(root, undefined, runtime.core);
    const sequence = tagSequence(root);
    const status = (tag: string) =>
      root.querySelector(`[data-filter-tag="${tag}"] .filter-option-count`)?.textContent;
    const state = (tag: string) =>
      root.querySelector<HTMLElement>(`[data-filter-tag="${tag}"]`)?.dataset['state'];

    expect(status('architecture')).toBe('9件');
    expect(status('music')).toBe('4件');
    expect(status('selectedZero')).toBe('0件・選択中');
    expect(tagInput(root, 'selectedZero').disabled).toBe(false);
    expect(state('selectedZero')).toBe('selected');
    expect(root.querySelector('[data-search-tag-mode-description]')?.textContent).toContain(
      '増加件数ではありません',
    );

    await userEvent.click(
      expectElement(
        root.querySelector('[data-search-choice-menu="tag-mode"] summary'),
        'mode trigger',
      ),
    );
    await userEvent.click(
      expectElement(
        root.querySelector('[data-search-choice-menu="tag-mode"] [data-value="and"]'),
        'and',
      ),
    );
    expect(status('architecture')).toBe('件数を計算中');
    expect(status('music')).toBe('件数を計算中');
    expect(tagInput(root, 'music').disabled).toBe(false);
    expect(state('music')).toBe('pending');
    expect(status('selectedZero')).toBe('選択中・件数を計算中');
    expect(tagInput(root, 'selectedZero').disabled).toBe(false);
    expect(root.querySelector('[data-search-filter-list]')?.getAttribute('aria-busy')).toBe('true');
    await runtime.finish(root, response);
    expect(status('architecture')).toBe('2件');
    expect(status('music')).toBe('0件・選択不可');
    expect(tagInput(root, 'music').disabled).toBe(true);
    expect(state('music')).toBe('disabled');
    expect(status('selectedZero')).toBe('0件・選択中');
    expect(tagInput(root, 'selectedZero').disabled).toBe(false);
    expect(tagSequence(root)).toEqual(sequence);
    expect(root.querySelector('[data-search-tag-mode-description]')?.textContent).toContain(
      '追加した後の結果件数',
    );

    history.back();
    await expect
      .poll(() => root.querySelector<HTMLInputElement>('[data-search-tag-mode-value]')?.value)
      .toBe('or');
    expect(status('music')).toBe('件数を計算中');
    await runtime.finish(root, response);
    expect(status('music')).toBe('4件');
    expect(root.querySelector('[data-search-tag-mode-description]')?.textContent).toContain(
      '増加件数ではありません',
    );
    history.forward();
    await expect
      .poll(() => root.querySelector<HTMLInputElement>('[data-search-tag-mode-value]')?.value)
      .toBe('and');
    expect(status('music')).toBe('件数を計算中');
    await runtime.finish(root, response);
    expect(status('music')).toBe('0件・選択不可');

    await userEvent.click(
      expectElement(
        root.querySelector('[data-search-selected-tag-remove="selectedZero"]'),
        'selected zero remove',
      ),
    );
    expect(tagInput(root, 'selectedZero').checked).toBe(false);
    expect(tagInput(root, 'selectedZero').disabled).toBe(false);
    expect(status('selectedZero')).toBe('件数を計算中');
    await runtime.finish(root, response);
    expect(status('selectedZero')).toBe('0件・選択不可');
    controller?.dispose();
  });

  it('必要な row 再構成だけ残存する可視 enabled checkbox の focus を保持し外部 focus を奪わないこと', async () => {
    const response: ExploreSearchResponse = {
      ...staticResponse,
      allTagCounts: { music: 4, architecture: 3, security: 1 },
      tagCounts: { music: 4, architecture: 3, security: 1 },
    };
    const root = await renderTagOrderFixture(response);
    const runtime = deferredTagRuntime();
    const controller = enhanceWithRuntime(root, undefined, runtime.core);
    const architecture = tagInput(root, 'architecture');
    await userEvent.click(expectElement(architecture.closest('label'), 'label'));
    await runtime.finish(root, {
      ...response,
      allTagCounts: { security: 8, architecture: 3, music: 1, added: 1 },
    });
    expect(tagSequence(root)).toEqual(['security', 'architecture', 'added', 'music']);
    expect(tagInput(root, 'architecture')).toBe(architecture);
    expect(document.activeElement).toBe(architecture);
    await userEvent.keyboard(' ');
    await runtime.finish(root, {
      ...response,
      tagCounts: { music: 1, architecture: 0, security: 1 },
      allTagCounts: { music: 4, architecture: 0, security: 1 },
    });
    expect(architecture.disabled).toBe(true);
    expect(document.activeElement).not.toBe(architecture);
    const query = expectElement(
      root.querySelector<HTMLInputElement>('[data-search-query-input]'),
      'query',
    );
    await userEvent.click(
      expectElement(tagInput(root, 'security').closest('label'), 'security label'),
    );
    query.focus();
    await runtime.finish(root, {
      ...response,
      allTagCounts: { music: 9, architecture: 3, security: 1 },
    });
    expect(document.activeElement).toBe(query);
    controller?.dispose();
  });

  it('local filter の substring・hidden subset・visible count と応答時の行同期を維持すること', async () => {
    const response: ExploreSearchResponse = {
      ...staticResponse,
      allTagCounts: { music: 4, architecture: 3, security: 1 },
      tagCounts: { music: 4, architecture: 3, security: 1 },
    };
    const root = await renderTagOrderFixture(response);
    const runtime = deferredTagRuntime();
    const controller = enhanceWithRuntime(root, undefined, runtime.core);
    await userEvent.click(
      expectElement(tagInput(root, 'architecture').closest('label'), 'architecture label'),
    );
    const filter = expectElement(
      root.querySelector<HTMLInputElement>('[data-search-filter-input]'),
      'local filter',
    );
    await userEvent.fill(filter, 'MUS');
    expect(tagSequence(root)).toEqual(['music', 'architecture', 'security']);
    expect(
      [...root.querySelectorAll<HTMLElement>('[data-filter-option]')]
        .filter((row) => !row.hidden)
        .map((row) => row.dataset['filterTag']),
    ).toEqual(['music']);
    expect(root.querySelector('[data-filter-visible-count]')?.textContent).toBe('1 / 3タグ');
    tagInput(root, 'music').focus();
    await runtime.finish(root, {
      ...response,
      allTagCounts: { architecture: 8, music: 4, security: 1, musical: 1 },
      tagCounts: { music: 2, architecture: 1, musical: 1 },
    });
    expect(tagSequence(root)).toEqual(['architecture', 'music', 'musical', 'security']);
    expect(document.activeElement).toBe(tagInput(root, 'music'));
    expect(root.querySelector('[data-filter-visible-count]')?.textContent).toBe('2 / 4タグ');
    expect(root.querySelector('[data-filter-tag="music"] .filter-option-count')?.textContent).toBe(
      '4件',
    );
    controller?.dispose();
  });

  it('順次選択・解除・chip解除・実 history 復帰で URL/chip は preferred/保持順に従うこと', async () => {
    const response: ExploreSearchResponse = {
      ...staticResponse,
      allTagCounts: { music: 4, architecture: 3, security: 1 },
      tagCounts: { music: 4, architecture: 3, security: 1 },
    };
    const root = await renderTagOrderFixture(response);
    const runtime = deferredTagRuntime();
    const controller = enhanceWithRuntime(root, undefined, runtime.core);
    const selected = () =>
      [...root.querySelectorAll<HTMLElement>('[data-selected-tag]')].map(
        (chip) => chip.dataset['selectedTag'],
      );
    const assertSelected = (tags: string[], chipTags: string[] = tags, responseApplied = true) => {
      const url = new URL(location.href);
      expect(url.pathname).toBe(tags.length === 1 ? `/tags/${tags[0] ?? ''}/` : '/search/');
      if (tags.length > 1) expect(url.searchParams.getAll('tag')).toEqual(tags);
      expect(selected()).toEqual(chipTags);
      if (responseApplied) expect(tagSequence(root)).toEqual(['music', 'architecture', 'security']);
    };
    for (const [tag, urlTags, immediateChips] of [
      ['security', ['security'], ['security']],
      ['architecture', ['architecture', 'security'], ['architecture', 'security']],
      ['music', ['architecture', 'music', 'security'], ['music', 'architecture', 'security']],
    ] as const) {
      await userEvent.click(expectElement(tagInput(root, tag).closest('label'), tag));
      assertSelected([...urlTags], [...immediateChips]);
      await runtime.finish(root, response);
      assertSelected([...urlTags]);
    }
    await userEvent.click(
      expectElement(tagInput(root, 'architecture').closest('label'), 'deselect'),
    );
    assertSelected(['music', 'security']);
    await runtime.finish(root, response);
    await userEvent.click(
      expectElement(root.querySelector('[data-search-selected-tag-remove="music"]'), 'chip remove'),
    );
    assertSelected(['security']);
    await runtime.finish(root, response);
    history.back();
    await expect.poll(() => selected()).toEqual(['music', 'security']);
    assertSelected(['music', 'security'], ['music', 'security'], false);
    await runtime.finish(root, response);
    assertSelected(['music', 'security']);
    history.forward();
    await expect.poll(() => selected()).toEqual(['security']);
    assertSelected(['security'], ['security'], false);
    await runtime.finish(root, response);
    assertSelected(['security']);
    controller?.dispose();
  });

  it('同一 node 列の同期は先頭タグ操作でも checkbox を再接続せず focus を保つこと', async () => {
    const response: ExploreSearchResponse = {
      ...staticResponse,
      allTagCounts: { music: 4, architecture: 3 },
      tagCounts: { music: 4, architecture: 3 },
    };
    const root = await renderTagOrderFixture(response, ['music']);
    const runtime = deferredTagRuntime();
    const controller = enhanceWithRuntime(root, undefined, runtime.core);
    const list = expectElement(root.querySelector('[data-search-filter-list]'), 'list');
    let rowReconnects = 0;
    const observer = new MutationObserver((records) => {
      rowReconnects += records.length;
    });
    observer.observe(list, { childList: true });
    const music = tagInput(root, 'music');
    music.focus();
    await userEvent.keyboard(' ');
    expect(tagSequence(root)).toEqual(['music', 'architecture']);
    expect(document.activeElement).toBe(music);
    await runtime.finish(root, response);
    expect(document.activeElement).toBe(music);
    expect(rowReconnects + observer.takeRecords().length).toBe(0);
    observer.disconnect();
    controller?.dispose();
  });

  it('必要な再構成で local filter に隠れる行や削除された行へ focus を強制しないこと', async () => {
    const response: ExploreSearchResponse = {
      ...staticResponse,
      allTagCounts: { music: 4, architecture: 3 },
      tagCounts: { music: 4, architecture: 3 },
    };
    const root = await renderTagOrderFixture(response, ['absent']);
    const runtime = deferredTagRuntime();
    const controller = enhanceWithRuntime(root, undefined, runtime.core);
    const absent = tagInput(root, 'absent');
    await userEvent.click(expectElement(absent.closest('label'), 'absent label'));
    expect(root.contains(absent)).toBe(false);
    expect(document.activeElement).not.toBe(absent);
    await runtime.finish(root, response);
    await userEvent.click(
      expectElement(tagInput(root, 'architecture').closest('label'), 'architecture label'),
    );
    const music = tagInput(root, 'music');
    music.focus();
    const filter = expectElement(
      root.querySelector<HTMLInputElement>('[data-search-filter-input]'),
      'filter',
    );
    // 応答待ち中に変わった local 条件を、focus 保持より先に反映する。
    filter.value = 'architecture';
    await runtime.finish(root, {
      ...response,
      allTagCounts: { architecture: 8, music: 4, added: 1 },
    });
    expect(root.querySelector<HTMLElement>('[data-filter-tag="music"]')?.hidden).toBe(true);
    expect(document.activeElement).not.toBe(music);
    controller?.dispose();
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

  it('bootstrap不成立はreadyにせずbaselineを保持すること', () => {
    const root = renderSearchPageFixture();
    const bootstrapState = {
      status: 'unavailable' as const,
      reason: 'search-runtime-unavailable' as const,
    };
    const searchRuntime = null;
    const controller = enhanceSearchPage(root, undefined, {
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
    const controller = enhanceSearchPage(root, undefined, {
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

    expect(remove.getAttribute('aria-label')).to.equal('architectureを解除');
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
    const controller = enhanceSearchPage(root, undefined, {
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
    const invalidController = enhanceSearchPage(invalidRoot, undefined, {
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
    const controller = enhanceSearchPage(root, undefined, {
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
    const controller = enhanceSearchPage(root, undefined, {
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
    enhanceSearchPage(root, undefined, {
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

  it('単一タグ state と通常 search state の pushState / popstate で hero を同期すること', () => {
    const root = renderSearchPageFixture();
    enhanceWithRuntime(root);
    const music = expectElement(
      root.querySelector<HTMLInputElement>('[data-search-tag-checkbox][value="music"]'),
      'music',
    );

    music.checked = true;
    music.dispatchEvent(new Event('change', { bubbles: true }));
    expect(location.pathname).to.equal('/tags/music/');
    expect(root.querySelector('.eyebrow')?.textContent).to.equal('Tag / Explore');
    expect(root.querySelector('h1')?.textContent).to.equal('#music');
    expect(root.querySelector('.description')?.textContent).to.equal(
      'このタグに属するノートを起点に、検索語や追加タグで探索を広げられます。',
    );

    history.pushState(history.state, '', '/search/?tag=music');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(
      root.querySelector<HTMLInputElement>('[data-search-tag-checkbox][value="music"]')?.checked,
    ).to.equal(true);
    expect(root.querySelector('.eyebrow')?.textContent).to.equal('Search / Filter');
    expect(root.querySelector('h1')?.textContent).to.equal('検索');
    expect(root.querySelector('.description')?.textContent).to.equal(
      'タグとキーワードを組み合わせ、複数タグはOR / ANDを切り替えて探索します。',
    );

    history.pushState(history.state, '', '/tags/music/');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(root.querySelector('.eyebrow')?.textContent).to.equal('Tag / Explore');
    expect(root.querySelector('h1')?.textContent).to.equal('#music');

    history.pushState(history.state, '', '/search/?q=router');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(root.querySelector('.eyebrow')?.textContent).to.equal('Search / Filter');
    expect(root.querySelector('h1')?.textContent).to.equal('検索');
    expect(root.querySelector('.description')?.textContent).to.equal(
      'タグとキーワードを組み合わせ、複数タグはOR / ANDを切り替えて探索します。',
    );
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
    enhanceSearchPage(root, undefined, {
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
