import { expect, fixture, html } from '@open-wc/testing';
import '../../src/components/search/search-page.js';
import type { Checkbox } from '../../src/components/ui/checkbox/checkbox.js';
import type { Details } from '../../src/components/ui/details/details.js';
import type { SearchField } from '../../src/components/ui/search-field/search-field.js';
import type { SearchPage } from '../../src/components/search/search-page.js';
import { searchCore } from '../../src/search/search-core.js';
import type { ExploreSearchResponse, SearchRequest } from '../../shared/search/search-types.js';
import { nextAnimationFrame, waitForLitUpdate, waitMs } from './helpers/wait-for-lit.js';

interface MockSearchItem {
  canonicalUrl: string;
  title: string;
  url: string;
  pathLabel: string;
  snippet: string;
  description: string;
  date: string;
  tags: readonly string[];
}

interface FilterOptionState {
  label: string;
  checked: boolean;
  selected: boolean;
}

const SEARCH_PAGE_TEST_WAIT_MS = 220;
const ORIGINAL_SEARCH = searchCore.search.bind(searchCore);

const MOCK_ITEMS: readonly MockSearchItem[] = [
  {
    canonicalUrl: '/notes/router-design/',
    title: 'Router 設計メモ',
    url: '/notes/router-design',
    pathLabel: 'notes / router-design',
    snippet: 'Router の設計と遷移制御をまとめたメモです。',
    description: 'Router の設計ノート',
    date: '2026-03-01',
    tags: ['router', 'architecture'],
  },
  {
    canonicalUrl: '/notes/lit-performance/',
    title: 'Lit レンダリング最適化',
    url: '/notes/lit-performance',
    pathLabel: 'notes / lit-performance',
    snippet: 'Lit の描画最適化と差分更新をまとめています。',
    description: 'Lit の描画最適化メモ',
    date: '2026-02-12',
    tags: ['lit', 'performance'],
  },
  {
    canonicalUrl: '/notes/a11y-log/',
    title: 'アクセシビリティ実装ログ',
    url: '/notes/a11y-log',
    pathLabel: 'notes / a11y-log',
    snippet: 'フォーム操作とラベル設計を検証したメモです。',
    description: 'A11y 実装の記録',
    date: '2026-01-22',
    tags: ['a11y', 'architecture'],
  },
  {
    canonicalUrl: '/notes/router-event-boundary/',
    title: 'Router イベント境界の設計',
    url: '/notes/router-event-boundary',
    pathLabel: 'notes / router-event-boundary',
    snippet: 'Router のイベント境界と購読戦略を整理しています。',
    description: 'Router のイベント境界設計メモ',
    date: '2026-01-11',
    tags: ['architecture', 'eventing'],
  },
];

const expectPresent = <T>(value: T | null | undefined, name: string): T => {
  expect(value, `${name} should exist`).to.not.equal(null);
  expect(value, `${name} should exist`).to.not.equal(undefined);

  if (value === null || value === undefined) {
    throw new Error(`${name} が見つかりません`);
  }

  return value;
};

