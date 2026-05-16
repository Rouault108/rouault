import { describe, expect, it } from 'vitest';
import { isExternalWebLinkKind, isRouterRoutableLinkKind } from '../../shared/link/link-kind.js';

describe('link kind predicates', () => {
  it('external-web だけを external indicator 対象にすること', () => {
    expect(isExternalWebLinkKind('external-web')).to.equal(true);
    expect(isExternalWebLinkKind('external-action')).to.equal(false);
  });

  it('internal-document だけを router routable とすること', () => {
    expect(isRouterRoutableLinkKind('internal-document')).to.equal(true);
    expect(isRouterRoutableLinkKind('internal-resource')).to.equal(false);
    expect(isRouterRoutableLinkKind('internal-fragment')).to.equal(false);
  });
});
