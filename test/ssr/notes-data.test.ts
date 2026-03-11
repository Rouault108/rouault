import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { buildNotesCollection, type SourceNote } from '../../src/data/notes.js';

const tempDirs: string[] = [];

const createContentRoot = async (): Promise<string> => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'rouault-notes-data-'));
  tempDirs.push(tempDir);

  await mkdir(path.join(tempDir, 'music', 'classical'), { recursive: true });
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
});
