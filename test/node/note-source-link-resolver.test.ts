import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  isRawNotesAbsoluteHref,
  parseRawHref,
  resolveNoteSourceLink,
} from '../../build/markdown/note-source-link-resolver.js';

const createFixture = () => {
  const root = mkdtempSync(path.join(tmpdir(), 'rouault-note-links-'));
  const content = path.join(root, 'content');
  const fixtures = path.join(root, 'fixtures-content');
  mkdirSync(path.join(content, 'program', 'csharp'), { recursive: true });
  mkdirSync(path.join(content, 'program', 'directory'), { recursive: true });
  mkdirSync(fixtures, { recursive: true });
  writeFileSync(path.join(content, 'program', 'csharp', 'index.md'), '# Source\n');
  writeFileSync(path.join(content, 'program', 'csharp', 'target.md'), '# Target\n');
  writeFileSync(path.join(content, 'program', 'directory', 'index.md'), '# Directory\n');
  return {
    content,
    fixtures,
    sourceFilePath: path.join(content, 'program', 'csharp', 'index.md'),
    sourceRootPaths: {
      content,
      'test/fixtures/content': fixtures,
    },
  };
};

describe('note source link resolver', () => {
  it('leaf note への相対 .md link を permalink に変換すること', () => {
    const fixture = createFixture();

    const result = resolveNoteSourceLink(
      { href: './target.md?tab=rust#section', sourceFilePath: fixture.sourceFilePath },
      { sourceRootPaths: fixture.sourceRootPaths },
    );

    expect(result.kind).to.equal('resolved');
    if (result.kind !== 'resolved') return;
    expect(result.href).to.equal('/notes/program/csharp/target?tab=rust#section');
    expect(result.permalink).to.equal('/notes/program/csharp/target');
    expect(result.requestedSlug).to.equal('program/csharp/target');
    expect(result.sourceFileDisplayPath).to.equal('content/program/csharp/index.md');
    expect(result.targetSourceFileDisplayPath).to.equal('content/program/csharp/target.md');
  });

  it('directory-index note への相対 .md link を permalink に変換すること', () => {
    const fixture = createFixture();

    const result = resolveNoteSourceLink(
      { href: '../directory/index.md', sourceFilePath: fixture.sourceFilePath },
      { sourceRootPaths: fixture.sourceRootPaths },
    );

    expect(result.kind).to.equal('resolved');
    if (result.kind !== 'resolved') return;
    expect(result.href).to.equal('/notes/program/directory');
    expect(result.permalink).to.equal('/notes/program/directory');
    expect(result.requestedSlug).to.equal('program/directory');
  });

  it('存在しない source .md link を build-time error にすること', () => {
    const fixture = createFixture();

    expect(() =>
      resolveNoteSourceLink(
        { href: './missing.md', sourceFilePath: fixture.sourceFilePath },
        { sourceRootPaths: fixture.sourceRootPaths },
      ),
    ).to.throw('The target Markdown file does not exist.');
  });

  it('source .md link 候補の raw pathname を厳格に拒否すること', () => {
    const fixture = createFixture();

    for (const href of ['./target.MD', './target.md/', './target.md.bak', './foo%20bar.md']) {
      expect(() =>
        resolveNoteSourceLink(
          { href, sourceFilePath: fixture.sourceFilePath },
          { sourceRootPaths: fixture.sourceRootPaths },
        ),
      ).to.throw();
    }
  });

  it('/notes/... 直書きを raw absolute href としてだけ検出すること', () => {
    expect(isRawNotesAbsoluteHref('/notes/program/csharp')).to.equal(true);
    expect(isRawNotesAbsoluteHref('/notes/program/csharp/')).to.equal(true);
    expect(isRawNotesAbsoluteHref('https://example.com/notes/program/csharp')).to.equal(false);
    expect(isRawNotesAbsoluteHref('//example.com/notes/program/csharp')).to.equal(false);
  });

  it('protocol-relative URL と unsafe scheme を note source link として扱わないこと', () => {
    expect(parseRawHref('//example.com/foo.md').kind).to.equal('protocol-relative-url');
    expect(parseRawHref('javascript:alert(1)').kind).to.equal('unsafe-scheme-url');
  });
});

