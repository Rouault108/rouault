import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  buildNotesCollection,
  filterPublicNotes,
  filterReaderFacingNotes,
  type SourceNote,
} from '../../src/data/notes.js';

const tempDirs: string[] = [];

const createContentRoot = async (): Promise<string> => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'rouault-notes-data-'));
  tempDirs.push(tempDir);

  await mkdir(path.join(tempDir, 'category', 'section-a'), { recursive: true });
  await mkdir(path.join(tempDir, 'category', 'section-b'), { recursive: true });
  await writeFile(
    path.join(tempDir, '_config.json'),
    JSON.stringify({ order: ['category'] }),
    'utf8',
  );
  await writeFile(
    path.join(tempDir, 'category', '_config.json'),
    JSON.stringify({ order: ['section-a'] }),
    'utf8',
  );
  await writeFile(
    path.join(tempDir, 'category', 'section-a', '_config.json'),
    JSON.stringify({ order: ['item-alpha.md', 'item-beta.md'] }),
    'utf8',
  );

  return tempDir;
};

afterEach(async () => {
  await Promise.all(
    tempDirs.splice(0).map((dirPath) => rm(dirPath, { recursive: true, force: true })),
  );
});

describe('buildNotesCollection', () => {
  it('階層ごとの _config.json を使って sortIndex と toc を付与する', async () => {
    const contentRoot = await createContentRoot();
    const notes: SourceNote[] = [
      {
        slug: 'category/section-a/item-beta',
        title: '項目ベータ',
        content: '<h2 id="heading-a">見出しA</h2>',
      },
      {
        slug: 'category/section-a/item-alpha',
        title: '項目アルファ',
        content: '<h2 id="heading-b">見出しB</h2>',
      },
    ];

    const collection = buildNotesCollection(notes, contentRoot);

    expect(collection.map((note) => note.slug)).toEqual([
      'category/section-a/item-alpha',
      'category/section-a/item-beta',
    ]);
    expect(collection[0]?.tocHeadings).toEqual([{ id: 'heading-b', text: '見出しB', level: 2 }]);
    expect(collection[1]?.tocHeadings).toEqual([{ id: 'heading-a', text: '見出しA', level: 2 }]);
    expect(collection[0]?.tocCapabilities).toEqual({
      activeTracking: true,
      dynamicScopes: false,
      mobileSummary: true,
    });
  });

  it('tabs 配下の見出し scope と tocCapabilities を build-time で確定する', async () => {
    const contentRoot = await createContentRoot();
    const collection = buildNotesCollection(
      [
        {
          slug: 'category/section-a/item-alpha',
          title: '項目アルファ',
          kind: 'reader',
          content: `
            <ui-tabs>
              <div slot="tab" value="overview">概要</div>
              <div slot="panel">
                <h2 id="overview-heading">Overview</h2>
              </div>
              <div slot="tab" value="details">詳細</div>
              <div slot="panel">
                <h2 id="details-heading">Details</h2>
              </div>
            </ui-tabs>
          `,
        },
      ],
      contentRoot,
    );

    expect(collection[0]?.content).toContain('data-toc-scope="toc-scope-1"');
    expect(collection[0]?.tocHeadings).toEqual([
      {
        id: 'overview-heading',
        text: 'Overview',
        level: 2,
        scopeSelections: [{ scopeId: 'toc-scope-1', value: 'overview' }],
      },
      {
        id: 'details-heading',
        text: 'Details',
        level: 2,
        scopeSelections: [{ scopeId: 'toc-scope-1', value: 'details' }],
      },
    ]);
    expect(collection[0]?.tocCapabilities).toEqual({
      activeTracking: true,
      dynamicScopes: true,
      mobileSummary: true,
    });
  });

  it('cover を resolver 済み metadata として保持する', async () => {
    const contentRoot = await createContentRoot();
    await mkdir(path.join(contentRoot, '_assets', 'testing'), { recursive: true });
    await writeFile(path.join(contentRoot, '_assets', 'testing', 'cover.jpg'), 'fixture', 'utf8');

    const collection = buildNotesCollection(
      [
        {
          slug: 'category/section-a/item-alpha',
          title: '項目アルファ',
          cover: 'content/_assets/testing/cover.jpg',
          content: '<h2 id="heading-b">見出しB</h2>',
        },
      ],
      contentRoot,
    );

    expect(collection[0]?.resolvedCover?.sourcePath).toBe('content/_assets/testing/cover.jpg');
    expect(collection[0]?.resolvedCover?.inline.src).toBe('/content-assets/testing/cover.jpg');
  });

  it('kind 未指定のノートは reader として保持する', async () => {
    const contentRoot = await createContentRoot();

    const collection = buildNotesCollection(
      [
        {
          slug: 'category/section-a/item-alpha',
          title: '項目アルファ',
          content: '<p>本文</p>',
        },
      ],
      contentRoot,
    );

    expect(collection[0]?.kind).toBe('reader');
  });

  it('sidebar.scope を最も近い祖先から解決する', async () => {
    const contentRoot = await createContentRoot();
    await mkdir(path.join(contentRoot, 'category', 'section-a', 'item-alpha'), { recursive: true });
    await mkdir(path.join(contentRoot, 'category', 'section-a', 'item-gamma'), { recursive: true });
    await writeFile(
      path.join(contentRoot, 'category', 'section-a', '_config.json'),
      JSON.stringify({
        order: ['item-alpha', 'item-gamma', 'item-beta.md'],
        sidebar: { scope: 'self' },
      }),
      'utf8',
    );
    await writeFile(
      path.join(contentRoot, 'category', 'section-a', 'item-alpha', '_config.json'),
      JSON.stringify({ sidebar: { scope: 'global' } }),
      'utf8',
    );
    await writeFile(
      path.join(contentRoot, 'category', 'section-b', '_config.json'),
      JSON.stringify({ sidebar: { scope: 'invalid' } }),
      'utf8',
    );

    const notes: SourceNote[] = [
      { slug: 'category/section-a/item-beta', content: '' },
      { slug: 'category/section-a/item-gamma/page-one', content: '' },
      { slug: 'category/section-a/item-alpha/page-two', content: '' },
      { slug: 'category/section-b/page-three', content: '' },
    ];

    const collection = buildNotesCollection(notes, contentRoot);

    expect(
      collection.find((note) => note.slug === 'category/section-a/item-beta')?.sidebarRoot,
    ).toBe('category/section-a');
    expect(
      collection.find((note) => note.slug === 'category/section-a/item-gamma/page-one')
        ?.sidebarRoot,
    ).toBe('category/section-a');
    expect(
      collection.find((note) => note.slug === 'category/section-a/item-alpha/page-two')
        ?.sidebarRoot,
    ).toBeUndefined();
    expect(
      collection.find((note) => note.slug === 'category/section-b/page-three')?.sidebarRoot,
    ).toBeUndefined();
  });

  it('sidebarIcon 未指定時は none を既定値としてサイドバー用 icon 情報を付与する', async () => {
    const contentRoot = await createContentRoot();
    await mkdir(path.join(contentRoot, 'category', 'section-a', 'item-alpha'), { recursive: true });
    await writeFile(
      path.join(contentRoot, '_config.json'),
      JSON.stringify({
        order: ['category'],
        sidebar: { icon: 'book-open' },
      }),
      'utf8',
    );
    await writeFile(
      path.join(contentRoot, 'category', '_config.json'),
      JSON.stringify({
        order: ['section-a'],
        sidebar: { icon: 'folder' },
      }),
      'utf8',
    );
    await writeFile(
      path.join(contentRoot, 'category', 'section-a', '_config.json'),
      JSON.stringify({
        order: ['item-alpha', 'item-beta.md'],
        sidebar: { icon: 'music' },
      }),
      'utf8',
    );
    await writeFile(
      path.join(contentRoot, 'category', 'section-a', 'item-alpha', '_config.json'),
      JSON.stringify({ sidebar: { icon: 'none' } }),
      'utf8',
    );

    const notes: SourceNote[] = [
      {
        slug: 'category/section-a/item-beta',
        content: '',
        sidebarIcon: 'file',
      },
      {
        slug: 'category/section-a/item-alpha/page-two',
        content: '',
      },
      {
        slug: 'category/section-a/item-alpha/page-three',
        content: '',
        sidebarIcon: 'music',
      },
      {
        slug: 'category/section-b/page-four',
        content: '',
        sidebarIcon: 'none',
      },
    ];

    const collection = buildNotesCollection(notes, contentRoot);
    const itemBeta = collection.find((note) => note.slug === 'category/section-a/item-beta');
    const pageTwo = collection.find(
      (note) => note.slug === 'category/section-a/item-alpha/page-two',
    );
    const pageThree = collection.find(
      (note) => note.slug === 'category/section-a/item-alpha/page-three',
    );
    const pageFour = collection.find((note) => note.slug === 'category/section-b/page-four');

    expect(itemBeta?.sidebarResolvedIcon).toBe('file');
    expect(itemBeta?.sidebarDirectoryIcons).toEqual({
      category: 'folder',
      'category/section-a': 'music',
    });
    expect(pageTwo?.sidebarResolvedIcon).toBe('music');
    expect(pageTwo?.sidebarDirectoryIcons).toEqual({
      category: 'folder',
      'category/section-a': 'music',
    });
    expect(pageThree?.sidebarResolvedIcon).toBe('music');
    expect(pageFour?.sidebarResolvedIcon).toBeUndefined();
    expect(pageFour?.sidebarDirectoryIcons).toEqual({
      category: 'folder',
      'category/section-b': 'folder',
    });
  });

  it('index.md を directory-index として正規化する', async () => {
    const contentRoot = await createContentRoot();
    await mkdir(path.join(contentRoot, 'fixture', 'index'), { recursive: true });
    await writeFile(path.join(contentRoot, 'fixture', 'index', 'index.md'), '# fixture', 'utf8');

    const collection = buildNotesCollection(
      [
        {
          slug: 'fixture/index',
          title: 'テスト',
          content: '<h2 id="summary">概要</h2>',
        },
      ],
      contentRoot,
    );

    expect(collection[0]).toMatchObject({
      rawSlug: 'fixture/index/index',
      slug: 'fixture/index',
      permalink: '/notes/fixture/index',
      noteKind: 'directory-index',
      directoryPath: 'fixture/index',
    });
  });

  it('leaf と directory-index が同じルートへ解決される場合はエラーにする', async () => {
    const contentRoot = await createContentRoot();
    await mkdir(path.join(contentRoot, 'fixture', 'index'), { recursive: true });
    await writeFile(path.join(contentRoot, 'fixture', 'index.md'), '# leaf', 'utf8');
    await writeFile(path.join(contentRoot, 'fixture', 'index', 'index.md'), '# dir', 'utf8');

    expect(() =>
      buildNotesCollection(
        [{ slug: 'fixture/index', title: 'fixture/index.md', content: '' }],
        contentRoot,
      ),
    ).toThrow(/Ambiguous note source/);
  });
});

