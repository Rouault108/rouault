import { expect, fixture, html } from '@open-wc/testing';

import {
  dispatchSearchReturnToReading,
  handleSearchReturnToReadingEvent,
} from '../../src/search/navigation.js';
import { navigateInternalDocument } from '../../src/router/navigate-internal-document.js';
import { searchReturnToReadingEventName } from '../../src/search/search-dialog-events.js';
import { DEFAULT_SITE_URL_CONTEXT } from '../../shared/site/site-url-context.js';
import type { NavigationResult } from '../../src/router/router.js';
import { toInternalDocumentNormalizedUrl } from '../../src/router/internal-document-normalized-url.js';
import { createInternalDocumentRouteSet } from '../../shared/navigation/internal-document-route-set.js';
import { createSearchEventDiagnosticSink } from '../../shared/search/search-diagnostics.js';
import { normalizeRouaultPathname } from '../../shared/url/rouault-url-policy.js';

const createCompletedNavigationResult = (url: string): NavigationResult => ({
  kind: 'completed',
  outcome: 'completed',
  normalizedUrl: toInternalDocumentNormalizedUrl(url),
  historyMode: 'push',
  stateOnly: false,
  committed: true,
  degraded: false,
  issues: [],
  source: 'none',
  renderedKind: null,
});

const createLoadedRouteManifestState = (routes: readonly string[]) => {
  const routeSet = createInternalDocumentRouteSet([
    ...routes,
    ...routes.map((route) => normalizeRouaultPathname(route)),
  ]);
  return {
  status: 'loaded' as const,
  manifest: {
    version: 1 as const,
    buildId: 'test-build-id',
    buildLabel: 'test-build-label',
    generatedAt: '2026-01-01T00:00:00.000Z',
    siteOrigin: DEFAULT_SITE_URL_CONTEXT.siteOrigin,
    basePath: DEFAULT_SITE_URL_CONTEXT.basePath,
    routes: routeSet.routes,
  },
  routeSet,
  };
};

describe('search-navigation', () => {
  it('app-router が存在する場合は SPA navigate を優先すること', async () => {
    const host = await fixture<HTMLElement>(html`<app-router></app-router>`);
    let navigatedUrl = '';

    (host as HTMLElement & { navigate: (url: string) => Promise<NavigationResult> }).navigate = (
      url: string,
    ) => {
      navigatedUrl = url;
      return Promise.resolve(createCompletedNavigationResult(url));
    };

    await navigateInternalDocument('/search/?q=router');

    expect(navigatedUrl).to.equal('/search/?q=router');
    host.remove();
  });

  it('app-router が存在しない場合は fallback navigation を行わないこと', async () => {
    const result = await navigateInternalDocument('/tags/music/', {
      resolveRouter: () => null,
    });

    expect(result.kind).to.equal('lifecycle-failure');
    if (result.kind === 'lifecycle-failure') {
      expect(result.reason).to.equal('not-started');
    }
  });

  it('return-to-reading event を route manifest 検証後に navigation adapter が URL navigation へ変換すること', async () => {
    const target = new EventTarget();
    let navigatedUrl = '';
    let observedType = '';
    const routeManifestState = createLoadedRouteManifestState(['/notes/search-result/']);

    const diagnostics = createSearchEventDiagnosticSink();

    target.addEventListener(searchReturnToReadingEventName, (event) => {
      observedType = event.type;
      void handleSearchReturnToReadingEvent(event, {
        siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
        routeManifestState,
        diagnostics,
        resolveRouter: () => ({
          navigate: (url: string) => {
            navigatedUrl = url;
            return Promise.resolve(createCompletedNavigationResult(url));
          },
        }),
      });
    });

    const dispatched = dispatchSearchReturnToReading(
      {
        schemaVersion: 1,
        eventName: searchReturnToReadingEventName,
        renderHref: '/notes/search-result/',
        canonicalPathname: '/notes/search-result/',
        title: 'Search Result',
        query: 'search',
        selectionMethod: 'keyboard',
      },
      { target },
    );

    await Promise.resolve();

    expect(dispatched).to.equal(true);
    expect(observedType).to.equal(searchReturnToReadingEventName);
    expect(navigatedUrl).to.equal('/notes/search-result/');
  });

  it('return-to-reading event は renderHref mismatch を navigation しないこと', async () => {
    const target = new EventTarget();
    let navigatedUrl = '';
    const routeManifestState = createLoadedRouteManifestState(['/notes/search-result/']);

    const diagnostics = createSearchEventDiagnosticSink();

    target.addEventListener(searchReturnToReadingEventName, (event) => {
      void handleSearchReturnToReadingEvent(event, {
        siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
        routeManifestState,
        diagnostics,
        resolveRouter: () => ({
          navigate: (url: string) => {
            navigatedUrl = url;
            return Promise.resolve(createCompletedNavigationResult(url));
          },
        }),
      });
    });

    dispatchSearchReturnToReading(
      {
        schemaVersion: 1,
        eventName: searchReturnToReadingEventName,
        renderHref: '/externalized/',
        canonicalPathname: '/notes/search-result/',
        title: 'Search Result',
        query: 'search',
        selectionMethod: 'keyboard',
      },
      { target },
    );

    await Promise.resolve();

    expect(navigatedUrl).to.equal('');
    expect(diagnostics.snapshot().issues.map((issue) => issue.code)).to.deep.equal([
      'search-event-render-href-mismatch',
    ]);
  });

  it('router host がない場合も unsafe / external / resource を disallowed-url にすること', async () => {
    const routeManifestState = createLoadedRouteManifestState(['/notes/example/']);

    for (const url of ['javascript:alert(1)', 'https://other.example/', '/assets/file.pdf']) {
      const result = await navigateInternalDocument(url, {
        siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
        routeManifestState,
        currentUrl: `${DEFAULT_SITE_URL_CONTEXT.siteOrigin}/notes/example/`,
        resolveRouter: () => null,
      });

      expect(result.kind).to.equal('validation-failure');
      if (result.kind === 'validation-failure') {
        expect(result.reason).to.equal('disallowed-url');
      }
    }
  });

  it('router host がない内部文書候補は validation 後に not-started を返すこと', async () => {
    const result = await navigateInternalDocument('/notes/example/', {
      siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
      routeManifestState: createLoadedRouteManifestState(['/notes/example/']),
      currentUrl: `${DEFAULT_SITE_URL_CONTEXT.siteOrigin}/search/`,
      resolveRouter: () => null,
    });

    expect(result.kind).to.equal('lifecycle-failure');
    if (result.kind === 'lifecycle-failure') {
      expect(result.reason).to.equal('not-started');
    }
  });


  it('router host がない内部文書候補は manifest failure を not-started より優先すること', async () => {
    const result = await navigateInternalDocument('/notes/example/', {
      siteUrlContext: DEFAULT_SITE_URL_CONTEXT,
      routeManifestState: { status: 'unavailable', reason: 'route-manifest-unavailable' },
      currentUrl: `${DEFAULT_SITE_URL_CONTEXT.siteOrigin}/search/`,
      resolveRouter: () => null,
    });

    expect(result.kind).to.equal('validation-failure');
    if (result.kind === 'validation-failure') {
      expect(result.reason).to.equal('route-manifest-unavailable');
    }
  });

});
