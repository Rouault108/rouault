import { expect } from '@esm-bundle/chai';

import { resolveTrailingSlashRewrite } from '../../shared/navigation/trailing-slash-rewrite.js';

describe('resolveTrailingSlashRewrite', () => {
  it('拡張子なしの内部URLを trailing slash 付きへ rewrite すること', () => {
    expect(resolveTrailingSlashRewrite('/notes/music/classical/beethoven/symphony-9')).to.equal(
      '/notes/music/classical/beethoven/symphony-9/',
    );
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
