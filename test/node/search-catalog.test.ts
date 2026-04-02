import { describe, expect, it } from 'vitest';

import {
  getSearchCatalog,
  loadSearchCatalog,
  resetSearchCatalogCache,
  type SearchCatalogItem,
} from '../../shared/search/search-catalog.js';

describe('search-catalog', () => {
  it('検索カタログ JSON を正規化して読み込むこと', async () => {
    const response = new Response(
      JSON.stringify([
        {
          title: ' ソートアルゴリズム比較 ',
          url: '/notes/computer-science/algorithms/sorting/',
          path: '/notes/computer-science/algorithms/sorting/',
          description: ' 比較メモ ',
          date: ' 2026-02-10 ',
          keywords: [' algorithms ', ' 比較 ', '', 123],
          tags: [' computer-science ', 'algorithms'],
        },
        {
          title: '',
          url: '/notes/invalid/',
          path: '/notes/invalid/',
        },
      ]),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    const items = await loadSearchCatalog(() => Promise.resolve(response));

    expect(items).to.deep.equal([
      {
        title: 'ソートアルゴリズム比較',
        url: '/notes/computer-science/algorithms/sorting/',
        path: '/notes/computer-science/algorithms/sorting/',
        description: '比較メモ',
        date: '2026-02-10',
        keywords: ['algorithms', '比較'],
        tags: ['computer-science', 'algorithms'],
      },
      {
        title: '',
        url: '/notes/invalid/',
        path: '/notes/invalid/',
        description: '',
        date: '',
        keywords: [],
        tags: [],
      },
    ]);
  });

  it('getSearchCatalog は loader 結果をキャッシュすること', async () => {
    const catalog: SearchCatalogItem[] = [
      {
        title: '公開ノート',
        url: '/notes/public/',
        path: '/notes/public/',
        description: '',
        date: '',
        keywords: [],
        tags: [],
      },
    ];
    let fetchCount = 0;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (() => {
      fetchCount += 1;
      return Promise.resolve(
        new Response(JSON.stringify(catalog), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }) as typeof fetch;

    resetSearchCatalogCache();

    try {
      expect(await getSearchCatalog()).to.deep.equal(catalog);
      expect(await getSearchCatalog()).to.deep.equal(catalog);
      expect(fetchCount).to.equal(1);
    } finally {
      resetSearchCatalogCache();
      globalThis.fetch = originalFetch;
    }
  });
});
