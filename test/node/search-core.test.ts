import { describe, expect, it } from 'vitest';

import { createSearchCore, type PagefindApi } from '../../src/search/search-core.js';
import { createAbortError } from '../../src/search/abort.js';
import type { SearchCatalogItem } from '../../shared/search/search-catalog.js';
import type { SearchRequest } from '../../shared/search/search-types.js';

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

  const navigateMusicRequest = {
    mode: 'navigate',
    q: 'music',
    tags: [],
    tagMode: 'or',
    sort: 'relevance',
  } satisfies SearchRequest;

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

  it('runtime 検索は /notes/testing/ のような path 名特例で結果を捨てないこと', async () => {
    const core = createSearchCore({
      loadPagefind: () =>
        Promise.resolve({
          filters() {
            return Promise.resolve({});
          },
          search() {
            return Promise.resolve({
              results: [
                {
                  data() {
                    return Promise.resolve({
                      url: '/notes/testing/interactive/',
                      excerpt: '<mark>ジャズ</mark> testing note',
                      meta: {
                        title: 'Testing Jazz Fixture',
                        description: 'ジャズ向け internal testing note',
                        date: '2026-03-20',
                        genre: 'testing,jazz',
                      },
                    });
                  },
                },
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
              ],
              unfilteredResultCount: 2,
              totalFilters: {
                genre: {
                  testing: 1,
                  music: 1,
                  jazz: 1,
                },
              },
            });
          },
        }),
      loadSearchCatalog: () =>
        Promise.resolve([
          ...catalogItems,
          {
            title: 'Testing Jazz Fixture',
            url: '/notes/testing/interactive/',
            path: '/notes/testing/interactive/',
            description: 'ジャズ向け internal testing note',
            date: '2026-03-20',
            keywords: ['testing', 'ジャズ'],
            tags: ['testing', 'jazz'],
          },
        ]),
      now: () => Date.parse('2026-03-23T00:00:00Z'),
    });

    const response = await core.search({
      mode: 'explore',
      q: 'ジャズ',
      tags: [],
      tagMode: 'or',
      sort: 'relevance',
    });

    expect(response.mode).to.equal('explore');
    expect(response.items.some((item) => item.url.startsWith('/notes/testing/'))).to.equal(true);
    expect(response.items.map((item) => item.title)).to.include('Testing Jazz Fixture');
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

  it('abort 済み signal では source loader を呼ばないこと', async () => {
    const controller = new AbortController();
    controller.abort();
    let pagefindLoadCount = 0;
    let catalogLoadCount = 0;
    const core = createSearchCore({
      loadPagefind: () => {
        pagefindLoadCount += 1;
        return Promise.resolve(createPagefindApi());
      },
      loadSearchCatalog: () => {
        catalogLoadCount += 1;
        return Promise.resolve(catalogItems);
      },
    });

    await expect(
      core.search(
        {
          mode: 'explore',
          q: 'music',
          tags: [],
          tagMode: 'or',
          sort: 'relevance',
        },
        { signal: controller.signal },
      ),
    ).rejects.toMatchObject({ name: 'AbortError' });

    expect(pagefindLoadCount).to.equal(0);
    expect(catalogLoadCount).to.equal(0);
  });

  it('Pagefind loader 失敗を永続メモ化せず次回検索で再試行すること', async () => {
    let pagefindLoadCount = 0;
    const core = createSearchCore({
      loadPagefind: () => {
        pagefindLoadCount += 1;
        if (pagefindLoadCount === 1) {
          return Promise.reject(new Error('temporary pagefind failure'));
        }

        return Promise.resolve(createPagefindApi());
      },
      loadSearchCatalog: () => Promise.resolve(catalogItems),
    });

    await core.search({
      mode: 'navigate',
      q: 'ジャズ',
      tags: [],
      tagMode: 'or',
      sort: 'relevance',
    });
    await core.search({
      mode: 'navigate',
      q: 'ジャズ',
      tags: [],
      tagMode: 'or',
      sort: 'relevance',
    });

    expect(pagefindLoadCount).to.equal(2);
  });

  it('Pagefind result.data() の通常 reject は source failure に分類し catalog fallback を返すこと', async () => {
    const core = createSearchCore({
      loadPagefind: () =>
        Promise.resolve({
          filters() {
            return Promise.resolve({});
          },
          search() {
            return Promise.resolve({
              results: [
                {
                  data() {
                    return Promise.reject(new Error('data failed'));
                  },
                },
              ],
              unfilteredResultCount: 1,
              totalFilters: {},
            });
          },
        }),
      loadSearchCatalog: () => Promise.resolve(catalogItems),
    });

    const response = await core.search({
      mode: 'navigate',
      q: 'ジャズ',
      tags: [],
      tagMode: 'or',
      sort: 'relevance',
    });

    expect(response.items.map((item) => item.title)).to.include('ジャズ理論の基礎');
    expect(response.diagnostics.failures).to.include('pagefind-search-failed');
  });

  it('source が AbortError を投げた場合は diagnostics に変換しないこと', async () => {
    const core = createSearchCore({
      loadPagefind: () => Promise.reject(createAbortError()),
      loadSearchCatalog: () => Promise.resolve(catalogItems),
    });

    await expect(core.search(navigateMusicRequest)).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('Pagefind load の catch 時に abort 済みなら通常 failure へ変換しないこと', async () => {
    const controller = new AbortController();
    const core = createSearchCore({
      loadPagefind: () => {
        controller.abort();
        return Promise.reject(new Error('late load failure'));
      },
      loadSearchCatalog: () => Promise.resolve(catalogItems),
    });

    await expect(core.search(navigateMusicRequest, { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('Pagefind search の catch 時に abort 済みなら通常 failure へ変換しないこと', async () => {
    const controller = new AbortController();
    const core = createSearchCore({
      loadPagefind: () =>
        Promise.resolve({
          filters() {
            return Promise.resolve({});
          },
          search() {
            controller.abort();
            return Promise.reject(new Error('late search failure'));
          },
        }),
      loadSearchCatalog: () => Promise.resolve(catalogItems),
    });

    await expect(core.search(navigateMusicRequest, { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('Pagefind result.data() の AbortError は pagefind-search-failed に変換しないこと', async () => {
    const core = createSearchCore({
      loadPagefind: () =>
        Promise.resolve({
          filters() {
            return Promise.resolve({});
          },
          search() {
            return Promise.resolve({
              results: [
                {
                  data() {
                    return Promise.reject(createAbortError());
                  },
                },
              ],
              unfilteredResultCount: 1,
              totalFilters: {},
            });
          },
        }),
      loadSearchCatalog: () => Promise.resolve(catalogItems),
    });

    await expect(core.search(navigateMusicRequest)).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('Pagefind result.data() の catch 時に abort 済みなら通常 failure へ変換しないこと', async () => {
    const controller = new AbortController();
    const core = createSearchCore({
      loadPagefind: () =>
        Promise.resolve({
          filters() {
            return Promise.resolve({});
          },
          search() {
            return Promise.resolve({
              results: [
                {
                  data() {
                    controller.abort();
                    return Promise.reject(new Error('late data failure'));
                  },
                },
              ],
              unfilteredResultCount: 1,
              totalFilters: {},
            });
          },
        }),
      loadSearchCatalog: () => Promise.resolve(catalogItems),
    });

    await expect(core.search(navigateMusicRequest, { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('Pagefind candidate 正規化中の abort では SearchResponse を返さないこと', async () => {
    const controller = new AbortController();
    const rawResult = {
      get url() {
        controller.abort();
        return '/notes/music/jazz/jazz-theory/';
      },
      excerpt: '<mark>ジャズ</mark>理論の基礎',
      meta: {
        title: 'ジャズ理論の基礎',
        description: 'ジャズ音楽の基本理論',
        date: '2026-02-01',
        genre: 'music,jazz',
      },
    };
    const core = createSearchCore({
      loadPagefind: () =>
        Promise.resolve({
          filters() {
            return Promise.resolve({});
          },
          search() {
            return Promise.resolve({
              results: [
                {
                  data() {
                    return Promise.resolve(rawResult);
                  },
                },
              ],
              unfilteredResultCount: 1,
              totalFilters: {},
            });
          },
        }),
      loadSearchCatalog: () => Promise.resolve(catalogItems),
    });

    await expect(core.search(navigateMusicRequest, { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('catalog load の catch 時に abort 済みなら通常 failure へ変換しないこと', async () => {
    const controller = new AbortController();
    const core = createSearchCore({
      loadPagefind: () => Promise.resolve(createPagefindApi()),
      loadSearchCatalog: () => {
        controller.abort();
        return Promise.reject(new Error('late catalog failure'));
      },
    });

    await expect(core.search(navigateMusicRequest, { signal: controller.signal })).rejects.toMatchObject({
      name: 'AbortError',
    });
  });

  it('通常 source failure diagnostics は維持すること', async () => {
    const core = createSearchCore({
      loadPagefind: () =>
        Promise.resolve({
          filters() {
            return Promise.resolve({});
          },
          search() {
            return Promise.reject(new Error('pagefind search failed'));
          },
        }),
      loadSearchCatalog: () => Promise.reject(new Error('catalog failed')),
    });

    const response = await core.search(navigateMusicRequest);

    expect(response.diagnostics.failures).to.deep.equal([
      'catalog-fetch-failed',
      'pagefind-search-failed',
      'all-sources-failed',
    ]);
  });
});
