import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  collectAdoptedContentSources,
  buildPublicationRouteRegistry,
} from '../../build/content/publication-snapshot.js';
import { loadMemosData } from '../../build/data/memos.js';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('explicit memo fixture adoption', () => {
  it('keeps existing note fixtures but excludes memo fixtures from the ordinary publication set', async () => {
    vi.stubEnv('ROUAULT_MEMO_FIXTURES', '');
    const cwd = await mkdtemp(path.join(tmpdir(), 'memo-adoption-'));
    try {
      for (const root of [
        'content/notes',
        'test/fixtures/content/notes',
        'test/fixtures/content/memos',
      ]) {
        await mkdir(path.join(cwd, root), { recursive: true });
        const name = root === 'content/notes' ? 'published-note.md' : 'synthetic.md';
        await writeFile(path.join(cwd, root, name), '---\ntitle: Synthetic\n---\nBody');
      }
      const sources = collectAdoptedContentSources({ cwd });
      expect(sources.filter((source) => source.identity.collectionId === 'notes')).toHaveLength(2);
      expect(sources.filter((source) => source.identity.collectionId === 'memos')).toHaveLength(0);
      expect(buildPublicationRouteRegistry({ cwd }).byPathname.has('/memos/synthetic')).toBe(false);
      vi.stubEnv('ROUAULT_MEMO_FIXTURES', '1');
      expect(
        collectAdoptedContentSources({ cwd }).filter(
          (source) => source.identity.collectionId === 'memos',
        ),
      ).toHaveLength(1);
      expect(buildPublicationRouteRegistry({ cwd }).byPathname.has('/memos/synthetic')).toBe(true);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
  it('refuses stale fixture JSON in an ordinary build instead of rendering unadopted bodies', async () => {
    vi.stubEnv('ROUAULT_MEMO_FIXTURES', '');
    const cwd = await mkdtemp(path.join(tmpdir(), 'memo-data-'));
    try {
      await mkdir(path.join(cwd, '.velite'));
      await writeFile(
        path.join(cwd, '.velite/memos.json'),
        JSON.stringify([
          {
            sourcePath: 'test/fixtures/content/memos/synthetic.md',
            title: 'Synthetic',
            content: '<p>Synthetic body</p>',
            license: 'CC BY 4.0',
          },
        ]),
      );
      vi.spyOn(process, 'cwd').mockReturnValue(cwd);
      expect(() => loadMemosData()).toThrow('outside the adopted collection');
      vi.stubEnv('ROUAULT_MEMO_FIXTURES', '1');
      expect(loadMemosData().map((memo) => memo.canonicalPathname)).toEqual(['/memos/synthetic']);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
  it('adopts real memos and returns to the empty publication set after the last withdrawal', async () => {
    vi.stubEnv('ROUAULT_MEMO_FIXTURES', '');
    const cwd = await mkdtemp(path.join(tmpdir(), 'memo-withdraw-'));
    try {
      for (const root of ['content/memos', 'test/fixtures/content/memos']) {
        await mkdir(path.join(cwd, root), { recursive: true });
        await writeFile(path.join(cwd, root, 'A.md'), '---\ntitle: Synthetic\n---\nBody');
      }
      expect([...buildPublicationRouteRegistry({ cwd }).byPathname.keys()]).toEqual(['/memos/A']);
      await rm(path.join(cwd, 'content/memos/A.md'));
      expect([...buildPublicationRouteRegistry({ cwd }).byPathname.keys()]).toEqual([]);
      vi.stubEnv('ROUAULT_MEMO_FIXTURES', '1');
      expect([...buildPublicationRouteRegistry({ cwd }).byPathname.keys()]).toEqual(['/memos/A']);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });
});
