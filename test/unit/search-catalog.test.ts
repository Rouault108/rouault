import { expect } from '@open-wc/testing';

import {
  loadSearchCatalog,
  mergeSearchDialogItems,
  searchSearchCatalog,
  type SearchCatalogItem,
} from '../../src/lib/search/search-catalog.js';

describe('search-catalog', () => {
  const catalog: SearchCatalogItem[] = [
    {
      title: '交響曲第9番 ニ短調',
      url: '/notes/music/classical/beethoven/symphony-9/',
      path: '/notes/music/classical/beethoven/symphony-9/',
      description: 'ベートーヴェンの交響曲分析メモ',
      keywords: ['music', 'classical', 'symphony', '交響曲', '分析', 'メモ'],
      tags: ['music', 'classical', 'symphony'],
    },
    {
      title: 'ソートアルゴリズム比較',
      url: '/notes/computer-science/algorithms/sorting/',
      path: '/notes/computer-science/algorithms/sorting/',
      description: '主要な計算量の比較メモ',
      keywords: ['computer-science', 'algorithms', 'sorting', '計算', '量', '比較'],
      tags: ['computer-science', 'algorithms'],
    },
  ];

  it('カタログ検索 helper は title / path / keywords を横断すること', () => {
    expect(searchSearchCatalog(catalog, 'classical symphony').map((item) => item.title)).to.deep.equal([
      '交響曲第9番 ニ短調',
    ]);
    expect(searchSearchCatalog(catalog, 'algorithms').map((item) => item.title)).to.deep.equal([
      'ソートアルゴリズム比較',
    ]);
  });

  it('ダイアログ item merge は canonical 単位で重複を吸収すること', () => {
    const merged = mergeSearchDialogItems(
      [
        {
          id: '/notes/program/sample-javascript/',
          title: 'JavaScriptの配列',
          url: '/notes/program/sample-javascript/',
          canonicalUrl: '/notes/program/sample-javascript/',
          path: '/notes/program/sample-javascript/',
        },
      ],
      [
        {
          id: '/notes/program/sample-javascript/',
          title: 'JavaScriptの配列',
          url: '/notes/program/sample-javascript',
          canonicalUrl: '/notes/program/sample-javascript/',
          path: '/notes/program/sample-javascript',
        },
      ],
      'javascript',
    );

    expect(merged).to.deep.equal([
      {
        id: '/notes/program/sample-javascript/',
        title: 'JavaScriptの配列',
        url: '/notes/program/sample-javascript/',
        canonicalUrl: '/notes/program/sample-javascript/',
        path: '/notes/program/sample-javascript/',
      },
    ]);
  });

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
});
