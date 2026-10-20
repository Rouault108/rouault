import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { readContentInputs, type ContentInput } from '../../build/content/content-input.js';
import { createContentBuildContext } from '../../build/content/content-build-context.js';
import { compileContentInput } from '../../build/content/content-compiler.js';
import { compileContentInputs } from '../../build/content/generate-content.js';
import { validateContentMetadata } from '../../build/content/content-schema.js';
import { collectNoteSourceLinksFromTree } from '../../build/content/validate-note-source-links.js';
import type { MdastNode } from '../../build/remark/directives/types.js';
import * as fs from 'node:fs';
import { buildNotesCollection, filterPublicNotes } from '../../build/data/notes.js';
import { buildMemosCollection } from '../../build/data/memos.js';
import { buildNoteNavigationModel } from '../../build/navigation/index.js';
import { buildNotePageProjection } from '../../build/projections/note-page-projection.js';
import { buildMemoPageProjection } from '../../build/projections/memo-page-projection.js';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return { ...actual, readFileSync: vi.fn(actual.readFileSync) };
});
const site = { siteOrigin: 'https://rouault.invalid', basePath: '' };
const input = (
  body: string,
  metadata: ContentInput['metadata'] = {
    title: 'Test',
    kind: 'testing',
    testingArea: 'interactive',
  },
): ContentInput => ({
  identity: { collectionId: 'notes', sourceRelativePath: 'synthetic.md' },
  sourceRoot: 'content/notes',
  sourceFilePath: path.resolve('content/notes/synthetic.md'),
  sourceLabel: 'content/notes/synthetic.md',
  body,
  bodyStartLine: 8,
  metadata,
});
const compile = (source: ContentInput) =>
  compileContentInput(source, createContentBuildContext([source], site)(source));

