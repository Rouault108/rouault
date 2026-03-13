import type { Meta, StoryObj } from '@storybook/web-components';
import { html } from 'lit';
import { pagefindSearchAdapter, type SearchResponse } from '../../lib/search/pagefind-search.js';
import './search-page.js';
import type { SearchField } from '../ui/search-field/search-field.js';
import type { SearchPage } from './search-page.js';

const ORIGINAL_SEARCH = pagefindSearchAdapter.search;
const ORIGINAL_GET_AVAILABLE_GENRES = pagefindSearchAdapter.getAvailableGenres;

const SEARCH_RESPONSE = {
  total: 2,
  genreCounts: {
    lit: 1,
    router: 1,
  },
  allGenreCounts: {
    lit: 1,
    router: 1,
  },
  items: [
    {
      title: 'Router 設計メモ',
      url: '/notes/router-design',
      path: '/notes/router-design',
      excerptHtml: 'Router の設計と遷移制御をまとめたメモです。',
      description: 'Router の設計ノート',
      date: '2026-03-01',
    },
    {
      title: 'Lit レンダリング最適化',
      url: '/notes/lit-performance',
      path: '/notes/lit-performance',
      excerptHtml: 'Lit の描画最適化と差分更新をまとめています。',
      description: 'Lit の描画最適化メモ',
      date: '2026-02-12',
    },
  ],
} satisfies SearchResponse;

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

const meta: Meta<SearchPage> = {
  title: 'Search/SearchPage',
  component: 'search-page',
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<SearchPage>;

export const QueryAndClearFlow: Story = {
  render: () => {
    pagefindSearchAdapter.search = async (query, selectedGenres, sortMode) => {
      const normalizedQuery = query.trim().toLowerCase();
      if (normalizedQuery.length === 0 && selectedGenres.length === 0) {
        return {
          total: 0,
          items: [],
          genreCounts: {},
          allGenreCounts: SEARCH_RESPONSE.allGenreCounts,
        } satisfies SearchResponse;
      }

      const filteredItems = SEARCH_RESPONSE.items.filter((item) => {
        const matchesQuery =
          normalizedQuery.length === 0 ||
          item.title.toLowerCase().includes(normalizedQuery) ||
          item.description.toLowerCase().includes(normalizedQuery);
        const matchesTag =
          selectedGenres.length === 0 ||
          selectedGenres.some((tag) => item.title.toLowerCase().includes(tag.toLowerCase()));

        return matchesQuery && matchesTag;
      });

      return {
        total: filteredItems.length,
        items: sortMode === 'date-desc' ? [...filteredItems].reverse() : filteredItems,
        genreCounts: SEARCH_RESPONSE.genreCounts,
        allGenreCounts: SEARCH_RESPONSE.allGenreCounts,
      } satisfies SearchResponse;
    };

    pagefindSearchAdapter.getAvailableGenres = async () => SEARCH_RESPONSE.allGenreCounts;

    return html`<search-page id="search-page-regression"></search-page>`;
  },
  play: async ({ canvasElement }) => {
    await customElements.whenDefined('search-page');
    await customElements.whenDefined('ui-search-field');
    const host = getHost(canvasElement, 'search-page-regression');
    const originalUrl = `${window.location.pathname}${window.location.search}`;
    await flush(host);

    const searchField = host.shadowRoot?.querySelector<SearchField>('ui-search-field');
    const input = searchField?.shadowRoot?.querySelector<HTMLInputElement>('input');
    const clearButton = searchField?.shadowRoot?.querySelector<HTMLButtonElement>('.clear-button');
    assert(!!searchField, 'search-page 内に ui-search-field が見つかりません');
    assert(!!input, 'search-page 内の検索 input が見つかりません');
    assert(!!clearButton, 'search-page 内の clear button が見つかりません');

    input.value = 'router';
    input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    await settleSearch(host);

    const resultLinks = host.shadowRoot?.querySelectorAll('.result-link') ?? [];
    const currentUrl = new URL(window.location.href);
    assert(resultLinks.length === 1, 'query 入力後に結果が絞り込まれていません');
    assert(currentUrl.searchParams.get('q') === 'router', 'query 入力時に URL が同期されていません');
    assert(!clearButton.hidden, 'query 入力後に clear button が表示されていません');

    clearButton.click();
    await settleSearch(host);

    const metaRowText = host.shadowRoot?.querySelector('.meta-row')?.textContent ?? '';
    const clearedUrl = new URL(window.location.href);
    assert(input.value === '', 'clear 後に input.value が空になっていません');
    assert(clearedUrl.searchParams.get('q') === null, 'clear 後に URL の query が除去されていません');
    assert(metaRowText.includes('0 件の結果'), 'clear 後の件数表示が更新されていません');

    history.replaceState(history.state, '', originalUrl);
    pagefindSearchAdapter.search = ORIGINAL_SEARCH;
    pagefindSearchAdapter.getAvailableGenres = ORIGINAL_GET_AVAILABLE_GENRES;
  },
};
