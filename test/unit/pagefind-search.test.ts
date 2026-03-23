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
      url: '/notes/music/jazz/jazz-theory/',
      path: '/notes/music/jazz/jazz-theory/',
      description: 'ジャズ音楽の基本理論',
      date: '2026-02-01',
      keywords: ['music', 'jazz', '理論'],
      tags: ['music', 'jazz'],
    },
    {
      title: 'クラシック入門',
      url: '/notes/music/classical/intro/',
      path: '/notes/music/classical/intro/',
      description: '古典派メモ',
      date: '2026-01-10',
      keywords: ['music', 'classical', '古典派'],
      tags: ['music', 'classical'],
    },
  ];

  let searchCalls: {
    term: string | null;
    filters?: Record<string, unknown>;
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
        searchCalls.push({
          term,
          ...(options.filters ? { filters: options.filters } : {}),
          ...(options.sort ? { sort: options.sort } : {}),
        });

        return Promise.resolve({
          results: [
            {
              data() {
                return Promise.resolve({
                  url: '/notes/music/jazz/jazz-theory/',
                  excerpt: '<mark>ジャズ</mark>理論の基礎',
                  meta: {
                    title: 'ジャズ理論の基礎',
                    description: 'ジャズ音楽の基本理論',
                    date: '2026-02-01',
                    genre: 'music,jazz',
                  },
                });
              },
            },
            {
              data() {
                return Promise.resolve({
                  url: '/notes/music/classical/intro/',
                  excerpt: 'クラシック入門',
                  meta: {
                    title: 'クラシック入門',
                    description: '古典派メモ',
                    date: '2026-01-10',
                    genre: 'music,classical',
                  },
                });
              },
            },
          ],
          unfilteredResultCount: 2,
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

    adapter = createPagefindSearchAdapter(() => Promise.resolve(api), {
      loadSearchCatalog: () => Promise.resolve(catalogItems),
    });
  });

  it('利用可能なタグ一覧は catalog から導出すること', async () => {
    expect(await adapter.getAvailableGenres()).to.deep.equal({
      classical: 1,
      jazz: 1,
      music: 2,
    });
  });

  it('Pagefind 検索結果を仕様形へ正規化し、最終タグ意味論は core で担うこと', async () => {
    const result = await adapter.search('ジャズ理論', ['music'], 'relevance');

    expect(searchCalls).to.deep.equal([
      {
        term: 'ジャズ 理論',
      },
    ]);
    expect(result.items.map((item) => item.canonicalUrl)).to.deep.equal([
      '/notes/music/jazz/jazz-theory/',
    ]);
    expect(result.items[0]?.snippet).to.deep.equal({
      segments: [
        { text: 'ジャズ', matched: true },
        { text: '理論の基礎', matched: false },
      ],
    });
    expect(result.tagCounts).to.deep.equal({
      jazz: 1,
      music: 1,
    });
    expect(result.allTagCounts).to.deep.equal({
      jazz: 1,
      music: 1,
    });
  });

  it('date-desc は Pagefind へ委譲せず core で解決すること', async () => {
    const result = await adapter.search('', ['music'], 'date-desc');

    expect(searchCalls).to.deep.equal([
      {
        term: null,
      },
    ]);
    expect(result.items.map((item) => item.title)).to.deep.equal([
      'ジャズ理論の基礎',
      'クラシック入門',
    ]);
  });

  it('Pagefind 読み込み失敗時は search-catalog に縮退すること', async () => {
    const fallbackAdapter = createPagefindSearchAdapter(
      () => Promise.reject(new Error('Failed to fetch dynamically imported module')),
      {
        loadSearchCatalog: () => Promise.resolve(catalogItems),
      },
    );

    const result = await fallbackAdapter.search('ジャズ', ['music'], 'relevance');

    expect(result.items[0]?.canonicalUrl).to.equal('/notes/music/jazz/jazz-theory/');
    expect(result.items[0]?.title).to.equal('ジャズ理論の基礎');
    expect(result.items[0]?.url).to.equal('/notes/music/jazz/jazz-theory/');
    expect(result.diagnostics.failures).to.deep.equal(['pagefind-load-failed']);
  });

  it('Pagefind facet count が欠落しても active のまま degraded になること', async () => {
    const degradedAdapter = createPagefindSearchAdapter(
      () =>
        Promise.resolve({
          filters: () => Promise.resolve({}),
          search: () =>
            Promise.resolve({
              results: [
                {
                  data() {
                    return Promise.resolve({
                      url: '/notes/music/jazz/jazz-theory/',
                      excerpt: 'ジャズ理論の基礎',
                      meta: {
                        title: 'ジャズ理論の基礎',
                        description: 'ジャズ音楽の基本理論',
                        date: '2026-02-01',
                        genre: 'music,jazz',
                      },
                    });
                  },
                },
              ],
              unfilteredResultCount: 1,
            }),
        }),
      {
        loadSearchCatalog: () => Promise.resolve(catalogItems),
      },
    );

    const result = await degradedAdapter.search('ジャズ', [], 'relevance');

    expect(result.diagnostics.degraded).to.equal(true);
    expect(result.diagnostics.failures).to.deep.equal(['pagefind-filter-read-failed']);
    expect(result.diagnostics.activeSources).to.deep.equal(['pagefind', 'catalog']);
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
    expect(await module.search('', {})).to.deep.equal({
      results: [],
      unfilteredResultCount: 0,
    });
    expect(await module.filters()).to.deep.equal({});
  });
});
