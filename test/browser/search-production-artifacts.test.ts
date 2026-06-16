import { expect } from '@open-wc/testing';

import { createInternalDocumentRouteSet } from '../../shared/navigation/internal-document-route-set.js';
import {
  createSearchArtifactUrlResolver,
  resolveSearchCatalogUrl,
} from '../../shared/search/search-artifact-url.js';
import { loadSearchCatalog, SearchCatalogLoadError } from '../../shared/search/search-catalog.js';
import { createSearchJsonParseDiagnosticSink } from '../../shared/search/search-diagnostics.js';
import type { SearchFetchResponse } from '../../shared/search/search-loaders.js';
import { createSearchRouteAllowlistPredicate } from '../../shared/search/search-route-allowlist.js';
import { createSiteUrlContext } from '../../shared/site/site-url-context.js';

const createResponse = (options: {
  readonly ok: boolean;
  readonly status: number;
  readonly contentType?: string;
  readonly body: unknown;
}): SearchFetchResponse => ({
  ok: options.ok,
  status: options.status,
  type: 'basic',
  redirected: false,
  headers: {
    get: (name: string) =>
      name.toLowerCase() === 'content-type'
        ? (options.contentType ?? 'application/json; charset=utf-8')
        : null,
  },
  json: async () => options.body,
  text: async () => JSON.stringify(options.body),
});

describe('search production artifacts', () => {
  it('resolver が basePath 付きの search / Pagefind artifact URL を解決すること', () => {
    const rootContext = createSiteUrlContext({ siteOrigin: 'https://example.com' });
    const nestedContext = createSiteUrlContext({
      siteOrigin: 'https://example.com',
      basePath: '/foo',
    });
    const rootResolver = createSearchArtifactUrlResolver({ siteUrlContext: rootContext });
    const nestedResolver = createSearchArtifactUrlResolver({ siteUrlContext: nestedContext });

    expect(resolveSearchCatalogUrl(rootContext)).to.equal('/search-catalog.json');
    expect(resolveSearchCatalogUrl(nestedContext)).to.equal('/foo/search-catalog.json');
    expect(rootResolver.resolvePagefindAssetUrl('pagefind.js')).to.equal('/pagefind/pagefind.js');
    expect(rootResolver.resolvePagefindAssetUrl('pagefind-entry.json')).to.equal(
      '/pagefind/pagefind-entry.json',
    );
    expect(nestedResolver.resolvePagefindAssetUrl('pagefind.js')).to.equal(
      '/foo/pagefind/pagefind.js',
    );
    expect(nestedResolver.resolvePagefindAssetUrl('pagefind-entry.json')).to.equal(
      '/foo/pagefind/pagefind-entry.json',
    );
  });

  it('top-level array の search catalog を mock fetch から読み込むこと', async () => {
    const siteUrlContext = createSiteUrlContext({ siteOrigin: 'https://example.com' });
    const routeSet = createInternalDocumentRouteSet(['/notes/search/']);

    const items = await loadSearchCatalog({
      runtimeEnvironment: 'test',
      siteUrlContext,
      artifactUrlResolver: createSearchArtifactUrlResolver({ siteUrlContext }),
      isInternalDocumentPathname: (pathname) => routeSet.has(pathname),
      testOnlyFetcher: async () =>
        createResponse({
          ok: true,
          status: 200,
          body: [
            {
              canonicalPathname: '/notes/search/',
              title: 'Search',
              tags: ['production'],
            },
          ],
        }),
    });

    expect(items).to.have.length(1);
    expect(items[0]?.tags).to.deep.equal(['production']);
  });

  it('route manifest が末尾 slash なしでも search catalog の末尾 slash あり canonicalPathname を allowlist 通過させること', async () => {
    const siteUrlContext = createSiteUrlContext({ siteOrigin: 'https://example.com' });
    const routeSet = createInternalDocumentRouteSet(['/notes/search']);

    const items = await loadSearchCatalog({
      runtimeEnvironment: 'test',
      siteUrlContext,
      artifactUrlResolver: createSearchArtifactUrlResolver({ siteUrlContext }),
      isInternalDocumentPathname: createSearchRouteAllowlistPredicate(routeSet),
      testOnlyFetcher: async () =>
        createResponse({
          ok: true,
          status: 200,
          body: [
            {
              canonicalPathname: '/notes/search/',
              title: 'Search',
              tags: ['production'],
            },
          ],
        }),
    });

    expect(items).to.have.length(1);
    expect(items[0]?.canonicalPathname).to.equal('/notes/search/');
  });

  it('404 は catalog-fetch-failed として扱うこと', async () => {
    const siteUrlContext = createSiteUrlContext({ siteOrigin: 'https://example.com' });

    try {
      await loadSearchCatalog({
        runtimeEnvironment: 'test',
        siteUrlContext,
        artifactUrlResolver: createSearchArtifactUrlResolver({ siteUrlContext }),
        isInternalDocumentPathname: () => true,
        testOnlyFetcher: async () => createResponse({ ok: false, status: 404, body: [] }),
      });
      throw new Error('loadSearchCatalog should have failed.');
    } catch (error) {
      expect(error).to.be.instanceOf(SearchCatalogLoadError);
      expect((error as SearchCatalogLoadError).code).to.equal('catalog-fetch-failed');
    }
  });

  it('top-level object は schema invalid になること', async () => {
    const siteUrlContext = createSiteUrlContext({ siteOrigin: 'https://example.com' });

    try {
      await loadSearchCatalog({
        runtimeEnvironment: 'test',
        siteUrlContext,
        artifactUrlResolver: createSearchArtifactUrlResolver({ siteUrlContext }),
        isInternalDocumentPathname: () => true,
        testOnlyFetcher: async () => createResponse({ ok: true, status: 200, body: { items: [] } }),
      });
      throw new Error('loadSearchCatalog should have failed.');
    } catch (error) {
      expect(error).to.be.instanceOf(SearchCatalogLoadError);
      expect((error as SearchCatalogLoadError).code).to.equal('catalog-normalize-failed');
    }
  });

  it('allowlist 外 item は droppedItemCount として診断できること', async () => {
    const siteUrlContext = createSiteUrlContext({ siteOrigin: 'https://example.com' });
    const diagnosticsTarget = { issues: [] };

    const items = await loadSearchCatalog({
      runtimeEnvironment: 'test',
      siteUrlContext,
      artifactUrlResolver: createSearchArtifactUrlResolver({ siteUrlContext }),
      isInternalDocumentPathname: () => false,
      diagnostics: createSearchJsonParseDiagnosticSink(diagnosticsTarget),
      testOnlyFetcher: async () =>
        createResponse({
          ok: true,
          status: 200,
          body: [{ canonicalPathname: '/notes/outside/', title: 'Outside', tags: [] }],
        }),
    });

    expect(items).to.deep.equal([]);
    expect(diagnosticsTarget.issues).to.have.length(2);
  });
});
