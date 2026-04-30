import { describe, expect, it } from 'vitest';

import {
  getSearchCatalog,
  loadSearchCatalog,
  resetSearchCatalogCache,
  type SearchCatalogItem,
} from '../../shared/search/search-catalog.js';

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, resolve, reject };
}

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

  it('getSearchCatalog は失敗 Promise を永続メモ化しないこと', async () => {
    const originalFetch = globalThis.fetch;
    let fetchCount = 0;
    const catalog: SearchCatalogItem[] = [
      {
        title: '再試行ノート',
        url: '/notes/retry/',
        path: '/notes/retry/',
        description: '',
        date: '',
        keywords: [],
        tags: [],
      },
    ];

    globalThis.fetch = (() => {
      fetchCount += 1;
      if (fetchCount === 1) {
        return Promise.reject(new Error('temporary failure'));
      }

      return Promise.resolve(
        new Response(JSON.stringify(catalog), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }) as typeof fetch;

    resetSearchCatalogCache();

    try {
      await expect(getSearchCatalog()).rejects.toMatchObject({ name: 'SearchCatalogLoadError' });
      expect(await getSearchCatalog()).to.deep.equal(catalog);
      expect(fetchCount).to.equal(2);
    } finally {
      resetSearchCatalogCache();
      globalThis.fetch = originalFetch;
    }
  });

  it('resetSearchCatalogCache 後に古い Promise が cache へ再注入されないこと', async () => {
    const originalFetch = globalThis.fetch;
    const first = createDeferred<Response>();
    let fetchCount = 0;
    const oldCatalog: SearchCatalogItem[] = [
      {
        title: '古いノート',
        url: '/notes/old/',
        path: '/notes/old/',
        description: '',
        date: '',
        keywords: [],
        tags: [],
      },
    ];
    const newCatalog: SearchCatalogItem[] = [
      {
        title: '新しいノート',
        url: '/notes/new/',
        path: '/notes/new/',
        description: '',
        date: '',
        keywords: [],
        tags: [],
      },
    ];

    globalThis.fetch = (() => {
      fetchCount += 1;
      if (fetchCount === 1) {
        return first.promise;
      }

      return Promise.resolve(
        new Response(JSON.stringify(newCatalog), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }) as typeof fetch;

    resetSearchCatalogCache();

    try {
      const oldRequest = getSearchCatalog();
      resetSearchCatalogCache();

      first.resolve(
        new Response(JSON.stringify(oldCatalog), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      expect(await oldRequest).to.deep.equal(oldCatalog);
      expect(await getSearchCatalog()).to.deep.equal(newCatalog);
      expect(await getSearchCatalog()).to.deep.equal(newCatalog);
      expect(fetchCount).to.equal(2);
    } finally {
      resetSearchCatalogCache();
      globalThis.fetch = originalFetch;
    }
  });
});
