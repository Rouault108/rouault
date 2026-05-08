import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { rehypeResolveNoteSourceLinks } from '../../build/rehype/resolve-note-source-links.js';

interface HastNode {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
}

const createFixture = () => {
  const root = mkdtempSync(path.join(tmpdir(), 'rouault-rehype-links-'));
  const content = path.join(root, 'content');
  const fixtures = path.join(root, 'fixtures-content');
  mkdirSync(path.join(content, 'testing'), { recursive: true });
  mkdirSync(fixtures, { recursive: true });
  const sourceFilePath = path.join(content, 'testing', 'index.md');
  writeFileSync(sourceFilePath, '# Source\n');
  writeFileSync(path.join(content, 'testing', 'reader-basic.md'), '# Reader\n');
  return {
    sourceFilePath,
    sourceRootPaths: {
      content,
      'test/fixtures/content': fixtures,
    },
  };
};

describe('rehypeResolveNoteSourceLinks', () => {
  it('a[href] の相対 .md link だけを正規 note URL に差し替えること', () => {
    const fixture = createFixture();
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'a',
          properties: { href: './reader-basic.md#top' },
          children: [],
        },
        {
          type: 'element',
          tagName: 'a',
          properties: { href: 'https://example.com/foo.md' },
          children: [],
        },
      ],
    };

    rehypeResolveNoteSourceLinks({ sourceRootPaths: fixture.sourceRootPaths })(tree, {
      path: fixture.sourceFilePath,
    });

    expect(tree.children?.[0]?.properties?.['href']).to.equal('/notes/testing/reader-basic#top');
    expect(tree.children?.[1]?.properties?.['href']).to.equal('https://example.com/foo.md');
  });

  it('VFile.path がない場合は error にすること', () => {
    const tree: HastNode = { type: 'root', children: [] };
    expect(() => rehypeResolveNoteSourceLinks()(tree)).to.throw('Markdown source file path');
  });

  it('/notes/... 直書きを build-time error にすること', () => {
    const fixture = createFixture();
    const tree: HastNode = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'a',
          properties: { href: '/notes/testing/reader-basic/' },
          children: [],
        },
      ],
    };

    expect(() =>
      rehypeResolveNoteSourceLinks({ sourceRootPaths: fixture.sourceRootPaths })(tree, {
        path: fixture.sourceFilePath,
      }),
    ).to.throw('/notes/...');
  });
});