describe('filterPublicNotes', () => {
  it('status=draft を除外し、それ以外の status は公開対象として返す', () => {
    const notes: SourceNote[] = [
      { slug: 'note-draft', status: 'draft' },
      { slug: 'note-archived', status: 'archived' },
      { slug: 'note-public', status: '' },
      { slug: 'note-default' },
    ];

    expect(filterPublicNotes(notes).map((note) => note.slug)).toEqual([
      'note-archived',
      'note-public',
      'note-default',
    ]);
  });

  it('読者向け フィルタでは testing と demo を除外する', () => {
    const notes: SourceNote[] = [
      { slug: 'note-reader', kind: 'reader' },
      { slug: 'note-testing', kind: 'testing' },
      { slug: 'note-demo', kind: 'demo' },
      { slug: 'note-draft', kind: 'reader', status: 'draft' },
      { slug: 'note-default' },
    ];

    expect(filterReaderFacingNotes(notes).map((note) => note.slug)).toEqual([
      'note-reader',
      'note-default',
    ]);
  });

  it('Velite が index.md を "fixture" として返しても directory-index に復元する', async () => {
    const contentRoot = await createContentRoot();

    await mkdir(path.join(contentRoot, 'fixture'), { recursive: true });
    await writeFile(path.join(contentRoot, 'fixture', 'index.md'), '# fixture', 'utf8');

    const collection = buildNotesCollection(
      [
        {
          slug: 'fixture',
          title: 'テスト',
          content: '<h2 id="summary">概要</h2>',
        },
      ],
      contentRoot,
    );

    expect(collection[0]).toMatchObject({
      rawSlug: 'fixture/index',
      slug: 'fixture',
      permalink: '/notes/fixture',
      noteKind: 'directory-index',
      directoryPath: 'fixture',
    });
  });

  it('fixture.md と fixture/index.md が同居する場合は曖昧としてエラーにする', async () => {
    const contentRoot = await createContentRoot();

    await mkdir(path.join(contentRoot, 'fixture'), { recursive: true });
    await writeFile(path.join(contentRoot, 'fixture.md'), '# leaf', 'utf8');
    await writeFile(path.join(contentRoot, 'fixture', 'index.md'), '# dir', 'utf8');

    expect(() =>
      buildNotesCollection(
        [
          {
            slug: 'fixture',
            title: 'テスト',
            content: '',
          },
        ],
        contentRoot,
      ),
    ).toThrow(/Ambiguous note source/);
  });
});
