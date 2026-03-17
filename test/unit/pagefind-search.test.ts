import { expect } from '@open-wc/testing';

import {
  createDefaultPagefindLoader,
  createPagefindSearchAdapter,
  type PagefindApi,
  type SearchAdapter,
} from '../../src/lib/search/pagefind-search.js';
import type { SearchCatalogItem } from '../../src/lib/search/search-catalog.js';

describe('pagefind-search', () => {
  const catalogItems: SearchCatalogItem[] = [
    {
      title: 'ジャズ理論の基礎',
      url: '/notes/music/jazz/jazz-theory',
      path: '/notes/music/jazz/jazz-theory',
      description: 'ジャズ音楽の基本理論',
      date: '2026-02-01',
      keywords: ['music', 'jazz', '理論'],
      genres: ['music', 'jazz'],
    },
    {
      title: 'クラシック入門',
      url: '/notes/music/classical/intro',
      path: '/notes/music/classical/intro',
      description: '古典派メモ',
      date: '2026-01-10',
      keywords: ['music', 'classical', '古典派'],
      genres: ['music', 'classical'],
    },
  ];
  let searchCalls: {
    term: string | null;
    filters?: Record<string, string[]>;
    sort?: Record<string, 'asc' | 'desc'>;
  }[];
  let adapter: SearchAdapter;

  beforeEach(() => {
    searchCalls = [];

    const api: PagefindApi = {
      filters() {
        return Promise.resolve({
          genre: {
            music: 2,
            jazz: 1,
            classical: 1,
          },
        });
      },
      search(term, options = {}) {
        const searchCall: {
          term: string | null;
          filters?: Record<string, string[]>;
          sort?: Record<string, 'asc' | 'desc'>;
        } = { term };
        if (options.filters !== undefined) {
          searchCall.filters = options.filters;
        }
        if (options.sort !== undefined) {
          searchCall.sort = options.sort;
        }
        searchCalls.push(searchCall);
        return Promise.resolve({
          results: [
            {
              data() {
                return Promise.resolve({
                  url: '/notes/music/jazz/jazz-theory',
                  excerpt: '<mark>ジャズ</mark>理論の基礎',
                  meta: {
                    title: 'ジャズ理論の基礎',
                    description: 'ジャズ音楽の基本理論',
                    date: '2026-02-01',
                  },
                });
              },
            },
          ],
          unfilteredResultCount: 1,
          filters: {
            genre: {
              music: 1,
              jazz: 1,
            },
          },
          totalFilters: {
            genre: {
              music: 2,
              jazz: 1,
              classical: 1,
            },
          },
        });
      },
    };

    adapter = createPagefindSearchAdapter(() => Promise.resolve(api));
  });

  it('利用可能なタグ一覧を取得すること', async () => {
    expect(await adapter.getAvailableGenres()).to.deep.equal({
      classical: 1,
      jazz: 1,
      music: 2,
    });
  });

  it('Pagefind 検索結果をアプリ用モデルに正規化すること', async () => {
    const result = await adapter.search('ジャズ理論', ['music'], 'relevance');

    expect(searchCalls).to.deep.equal([
      {
        term: 'ジャズ 理論',
        filters: {
          genre: ['music'],
        },
      },
    ]);
    expect(result.total).to.equal(1);
    expect(result.items).to.deep.equal([
      {
        title: 'ジャズ理論の基礎',
        url: '/notes/music/jazz/jazz-theory',
        path: '/notes/music/jazz/jazz-theory',
        excerptHtml: '<mark>ジャズ</mark>理論の基礎',
        description: 'ジャズ音楽の基本理論',
        date: '2026-02-01',
      },
    ]);
    expect(result.genreCounts).to.deep.equal({
      jazz: 1,
      music: 1,
    });
    expect(result.allGenreCounts).to.deep.equal({
      classical: 1,
      jazz: 1,
      music: 2,
    });
  });

  it('クエリもタグもない時は検索を走らせないこと', async () => {
    const result = await adapter.search('', [], 'relevance');

    expect(searchCalls).to.deep.equal([]);
    expect(result.total).to.equal(0);
    expect(result.items).to.deep.equal([]);
    expect(result.allGenreCounts).to.deep.equal({
      classical: 1,
      jazz: 1,
      music: 2,
    });
  });

  it('タグのみ検索では filter-only 検索を使うこと', async () => {
    await adapter.search('', ['music', 'jazz'], 'relevance');

    expect(searchCalls).to.deep.equal([
      {
        term: null,
        filters: {
          genre: ['music', 'jazz'],
        },
      },
    ]);
  });

  it('新しい順では date sort を Pagefind に渡すこと', async () => {
    await adapter.search('ジャズ', [], 'date-desc');

    expect(searchCalls).to.deep.equal([
      {
        term: 'ジャズ',
        sort: {
          date: 'desc',
        },
      },
    ]);
  });

  it('日付が空でも date sort 検索結果を返すこと', async () => {
    const api: PagefindApi = {
      filters() {
        return Promise.resolve({
          genre: {
            music: 1,
          },
        });
      },
      search() {
        return Promise.resolve({
          results: [
            {
              data() {
                return Promise.resolve({
                  url: '/notes/no-date/',
                  meta: {
                    title: '日付なしノート',
                  },
                });
              },
            },
          ],
          unfilteredResultCount: 1,
          filters: {
            genre: {
              music: 1,
            },
          },
          totalFilters: {
            genre: {
              music: 1,
            },
          },
        });
      },
    };
    const noDateAdapter = createPagefindSearchAdapter(() => Promise.resolve(api));

    const result = await noDateAdapter.search('ノート', [], 'date-desc');

    expect(result.items).to.deep.equal([
      {
        title: '日付なしノート',
        url: '/notes/no-date/',
        path: '/notes/no-date/',
        excerptHtml: '',
        description: '',
        date: '',
      },
    ]);
  });

  it('Pagefind 読み込み失敗時は search-catalog へフォールバックすること', async () => {
    const fallbackAdapter = createPagefindSearchAdapter(
      () => Promise.reject(new Error('Failed to fetch dynamically imported module')),
      {
        loadSearchCatalog: () => Promise.resolve(catalogItems),
      },
    );

    expect(await fallbackAdapter.getAvailableGenres()).to.deep.equal({
      classical: 1,
      jazz: 1,
      music: 2,
    });

    const result = await fallbackAdapter.search('ジャズ', ['music'], 'relevance');

    expect(result.items).to.deep.equal([
      {
        title: 'ジャズ理論の基礎',
        url: '/notes/music/jazz/jazz-theory',
        path: '/notes/music/jazz/jazz-theory',
        excerptHtml: '',
        description: 'ジャズ音楽の基本理論',
        date: '2026-02-01',
      },
    ]);
    expect(result.genreCounts).to.deep.equal({
      jazz: 1,
      music: 1,
    });
    expect(result.allGenreCounts).to.deep.equal({
      jazz: 1,
      music: 1,
    });
  });

  it('Pagefind module を fetch 経由で読み込み basePath を明示できること', async () => {
    const importedUrls: string[] = [];
    const revokedUrls: string[] = [];
    const optionCalls: Record<string, string>[] = [];
    const search = () =>
      Promise.resolve({
        results: [],
        unfilteredResultCount: 0,
      });
    const filters = () => Promise.resolve({});
    const loadPagefind = createDefaultPagefindLoader({
      fetchModule: (moduleUrl) => {
        expect(moduleUrl).to.equal('/pagefind/pagefind.js');
        return Promise.resolve({
          ok: true,
          status: 200,
          text: () => Promise.resolve('export {};'),
        });
      },
      createModuleUrl: (moduleSource) => {
        expect(moduleSource).to.equal('export {};');
        return 'blob:pagefind-module';
      },
      importModule: (moduleUrl) => {
        importedUrls.push(moduleUrl);
        return Promise.resolve({
          options: (nextOptions: Record<string, string>) => {
            optionCalls.push(nextOptions);
            return Promise.resolve();
          },
          search,
          filters,
        });
      },
      revokeModuleUrl: (moduleUrl) => {
        revokedUrls.push(moduleUrl);
      },
    });

    const module = await loadPagefind();

    expect(importedUrls).to.deep.equal(['blob:pagefind-module']);
    expect(optionCalls).to.deep.equal([{ basePath: '/pagefind/' }]);
    expect(revokedUrls).to.deep.equal(['blob:pagefind-module']);
    const searchResult = await module.search('', {});
    expect(searchResult).to.deep.equal({
      results: [],
      unfilteredResultCount: 0,
    });
    const filterResult = await module.filters();
    expect(filterResult).to.deep.equal({});
  });
});
