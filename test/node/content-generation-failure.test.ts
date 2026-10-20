import { mkdtemp, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  saveContentCollections,
  type ContentOutputIO,
} from '../../build/content/generate-content.js';
import {
  createContentBuildLifecycle,
  createSearchAvailability,
} from '../../build/dev/search-availability.js';

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

const setup = async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'content-failure-'));
  directories.push(directory);
  await writeFile(path.join(directory, 'notes.json'), 'old notes');
  await writeFile(path.join(directory, 'memos.json'), 'old memos');
  return directory;
};
const read = (directory: string, name: string) =>
  readFile(path.join(directory, `${name}.json`), 'utf8');

describe('content JSON failure semantics', () => {
  it.each([1, 2])('一時ファイル%dの書込み失敗では両既存JSONを保存する', async (failureAt) => {
    const directory = await setup();
    const error = new Error('injected write failure');
    let writes = 0;
    const replace = vi.fn(rename);
    const io: ContentOutputIO = {
      writeFile: async (...args) => {
        if (++writes === failureAt) throw error;
        await writeFile(...args);
      },
      rename: replace,
      rm,
    };
    await expect(saveContentCollections({ notes: [], memos: [] }, directory, io)).rejects.toBe(
      error,
    );
    expect(await read(directory, 'notes')).toBe('old notes');
    expect(await read(directory, 'memos')).toBe('old memos');
    expect(replace).not.toHaveBeenCalled();
    expect((await readdir(directory)).sort()).toEqual(['memos.json', 'notes.json']);
  });
  it.each([1, 2])('置換%dの失敗は後段と配信を止め、次の全生成で回復する', async (failureAt) => {
    const directory = await setup();
    const availability = createSearchAvailability();
    const copy = vi.fn(async () => undefined);
    const search = vi.fn(async () => undefined);
    let replacements = 0;
    let fail = true;
    const io: ContentOutputIO = {
      writeFile,
      rm,
      rename: async (...args) => {
        if (fail && ++replacements === failureAt) throw new Error('injected replacement failure');
        await rename(...args);
      },
    };
    const lifecycle = createContentBuildLifecycle({
      availability,
      generateContent: () => saveContentCollections({ notes: [], memos: [] }, directory, io),
      copyStaticArtifacts: copy,
      emitSearch: search,
    });
    const failed = {};
    await expect(lifecycle.before(failed)).rejects.toThrow('replacement failure');
    await lifecycle.after(failed);
    expect(await read(directory, 'notes')).toBe(failureAt === 1 ? 'old notes' : '[]');
    expect(await read(directory, 'memos')).toBe('old memos');
    expect(copy).not.toHaveBeenCalled();
    expect(search).not.toHaveBeenCalled();
    expect(availability.isAvailable()).toBe(false);
    fail = false;
    const recovery = {};
    await lifecycle.before(recovery);
    expect(availability.isAvailable()).toBe(false);
    await lifecycle.after(recovery);
    expect(await read(directory, 'notes')).toBe('[]');
    expect(await read(directory, 'memos')).toBe('[]');
    expect(copy).toHaveBeenCalledOnce();
    expect(search).toHaveBeenCalledOnce();
    expect(availability.isAvailable()).toBe(true);
  });
  it('cleanup失敗で元の書込みエラーを隠さない', async () => {
    const directory = await setup();
    const error = new Error('original write failure');
    await expect(
      saveContentCollections({ notes: [], memos: [] }, directory, {
        rename,
        writeFile: async () => {
          throw error;
        },
        rm: async () => {
          throw new Error('cleanup');
        },
      }),
    ).rejects.toBe(error);
  });
  it('シリアライズ失敗では一時ファイルも置換もしない', async () => {
    const directory = await setup();
    const notes: never[] = [];
    Object.defineProperty(notes, 'toJSON', {
      value: () => {
        throw new Error('serialize');
      },
    });
    const write = vi.fn(writeFile);
    await expect(
      saveContentCollections({ notes, memos: [] }, directory, { writeFile: write, rename, rm }),
    ).rejects.toThrow('serialize');
    expect(write).not.toHaveBeenCalled();
    expect(await read(directory, 'notes')).toBe('old notes');
  });
});

describe('search availability lifecycle', () => {
  it.each(['input', 'static', 'search'] as const)(
    '%s失敗は閉じたままにし、修正後の試行だけが回復する',
    async (phase) => {
      const availability = createSearchAvailability();
      let failure = true;
      const run = (stage: typeof phase) => async () => {
        if (failure && stage === phase) throw new Error(stage);
      };
      const lifecycle = createContentBuildLifecycle({
        availability,
        generateContent: run('input'),
        copyStaticArtifacts: run('static'),
        emitSearch: run('search'),
      });
      expect(availability.isAvailable()).toBe(false);
      const first = {};
      if (phase === 'input') await expect(lifecycle.before(first)).rejects.toThrow(phase);
      else {
        await lifecycle.before(first);
        await expect(lifecycle.after(first)).rejects.toThrow(phase);
      }
      expect(availability.isAvailable()).toBe(false);
      failure = false;
      const next = {};
      await lifecycle.before(next);
      expect(availability.isAvailable()).toBe(false);
      await lifecycle.after(next);
      expect(availability.isAvailable()).toBe(true);
      const failedAgain = {};
      failure = true;
      if (phase === 'input') await expect(lifecycle.before(failedAgain)).rejects.toThrow(phase);
      else {
        await lifecycle.before(failedAgain);
        await expect(lifecycle.after(failedAgain)).rejects.toThrow(phase);
      }
      expect(availability.isAvailable()).toBe(false);
    },
  );
  it('HTML生成が失敗してafterへ到達しなければ配信を再開しない', async () => {
    const availability = createSearchAvailability();
    const lifecycle = createContentBuildLifecycle({
      availability,
      generateContent: async () => undefined,
      copyStaticArtifacts: async () => undefined,
      emitSearch: async () => undefined,
    });
    const event = {};
    await lifecycle.before(event);
    expect(availability.isAvailable()).toBe(false);
  });
  it('古いafterと進行中afterは新しい試行を再開できない', async () => {
    const availability = createSearchAvailability();
    let resolveCopy: () => void = () => undefined;
    const lifecycle = createContentBuildLifecycle({
      availability,
      generateContent: async () => undefined,
      copyStaticArtifacts: () =>
        new Promise<void>((resolve) => {
          resolveCopy = resolve;
        }),
      emitSearch: async () => undefined,
    });
    const old = {},
      latest = {};
    await lifecycle.before(old);
    const pending = lifecycle.after(old);
    await lifecycle.before(latest);
    resolveCopy();
    await pending;
    await lifecycle.after(old);
    expect(availability.isAvailable()).toBe(false);
    const latestPending = lifecycle.after(latest);
    resolveCopy();
    await latestPending;
    expect(availability.isAvailable()).toBe(true);
  });
});
