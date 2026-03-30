import { describe, expect, it } from 'vitest';

import { buildNoteNavigationModel } from '../../lib/content/navigation/index.js';
import { buildNotePageProjection, type NotePageProjection } from '../../src/data/projections/note-page-projection.js';
import type { IntrinsicNote } from '../../src/data/notes.js';
import { buildPagefindDocumentData } from '../../src/lib/search/build/build-pagefind-document-data.js';

const buildProjection = (
  note: IntrinsicNote,
  notes: readonly IntrinsicNote[] = [],
): NotePageProjection => {
  const navigation = buildNoteNavigationModel({
    currentNote: note,
    notes,
  });
  const pagefindDocument = buildPagefindDocumentData({
    title: typeof note.title === 'string' ? note.title : undefined,
    description: typeof note.description === 'string' ? note.description : undefined,
    date: typeof note.date === 'string' ? note.date : undefined,
    updated: typeof note.updated === 'string' ? note.updated : undefined,
    tags: Array.isArray(note.genre) ? note.genre : undefined,
  });

  return buildNotePageProjection({
    note,
    navigation,
    pagefindDocument,
  });
};

describe('buildNotePageProjection', () => {
  it('Pagefind 用の payload を構築すること', () => {
    const projection = buildProjection({
      rawSlug: 'music/jazz',
      slug: 'music/jazz',
      permalink: '/notes/music/jazz',
      noteKind: 'leaf',
      sortIndex: 0,
      tocHeadings: [],
      tocCapabilities: {
        activeTracking: false,
        dynamicScopes: false,
        mobileSummary: false,
      },
      kind: 'reader',
      title: 'ジャズ理論の基礎',
      description: '即興と和声のメモ',
      date: '2026-01-01',
      updated: '2026-02-10',
      genre: ['music', 'jazz'],
    });

    expect(projection.pagefind).toEqual({
      sortDate: '2026-02-10',
      title: 'ジャズ理論の基礎',
      tokenizedTitle: 'ジャズ 理論 の 基礎',
      description: '即興と和声のメモ',
      tokenizedDescription: '即興 と 和声 の メモ',
      date: '2026-02-10',
      tags: ['music', 'jazz'],
    });
  });

  it('日付未設定時は Pagefind sort を 0000-00-00 にすること', () => {
    const projection = buildProjection({
      rawSlug: 'untitled',
      slug: 'untitled',
      permalink: '/notes/untitled',
      noteKind: 'leaf',
      sortIndex: 0,
      tocHeadings: [],
      tocCapabilities: {
        activeTracking: false,
        dynamicScopes: false,
        mobileSummary: false,
      },
      kind: 'reader',
      title: '日付なし',
    });

    expect(projection.pagefind?.sortDate).toBe('0000-00-00');
  });

  it('sidebar の selected id と icon 付き tree を受け渡すこと', () => {
    const note: IntrinsicNote = {
      rawSlug: 'music/classical/mozart',
      slug: 'music/classical/mozart',
      permalink: '/notes/music/classical/mozart',
      noteKind: 'leaf',
      sortIndex: 0,
      tocHeadings: [],
      tocCapabilities: {
        activeTracking: false,
        dynamicScopes: false,
        mobileSummary: false,
      },
      kind: 'reader',
      title: 'モーツァルト',
    };

    const projection = buildProjection(note, [
      {
        ...note,
        sidebarResolvedIcon: 'music',
        sidebarDirectoryIcons: {
          music: 'book-open',
          'music/classical': 'folder-open',
        },
      },
      {
        rawSlug: 'music/jazz/kind-of-blue',
        slug: 'music/jazz/kind-of-blue',
        permalink: '/notes/music/jazz/kind-of-blue',
        noteKind: 'leaf',
        sortIndex: 1,
        tocHeadings: [],
        tocCapabilities: {
          activeTracking: false,
          dynamicScopes: false,
          mobileSummary: false,
        },
        kind: 'reader',
        title: 'Kind of Blue',
      },
    ]);

    expect(projection.sidebar?.selectedId).toBe('music/classical/mozart');
    expect(JSON.stringify(projection.sidebar?.items ?? [])).toContain(
      '"id":"music","label":"Music","icon":"book-open"',
    );
    expect(JSON.stringify(projection.sidebar?.items ?? [])).toContain(
      '"id":"music/classical","label":"Classical","icon":"folder-open"',
    );
    expect(JSON.stringify(projection.sidebar?.items ?? [])).toContain('"icon":"music"');
  });

  it('directory-index の current note を含む sidebar model を受け渡すこと', () => {
    const note: IntrinsicNote = {
      rawSlug: 'music/index',
      slug: 'music',
      permalink: '/notes/music',
      noteKind: 'directory-index',
      directoryPath: 'music',
      sortIndex: 0,
      tocHeadings: [],
      tocCapabilities: {
        activeTracking: false,
        dynamicScopes: false,
        mobileSummary: false,
      },
      kind: 'reader',
      title: '音楽',
    };

    const projection = buildProjection(note, [
      {
        rawSlug: 'music/classical/mozart',
        slug: 'music/classical/mozart',
        permalink: '/notes/music/classical/mozart',
        noteKind: 'leaf',
        sortIndex: 1,
        tocHeadings: [],
        tocCapabilities: {
          activeTracking: false,
          dynamicScopes: false,
          mobileSummary: false,
        },
        kind: 'reader',
        title: 'モーツァルト',
      },
    ]);

    expect(projection.sidebar?.selectedId).toBe('music/__index__');
    expect(JSON.stringify(projection.sidebar?.items ?? [])).toContain('"id":"music/__index__"');
    expect(JSON.stringify(projection.sidebar?.items ?? [])).toContain('"href":"/notes/music"');
  });

  it('TOC payload と hydration 判定を投影すること', () => {
    const projection = buildProjection({
      rawSlug: 'music/with-toc',
      slug: 'music/with-toc',
      permalink: '/notes/music/with-toc',
      noteKind: 'leaf',
      sortIndex: 0,
      tocHeadings: [{ id: 'intro', text: 'Intro', level: 2 }],
      tocCapabilities: {
        activeTracking: true,
        dynamicScopes: false,
        mobileSummary: true,
      },
      kind: 'reader',
      title: 'With TOC',
      content: '<h2 id="intro">Intro</h2>',
    });

    expect(projection.toc.sourceId).toBe('toc-source-music-with-toc');
    expect(projection.toc.contentRootId).toBe('note-content-music-with-toc');
    expect(projection.toc.capabilities).toEqual({
      activeTracking: true,
      dynamicScopes: false,
      mobileSummary: true,
    });
    expect(projection.toc.shouldHydrate).toBe(true);
  });

  it('genre と reader content を article header / content projection に反映すること', () => {
    const projection = buildProjection({
      rawSlug: 'music/example',
      slug: 'music/example',
      permalink: '/notes/music/example',
      noteKind: 'leaf',
      sortIndex: 0,
      tocHeadings: [],
      tocCapabilities: {
        activeTracking: false,
        dynamicScopes: false,
        mobileSummary: false,
      },
      kind: 'reader',
      title: 'Example',
      genre: ['testing'],
      content: '<ui-code-preview heading="例"></ui-code-preview>',
    });

    expect(projection.articleHeader.genres).toEqual(['testing']);
    expect(projection.articleHeader.shouldHydrateTags).toBe(true);
    expect(projection.contentHtml).toContain('preview-profile="reader"');
    expect(projection.pagefind).not.toBeNull();
    expect(projection.showSidebar).toBe(true);
  });

  it('testing note では reader sidebar と Pagefind を抑止すること', () => {
    const projection = buildProjection({
      rawSlug: 'testing/example',
      slug: 'testing/example',
      permalink: '/notes/testing/example',
      noteKind: 'leaf',
      sortIndex: 0,
      tocHeadings: [],
      tocCapabilities: {
        activeTracking: false,
        dynamicScopes: false,
        mobileSummary: false,
      },
      kind: 'testing',
      title: 'Example',
      content: '<ui-code-preview heading="例"></ui-code-preview>',
    });

    expect(projection.contentHtml).toContain('preview-profile="demo"');
    expect(projection.pagefind).toBeNull();
    expect(projection.showSidebar).toBe(false);
    expect(projection.sidebar).toBeUndefined();
    expect(projection.noteShellSidebarPresence).toBe('absent');
  });
});
