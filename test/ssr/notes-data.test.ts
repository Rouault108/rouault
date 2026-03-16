import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { buildNotesCollection, filterPublicNotes, type SourceNote } from '../../src/data/notes.js';

const tempDirs: string[] = [];

const createContentRoot = async (): Promise<string> => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'rouault-notes-data-'));
  tempDirs.push(tempDir);

  await mkdir(path.join(tempDir, 'music', 'classical'), { recursive: true });
  await mkdir(path.join(tempDir, 'music', 'jazz'), { recursive: true });
  await writeFile(
    path.join(tempDir, '_config.json'),
    JSON.stringify({ order: ['music'] }),
    'utf8',
  );
  await writeFile(
    path.join(tempDir, 'music', '_config.json'),
    JSON.stringify({ order: ['classical'] }),
    'utf8',
  );
  await writeFile(
    path.join(tempDir, 'music', 'classical', '_config.json'),
    JSON.stringify({ order: ['beethoven.md', 'mozart.md'] }),
    'utf8',
  );

  return tempDir;
};

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dirPath) => rm(dirPath, { recursive: true, force: true })));
});

describe('buildNotesCollection', () => {
  it('階層ごとの _config.json を使って sortIndex と toc を付与する', async () => {
    const contentRoot = await createContentRoot();
    const notes: SourceNote[] = [
      {
        slug: 'music/classical/mozart',
        title: 'モーツァルト',
        content: '<h2 id="life">生涯</h2>',
      },
      {
        slug: 'music/classical/beethoven',
        title: 'ベートーヴェン',
        content: '<h2 id="works">作品</h2>',
      },
    ];

    const collection = buildNotesCollection(notes, contentRoot);

    expect(collection.map((note) => note.slug)).toEqual([
      'music/classical/beethoven',
      'music/classical/mozart',
    ]);
    expect(collection[0]?.tocHeadings).toEqual([
      { id: 'works', text: '作品', level: 2 },
    ]);
    expect(collection[1]?.tocHeadings).toEqual([
      { id: 'life', text: '生涯', level: 2 },
    ]);
  });

  it('sidebar.scope を最も近い祖先から解決する', async () => {
    const contentRoot = await createContentRoot();
    await mkdir(path.join(contentRoot, 'music', 'classical', 'beethoven'), { recursive: true });
    await mkdir(path.join(contentRoot, 'music', 'classical', 'chopin'), { recursive: true });
    await writeFile(
      path.join(contentRoot, 'music', 'classical', '_config.json'),
      JSON.stringify({
        order: ['beethoven', 'chopin', 'mozart.md'],
        sidebar: { scope: 'self' },
      }),
      'utf8',
    );
    await writeFile(
      path.join(contentRoot, 'music', 'classical', 'beethoven', '_config.json'),
      JSON.stringify({ sidebar: { scope: 'global' } }),
      'utf8',
    );
    await writeFile(
      path.join(contentRoot, 'music', 'jazz', '_config.json'),
      JSON.stringify({ sidebar: { scope: 'invalid' } }),
      'utf8',
    );

    const notes: SourceNote[] = [
      { slug: 'music/classical/mozart', content: '' },
      { slug: 'music/classical/chopin/nocturnes', content: '' },
      { slug: 'music/classical/beethoven/symphony-9', content: '' },
      { slug: 'music/jazz/kind-of-blue', content: '' },
    ];

    const collection = buildNotesCollection(notes, contentRoot);

    expect(collection.find((note) => note.slug === 'music/classical/mozart')?.sidebarRoot).toBe(
      'music/classical',
    );
    expect(
      collection.find((note) => note.slug === 'music/classical/chopin/nocturnes')?.sidebarRoot,
    ).toBe('music/classical');
    expect(
      collection.find((note) => note.slug === 'music/classical/beethoven/symphony-9')?.sidebarRoot,
    ).toBeUndefined();
    expect(collection.find((note) => note.slug === 'music/jazz/kind-of-blue')?.sidebarRoot).toBeUndefined();
  });

  it('sidebarIcon 未指定時は none を既定値としてサイドバー用 icon 情報を付与する', async () => {
    const contentRoot = await createContentRoot();
    await mkdir(path.join(contentRoot, 'music', 'classical', 'beethoven'), { recursive: true });
    await writeFile(
      path.join(contentRoot, '_config.json'),
      JSON.stringify({
        order: ['music'],
        sidebar: { icon: 'lucide:library' },
      }),
      'utf8',
    );
    await writeFile(
      path.join(contentRoot, 'music', '_config.json'),
      JSON.stringify({
        order: ['classical'],
        sidebar: { icon: 'folder' },
      }),
      'utf8',
    );
    await writeFile(
      path.join(contentRoot, 'music', 'classical', '_config.json'),
      JSON.stringify({
        order: ['beethoven', 'mozart.md'],
        sidebar: { icon: 'lucide:music-2' },
      }),
      'utf8',
    );
    await writeFile(
      path.join(contentRoot, 'music', 'classical', 'beethoven', '_config.json'),
      JSON.stringify({ sidebar: { icon: 'none' } }),
      'utf8',
    );

    const notes: SourceNote[] = [
      {
        slug: 'music/classical/mozart',
        content: '',
        sidebarIcon: 'file',
      },
      {
        slug: 'music/classical/beethoven/symphony-9',
        content: '',
      },
      {
        slug: 'music/classical/beethoven/fidelio',
        content: '',
        sidebarIcon: 'lucide:music-3',
      },
      {
        slug: 'music/jazz/kind-of-blue',
        content: '',
        sidebarIcon: 'none',
      },
    ];

    const collection = buildNotesCollection(notes, contentRoot);
    const mozart = collection.find((note) => note.slug === 'music/classical/mozart');
    const symphony = collection.find((note) => note.slug === 'music/classical/beethoven/symphony-9');
    const fidelio = collection.find((note) => note.slug === 'music/classical/beethoven/fidelio');
    const jazz = collection.find((note) => note.slug === 'music/jazz/kind-of-blue');

    expect(mozart?.sidebarResolvedIcon).toBe('lucide:file-text');
    expect(mozart?.sidebarDirectoryIcons).toEqual({
      music: 'lucide:folder',
      'music/classical': 'lucide:music-2',
    });
    expect(symphony?.sidebarResolvedIcon).toBeUndefined();
    expect(symphony?.sidebarDirectoryIcons).toEqual({
      music: 'lucide:folder',
      'music/classical': 'lucide:music-2',
    });
    expect(fidelio?.sidebarResolvedIcon).toBe('lucide:music-3');
    expect(jazz?.sidebarResolvedIcon).toBeUndefined();
    expect(jazz?.sidebarDirectoryIcons).toEqual({
      music: 'lucide:folder',
      'music/jazz': 'lucide:folder',
    });
  });

  it('index.md を directory-index として正規化する', async () => {
    const contentRoot = await createContentRoot();

    const collection = buildNotesCollection(
      [
        {
          slug: 'testing/index',
          title: 'テスト',
          content: '<h2 id="概要">概要</h2>',
        },
      ],
      contentRoot,
    );

    expect(collection[0]).toMatchObject({
      rawSlug: 'testing/index',
      slug: 'testing',
      permalink: '/notes/testing',
      noteKind: 'directory-index',
      directoryPath: 'testing',
    });
  });

  it('leaf と directory-index が同じルートへ解決される場合はエラーにする', async () => {
    const contentRoot = await createContentRoot();

    expect(() =>
      buildNotesCollection(
        [
          { slug: 'testing', title: 'testing.md', content: '' },
          { slug: 'testing/index', title: 'testing/index.md', content: '' },
        ],
        contentRoot,
      ),
    ).toThrow(/Route collision detected/);
  });
});

