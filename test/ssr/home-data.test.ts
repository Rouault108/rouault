import { describe, expect, it } from 'vitest';

import {
  buildHomePageProjection,
  type HomeSourceNote,
} from '../../src/data/projections/home-page-projection.js';

const createHomeNote = (overrides: Partial<HomeSourceNote> & { slug: string }): HomeSourceNote => {
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
      mobileSummary: false,
    },
    kind: 'reader',
    ...rest,
  };
};

describe('buildHomePageProjection', () => {
  it('更新日優先で新しい順に並べ、同日はタイトルと permalink で安定化すること', () => {
    const notes: HomeSourceNote[] = [
      createHomeNote({
        title: 'Gamma',
        permalink: '/notes/gamma/',
        slug: 'music/gamma',
        description: '  三番目の要約  ',
        date: '2026-03-09',
        updated: '2026-03-10T09:00:00Z',
        genre: ['analysis', 'analysis', ' essay '],
      }),
      createHomeNote({
        title: 'Alpha',
        permalink: '/notes/alpha/',
        slug: 'music/alpha',
        description: '最初の要約',
        date: '2026-03-10',
        genre: ['essay'],
      }),
      createHomeNote({
        title: 'Alpha',
        permalink: '/notes/alpha-b/',
        slug: 'music/alpha-b',
        description: '同名タイトル',
        updated: '2026-03-10',
        genre: ['essay'],
      }),
      createHomeNote({
        title: 'Beta',
        permalink: '/notes/beta/',
        slug: 'music/beta',
        description: '二番目の要約',
        date: '2026-03-08',
        genre: ['reference'],
        status: 'draft',
      }),
      createHomeNote({
        title: 'Testing',
        permalink: '/notes/testing/',
        slug: 'testing/index',
        description: 'testing note',
        date: '2026-03-11',
        kind: 'testing',
      }),
      ...Array.from({ length: 11 }, (_value, index) => {
        const noteNumber = index + 4;
        const date = new Date(Date.UTC(2026, 2, 9 - index)).toISOString().slice(0, 10);

        return createHomeNote({
          title: `Note ${String(noteNumber)}`,
          permalink: `/notes/note-${String(noteNumber)}/`,
          slug: `archive/note-${String(noteNumber)}`,
          description: `要約 ${String(noteNumber)}`,
          date,
          genre: ['archive'],
        });
      }),
    ];

    const home = buildHomePageProjection(notes);

    expect(home.publicNoteCount).toBe(14);
    expect(home.latestUpdatedDate).toBe('2026-03-10');
    expect(home.notes).toHaveLength(12);
    expect(home.notes[0]).toEqual({
      title: 'Alpha',
      permalink: '/notes/alpha/',
      summary: '最初の要約',
      date: '2026-03-10',
      pathLabel: 'music / alpha',
      genres: ['essay'],
    });
    expect(home.notes[1]).toEqual({
      title: 'Alpha',
      permalink: '/notes/alpha-b/',
      summary: '同名タイトル',
      date: '2026-03-10',
      pathLabel: 'music / alpha-b',
      genres: ['essay'],
    });
    expect(home.notes[2]).toEqual({
      title: 'Gamma',
      permalink: '/notes/gamma/',
      summary: '三番目の要約',
      date: '2026-03-10',
      pathLabel: 'music / gamma',
      genres: ['analysis', 'essay'],
    });
    expect(home.notes.some((note) => note.title === 'Beta')).toBe(false);
    expect(home.notes.some((note) => note.title === 'Testing')).toBe(false);
    expect(home.notes.some((note) => note.title === 'Note 14')).toBe(false);
  });
});
