import { describe, expect, it } from 'vitest';

import {
  normalizeNoteNavigationUrl,
  normalizeNotePath,
} from '../../build/navigation/index.js';
import { resolveTrailingSlashRewrite } from '../../shared/navigation/trailing-slash-rewrite.js';

describe('normalizeNotePath', () => {
  it('leaf note の path semantics を正規化すること', () => {
    expect(
      normalizeNotePath({
        requestedSlug: 'music/classical/beethoven/symphony-9',
        hasLeaf: true,
        hasDirectoryIndex: false,
      }),
    ).to.deep.equal({
      rawSlug: 'music/classical/beethoven/symphony-9',
      slug: 'music/classical/beethoven/symphony-9',
      permalink: '/notes/music/classical/beethoven/symphony-9',
      kind: 'leaf',
    });
  });

  it('directory-index の path semantics を復元すること', () => {
    expect(
      normalizeNotePath({
        requestedSlug: 'fixture',
        hasLeaf: false,
        hasDirectoryIndex: true,
      }),
    ).to.deep.equal({
      rawSlug: 'fixture/index',
      slug: 'fixture',
      permalink: '/notes/fixture',
      kind: 'directory-index',
      directoryPath: 'fixture',
    });
  });

  it('fixture/index.md 形式も directory-index として扱うこと', () => {
    expect(
      normalizeNotePath({
        requestedSlug: 'fixture/index',
        hasLeaf: false,
        hasDirectoryIndex: true,
      }),
    ).to.deep.equal({
      rawSlug: 'fixture/index/index',
      slug: 'fixture/index',
      permalink: '/notes/fixture/index',
      kind: 'directory-index',
      directoryPath: 'fixture/index',
    });
  });

  it('leaf と directory-index の両方が存在する場合は曖昧として拒否すること', () => {
    expect(() =>
      normalizeNotePath({
        requestedSlug: 'fixture',
        hasLeaf: true,
        hasDirectoryIndex: true,
      }),
    ).to.throw(/Ambiguous note source/);
  });
});

describe('normalizeNoteNavigationUrl', () => {
  it('note page canonical URL は trailing slash なしへ正規化すること', () => {
    expect(
      normalizeNoteNavigationUrl('/notes/music/classical/beethoven/symphony-9/?tab=score#coda'),
    ).to.equal('/notes/music/classical/beethoven/symphony-9?tab=score#coda');
  });

  it('note 以外の URL は search domain の意味論へ介入しないこと', () => {
    expect(normalizeNoteNavigationUrl('/search/?q=router')).to.equal('/search/?q=router');
  });

  it('transport rewrite は canonical note URL を source of truth にしないこと', () => {
    const canonical = normalizeNoteNavigationUrl('/notes/music/classical/beethoven/symphony-9/');
    const rewritten = resolveTrailingSlashRewrite(canonical);

    expect(canonical).to.equal('/notes/music/classical/beethoven/symphony-9');
    expect(rewritten).to.equal('/notes/music/classical/beethoven/symphony-9/');
  });
});
