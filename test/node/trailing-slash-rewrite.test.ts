import { describe, expect, it } from 'vitest';

import { resolveTrailingSlashRewrite } from '../../shared/navigation/trailing-slash-rewrite.js';

describe('resolveTrailingSlashRewrite', () => {
  it('拡張子なしの内部URLを trailing slash 付きへ rewrite すること', () => {
    expect(resolveTrailingSlashRewrite('/notes/music/classical/beethoven/symphony-9')).to.equal(
      '/notes/music/classical/beethoven/symphony-9/',
    );
  });

  it('corpora URL を trailing slash 付きへ rewrite すること', () => {
    expect(resolveTrailingSlashRewrite('/corpora')).to.equal('/corpora/');
    expect(resolveTrailingSlashRewrite('/corpora/music')).to.equal('/corpora/music/');
  });

  it('クエリ文字列を維持すること', () => {
    expect(resolveTrailingSlashRewrite('/search?q=router')).to.equal('/search/?q=router');
  });

  it('既に trailing slash が付いているURLは rewrite しないこと', () => {
    expect(resolveTrailingSlashRewrite('/notes/music/classical/beethoven/symphony-9/')).to.equal(
      null,
    );
  });

  it('拡張子付きリソースは rewrite しないこと', () => {
    expect(resolveTrailingSlashRewrite('/assets/main.css')).to.equal(null);
  });

  it('Vite の内部パスは rewrite しないこと', () => {
    expect(resolveTrailingSlashRewrite('/@vite/client')).to.equal(null);
  });
});
