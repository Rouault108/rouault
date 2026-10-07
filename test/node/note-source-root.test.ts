import { describe, expect, it } from 'vitest';

import { resolveNoteSourceLocation } from '../../shared/note/note-source-root.js';

describe('note source root', () => {
  it('test fixture source root は content より具体的な root として解決すること', () => {
    expect(
      resolveNoteSourceLocation('test/fixtures/content/notes/testing/toc-static-present'),
    ).toEqual({
      sourceRoot: 'test/fixtures/content/notes',
      slug: 'testing/toc-static-present',
    });
  });

  it('absolute path 内の test fixture source root も content に誤分類しないこと', () => {
    expect(
      resolveNoteSourceLocation(
        '/repo/rouault/test/fixtures/content/notes/testing/toc-static-present.md',
      ),
    ).toEqual({
      sourceRoot: 'test/fixtures/content/notes',
      slug: 'testing/toc-static-present.md',
    });
  });

  it('production content source root はcontent/notesとして解決すること', () => {
    expect(
      resolveNoteSourceLocation('/repo/rouault/content/notes/program/csharp/index.md'),
    ).toEqual({
      sourceRoot: 'content/notes',
      slug: 'program/csharp/index.md',
    });
  });
});
