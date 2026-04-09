import { describe, expect, it } from 'vitest';
import { RouaultUrlPolicy } from '../../src/router/rouault-url-policy.js';

describe('RouaultUrlPolicy', () => {
  it('/search は trailing slash なしへ正規化すること', () => {
    const policy = new RouaultUrlPolicy();

    expect(policy.normalizePathname('/search')).to.equal('/search');
    expect(policy.normalizePathname('/search/')).to.equal('/search');
  });

  it('/about は trailing slash 付きへ正規化すること', () => {
    const policy = new RouaultUrlPolicy();

    expect(policy.normalizePathname('/about')).to.equal('/about/');
    expect(policy.normalizePathname('/about/')).to.equal('/about/');
  });

  it('/corpora は trailing slash 付きへ正規化すること', () => {
    const policy = new RouaultUrlPolicy();

    expect(policy.normalizePathname('/corpora')).to.equal('/corpora/');
    expect(policy.normalizePathname('/corpora/')).to.equal('/corpora/');
    expect(policy.normalizePathname('/corpora/music')).to.equal('/corpora/music/');
    expect(policy.normalizePathname('/corpora/music/')).to.equal('/corpora/music/');
  });

  it('/tags/<tag>/ は trailing slash を保持すること', () => {
    const policy = new RouaultUrlPolicy();

    expect(policy.normalizePathname('/tags/music/')).to.equal('/tags/music/');
  });

  it('通常ページは trailing slash を除去すること', () => {
    const policy = new RouaultUrlPolicy();

    expect(policy.normalizePathname('/notes/example/')).to.equal('/notes/example');
  });

  it('wtr-session-id は search params から除去すること', () => {
    const policy = new RouaultUrlPolicy();
    const url = new URL('https://example.com/search/?q=test&wtr-session-id=abc&tab=all');

    policy.sanitizeSearchParams(url);

    expect(url.searchParams.has('wtr-session-id')).to.equal(false);
    expect(url.searchParams.get('q')).to.equal('test');
    expect(url.searchParams.get('tab')).to.equal('all');
  });

  it('content fetch 用 URL は拡張子なし pathname に trailing slash を付与すること', () => {
    const policy = new RouaultUrlPolicy();

    expect(policy.resolveContentPath('/notes/example')).to.equal('/notes/example/');
    expect(policy.resolveContentPath('/search')).to.equal('/search/');
    expect(policy.resolveContentPath('/assets/app.css')).to.equal('/assets/app.css');
  });
});
