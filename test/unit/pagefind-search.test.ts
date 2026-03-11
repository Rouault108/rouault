import { expect } from '@open-wc/testing';

import {
  createPagefindSearchAdapter,
  type PagefindApi,
  type SearchAdapter,
} from '../../src/lib/search/pagefind-search.js';

describe('pagefind-search', () => {
  let searchCalls: Array<{ term: string | null; filters?: Record<string, string[]> }>;
  let adapter: SearchAdapter;

  beforeEach(() => {
    searchCalls = [];

    const api: PagefindApi = {
      async filters() {
        return {
          genre: {
            music: 2,
            jazz: 1,
            classical: 1,
          },
        };
      },
      async search(term, options = {}) {
        searchCalls.push({ term, filters: options.filters });
        return {
          results: [
            {
              async data() {
                return {
                  url: '/notes/music/jazz/jazz-theory/',
                  excerpt: '<mark>ジャズ</mark>理論の基礎',
                  meta: {
                    title: 'ジャズ理論の基礎',
                    description: 'ジャズ音楽の基本理論',
                    date: '2026-02-01',
                  },
                };
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
        };
      },
    };

    adapter = createPagefindSearchAdapter(async () => api);
  });

  it('利用可能なタグ一覧を取得すること', async () => {
    expect(await adapter.getAvailableGenres()).to.deep.equal({
      classical: 1,
      jazz: 1,
      music: 2,
    });
  });

  it('Pagefind 検索結果をアプリ用モデルに正規化すること', async () => {
    const result = await adapter.search('ジャズ', ['music']);

    expect(searchCalls).to.deep.equal([
      {
        term: 'ジャズ',
        filters: {
          genre: ['music'],
        },
      },
    ]);
    expect(result.total).to.equal(1);
    expect(result.items).to.deep.equal([
      {
        title: 'ジャズ理論の基礎',
        url: '/notes/music/jazz/jazz-theory/',
        path: '/notes/music/jazz/jazz-theory/',
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
    const result = await adapter.search('', []);

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
    await adapter.search('', ['music', 'jazz']);

    expect(searchCalls).to.deep.equal([
      {
        term: null,
        filters: {
          genre: ['music', 'jazz'],
        },
      },
    ]);
  });
});
