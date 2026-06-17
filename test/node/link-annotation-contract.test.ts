import { describe, expect, it } from 'vitest';
import {
  classifyLinkHref,
  createManifestLoadedRouteClassificationMode,
} from '../../shared/link/link-annotation.js';

const siteUrlContext = { siteOrigin: 'https://example.com', basePath: '' } as const;
const routeClassificationMode = createManifestLoadedRouteClassificationMode({
  isInternalDocumentPathname: (pathname) => pathname === '/' || pathname === '/about/',
});

describe('link annotation contract', () => {
  it('target/download/rel/data-no-router を routerInterceptionPolicy に反映すること', () => {
    const base = {
      href: '/about/',
      surface: 'prose' as const,
      siteUrlContext,
      currentUrl: 'https://example.com/',
      routeClassificationMode,
    };

    expect(classifyLinkHref(base).routerInterceptionPolicy).to.equal('intercept');
    expect(classifyLinkHref({ ...base, target: '_blank' }).routerInterceptionPolicy).to.equal(
      'passthrough',
    );
    expect(classifyLinkHref({ ...base, download: true }).routerInterceptionPolicy).to.equal(
      'passthrough',
    );
    expect(classifyLinkHref({ ...base, rel: 'external' }).routerInterceptionPolicy).to.equal(
      'passthrough',
    );
    expect(classifyLinkHref({ ...base, noRouter: true }).routerInterceptionPolicy).to.equal(
      'passthrough',
    );
  });

  it('manifest 外 currentUrl を current document として扱わないこと', () => {
    expect(() =>
      classifyLinkHref({
        href: '#heading',
        surface: 'prose',
        siteUrlContext,
        currentUrl: 'https://example.com/missing/',
        routeClassificationMode,
      }),
    ).toThrow();
  });
});