describe('content schema and compiler', () => {
  it('titleとenumを検証し、日付は既存ISO形式へ正規化する', () => {
    expect(() => validateContentMetadata({}, 'notes', 'test')).toThrow('title');
    expect(() => validateContentMetadata({ title: 'A', kind: 'unknown' }, 'notes', 'test')).toThrow(
      'kind',
    );
    expect(() => validateContentMetadata({ title: 'A', date: 'invalid' }, 'notes', 'test')).toThrow(
      'date',
    );
    expect(
      validateContentMetadata(
        { title: 'A', date: '2026-01-01', unknown: 'ignored' },
        'notes',
        'test',
      ),
    ).toEqual({ title: 'A', date: '2026-01-01T00:00:00.000Z' });
    expect(() => validateContentMetadata({ title: 'A', kind: 'testing' }, 'notes', 'test')).toThrow(
      'testingArea',
    );
  });
  it('memoは許可metadataだけを受け付ける', () => {
    for (const value of [
      { title: '', license: 'CC BY 4.0' },
      { title: 'A', license: 'other' },
      { title: 'A', license: 'CC BY 4.0', content: 'override' },
      { title: 'A', license: 'CC BY 4.0', kind: 'reader' },
    ])
      expect(() => validateContentMetadata(value, 'memos', 'test')).toThrow();
    expect(validateContentMetadata({ title: 'A', license: 'CC BY 4.0' }, 'memos', 'test')).toEqual({
      title: 'A',
      license: 'CC BY 4.0',
    });
  });
  it('純粋なコメントは除去し、HTMLが混在したコメントを拒否する', async () => {
    expect((await compile(input('<!-- comment -->\n\nBody'))).note?.content).toContain(
      '<p>Body</p>',
    );
    await expect(compile(input('<!-- comment -->\n<div>unsafe</div>'))).rejects.toThrow('生HTML');
    await expect(compile(input('<!-- first --><div>unsafe</div><!-- last -->'))).rejects.toThrow(
      '生HTML',
    );
  });
  it('注入済みreader policyを使い、sandbox用のpath推測へ戻らない', async () => {
    await expect(
      compile(
        input('::code-preview{toolbar="true"}\n\n```html\n<p>hello</p>\n```\n\n::', {
          title: 'Reader',
        }),
      ),
    ).rejects.toThrow();
  });
  it('変換前のURLとfrontmatterを含むsource位置をコピーして保持する', async () => {
    const source = input(
      'See [target](https://example.com/path).\n\n::link-card{url="https://example.com/card" title="Card"}',
    );
    const result = await compile(source);
    expect(result.links[0]).toMatchObject({
      origin: 'mdast-link',
      href: 'https://example.com/path',
      position: { line: 8, column: 5 },
    });
    expect(result.links.find((link) => link.origin === 'directive-url-attribute')).toMatchObject({
      href: 'https://example.com/card',
      directiveName: 'link-card',
      directiveAttributeName: 'url',
      position: { line: 10, column: 1 },
    });
    const tree: MdastNode = {
      children: [{ type: 'link', url: './before.md', position: { start: { line: 2, column: 3 } } }],
    };
    const collected = collectNoteSourceLinksFromTree(tree, {
      sourceFilePath: 'source',
      sourceFileDisplayPath: 'source',
      bodyStartLine: 5,
    });
    const link = tree.children?.[0];
    if (!link?.position?.start) throw new Error('missing fixture position');
    link.url = './after.md';
    link.position.start.line = 100;
    expect(collected[0]).toMatchObject({ href: './before.md', position: { line: 6, column: 3 } });
    const folded = await compile(
      input(
        '::link-card{url="https://example.com/one" title="One"}\n::link-card{url="https://example.com/two" title="Two"}',
      ),
    );
    expect(folded.links.map((link) => link.position?.line)).toEqual([8, 9]);
  });
  it('分類、本文変換、include、投影、リンク検証で文書Markdownを再読込しない', async () => {
    vi.mocked(fs.readFileSync).mockClear();
    const inputs = readContentInputs();
    const documentPaths = new Set(inputs.map((source) => source.sourceFilePath));
    const reads = () =>
      vi
        .mocked(fs.readFileSync)
        .mock.calls.filter(([file]) => documentPaths.has(String(file)))
        .map(([file]) => String(file));
    expect(reads()).toHaveLength(inputs.length);
    // include先は展開時にだけ読む。収集と最終リンク検証も同じ展開結果を利用する。
    expect(inputs.some((source) => source.body.includes('::example-include'))).toBe(true);
    const generated = await compileContentInputs(inputs);
    const notes = filterPublicNotes(
      buildNotesCollection(generated.notes, path.resolve('content/notes')),
    );
    for (const note of notes) {
      const linkContext = generated.contexts.get(
        `${note.sourceRoot ?? 'content/notes'}/${note.rawSlug}.md`,
      );
      if (!linkContext) throw new Error('missing context');
      buildNotePageProjection({
        note,
        navigation: buildNoteNavigationModel({ currentNote: note, notes }),
        linkContext,
      });
    }
    const memos = buildMemosCollection(generated.memos);
    for (const memo of memos) {
      const context = generated.contexts.get(
        `${memo.sourceRoot}/${memo.identity.sourceRelativePath}`,
      );
      if (!context) throw new Error('missing memo context');
      buildMemoPageProjection(memo, memos, context);
    }
    expect(reads()).toHaveLength(inputs.length);
  }, 30_000);
  it('includeは一度だけ展開し、同じ木からURLと展開元refを収集する', async () => {
    vi.mocked(fs.readFileSync).mockClear();
    const source = input('::example-include{ref="media/core"}', {
      title: 'Included',
      kind: 'testing',
      testingArea: 'media',
    });
    const result = await compile(source);
    const sampleReads = vi
      .mocked(fs.readFileSync)
      .mock.calls.filter(([file]) => String(file).endsWith('/examples/snippets/media/core.md'));
    expect(sampleReads).toHaveLength(1);
    expect(result.links.some((link) => link.expansionSource?.ref === 'media/core')).toBe(true);
    expect(result.note?.content).toContain('data-link-card');
  });
  it('下書きも変換し、公開noteのリンク検証からは除く', async () => {
    const draft = input('See [draft route](/notes/nonexistent).', {
      title: 'Draft',
      status: 'draft',
    });
    await expect(compileContentInputs([draft])).rejects.toThrow('/notes/');
    const validDraft = input('See [missing](/unregistered-resource).', {
      title: 'Draft',
      status: 'draft',
    });
    expect((await compileContentInputs([validDraft])).notes).toHaveLength(1);
  });
});
