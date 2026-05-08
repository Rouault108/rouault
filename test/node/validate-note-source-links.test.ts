import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  collectNoteSourceLinksFromMarkdown,
  stripYamlFrontmatter,
  validateCollectedAuthoringLinks,
  validateCollectedRouteReachability,
} from '../../build/content/validate-note-source-links.js';

const createFixture = () => {
  const root = mkdtempSync(path.join(tmpdir(), 'rouault-validate-links-'));
  const content = path.join(root, 'content');
  const fixtures = path.join(root, 'fixtures-content');
  mkdirSync(path.join(content, 'testing'), { recursive: true });
  mkdirSync(fixtures, { recursive: true });
  const sourceFilePath = path.join(content, 'testing', 'index.md');
  writeFileSync(sourceFilePath, '# Source\n');
  writeFileSync(path.join(content, 'testing', 'target.md'), '# Target\n');
  return {
    sourceFilePath,
    sourceRootPaths: {
      content,
      'test/fixtures/content': fixtures,
    },
  };
};

describe('validate note source links', () => {
  it('LF / CRLF / BOM の frontmatter を除去すること', () => {
    expect(stripYamlFrontmatter('---\ntitle: A\n---\n[body](./a.md)').body).to.equal(
      '[body](./a.md)',
    );
    expect(stripYamlFrontmatter('---\r\ntitle: A\r\n---\r\nbody').body).to.equal('body');
    const stripped = stripYamlFrontmatter('\uFEFF---\ntitle: A\n---\nbody');
    expect(stripped.hadBom).to.equal(true);
    expect(stripped.body).to.equal('body');
    expect(stripYamlFrontmatter('heading\n---\nbody').body).to.equal('heading\n---\nbody');
  });

  it('frontmatter ではなく Markdown body の link だけを収集すること', async () => {
    const fixture = createFixture();
    const stripped = stripYamlFrontmatter('---\nsource: /notes/not-body/\n---\n[Target](./target.md)');

    const links = await collectNoteSourceLinksFromMarkdown({
      body: stripped.body,
      bodyStartLine: stripped.bodyStartLine,
      frontmatter: stripped.frontmatter,
      sourceFilePath: fixture.sourceFilePath,
      sourceFileDisplayPath: 'content/testing/index.md',
    });

    expect(links).to.have.length(1);
    expect(links[0]?.href).to.equal('./target.md');
    expect(links[0]?.position?.line).to.equal(4);
  });

  it('/notes/... 直書きは authoring validation で拒否すること', async () => {
    const fixture = createFixture();
    const links = await collectNoteSourceLinksFromMarkdown({
      body: '[Target](/notes/testing/target/)',
      bodyStartLine: 1,
      frontmatter: null,
      sourceFilePath: fixture.sourceFilePath,
      sourceFileDisplayPath: 'content/testing/index.md',
    });

    expect(() =>
      validateCollectedAuthoringLinks(links, { sourceRootPaths: fixture.sourceRootPaths }),
    ).to.throw('/notes/...');
  });

  it('resolved permalink が route set にない場合は route validation で拒否すること', async () => {
    const fixture = createFixture();
    const links = await collectNoteSourceLinksFromMarkdown({
      body: '[Target](./target.md#frag)',
      bodyStartLine: 1,
      frontmatter: null,
      sourceFilePath: fixture.sourceFilePath,
      sourceFileDisplayPath: 'content/testing/index.md',
    });

    validateCollectedAuthoringLinks(links, { sourceRootPaths: fixture.sourceRootPaths });
    expect(() =>
      validateCollectedRouteReachability(links, new Set(['/notes/testing/other']), {
        sourceRootPaths: fixture.sourceRootPaths,
      }),
    ).to.throw('/notes/testing/target');
  });
});

