import { describe, expect, it } from 'vitest';

import { buildNoteNavigationModel } from '../../build/navigation/index.js';
import {
  buildNotePageProjection,
  type NotePageProjection,
} from '../../build/projections/note-page-projection.js';
import type { IntrinsicNote } from '../../build/data/notes.js';
import { buildPagefindDocumentData } from '../../build/search/build-pagefind-document-data.js';

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
        mobilePanel: false,
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
        mobilePanel: false,
      },
      kind: 'reader',
      title: '日付なし',
    });

    expect(projection.pagefind?.sortDate).toBe('0000-00-00');
  });

  it('articleHeader の published に ISO 日時を渡しても YYYY-MM-DD に正規化すること', () => {
    const projection = buildProjection({
      rawSlug: 'music/published-iso',
      slug: 'music/published-iso',
      permalink: '/notes/music/published-iso',
      noteKind: 'leaf',
      sortIndex: 0,
      tocHeadings: [],
      tocCapabilities: {
        activeTracking: false,
        dynamicScopes: false,
        mobilePanel: false,
      },
      kind: 'reader',
      title: 'Published ISO',
      date: '2026-04-19T00:00:00.000Z',
    });

    expect(projection.articleHeader.published).toBe('2026-04-19');
    expect(projection.articleHeader.updated).toBeUndefined();
  });

  it('articleHeader の updated に ISO 日時を渡しても YYYY-MM-DD に正規化すること', () => {
    const projection = buildProjection({
      rawSlug: 'music/updated-iso',
      slug: 'music/updated-iso',
      permalink: '/notes/music/updated-iso',
      noteKind: 'leaf',
      sortIndex: 0,
      tocHeadings: [],
      tocCapabilities: {
        activeTracking: false,
        dynamicScopes: false,
        mobilePanel: false,
      },
      kind: 'reader',
      title: 'Updated ISO',
      date: '2026-04-19T00:00:00.000Z',
      updated: '2026-04-20T12:34:56.000Z',
    });

    expect(projection.articleHeader.published).toBe('2026-04-19');
    expect(projection.articleHeader.updated).toBe('2026-04-20');
  });

  it('articleHeader の created に ISO 日時を渡しても YYYY-MM-DD に正規化すること', () => {
    const projection = buildProjection({
      rawSlug: 'music/created-iso',
      slug: 'music/created-iso',
      permalink: '/notes/music/created-iso',
      noteKind: 'leaf',
      sortIndex: 0,
      tocHeadings: [],
      tocCapabilities: {
        activeTracking: false,
        dynamicScopes: false,
        mobilePanel: false,
      },
      kind: 'reader',
      title: 'Created ISO',
      created: '2026-04-18T12:34:56.000Z',
    });

    expect(projection.articleHeader.created).toBe('2026-04-18');
  });

  it('articleHeader には不正な日付文字列を載せないこと', () => {
    const projection = buildProjection({
      rawSlug: 'music/invalid-date',
      slug: 'music/invalid-date',
      permalink: '/notes/music/invalid-date',
      noteKind: 'leaf',
      sortIndex: 0,
      tocHeadings: [],
      tocCapabilities: {
        activeTracking: false,
        dynamicScopes: false,
        mobilePanel: false,
      },
      kind: 'reader',
      title: 'Invalid Date',
      date: 'not-a-date',
      updated: '',
    });

    expect(projection.articleHeader.published).toBeUndefined();
    expect(projection.articleHeader.updated).toBeUndefined();
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
        mobilePanel: false,
      },
      kind: 'reader',
      title: 'モーツァルト',
    };

    const projection = buildProjection(note, [
      {
        ...note,
        sidebarResolvedIcon: 'music',
        navigationDirectoryPresentation: {
          music: {
            icon: 'book-open',
          },
          'music/classical': {
            icon: 'folder-open',
          },
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
          mobilePanel: false,
        },
        kind: 'reader',
        title: 'Kind of Blue',
      },
    ]);

    expect(projection.sidebar?.selectedId).toBe('music/classical/mozart');
    expect(projection.sidebar?.stateScopeId).toBe('note-navigation');
    expect(projection.sidebar?.initialExpandedIds).toEqual(['music', 'music/classical']);
    expect(projection.sidebar?.navHtml).toContain('data-sidebar-nav');
    expect(projection.sidebar?.navHtml).toContain('data-sidebar-nav-control');
    expect(projection.sidebar?.navHtml).toContain('data-sidebar-nav-link');
    expect(projection.sidebar?.navHtml).toContain('data-sidebar-nav-branch-control');
    expect(projection.sidebar?.navHtml).toContain('data-sidebar-nav-disclosure');
    expect(projection.sidebar?.navHtml).toContain('aria-current="page"');
    expect(projection.sidebar?.navHtml).toContain('data-node-id="music"');
    expect(projection.sidebar?.navHtml).toContain('data-node-id="music/classical"');
    expect(projection.sidebar?.navHtml).toContain('data-current-branch="true"');
    expect(projection.sidebar?.navHtml).toContain('&quot;icon&quot;:&quot;book-open&quot;');
    expect(projection.sidebar?.navHtml).toContain('&quot;icon&quot;:&quot;folder-open&quot;');
    expect(projection.sidebar?.navHtml).toContain('&quot;icon&quot;:&quot;music&quot;');
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
        mobilePanel: false,
      },
      kind: 'reader',
      title: '音楽とは何か',
      navigationDirectoryPresentation: {
        music: {
          label: '音楽',
        },
      },
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
          mobilePanel: false,
        },
        kind: 'reader',
        title: 'モーツァルト',
        navigationDirectoryPresentation: {
          music: {
            label: '音楽',
          },
        },
      },
    ]);

    expect(projection.sidebar?.selectedId).toBe('music/__index__');
    expect(projection.sidebar?.initialExpandedIds).toEqual(['music']);
    expect(projection.sidebar?.navHtml).toContain('/notes/music');
    expect(projection.sidebar?.navHtml).toContain('data-node-id="music/__index__"');
    expect(projection.sidebar?.navHtml).toContain('href="/notes/music"');
    expect(projection.sidebar?.navHtml).toContain('>音楽<');
    expect(projection.sidebar?.navHtml).toContain('>音楽とは何か<');
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
        mobilePanel: true,
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
      mobilePanel: true,
    });
    expect(projection.tocPresence).toBe('present');
    expect(projection.toc.shouldHydrate).toBe(true);
  });

  it('headings 0 件では tocPresence を absent にすること', () => {
    const projection = buildProjection({
      rawSlug: 'music/without-toc',
      slug: 'music/without-toc',
      permalink: '/notes/music/without-toc',
      noteKind: 'leaf',
      sortIndex: 0,
      tocHeadings: [],
      tocCapabilities: {
        activeTracking: true,
        dynamicScopes: true,
        mobilePanel: true,
      },
      kind: 'reader',
      title: 'Without TOC',
      content: '<p>本文だけ</p>',
    });

    expect(projection.tocPresence).toBe('absent');
    expect(projection.toc.shouldHydrate).toBe(true);
  });

  it('headings があり capability が静的なら tocPresence=present と shouldHydrate=false を両立すること', () => {
    const projection = buildProjection({
      rawSlug: 'music/present-static',
      slug: 'music/present-static',
      permalink: '/notes/music/present-static',
      noteKind: 'leaf',
      sortIndex: 0,
      tocHeadings: [{ id: 'intro', text: 'Intro', level: 2 }],
      tocCapabilities: {
        activeTracking: false,
        dynamicScopes: false,
        mobilePanel: false,
      },
      kind: 'reader',
      title: 'Present Static',
      content: '<h2 id="intro">Intro</h2>',
    });

    expect(projection.tocPresence).toBe('present');
    expect(projection.toc.shouldHydrate).toBe(false);
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
        mobilePanel: false,
      },
      kind: 'reader',
      title: 'Example',
      genre: ['testing'],
      content: '<ui-code-preview heading="例"></ui-code-preview>',
    });

    expect(projection.articleHeader.genres).toEqual(['testing']);
    expect(projection.contentHtml).toContain('preview-profile="reader"');
    expect(projection.pagefind).not.toBeNull();
    expect(projection.showSidebar).toBe(true);
  });

  it('testing note かつ chromeProfile=plain では reader sidebar と Pagefind を抑止すること', () => {
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
        mobilePanel: false,
      },
      kind: 'testing',
      chromeProfile: 'plain',
      title: 'Example',
      content: '<ui-code-preview heading="例"></ui-code-preview>',
    });

    expect(projection.contentHtml).toContain('preview-profile="demo"');
    expect(projection.pagefind).toBeNull();
    expect(projection.showSidebar).toBe(false);
    expect(projection.sidebar).toBeUndefined();
    expect(projection.noteShellSidebarPresence).toBe('absent');
  });

  it('testing note でも chromeProfile=reader なら sidebar を持てること', () => {
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
        mobilePanel: false,
      },
      kind: 'testing',
      chromeProfile: 'reader',
      title: 'Example',
      content: '<p>fixture</p>',
    });

    expect(projection.pagefind).toBeNull();
    expect(projection.showSidebar).toBe(true);
    expect(projection.noteShellSidebarPresence).toBe('present');
  });

  it('testing note では genre を持っていても tags surface への導線を出さないこと', () => {
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
        mobilePanel: false,
      },
      kind: 'testing',
      chromeProfile: 'reader',
      title: 'Example',
      genre: ['testing', 'e2e'],
      content: '<p>fixture</p>',
    });

    expect(projection.articleHeader.genres).toEqual([]);
  });

  it('excludeFromPublicationSurfaces=true の reader fixture は Pagefind 除外と article-header tags 表示を両立すること', () => {
    const projection = buildProjection({
      rawSlug: 'e2e/article-header-link-decoration',
      slug: 'e2e/article-header-link-decoration',
      permalink: '/notes/e2e/article-header-link-decoration',
      noteKind: 'leaf',
      sortIndex: 0,
      tocHeadings: [{ id: 'toc-link-anchor', text: 'TOC Link Anchor', level: 2 }],
      tocCapabilities: {
        activeTracking: true,
        dynamicScopes: false,
        mobilePanel: true,
      },
      kind: 'reader',
      chromeProfile: 'plain',
      title: 'Article Header Link Decoration Fixture',
      genre: ['ui', 'layout'],
      excludeFromPublicationSurfaces: true,
      content: '<h2 id="toc-link-anchor">TOC Link Anchor</h2>',
    });

    expect(projection.pagefind).toBeNull();
    expect(projection.articleHeader.genres).toEqual(['ui', 'layout']);
    expect(projection.showSidebar).toBe(false);
  });

  it('profile 未指定 note は budget 超過相当の workload でも hard fail しないこと', () => {
    expect(() =>
      buildProjection({
        rawSlug: 'program/sample-javascript',
        slug: 'program/sample-javascript',
        permalink: '/notes/program/sample-javascript',
        noteKind: 'leaf',
        sortIndex: 0,
        tocHeadings: [{ id: 'sample', text: 'Sample', level: 2 }],
        tocCapabilities: {
          activeTracking: true,
          dynamicScopes: false,
          mobilePanel: true,
        },
        kind: 'reader',
        title: 'Sample JavaScript',
        genre: ['javascript', 'programming'],
        content: [
          '<h2 id="sample">Sample</h2>',
          '<ui-details data-hydration-trigger="initial"></ui-details>',
          '<div data-code-block-root="true" data-hydration-trigger="post-commit" data-hydration-key="code-block-enhancer"><pre data-code-block="true"></pre></div>',
        ].join(''),
      }),
    ).not.toThrow();
  });

  it('explicit profile note は profile budget を超えた場合に hard fail すること', () => {
    expect(() =>
      buildProjection({
        rawSlug: 'program/sample-javascript',
        slug: 'program/sample-javascript',
        permalink: '/notes/program/sample-javascript',
        noteKind: 'leaf',
        sortIndex: 0,
        tocHeadings: [{ id: 'sample', text: 'Sample', level: 2 }],
        tocCapabilities: {
          activeTracking: true,
          dynamicScopes: false,
          mobilePanel: true,
        },
        kind: 'reader',
        title: 'Sample JavaScript',
        hydrationBudgetProfile: 'reader-shell-canary',
        genre: ['javascript', 'programming'],
        content: [
          '<h2 id="sample">Sample</h2>',
          '<ui-details data-hydration-trigger="initial"></ui-details>',
          '<div data-code-block-root="true" data-hydration-trigger="post-commit" data-hydration-key="code-block-enhancer"><pre data-code-block="true"></pre></div>',
        ].join(''),
      }),
    ).toThrow(
      '[markdown] note hydration budget exceeded for "program/sample-javascript" profile="reader-shell-canary"',
    );
  });
});
