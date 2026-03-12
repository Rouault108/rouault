import { describe, expect, it } from 'vitest';

import { buildSearchCatalog } from '../../src/data/searchCatalog.js';

describe('buildSearchCatalog', () => {
  it('公開ノートから検索ダイアログ用カタログを構築すること', () => {
    const catalog = buildSearchCatalog([
      {
        title: 'ソートアルゴリズム比較',
        permalink: '/notes/computer-science/algorithms/sorting/',
        slug: 'computer-science/algorithms/sorting',
        description: '主要なソートアルゴリズムの計算量と特徴を比較するメモ',
        date: '2026-02-10',
        genre: ['computer-science', 'algorithms'],
      },
    ]);

    expect(catalog).toEqual([
      {
        title: 'ソートアルゴリズム比較',
        url: '/notes/computer-science/algorithms/sorting/',
        path: '/notes/computer-science/algorithms/sorting/',
        description: '主要なソートアルゴリズムの計算量と特徴を比較するメモ',
        date: '2026-02-10',
        keywords: [
          'computer-science/algorithms/sorting',
          'computer-science',
          'algorithms',
          'sorting',
          'computer',
          'science',
        ],
        genres: ['computer-science', 'algorithms'],
      },
    ]);
  });

  it('draft ノートを除外し、不完全なノートは出力しないこと', () => {
    const catalog = buildSearchCatalog([
      {
        title: '下書き',
        permalink: '/notes/draft/',
        slug: 'draft',
        status: 'draft',
      },
      {
        title: '',
        permalink: '/notes/invalid/',
        slug: 'invalid',
      },
      {
        title: '公開ノート',
        permalink: '/notes/public/',
        slug: 'public',
      },
    ]);

    expect(catalog).toEqual([
      {
        title: '公開ノート',
        url: '/notes/public/',
        path: '/notes/public/',
        description: '',
        date: '',
        keywords: ['public'],
        genres: [],
      },
    ]);
  });
});
