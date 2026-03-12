import { expect } from '@open-wc/testing';

import {
  loadSearchCatalog,
  mergeSearchDialogItems,
  searchSearchCatalog,
  type SearchCatalogItem,
  type SearchDialogItem,
} from '../../src/lib/search/search-catalog.js';

describe('search-catalog', () => {
  const catalog: SearchCatalogItem[] = [
    {
      title: '交響曲第9番 ニ短調',
      url: '/notes/music/classical/beethoven/symphony-9/',
      path: '/notes/music/classical/beethoven/symphony-9/',
      keywords: ['music', 'classical', 'symphony'],
      genres: ['music', 'classical', 'symphony'],
    },
    {
      title: 'ソートアルゴリズム比較',
      url: '/notes/computer-science/algorithms/sorting/',
      path: '/notes/computer-science/algorithms/sorting/',
      keywords: ['computer-science', 'algorithms', 'sorting'],
      genres: ['computer-science', 'algorithms'],
    },
  ];

  it('token 単位で title / path / keywords を検索できること', () => {
    expect(searchSearchCatalog(catalog, 'classical symphony')).to.deep.equal([
      {
        title: '交響曲第9番 ニ短調',
        url: '/notes/music/classical/beethoven/symphony-9/',
        path: '/notes/music/classical/beethoven/symphony-9/',
        keywords: ['music', 'classical', 'symphony'],
      },
    ]);

    expect(searchSearchCatalog(catalog, 'algorithms')).to.deep.equal([
      {
        title: 'ソートアルゴリズム比較',
        url: '/notes/computer-science/algorithms/sorting/',
        path: '/notes/computer-science/algorithms/sorting/',
        keywords: ['computer-science', 'algorithms', 'sorting'],
      },
    ]);
  });

  it('Pagefind 結果と補助カタログ結果を重複なくマージすること', () => {
    const merged = mergeSearchDialogItems(
      [
        {
          title: '交響曲第9番 ニ短調',
          url: '/notes/music/classical/beethoven/symphony-9/',
          path: '/notes/music/classical/beethoven/symphony-9/',
          date: '2026-02-01',
          pagefindBacked: true,
        },
      ],
      searchSearchCatalog(catalog, 'al'),
      'al',
    );

    expect(merged).to.deep.equal([
      {
        title: '交響曲第9番 ニ短調',
        url: '/notes/music/classical/beethoven/symphony-9/',
        path: '/notes/music/classical/beethoven/symphony-9/',
        keywords: ['music', 'classical', 'symphony'],
      },
      {
        title: 'ソートアルゴリズム比較',
        url: '/notes/computer-science/algorithms/sorting/',
        path: '/notes/computer-science/algorithms/sorting/',
        keywords: ['computer-science', 'algorithms', 'sorting'],
      },
    ]);
  });

  it('ダイアログ再ランキングが title exact > title prefix > path/keyword exact token > pagefind を満たすこと', () => {
    const merged = mergeSearchDialogItems(
      [
        {
          title: 'Body-only hit',
          url: '/notes/text-hit/',
          path: '/notes/text-hit/',
          date: '2026-01-01',
          pagefindBacked: true,
        },
      ],
      [
        {
          title: 'jazz theory',
          url: '/notes/jazz-theory-exact/',
          path: '/notes/jazz-theory-exact/',
          date: '2026-01-03',
        },
        {
          title: 'jazz theory intro',
          url: '/notes/jazz-theory-intro/',
          path: '/notes/jazz-theory-intro/',
          date: '2026-01-02',
        },
        {
          title: 'music memo',
          url: '/notes/jazz-keyword/',
          path: '/notes/music/jazz/',
          keywords: ['jazz', 'music'],
          date: '2026-01-04',
        },
      ] satisfies SearchDialogItem[],
      'jazz theory',
    );

    expect(merged.map((item) => item.url)).to.deep.equal([
      '/notes/jazz-theory-exact/',
      '/notes/jazz-theory-intro/',
      '/notes/jazz-keyword/',
      '/notes/text-hit/',
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
          keywords: [' algorithms ', '', 123],
          genres: [' computer-science ', 'algorithms'],
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

    const items = await loadSearchCatalog(async () => response);

    expect(items).to.deep.equal([
      {
        title: 'ソートアルゴリズム比較',
        url: '/notes/computer-science/algorithms/sorting/',
        path: '/notes/computer-science/algorithms/sorting/',
        description: '比較メモ',
        date: '2026-02-10',
        keywords: ['algorithms'],
        genres: ['computer-science', 'algorithms'],
      },
    ]);
  });
});
