import { describe, expect, it } from 'vitest';
import {
  buildSearchRenderHref,
  createSearchCanonicalPathname,
} from '../../shared/search/document-url.js';

describe('search document URL contract', () => {
  it('canonical pathname と render href を分離すること', () => {
    const canonical = createSearchCanonicalPathname({ pathname: '/notes/a/' });
    expect(canonical.ok).toBe(true);
    if (canonical.ok)
      expect(
        buildSearchRenderHref({
          canonicalPathname: canonical.canonicalPathname,
          basePath: '/rouault',
        }),
      ).toBe('/rouault/notes/a/');
  });
});
