import { expect } from '@open-wc/testing';

import { createSearchCore, type PagefindApi } from '../../src/search/search-core.js';
import type { SearchCatalogItem } from '../../shared/search/search-catalog.js';

describe('search-core', () => {
  const catalogItems: SearchCatalogItem[] = [
    {
      title: '交響曲第9番 ニ短調',
      url: '/notes/music/classical/beethoven/symphony-9/',
      path: '/notes/music/classical/beethoven/symphony-9/',
      description: 'ベートーヴェンの交響曲分析メモ',
      date: '2026-03-10',
      keywords: ['music', 'classical', 'symphony', '交響曲'],
      tags: ['music', 'classical'],
    },
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
      title: 'ロジック入門',
      url: '/notes/philosophy/logic/',
      path: '/notes/philosophy/logic/',
      description: '形式論理の入門メモ',
      date: '2025-12-24',
      keywords: ['logic', 'philosophy'],
      tags: ['philosophy'],
    },
  ];

  function createPagefindApi(): PagefindApi {
    return {
      filters() {
        return Promise.resolve({});
      },
      search(term) {
        const normalizedTerm = term ?? '';
        const shouldIncludeClassical = normalizedTerm === '' || normalizedTerm.includes('交響曲');
        const shouldIncludeJazz = normalizedTerm === '' || normalizedTerm.includes('ジャズ');

        return Promise.resolve({
          results: [
            ...(shouldIncludeClassical
              ? [
                  {
                    data() {
                      return Promise.resolve({
                        url: '/notes/music/classical/beethoven/symphony-9/',
                        excerpt: '<mark>交響曲</mark>第9番 ニ短調',
                        meta: {
                          title: '交響曲第9番 ニ短調',
                          description: 'ベートーヴェンの交響曲分析メモ',
                          date: '2026-03-10',
                          genre: 'music,classical',
                        },
                      });
                    },
                  },
                ]
              : []),
            ...(shouldIncludeJazz
              ? [
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
                ]
              : []),
          ],
          unfilteredResultCount: 2,
          totalFilters: {
            genre: {
              music: 2,
              classical: 1,
              jazz: 1,
            },
          },
        });
      },
    };
  }

  it('explore モードで query 集合と tag 集合の件数を分けて返すこと', async () => {
    const core = createSearchCore({
      loadPagefind: () => Promise.resolve(createPagefindApi()),
      loadSearchCatalog: () => Promise.resolve(catalogItems),
      now: () => Date.parse('2026-03-23T00:00:00Z'),
    });

    const response = await core.search({
      mode: 'explore',
      q: '',
      tags: ['music'],
      tagMode: 'or',
      sort: 'relevance',
    });

    expect(response.mode).to.equal('explore');
    if (response.mode !== 'explore') {
      throw new Error('mode is not explore');
    }
    expect(response.items.map((item) => item.title)).to.deep.equal([
      '交響曲第9番 ニ短調',
      'ジャズ理論の基礎',
    ]);
    expect(response.tagCounts).to.deep.equal({
      classical: 1,
      jazz: 1,
      music: 2,
    });
    expect(response.allTagCounts).to.deep.equal({
      classical: 1,
      jazz: 1,
      music: 2,
      philosophy: 1,
    });
  });

  it('and 条件は core の後段フィルターで保証すること', async () => {
    const core = createSearchCore({
      loadPagefind: () => Promise.resolve(createPagefindApi()),
      loadSearchCatalog: () => Promise.resolve(catalogItems),
      now: () => Date.parse('2026-03-23T00:00:00Z'),
    });

    const response = await core.search({
      mode: 'explore',
      q: '',
      tags: ['music', 'classical'],
      tagMode: 'and',
      sort: 'relevance',
    });

    expect(response.mode).to.equal('explore');
    expect(response.items.map((item) => item.title)).to.deep.equal(['交響曲第9番 ニ短調']);
  });

  it('navigate モードは結果を 20 件に制限すること', async () => {
    const manyCatalogItems = Array.from({ length: 25 }, (_, index) => ({
      title: `note-${index.toString()}`,
      url: `/notes/note-${index.toString()}/`,
      path: `/notes/note-${index.toString()}/`,
      description: '検索用メモ',
      date: '2026-03-01',
      keywords: ['note'],
      tags: ['memo'],
    })) satisfies SearchCatalogItem[];

    const core = createSearchCore({
      loadPagefind: () => Promise.reject(new Error('missing pagefind')),
      loadSearchCatalog: () => Promise.resolve(manyCatalogItems),
      now: () => Date.parse('2026-03-23T00:00:00Z'),
    });

    const response = await core.search({
      mode: 'navigate',
      q: 'note',
      tags: [],
      tagMode: 'or',
      sort: 'relevance',
    });

    expect(response.mode).to.equal('navigate');
    expect(response.items).to.have.length(20);
    expect(response.total).to.equal(25);
  });

  it('全 source 失敗時は all-sources-failed を返すこと', async () => {
    const core = createSearchCore({
      loadPagefind: () => Promise.reject(new Error('missing pagefind')),
      loadSearchCatalog: () => Promise.reject(new Error('missing catalog')),
    });

    const response = await core.search({
      mode: 'explore',
      q: 'test',
      tags: [],
      tagMode: 'or',
      sort: 'relevance',
    });

    expect(response.mode).to.equal('explore');
    expect(response.items).to.deep.equal([]);
    expect(response.diagnostics.failures).to.deep.equal([
      'catalog-fetch-failed',
      'pagefind-load-failed',
      'all-sources-failed',
    ]);
    expect(response.diagnostics.degraded).to.equal(true);
  });
});
