import { describe, expect, it } from 'vitest';

import {
  buildCorpusNavigation,
  buildCorpusPageProjection,
  type CorpusPageSourceNote,
} from '../../build/projections/corpus-page-projection.js';

const createCorpusNote = (
  overrides: Partial<CorpusPageSourceNote> & { slug: string },
): CorpusPageSourceNote => {
  const { slug, ...rest } = overrides;

  return {
    rawSlug: slug,
    slug,
    permalink: `/notes/${slug}/`,
    noteKind: 'leaf',
    sortIndex: 0,
    tocHeadings: [],
    tocCapabilities: {
      activeTracking: false,
      dynamicScopes: false,
      mobilePanel: false,
    },
    kind: 'reader',
    ...rest,
  };
};

describe('buildCorpusPageProjection', () => {
  it('公開ノートをトップレベルのコーパス単位に束ねること', () => {
    const notes: CorpusPageSourceNote[] = [
      createCorpusNote({
        title: '音楽',
        permalink: '/notes/music/',
        slug: 'music',
        noteKind: 'directory-index',
        directoryPath: 'music',
        date: '2026-03-01',
      }),
      createCorpusNote({
        title: '和声のメモ',
        permalink: '/notes/music/harmony/',
        slug: 'music/harmony',
        description: '機能和声の整理',
        updated: '2026-03-10',
        genre: ['music'],
      }),
      createCorpusNote({
        title: 'ソート比較',
        permalink: '/notes/computer-science/algorithms/',
        slug: 'computer-science/algorithms',
        date: '2026-03-08',
        genre: ['algorithms'],
      }),
      createCorpusNote({
        title: '非公開',
        permalink: '/notes/music/private/',
        slug: 'music/private',
        status: 'draft',
      }),
      createCorpusNote({
        title: 'テスト導線',
        permalink: '/notes/testing/debug/',
        slug: 'testing/debug',
        kind: 'testing',
      }),
      createCorpusNote({
        title: 'Testing Reader',
        permalink: '/notes/testing/reader-basic/',
        slug: 'testing/reader-basic',
        date: '2026-03-12',
        kind: 'reader',
      }),
    ];

    expect(buildCorpusPageProjection(notes)).toEqual([
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

  it('ISO 8601 の updated を YYYY-MM-DD に正規化すること', () => {
    const notes: CorpusPageSourceNote[] = [
      createCorpusNote({
        title: 'C#',
        permalink: '/notes/program/csharp/',
        slug: 'program/csharp',
        updated: '2026-04-15T00:00:00.000Z',
        genre: ['programming'],
      }),
    ];

    expect(buildCorpusPageProjection(notes)).toEqual([
      {
        key: 'program',
        label: 'Program',
        href: '/corpora/program/',
        noteCount: 1,
        latestUpdatedDate: '2026-04-15',
        notes: [
          {
            title: 'C#',
            permalink: '/notes/program/csharp/',
            description: '',
            date: '2026-04-15',
            slug: 'program/csharp',
            genres: ['programming'],
          },
        ],
      },
    ]);
  });

  it('下位 directory-index の title をトップレベル corpus label に誤採用しないこと', () => {
    const notes: CorpusPageSourceNote[] = [
      createCorpusNote({
        title: 'C#',
        permalink: '/notes/program/csharp/',
        slug: 'program/csharp',
        noteKind: 'directory-index',
        directoryPath: 'program/csharp',
        date: '2026-03-01',
      }),
      createCorpusNote({
        title: 'JavaScriptの配列',
        permalink: '/notes/program/sample-javascript/',
        slug: 'program/sample-javascript',
        updated: '2026-03-10',
        genre: ['JavaScript', 'Programming'],
      }),
    ];

    expect(buildCorpusPageProjection(notes)).toEqual([
      {
        key: 'program',
        label: 'Program',
        href: '/corpora/program/',
        noteCount: 2,
        latestUpdatedDate: '2026-03-10',
        notes: [
          {
            title: 'JavaScriptの配列',
            permalink: '/notes/program/sample-javascript/',
            description: '',
            date: '2026-03-10',
            slug: 'program/sample-javascript',
            genres: ['JavaScript', 'Programming'],
          },
          {
            title: 'C#',
            permalink: '/notes/program/csharp/',
            description: '',
            date: '2026-03-01',
            slug: 'program/csharp',
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
        href: '/corpora/',
      },
      {
        key: 'music',
        label: '音楽',
        href: '/corpora/music/',
      },
    ]);
  });
});
