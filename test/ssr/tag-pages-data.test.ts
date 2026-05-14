import { describe, expect, it } from 'vitest';

import { buildTagPageProjection } from '../../build/projections/tag-page-projection.js';
import type { IntrinsicNote } from '../../build/data/notes.js';

const createIntrinsicNote = (
  overrides: Partial<IntrinsicNote> & { slug: string },
): IntrinsicNote => {
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
    tocCapabilitySource: 'inferred',
    kind: 'reader',
    ...rest,
  };
};

describe('buildTagPageProjection', () => {
  it('公開ノートからタグ一覧と各タグのノート一覧を構築すること', () => {
    const notes: IntrinsicNote[] = [
      createIntrinsicNote({
        title: '後期ロマン派',
        permalink: '/notes/music/romantic/',
        slug: 'music/romantic',
        description: '和声進行の整理',
        date: '2026-01-01',
        updated: '2026-03-10',
        genre: ['music', ' romantic ', 'music'],
      }),
      createIntrinsicNote({
        title: 'バロック入門',
        permalink: '/notes/music/baroque/',
        slug: 'music/baroque',
        description: '通奏低音の基礎',
        date: '2026-02-14',
        genre: ['music', 'baroque'],
      }),
      createIntrinsicNote({
        title: '非公開ノート',
        permalink: '/notes/private/',
        slug: 'private',
        status: 'draft',
        genre: ['music'],
      }),
      createIntrinsicNote({
        title: 'テストノート',
        permalink: '/notes/testing/debug/',
        slug: 'testing/debug',
        kind: 'testing',
        genre: ['music', 'testing'],
      }),
    ];

    expect(buildTagPageProjection(notes)).toEqual([
      {
        tag: 'baroque',
        noteCount: 1,
        notes: [
          {
            title: 'バロック入門',
            permalink: '/notes/music/baroque/',
            description: '通奏低音の基礎',
            date: '2026-02-14',
            slug: 'music/baroque',
            genres: ['music', 'baroque'],
          },
        ],
      },
      {
        tag: 'music',
        noteCount: 2,
        notes: [
          {
            title: '後期ロマン派',
            permalink: '/notes/music/romantic/',
            description: '和声進行の整理',
            date: '2026-03-10',
            slug: 'music/romantic',
            genres: ['music', 'romantic'],
          },
          {
            title: 'バロック入門',
            permalink: '/notes/music/baroque/',
            description: '通奏低音の基礎',
            date: '2026-02-14',
            slug: 'music/baroque',
            genres: ['music', 'baroque'],
          },
        ],
      },
      {
        tag: 'romantic',
        noteCount: 1,
        notes: [
          {
            title: '後期ロマン派',
            permalink: '/notes/music/romantic/',
            description: '和声進行の整理',
            date: '2026-03-10',
            slug: 'music/romantic',
            genres: ['music', 'romantic'],
          },
        ],
      },
    ]);
  });

  it('更新日優先の降順で並べ、同日の場合はタイトル順で安定化すること', () => {
    const notes: IntrinsicNote[] = [
      createIntrinsicNote({
        title: 'Zeta',
        permalink: '/notes/zeta/',
        slug: 'zeta',
        updated: '2026-01-12',
        genre: ['設計'],
      }),
      createIntrinsicNote({
        title: 'Alpha',
        permalink: '/notes/alpha/',
        slug: 'alpha',
        date: '2026-01-12',
        genre: ['設計'],
      }),
      createIntrinsicNote({
        title: 'Beta',
        permalink: '/notes/beta/',
        slug: 'beta',
        updated: '2026-01-20',
        genre: ['設計'],
      }),
    ];

    expect(buildTagPageProjection(notes)).toEqual([
      {
        tag: '設計',
        noteCount: 3,
        notes: [
          {
            title: 'Beta',
            permalink: '/notes/beta/',
            description: '',
            date: '2026-01-20',
            slug: 'beta',
            genres: ['設計'],
          },
          {
            title: 'Alpha',
            permalink: '/notes/alpha/',
            description: '',
            date: '2026-01-12',
            slug: 'alpha',
            genres: ['設計'],
          },
          {
            title: 'Zeta',
            permalink: '/notes/zeta/',
            description: '',
            date: '2026-01-12',
            slug: 'zeta',
            genres: ['設計'],
          },
        ],
      },
    ]);
  });
});
