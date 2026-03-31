import { expect } from '@esm-bundle/chai';
import { LocationAdapter } from '../../src/router/location-adapter.js';

describe('LocationAdapter', () => {
  it('/search は trailing slash なしへ正規化すること', () => {
    const adapter = new LocationAdapter();

    expect(adapter.normalizePathname('/search')).to.equal('/search');
    expect(adapter.normalizePathname('/search/')).to.equal('/search');
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