describe('filterPublicNotes', () => {
  it('status=draft を除外し、それ以外の status は公開対象として返す', () => {
    const notes: SourceNote[] = [
      { slug: 'private-note', status: 'draft' },
      { slug: 'archived-note', status: 'archived' },
      { slug: 'public-note', status: '' },
      { slug: 'implicit-public' },
    ];

    expect(filterPublicNotes(notes).map((note) => note.slug)).toEqual([
      'archived-note',
      'public-note',
      'implicit-public',
    ]);
  });

  it('Velite が index.md を "testing" として返しても directory-index に復元する', async () => {
    const contentRoot = await createContentRoot();

    await mkdir(path.join(contentRoot, 'testing'), { recursive: true });
    await writeFile(path.join(contentRoot, 'testing', 'index.md'), '# testing', 'utf8');

    const collection = buildNotesCollection(
      [
        {
          slug: 'testing',
          title: 'テスト',
          content: '<h2 id="概要">概要</h2>',
        },
      ],
      contentRoot,
    );

    expect(collection[0]).toMatchObject({
      rawSlug: 'testing/index',
      slug: 'testing',
      permalink: '/notes/testing',
      noteKind: 'directory-index',
      directoryPath: 'testing',
    });
  });

  it('testing.md と testing/index.md が同居する場合は曖昧としてエラーにする', async () => {
    const contentRoot = await createContentRoot();

    await mkdir(path.join(contentRoot, 'testing'), { recursive: true });
    await writeFile(path.join(contentRoot, 'testing.md'), '# leaf', 'utf8');
    await writeFile(path.join(contentRoot, 'testing', 'index.md'), '# dir', 'utf8');

    expect(() =>
      buildNotesCollection(
        [
          {
            slug: 'testing',
            title: 'テスト',
            content: '',
          },
        ],
        contentRoot,
      ),
    ).toThrow(/Ambiguous note source/);
  });
});
