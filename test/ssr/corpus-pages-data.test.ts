import { describe, expect, it } from 'vitest';

import { buildCorpusNavigation, buildCorpusPagesData } from '../../src/data/corpusPages.js';
import type { CorpusPageSourceNote } from '../../src/data/corpusPages.js';

describe('buildCorpusPagesData', () => {
  it('公開ノートをトップレベルのコーパス単位に束ねること', () => {
    const notes: CorpusPageSourceNote[] = [
      {
        title: '音楽',
        permalink: '/notes/music/',
        slug: 'music',
        noteKind: 'directory-index',
        directoryPath: 'music',
        date: '2026-03-01',
      },
      {
        title: '和声のメモ',
        permalink: '/notes/music/harmony/',
        slug: 'music/harmony',
        description: '機能和声の整理',
        updated: '2026-03-10',
        genre: ['music'],
      },
      {
        title: 'ソート比較',
        permalink: '/notes/computer-science/algorithms/',
        slug: 'computer-science/algorithms',
        date: '2026-03-08',
        genre: ['algorithms'],
      },
      {
        title: '非公開',
        permalink: '/notes/music/private/',
        slug: 'music/private',
        status: 'draft',
      },
    ];

    expect(buildCorpusPagesData(notes)).toEqual([
      {
        key: 'computer-science',
        label: 'Computer Science',
        href: '/corpora/computer-science/',
        noteCount: 1,
        latestUpdatedDate: '2026-03-08',
        notes: [
          {
            title: 'ソート比較',
            permalink: '/notes/computer-science/algorithms/',
            description: '',
            date: '2026-03-08',
            slug: 'computer-science/algorithms',
            genres: ['algorithms'],
          },
        ],
      },
      {
        key: 'music',
        label: '音楽',
        href: '/corpora/music/',
        noteCount: 2,
        latestUpdatedDate: '2026-03-10',
        notes: [
          {
            title: '和声のメモ',
            permalink: '/notes/music/harmony/',
            description: '機能和声の整理',
            date: '2026-03-10',
            slug: 'music/harmony',
            genres: ['music'],
          },
          {
            title: '音楽',
            permalink: '/notes/music/',
            description: '',
            date: '2026-03-01',
            slug: 'music',
            genres: [],
          },
        ],
      },
    ]);
  });
});

describe('buildCorpusNavigation', () => {
  it('ヘッダー用に全体入口を先頭へ付与すること', () => {
    expect(
      buildCorpusNavigation([
        {
          key: 'music',
          label: '音楽',
          href: '/corpora/music/',
          noteCount: 2,
          latestUpdatedDate: '2026-03-10',
          notes: [],
        },
      ]),
    ).toEqual([
      {
        key: 'all',
        label: 'すべてのノート',
        href: '/',
      },
      {
        key: 'music',
        label: '音楽',
        href: '/corpora/music/',
      },
    ]);
  });
});
