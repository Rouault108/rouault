import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { pagefindSearchAdapter, type SearchResponse } from '../../lib/search/pagefind-search.js';
import './search-page.js';
import type { Checkbox } from '../ui/checkbox/checkbox.js';
import type { Details } from '../ui/details/details.js';
import type { SearchField } from '../ui/search-field/search-field.js';
import type { SearchPage } from './search-page.js';

const ORIGINAL_SEARCH = pagefindSearchAdapter.search.bind(pagefindSearchAdapter);
const ORIGINAL_GET_AVAILABLE_GENRES =
  pagefindSearchAdapter.getAvailableGenres.bind(pagefindSearchAdapter);

interface MockSearchItem {
  title: string;
  url: string;
  path: string;
  excerptHtml: string;
  description: string;
  date: string;
  tags: readonly string[];
}

interface FilterOptionState {
  label: string;
  checked: boolean;
  selected: boolean;
}

const MOCK_ITEMS: readonly MockSearchItem[] = [
  {
    title: 'Router 設計メモ',
    url: '/notes/router-design',
    path: '/notes/router-design',
    excerptHtml: 'Router の設計と遷移制御をまとめたメモです。',
    description: 'Router の設計ノート',
    date: '2026-03-01',
    tags: ['router', 'architecture'],
  },
  {
    title: 'Lit レンダリング最適化',
    url: '/notes/lit-performance',
    path: '/notes/lit-performance',
    excerptHtml: 'Lit の描画最適化と差分更新をまとめています。',
    description: 'Lit の描画最適化メモ',
    date: '2026-02-12',
    tags: ['lit', 'performance'],
  },
  {
    title: 'アクセシビリティ実装ログ',
    url: '/notes/a11y-log',
    path: '/notes/a11y-log',
    excerptHtml: 'フォーム操作とラベル設計を検証したメモです。',
    description: 'A11y 実装の記録',
    date: '2026-01-22',
    tags: ['a11y', 'architecture'],
  },
  {
    title: 'Router イベント境界の設計',
    url: '/notes/router-event-boundary',
    path: '/notes/router-event-boundary',
    excerptHtml: 'Router のイベント境界と購読戦略を整理しています。',
    description: 'Router のイベント境界設計メモ',
    date: '2026-01-11',
    tags: ['architecture', 'eventing'],
  },
];

const ALL_GENRE_COUNTS = buildGenreCounts(MOCK_ITEMS);

const SEARCH_WAIT_MS = 210;

const wait = async (ms: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });

const waitFrame = async (): Promise<void> =>
  new Promise((resolve) => {
    requestAnimationFrame(() => {
      resolve();
    });
  });

const flush = async (host: SearchPage): Promise<void> => {
  await host.updateComplete;
  await waitFrame();
  await host.updateComplete;
};

const settleSearch = async (host: SearchPage): Promise<void> => {
  await wait(SEARCH_WAIT_MS);
  await flush(host);
};

const getHost = (canvasElement: Element, id: string): SearchPage => {
  const host = canvasElement.querySelector<SearchPage>(`#${id}`);
  if (!host) {
    throw new Error(`#${id} が見つかりません`);
  }

  return host;
};

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function buildGenreCounts(
  items: readonly MockSearchItem[],
  options: {
    includeAllKnownTags?: boolean;
  } = {},
): Record<string, number> {
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
}

function createSearchResponse(
  query: string,
  selectedGenres: readonly string[],
  sortMode: string,
): SearchResponse {
  const normalizedQuery = query.trim().toLowerCase();
  if (normalizedQuery.length === 0 && selectedGenres.length === 0) {
    return {
      total: 0,
      items: [],
      genreCounts: {},
      allGenreCounts: ALL_GENRE_COUNTS,
    } satisfies SearchResponse;
  }

  const queryMatchedItems = MOCK_ITEMS.filter((item) => {
    if (normalizedQuery.length === 0) {
      return true;
    }

    const haystacks = [item.title, item.description, ...item.tags].map((value) => value.toLowerCase());
    return haystacks.some((value) => value.includes(normalizedQuery));
  });

  const filteredItems =
    selectedGenres.length > 0
      ? queryMatchedItems.filter((item) =>
        selectedGenres.some((tag) => item.tags.includes(tag)),
      )
      : queryMatchedItems;

  const sortedItems =
    sortMode === 'date-desc' ? [...filteredItems].sort((left, right) => right.date.localeCompare(left.date, 'ja')) : filteredItems;

  return {
    total: sortedItems.length,
    items: sortedItems.map((item) => ({
      title: item.title,
      url: item.url,
      path: item.path,
      excerptHtml: item.excerptHtml,
      description: item.description,
      date: item.date,
    })),
    genreCounts: buildGenreCounts(sortedItems),
    allGenreCounts: buildGenreCounts(queryMatchedItems, { includeAllKnownTags: true }),
  } satisfies SearchResponse;
}