const buildGenreCounts = (
  items: readonly MockSearchItem[],
  options: {
    includeAllKnownTags?: boolean;
  } = {},
): Record<string, number> => {
  const counts = new Map<string, number>();

  if (options.includeAllKnownTags === true) {
    for (const tag of Object.keys(ALL_GENRE_COUNTS)) {
      counts.set(tag, 0);
    }
  }

  for (const item of items) {
    for (const tag of item.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return Object.fromEntries(
    [...counts.entries()].sort((left, right) => left[0].localeCompare(right[0], 'ja')),
  );
};

const ALL_GENRE_COUNTS = buildGenreCounts(MOCK_ITEMS);

const createSearchResponse = (
  query: string,
  selectedGenres: readonly string[],
  sortMode: string,
  tagMode: 'or' | 'and' = 'or',
): ExploreSearchResponse => {
  const normalizedQuery = query.trim().toLowerCase();

  if (normalizedQuery.length === 0 && selectedGenres.length === 0) {
    return {
      mode: 'explore',
      rankingProfileId: 'rouault-search-v1',
      total: 0,
      items: [],
      tagCounts: {},
      allTagCounts: ALL_GENRE_COUNTS,
      diagnostics: {
        degraded: false,
        activeSources: ['catalog'],
        failures: [],
        issues: [],
      },
    } satisfies ExploreSearchResponse;
  }

  const queryMatchedItems = MOCK_ITEMS.filter((item) => {
    if (normalizedQuery.length === 0) {
      return true;
    }

    const haystacks = [item.title, item.description, ...item.tags].map((value) =>
      value.toLowerCase(),
    );
    return haystacks.some((value) => value.includes(normalizedQuery));
  });

  const filteredItems =
    selectedGenres.length > 0
      ? queryMatchedItems.filter((item) =>
          tagMode === 'and'
            ? selectedGenres.every((tag) => item.tags.includes(tag))
            : selectedGenres.some((tag) => item.tags.includes(tag)),
        )
      : queryMatchedItems;

  const sortedItems =
    sortMode === 'date-desc'
      ? [...filteredItems].sort((left, right) => right.date.localeCompare(left.date, 'ja'))
      : filteredItems;

  return {
    mode: 'explore',
    rankingProfileId: 'rouault-search-v1',
    total: sortedItems.length,
    items: sortedItems.map((item) => ({
      canonicalUrl: item.canonicalUrl,
      title: item.title,
      url: item.url,
      pathLabel: item.pathLabel,
      description: item.description,
      date: {
        epochMs: Date.parse(item.date),
        original: item.date,
      },
      tags: [...item.tags],
      snippet: {
        segments: [{ text: item.snippet, matched: false }],
      },
      reasons: [{ kind: 'title-prefix', tokens: [query] }],
    })),
    tagCounts: buildGenreCounts(sortedItems),
    allTagCounts: buildGenreCounts(queryMatchedItems, { includeAllKnownTags: true }),
    diagnostics: {
      degraded: false,
      activeSources: ['catalog'],
      failures: [],
      issues: [],
    },
  } satisfies ExploreSearchResponse;
};

const installSearchMock = (): void => {
  searchCore.search = (request: SearchRequest) =>
    Promise.resolve(createSearchResponse(request.q, request.tags, request.sort, request.tagMode));
};

const restoreSearchMock = (): void => {
  searchCore.search = ORIGINAL_SEARCH;
};

const flush = async (host: SearchPage): Promise<void> => {
  await waitForLitUpdate(host);
  await nextAnimationFrame();
  await waitForLitUpdate(host);
};

const settleSearch = async (host: SearchPage): Promise<void> => {
  await waitMs(SEARCH_PAGE_TEST_WAIT_MS);
  await flush(host);
};

const getSearchInput = (field: SearchField | null | undefined): HTMLInputElement => {
  const input = field?.shadowRoot?.querySelector<HTMLInputElement>('input');
  if (!input) {
    throw new Error('ui-search-field 内の input が見つかりません');
  }

  return input;
};

const getFilterDetails = (host: SearchPage): Details =>
  expectPresent(
    host.shadowRoot?.querySelector<Details>('ui-details.filter-details'),
    'filter details',
  );

const getFilterTrigger = (host: SearchPage): HTMLButtonElement =>
  expectPresent(
    getFilterDetails(host).shadowRoot?.querySelector<HTMLButtonElement>('button.trigger'),
    'filter trigger',
  );

const getFilterSearchField = (host: SearchPage): SearchField =>
  expectPresent(
    host.shadowRoot?.querySelector<SearchField>('ui-search-field.filter-search-field'),
    'filter search field',
  );

const getFilterCheckbox = (host: SearchPage, label: string): Checkbox => {
  const checkboxes =
    host.shadowRoot?.querySelectorAll<Checkbox>('ui-checkbox.filter-option-checkbox') ?? [];
  const checkbox = [...checkboxes].find((candidate) => candidate.label === label);

  if (!checkbox) {
    throw new Error(`"${label}" の filter checkbox が見つかりません`);
  }

  return checkbox;
};

const clickCheckboxLabel = async (checkbox: Checkbox): Promise<void> => {
  await waitForLitUpdate(checkbox);

  const label = checkbox.shadowRoot?.querySelector<HTMLElement>('label.label');
  if (!label) {
    throw new Error('checkbox label が見つかりません');
  }

  label.click();
};

const getFilterOptionStates = (host: SearchPage): FilterOptionState[] => {
  const options = host.shadowRoot?.querySelectorAll<HTMLElement>('.filter-option') ?? [];

  return [...options].map((option) => {
    const checkbox = option.querySelector<Checkbox>('ui-checkbox.filter-option-checkbox');
    if (!checkbox) {
      throw new Error('filter option 内の checkbox が見つかりません');
    }

    return {
      label: checkbox.label,
      checked: checkbox.checked,
      selected: option.dataset['selected'] === 'true',
    } satisfies FilterOptionState;
  });
};

const assertFilterSelectionConsistency = (host: SearchPage, context: string): void => {
  const mismatch = getFilterOptionStates(host).find((state) => state.checked !== state.selected);

  expect(mismatch, `${context}: checked と data-selected が不一致のタグが存在しないこと`).to.equal(
    undefined,
  );
};

describe('search-page browser contract', () => {
  afterEach(() => {
    restoreSearchMock();
    history.replaceState(history.state, '', '/');
  });

  it('query 入力と clear で URL / clear button / 件数表示を同期すること', async () => {
    installSearchMock();
    history.replaceState(history.state, '', '/');

    const host = await fixture<SearchPage>(
      html`<search-page id="search-page-regression"></search-page>`,
    );

    await flush(host);

    const searchField = expectPresent(
      host.shadowRoot?.querySelector<SearchField>('ui-search-field.search-input-control'),
      'main search field',
    );
    const input = getSearchInput(searchField);
    const clearButton = expectPresent(
      searchField.shadowRoot?.querySelector<HTMLButtonElement>('.clear-button'),
      'clear button',
    );

    input.value = 'router';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await settleSearch(host);

    const resultLinks = host.shadowRoot?.querySelectorAll('.result-link') ?? [];
    const currentUrl = new URL(window.location.href);

    expect(resultLinks.length).to.equal(2);
    expect(currentUrl.searchParams.get('q')).to.equal('router');
    expect(clearButton.hidden).to.equal(false);

    clearButton.click();
    await settleSearch(host);

    const metaRowText = host.shadowRoot?.querySelector('.meta-row')?.textContent ?? '';
    const clearedUrl = new URL(window.location.href);

    expect(input.value).to.equal('');
    expect(clearedUrl.searchParams.get('q')).to.equal(null);
    expect(metaRowText.includes('0 件の結果')).to.equal(true);
  });

  it('filter panel がローカル絞り込み・tag URL・selected chip removal を正しく同期すること', async () => {
    installSearchMock();
    history.replaceState(history.state, '', '/');

    const host = await fixture<SearchPage>(html`
      <div style="max-inline-size: 22.5rem;">
        <search-page id="search-page-filters"></search-page>
      </div>
    `);

    await flush(host);

    const searchPage = expectPresent(host.querySelector<SearchPage>('search-page'), 'search page');
    const filterDetails = getFilterDetails(searchPage);
    const filterSummaryText =
      searchPage.shadowRoot?.querySelector('.filter-summary-state')?.textContent ?? '';

    expect(filterDetails.open).to.equal(false);
    expect(filterSummaryText.includes('すべてのタグ')).to.equal(true);

    getFilterTrigger(searchPage).click();
    await flush(searchPage);

    expect(filterDetails.open).to.equal(true);

    const filterList = expectPresent(
      searchPage.shadowRoot?.querySelector<HTMLElement>('.filter-list'),
      'filter list',
    );
    const filterListStyle = getComputedStyle(filterList);

    expect(filterListStyle.overflowY).to.equal('auto');
    expect(filterListStyle.maxHeight).to.not.equal('none');

    const filterSearchField = getFilterSearchField(searchPage);
    const filterSearchInput = getSearchInput(filterSearchField);
    const urlBeforeFilterSearch = `${window.location.pathname}${window.location.search}`;

    filterSearchInput.value = 'lit';
    filterSearchInput.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await flush(searchPage);

    const visibleCheckboxesAfterFilter =
      searchPage.shadowRoot?.querySelectorAll('ui-checkbox.filter-option-checkbox') ?? [];

    expect(visibleCheckboxesAfterFilter.length).to.equal(1);
    expect(`${window.location.pathname}${window.location.search}`).to.equal(urlBeforeFilterSearch);

    filterSearchInput.value = '';
    filterSearchInput.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await flush(searchPage);

    const litCheckbox = getFilterCheckbox(searchPage, 'lit');
    await clickCheckboxLabel(litCheckbox);
    await settleSearch(searchPage);

    const urlAfterTagSelect = new URL(window.location.href);
    const resultLinksAfterTagSelect = searchPage.shadowRoot?.querySelectorAll('.result-link') ?? [];

    expect(
      urlAfterTagSelect.pathname === '/tags/lit/' ||
        urlAfterTagSelect.searchParams.getAll('tag').includes('lit'),
    ).to.equal(true);
    expect(resultLinksAfterTagSelect.length).to.equal(1);

    const mainSearchField = expectPresent(
      searchPage.shadowRoot?.querySelector<SearchField>('ui-search-field.search-input-control'),
      'main search field',
    );
    const mainSearchInput = getSearchInput(mainSearchField);

    mainSearchInput.value = 'router';
    mainSearchInput.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await settleSearch(searchPage);

    const urlAfterQuery = new URL(window.location.href);
    const litCheckboxAfterQuery = getFilterCheckbox(searchPage, 'lit');
    const performanceCheckboxAfterQuery = getFilterCheckbox(searchPage, 'performance');
    const selectedTag = expectPresent(
      searchPage.shadowRoot?.querySelector<HTMLElement>('.selected-tags ui-tag'),
      'selected tag chip',
    );

    expect(urlAfterQuery.searchParams.get('q')).to.equal('router');
    expect(litCheckboxAfterQuery.checked).to.equal(true);
    expect(litCheckboxAfterQuery.disabled).to.equal(false);
    expect(performanceCheckboxAfterQuery.disabled).to.equal(true);

    selectedTag.dispatchEvent(
      new CustomEvent<{ value: string }>('ui-tag-remove', {
        bubbles: true,
        composed: true,
        detail: { value: 'lit' },
      }),
    );
    await settleSearch(searchPage);

    const urlAfterRemove = new URL(window.location.href);
    const resultLinksAfterRemove = searchPage.shadowRoot?.querySelectorAll('.result-link') ?? [];
    const filterSummaryAfterRemove =
      searchPage.shadowRoot?.querySelector('.filter-summary-state')?.textContent ?? '';

    expect(urlAfterRemove.searchParams.getAll('tag').includes('lit')).to.equal(false);
    expect(resultLinksAfterRemove.length).to.equal(2);
    expect(filterSummaryAfterRemove.includes('すべてのタグ')).to.equal(true);
  });

  it('selected tag を先頭へ並べ替えつつ checked と data-selected を一貫させること', async () => {
    installSearchMock();
    history.replaceState(history.state, '', '/');

    const host = await fixture<SearchPage>(html`
      <div style="max-inline-size: 22.5rem;">
        <search-page id="search-page-filter-regression"></search-page>
      </div>
    `);

    await flush(host);

    const searchPage = expectPresent(host.querySelector<SearchPage>('search-page'), 'search page');

    getFilterTrigger(searchPage).click();
    await flush(searchPage);

    const litCheckbox = getFilterCheckbox(searchPage, 'lit');
    await clickCheckboxLabel(litCheckbox);
    await settleSearch(host);

    const statesAfterLitSelect = getFilterOptionStates(searchPage);
    expect(statesAfterLitSelect[0]?.label).to.equal('lit');
    assertFilterSelectionConsistency(searchPage, 'lit 選択後');

    const architectureCheckbox = getFilterCheckbox(searchPage, 'architecture');
    await clickCheckboxLabel(architectureCheckbox);
    await settleSearch(host);

    const statesAfterArchitectureSelect = getFilterOptionStates(searchPage);
    expect(statesAfterArchitectureSelect[0]?.label).to.equal('architecture');
    expect(statesAfterArchitectureSelect[1]?.label).to.equal('lit');
    assertFilterSelectionConsistency(searchPage, 'architecture 選択後');

    const architectureCheckboxAtTop = getFilterCheckbox(searchPage, 'architecture');
    await clickCheckboxLabel(architectureCheckboxAtTop);
    await settleSearch(host);

    const statesAfterArchitectureRemove = getFilterOptionStates(searchPage);
    const topStateAfterRemove = expectPresent(statesAfterArchitectureRemove[0], 'top state');

    expect(topStateAfterRemove.label).to.equal('lit');
    expect(topStateAfterRemove.selected).to.equal(true);
    expect(topStateAfterRemove.checked).to.equal(true);

    const architectureState = statesAfterArchitectureRemove.find(
      (state) => state.label === 'architecture',
    );

    expect(architectureState?.selected).to.equal(false);
    expect(architectureState?.checked).to.equal(false);
    assertFilterSelectionConsistency(searchPage, 'architecture 解除後');
  });
});
