import { describe, expect, it } from 'vitest';
import {
  buildSearchRenderHref,
  createSearchCanonicalPathname,
} from '../../shared/search/document-url.js';

describe('search document URL contract', () => {
  it('canonical pathname と render href を分離すること', () => {
    const canonical = createSearchCanonicalPathname({ pathname: '/notes/a' });
    expect(canonical.ok).toBe(true);
    if (canonical.ok) {
      expect(canonical.canonicalPathname).to.equal('/notes/a/');
      expect(
        buildSearchRenderHref({
          canonicalPathname: canonical.canonicalPathname,
          basePath: '',
        }),
      ).toBe('/notes/a/');
      expect(
        buildSearchRenderHref({
          canonicalPathname: canonical.canonicalPathname,
          basePath: '/rouault',
        }),
      ).toBe('/rouault/notes/a/');
    }
  });

  it('SearchStateUrl を SearchCanonicalPathname として受け入れないこと', () => {
    expect(createSearchCanonicalPathname({ pathname: '/search/' }).ok).toBe(false);
    expect(createSearchCanonicalPathname({ pathname: '/tags/music/' }).ok).toBe(false);
  });
});
