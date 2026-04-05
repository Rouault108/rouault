import { describe, expect, it } from 'vitest';
import { LocationAdapter } from '../../src/router/location-adapter.js';

describe('LocationAdapter', () => {
  it('/search は trailing slash なしへ正規化すること', () => {
    const adapter = new LocationAdapter();

    expect(adapter.normalizePathname('/search')).to.equal('/search');
    expect(adapter.normalizePathname('/search/')).to.equal('/search');
  });

  it('/about は trailing slash 付きへ正規化すること', () => {
    const adapter = new LocationAdapter();

    expect(adapter.normalizePathname('/about')).to.equal('/about/');
    expect(adapter.normalizePathname('/about/')).to.equal('/about/');
  });

  it('/corpora は trailing slash 付きへ正規化すること', () => {
    const adapter = new LocationAdapter();

    expect(adapter.normalizePathname('/corpora')).to.equal('/corpora/');
    expect(adapter.normalizePathname('/corpora/')).to.equal('/corpora/');
    expect(adapter.normalizePathname('/corpora/music')).to.equal('/corpora/music/');
    expect(adapter.normalizePathname('/corpora/music/')).to.equal('/corpora/music/');
  });

  it('/tags/<tag>/ は trailing slash を保持すること', () => {
    const adapter = new LocationAdapter();

    expect(adapter.normalizePathname('/tags/music/')).to.equal('/tags/music/');
  });

  it('通常ページは trailing slash を除去すること', () => {
    const adapter = new LocationAdapter();

    expect(adapter.normalizePathname('/notes/example/')).to.equal('/notes/example');
  });
});
