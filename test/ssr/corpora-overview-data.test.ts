import { describe, expect, it } from 'vitest';

import { buildCorporaOverviewData } from '../../src/data/corporaOverview.js';
import type { CorporaOverviewSourceNote } from '../../src/data/corporaOverview.js';

describe('buildCorporaOverviewData', () => {
  it('コーパス一覧と最近更新ノート一覧を同時に構築すること', () => {
    const notes: CorporaOverviewSourceNote[] = [
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
    ];

    expect(buildCorporaOverviewData(notes)).toEqual({
      corpusCount: 2,
      noteCount: 3,
      latestUpdatedDate: '2026-03-10',
      corpora: [
        {
          key: 'computer-science',
          label: 'Computer Science',
          href: '/corpora/computer-science/',
          noteCount: 1,
          latestUpdatedDate: '2026-03-08',
        },
        {
          key: 'music',
          label: '音楽',
          href: '/corpora/music/',
          noteCount: 2,
          latestUpdatedDate: '2026-03-10',
        },
      ],
      recentNotes: [
        {
          title: '和声のメモ',
          permalink: '/notes/music/harmony/',
          summary: '機能和声の整理',
          date: '2026-03-10',
          pathLabel: 'music / harmony',
          genres: ['music'],
        },
        {
          title: 'ソート比較',
          permalink: '/notes/computer-science/algorithms/',
          summary: '',
          date: '2026-03-08',
          pathLabel: 'computer-science / algorithms',
          genres: ['algorithms'],
        },
        {
          title: '音楽',
          permalink: '/notes/music/',
          summary: '',
          date: '2026-03-01',
          pathLabel: 'music',
          genres: [],
        },
      ],
    });
  });
});