function installSearchMock(): void {
  pagefindSearchAdapter.search = (query, selectedGenres, sortMode) =>
    Promise.resolve(createSearchResponse(query, selectedGenres, sortMode));

  pagefindSearchAdapter.getAvailableGenres = () => Promise.resolve(ALL_GENRE_COUNTS);
}

function restoreSearchMock(): void {
  pagefindSearchAdapter.search = ORIGINAL_SEARCH;
  pagefindSearchAdapter.getAvailableGenres = ORIGINAL_GET_AVAILABLE_GENRES;
}

const getSearchInput = (field: SearchField | null | undefined): HTMLInputElement => {
  const input = field?.shadowRoot?.querySelector<HTMLInputElement>('input');
  if (!input) {
    throw new Error('ui-search-field 内の input が見つかりません');
  }

  return input;
};

const getFilterDetails = (host: SearchPage): Details => {
  const details = host.shadowRoot?.querySelector<Details>('ui-details.filter-details');
  if (!details) {
    throw new Error('filter details が見つかりません');
  }

  return details;
};

const getFilterTrigger = (host: SearchPage): HTMLButtonElement => {
  const trigger = getFilterDetails(host).shadowRoot?.querySelector<HTMLButtonElement>('button.trigger');
  if (!trigger) {
    throw new Error('filter details の trigger が見つかりません');
  }

  return trigger;
};

const getFilterSearchField = (host: SearchPage): SearchField => {
  const field = host.shadowRoot?.querySelector<SearchField>('ui-search-field.filter-search-field');
  if (!field) {
    throw new Error('タグ絞り込み用の ui-search-field が見つかりません');
  }

  return field;
};

const getFilterCheckbox = (host: SearchPage, label: string): Checkbox => {
  const checkboxes = host.shadowRoot?.querySelectorAll<Checkbox>('ui-checkbox.filter-option-checkbox') ?? [];
  const checkbox = [...checkboxes].find((candidate) => candidate.label === label);
  if (!checkbox) {
    throw new Error(`"${label}" の filter checkbox が見つかりません`);
  }

  return checkbox;
};

const clickCheckboxLabel = async (checkbox: Checkbox): Promise<void> => {
  await checkbox.updateComplete;
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
  assert(
    mismatch === undefined,
    `${context}: "${mismatch?.label ?? 'unknown'}" の checked=${String(mismatch?.checked)} と data-selected=${String(mismatch?.selected)} が不一致です`,
  );
};

