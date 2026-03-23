import { describe, expect, it } from 'vitest';

import { buildSearchCatalog, serializeSearchCatalog } from '../../src/data/searchCatalog.js';

describe('buildSearchCatalog', () => {
  it('公開ノートから検索カタログを構築すること', () => {
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
          'ソート',
          'アルゴリズム',
          '比較',
          '主要',
          'な',
          'の',
          '計算',
          '量',
          'と',
          '特徴',
          'を',
          'する',
          'メモ',
        ],
        tags: ['computer-science', 'algorithms'],
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
        keywords: ['public', '公開', 'ノート'],
        tags: [],
      },
    ]);
  });

  it('検索カタログ JSON を安定した形式でシリアライズできること', () => {
    const json = serializeSearchCatalog([
      {
        title: '公開ノート',
        permalink: '/notes/public/',
        slug: 'public',
        description: '説明',
      },
    ]);

    expect(json).toBe(
      '[{"title":"公開ノート","url":"/notes/public/","path":"/notes/public/","description":"説明","date":"","keywords":["public","公開","ノート","説明"],"tags":[]}]',
    );
  });
});
