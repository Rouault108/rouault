import { describe, expect, it } from 'vitest';
import {
  normalizeRouaultPathname,
  resolveRouaultContentPath,
  sanitizeRouaultSearchParams,
} from '../../shared/url/rouault-url-policy.js';

describe('shared Rouault URL policy', () => {
  it('/search は trailing slash 付きへ正規化すること', () => {
    expect(normalizeRouaultPathname('/search')).to.equal('/search/');
    expect(normalizeRouaultPathname('/search/')).to.equal('/search/');
  });

  it('/about は trailing slash 付きへ正規化すること', () => {
    expect(normalizeRouaultPathname('/about')).to.equal('/about/');
    expect(normalizeRouaultPathname('/about/')).to.equal('/about/');
  });

  it('/corpora は trailing slash 付きへ正規化すること', () => {
    expect(normalizeRouaultPathname('/corpora')).to.equal('/corpora/');
    expect(normalizeRouaultPathname('/corpora/')).to.equal('/corpora/');
    expect(normalizeRouaultPathname('/corpora/music')).to.equal('/corpora/music/');
    expect(normalizeRouaultPathname('/corpora/music/')).to.equal('/corpora/music/');
  });

  it('/tags/<tag>/ は trailing slash を保持すること', () => {
    expect(normalizeRouaultPathname('/tags/music/')).to.equal('/tags/music/');
  });

  it('/tags/<tag> は tag SearchStateUrl canonical へ補完しないこと', () => {
    expect(normalizeRouaultPathname('/tags/music')).to.equal('/tags/music');
  });

  it('通常ページは trailing slash を除去すること', () => {
    expect(normalizeRouaultPathname('/notes/example/')).to.equal('/notes/example');
  });

  it('wtr-session-id は search params から除去すること', () => {
    const url = new URL('https://example.com/search/?q=test&wtr-session-id=abc&tab=all');

    sanitizeRouaultSearchParams(url);

    expect(url.searchParams.has('wtr-session-id')).to.equal(false);
    expect(url.searchParams.get('q')).to.equal('test');
    expect(url.searchParams.get('tab')).to.equal('all');
  });

  it('content fetch 用 URL は拡張子なし pathname に trailing slash を付与すること', () => {
    expect(resolveRouaultContentPath('/notes/example')).to.equal('/notes/example/');
    expect(resolveRouaultContentPath('/search')).to.equal('/search/');
    expect(resolveRouaultContentPath('/assets/app.css')).to.equal('/assets/app.css');
  });
});
