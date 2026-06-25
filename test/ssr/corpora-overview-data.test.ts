import { describe, expect, it } from 'vitest';

import {
  buildCorporaOverviewProjection,
  type CorporaOverviewSourceNote,
} from '../../build/projections/corpora-overview-projection.js';

const createOverviewNote = (
  overrides: Partial<CorporaOverviewSourceNote> & { slug: string },
): CorporaOverviewSourceNote => {
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

describe('buildCorporaOverviewProjection', () => {
  it('コーパス一覧と Corpora meta を構築すること', () => {
    const notes: CorporaOverviewSourceNote[] = [
      createOverviewNote({
        title: '音楽',
        permalink: '/notes/music/',
        slug: 'music',
        noteKind: 'directory-index',
        directoryPath: 'music',
        date: '2026-03-01',
        navigationDirectoryPresentation: {
          music: {
            label: '音楽',
          },
        },
      }),
      createOverviewNote({
        title: '和声のメモ',
        permalink: '/notes/music/harmony/',
        slug: 'music/harmony',
        description: '機能和声の整理',
        updated: '2026-03-10',
        genre: ['music'],
      }),
      createOverviewNote({
        title: 'ソート比較',
        permalink: '/notes/computer-science/algorithms/',
        slug: 'computer-science/algorithms',
        date: '2026-03-08',
        genre: ['algorithms'],
      }),
      createOverviewNote({
        title: 'Testing Reader',
        permalink: '/notes/testing/reader-basic/',
        slug: 'testing/reader-basic',
        date: '2026-03-12',
        kind: 'testing',
        chromeProfile: 'reader',
      }),
    ];

    expect(buildCorporaOverviewProjection(notes)).toEqual({
      corpusCount: 2,
      noteCount: 3,
      latestUpdatedDate: '2026-03-10',
      corpora: [
        {
          key: 'computer-science',
          label: 'Computer Science',
          href: '/corpora/computer-science/',
          renderHref: '/corpora/computer-science/',
          noteCount: 1,
          latestUpdatedDate: '2026-03-08',
        },
        {
          key: 'music',
          label: '音楽',
          href: '/corpora/music/',
          renderHref: '/corpora/music/',
          noteCount: 2,
          latestUpdatedDate: '2026-03-10',
        },
      ],
    });
  });

  it('Corpora meta の最新更新日は空文字列を候補から除外すること', () => {
    const notes: CorporaOverviewSourceNote[] = [
      createOverviewNote({
        title: '日付なし',
        permalink: '/notes/undated/entry/',
        slug: 'undated/entry',
      }),
      createOverviewNote({
        title: '日付あり',
        permalink: '/notes/dated/entry/',
        slug: 'dated/entry',
        date: '2026-04-01',
      }),
    ];

    const overview = buildCorporaOverviewProjection(notes);

    expect(overview.noteCount).toBe(2);
    expect(overview.latestUpdatedDate).toBe('2026-04-01');
    expect(overview.corpora.find((corpus) => corpus.key === 'undated')?.latestUpdatedDate).toBe(
      '',
    );
  });
});
