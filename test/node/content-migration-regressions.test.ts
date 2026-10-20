import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readContentInputs, type ContentInput } from '../../build/content/content-input.js';
import { compileContentInputs } from '../../build/content/generate-content.js';
import { buildMemosCollection } from '../../build/data/memos.js';
import MemoPages from '../../src/memos.11ty.js';

const directories: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(
    directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('content migration edge cases', () => {
  it('nested index memoの元のidentityをJSONとページ投影のcontext lookupまで維持する', async () => {
    const sourceLabel = 'content/memos/foo/index.md';
    const input: ContentInput = {
      identity: { collectionId: 'memos', sourceRelativePath: 'foo/index.md' },
      sourceRoot: 'content/memos',
      sourceLabel,
      sourceFilePath: path.resolve(sourceLabel),
      body: '## Heading\n\nNested memo.',
      bodyStartLine: 5,
      metadata: { title: 'Nested memo', license: 'CC BY 4.0' },
    };
    const generated = await compileContentInputs([input]);
    expect(generated.memos[0]?.sourcePath).toBe(sourceLabel);
    const memos = buildMemosCollection(generated.memos);
    const memo = memos[0];
    expect(memo?.identity.sourceRelativePath).toBe('foo/index.md');
    expect(memo?.canonicalPathname).toBe('/memos/foo');
    expect(memo?.outputPath).toBe('memos/foo/index.html');
    const project = new MemoPages().data().eleventyComputed.notePage;
    expect(() =>
      project({ ...(memo ? { memo } : {}), memos, contentBuildContexts: generated.contexts }),
    ).not.toThrow();
    expect(
      project({ ...(memo ? { memo } : {}), memos, contentBuildContexts: generated.contexts })
        ?.contentHtml,
    ).toContain('Nested memo.');
  });
  it('旧globと同じfile/directory除外をmetadata読込前に適用する', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'content-exclusions-'));
    directories.push(directory);
    const excluded = [
      '_private.md',
      '_draft.md',
      '.hidden.md',
      '.hidden/child.md',
      'normal/_private.md',
      'normal/.hidden.md',
      'normal/.hidden/child.md',
      '_private/_bad.md',
    ];
    const adopted = [
      'visible.md',
      'normal/visible.md',
      '_private/child.md',
      'normal/_private/child.md',
      'normal_name/visible_file.md',
    ];
    for (const collection of ['notes', 'memos']) {
      for (const source of excluded) {
        const file = path.join(directory, 'content', collection, source);
        await mkdir(path.dirname(file), { recursive: true });
        // 除外対象はYAML自体が壊れていてもビルド入力にしない。
        await writeFile(file, '---\ntitle: [broken\n---\nHidden body');
      }
      for (const source of adopted) {
        const file = path.join(directory, 'content', collection, source);
        await mkdir(path.dirname(file), { recursive: true });
        await writeFile(
          file,
          `---\ntitle: Visible\n${collection === 'memos' ? 'license: CC BY 4.0\n' : ''}---\nVisible body`,
        );
      }
    }
    vi.spyOn(process, 'cwd').mockReturnValue(directory);
    const inputs = readContentInputs();
    expect(inputs.map((input) => input.sourceLabel)).toEqual(
      ['memos', 'notes']
        .flatMap((collection) => adopted.map((source) => `content/${collection}/${source}`))
        .sort((a, b) => a.localeCompare(b, 'en')),
    );
  });
});