const meta: Meta<SearchPage> = {
  title: 'Search/SearchPage',
  component: 'search-page',
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<SearchPage>;

export const QueryAndClearFlow: Story = {
  render: () => {
    installSearchMock();
    return html`<search-page id="search-page-regression"></search-page>`;
  },
  play: async ({ canvasElement }) => {
    await customElements.whenDefined('search-page');
    await customElements.whenDefined('ui-search-field');
    const host = getHost(canvasElement, 'search-page-regression');
    const originalUrl = `${window.location.pathname}${window.location.search}`;

    try {
      await flush(host);

      const searchField = host.shadowRoot?.querySelector<SearchField>('ui-search-field.search-input-control');
      const input = getSearchInput(searchField);
      const clearButton = searchField?.shadowRoot?.querySelector<HTMLButtonElement>('.clear-button');
      assert(!!searchField, 'search-page 内に主検索用 ui-search-field が見つかりません');
      assert(!!clearButton, 'search-page 内の clear button が見つかりません');

      input.value = 'router';
      input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      await settleSearch(host);

      const resultLinks = host.shadowRoot?.querySelectorAll('.result-link') ?? [];
      const currentUrl = new URL(window.location.href);
      assert(resultLinks.length === 2, 'query 入力後に結果が期待通り絞り込まれていません');
      assert(currentUrl.searchParams.get('q') === 'router', 'query 入力時に URL が同期されていません');
      assert(!clearButton.hidden, 'query 入力後に clear button が表示されていません');

      clearButton.click();
      await settleSearch(host);

      const metaRowText = host.shadowRoot?.querySelector('.meta-row')?.textContent ?? '';
      const clearedUrl = new URL(window.location.href);
      assert(input.value === '', 'clear 後に input.value が空になっていません');
      assert(clearedUrl.searchParams.get('q') === null, 'clear 後に URL の query が除去されていません');
      assert(metaRowText.includes('0 件の結果'), 'clear 後の件数表示が更新されていません');
    } finally {
      history.replaceState(history.state, '', originalUrl);
      restoreSearchMock();
    }
  },
};

export const FilterPanelFlow: Story = {
  render: () => {
    installSearchMock();
    return html`
      <div style="max-inline-size: 22.5rem;">
        <search-page id="search-page-filters"></search-page>
      </div>
    `;
  },
  play: async ({ canvasElement }) => {
    await customElements.whenDefined('search-page');
    await customElements.whenDefined('ui-details');
    await customElements.whenDefined('ui-search-field');
    await customElements.whenDefined('ui-checkbox');
    await customElements.whenDefined('ui-tag');
    const host = getHost(canvasElement, 'search-page-filters');
    const originalUrl = `${window.location.pathname}${window.location.search}`;

    try {
      await flush(host);

      const filterDetails = getFilterDetails(host);
      const filterSummaryText = host.shadowRoot?.querySelector('.filter-summary-state')?.textContent ?? '';
      assert(!filterDetails.open, '初期状態のフィルターパネルは閉じている必要があります');
      assert(filterSummaryText.includes('すべてのタグ'), '初期 summary が "すべてのタグ" ではありません');

      getFilterTrigger(host).click();
      await flush(host);

      assert(filterDetails.open, 'フィルターパネルが開いていません');
      const filterList = host.shadowRoot?.querySelector<HTMLElement>('.filter-list');
      assert(!!filterList, 'タグ一覧が描画されていません');
      const filterListStyle = getComputedStyle(filterList);
      assert(filterListStyle.overflowY === 'auto', 'タグ一覧は内部スクロールである必要があります');
      assert(filterListStyle.maxHeight !== 'none', 'タグ一覧に max-height が設定されていません');

      const filterSearchField = getFilterSearchField(host);
      const filterSearchInput = getSearchInput(filterSearchField);
      const urlBeforeFilterSearch = `${window.location.pathname}${window.location.search}`;

      filterSearchInput.value = 'lit';
      filterSearchInput.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      await flush(host);

      const visibleCheckboxesAfterFilter = host.shadowRoot?.querySelectorAll('ui-checkbox.filter-option-checkbox') ?? [];
      assert(visibleCheckboxesAfterFilter.length === 1, 'ローカルタグ検索で候補が絞り込まれていません');
      assert(
        `${window.location.pathname}${window.location.search}` === urlBeforeFilterSearch,
        'ローカルタグ検索で URL が変わってはいけません',
      );

      filterSearchInput.value = '';
      filterSearchInput.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      await flush(host);

      const litCheckbox = getFilterCheckbox(host, 'lit');
      await clickCheckboxLabel(litCheckbox);
      await settleSearch(host);

      const urlAfterTagSelect = new URL(window.location.href);
      const resultLinksAfterTagSelect = host.shadowRoot?.querySelectorAll('.result-link') ?? [];
      assert(urlAfterTagSelect.searchParams.getAll('tag').includes('lit'), 'タグ選択時に URL が同期されていません');
      assert(resultLinksAfterTagSelect.length === 1, 'タグ選択で結果数が更新されていません');

      const mainSearchField = host.shadowRoot?.querySelector<SearchField>('ui-search-field.search-input-control');
      const mainSearchInput = getSearchInput(mainSearchField);
      mainSearchInput.value = 'router';
      mainSearchInput.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      await settleSearch(host);

      const urlAfterQuery = new URL(window.location.href);
      const litCheckboxAfterQuery = getFilterCheckbox(host, 'lit');
      const performanceCheckboxAfterQuery = getFilterCheckbox(host, 'performance');
      const selectedTag = host.shadowRoot?.querySelector<HTMLElement>('.selected-tags ui-tag');
      assert(urlAfterQuery.searchParams.get('q') === 'router', 'query 入力時に URL が同期されていません');
      assert(litCheckboxAfterQuery.checked, 'query 後も選択中タグは維持される必要があります');
      assert(!litCheckboxAfterQuery.disabled, '0件の選択済みタグは再操作可能である必要があります');
      assert(performanceCheckboxAfterQuery.disabled, '0件の未選択タグは disabled である必要があります');
      assert(!!selectedTag, '選択中タグの removable chip が表示されていません');

      selectedTag.dispatchEvent(
        new CustomEvent<{ value: string }>('ui-tag-remove', {
          bubbles: true,
          composed: true,
          detail: { value: 'lit' },
        }),
      );
      await settleSearch(host);

      const urlAfterRemove = new URL(window.location.href);
      const resultLinksAfterRemove = host.shadowRoot?.querySelectorAll('.result-link') ?? [];
      const filterSummaryAfterRemove = host.shadowRoot?.querySelector('.filter-summary-state')?.textContent ?? '';
      assert(
        !urlAfterRemove.searchParams.getAll('tag').includes('lit'),
        'removable chip 削除後に URL から tag が除去されていません',
      );
      assert(resultLinksAfterRemove.length === 2, 'removable chip 削除後に結果数が戻っていません');
      assert(filterSummaryAfterRemove.includes('すべてのタグ'), '最後のタグ削除後に summary が戻っていません');
    } finally {
      history.replaceState(history.state, '', originalUrl);
      restoreSearchMock();
    }
  },
};

export const FilterPanelReorderRegression: Story = {
  render: () => {
    installSearchMock();
    return html`
      <div style="max-inline-size: 22.5rem;">
        <search-page id="search-page-filter-regression"></search-page>
      </div>
    `;
  },
  play: async ({ canvasElement }) => {
    await customElements.whenDefined('search-page');
    await customElements.whenDefined('ui-details');
    await customElements.whenDefined('ui-checkbox');
    const host = getHost(canvasElement, 'search-page-filter-regression');
    const originalUrl = `${window.location.pathname}${window.location.search}`;

    try {
      await flush(host);
      getFilterTrigger(host).click();
      await flush(host);

      const litCheckbox = getFilterCheckbox(host, 'lit');
      await clickCheckboxLabel(litCheckbox);
      await settleSearch(host);

      const statesAfterLitSelect = getFilterOptionStates(host);
      assert(statesAfterLitSelect[0]?.label === 'lit', '非先頭タグ選択後に選択タグが先頭へ移動していません');
      assertFilterSelectionConsistency(host, 'lit 選択後');

      const architectureCheckbox = getFilterCheckbox(host, 'architecture');
      await clickCheckboxLabel(architectureCheckbox);
      await settleSearch(host);

      const statesAfterArchitectureSelect = getFilterOptionStates(host);
      assert(statesAfterArchitectureSelect[0]?.label === 'architecture', '高頻度タグ選択後に並び順が更新されていません');
      assert(statesAfterArchitectureSelect[1]?.label === 'lit', '先に選択したタグの相対位置が期待通りではありません');
      assertFilterSelectionConsistency(host, 'architecture 選択後');

      const architectureCheckboxAtTop = getFilterCheckbox(host, 'architecture');
      await clickCheckboxLabel(architectureCheckboxAtTop);
      await settleSearch(host);

      const statesAfterArchitectureRemove = getFilterOptionStates(host);
      const topStateAfterRemove = statesAfterArchitectureRemove[0];
      assert(topStateAfterRemove !== undefined, '先頭のタグ状態が存在しません');
      assert(topStateAfterRemove.label === 'lit', '先頭タグ解除後に残った選択タグが先頭へ戻っていません');
      assert(topStateAfterRemove.selected, '残った選択タグが選択状態ではありません');
      assert(topStateAfterRemove.checked, '残った選択タグの checkbox が checked ではありません');

      const architectureState = statesAfterArchitectureRemove.find((state) => state.label === 'architecture');
      assert(!architectureState?.selected, '解除したタグが data-selected=true のままです');
      assert(!architectureState?.checked, '解除したタグの checkbox が checked のままです');
      assertFilterSelectionConsistency(host, 'architecture 解除後');
    } finally {
      history.replaceState(history.state, '', originalUrl);
      restoreSearchMock();
    }
  },
};
