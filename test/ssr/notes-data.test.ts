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
});
