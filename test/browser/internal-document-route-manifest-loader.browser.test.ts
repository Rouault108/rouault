import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_SITE_URL_CONTEXT,
  type SiteUrlContext,
} from '../../shared/site/site-url-context.js';
import { INTERNAL_DOCUMENT_ROUTE_MANIFEST_VERSION } from '../../shared/navigation/internal-document-route-manifest-path.js';
import {
  loadInternalDocumentRouteManifest,
  loadInternalDocumentRouteManifestFromDocument,
  type InternalDocumentRouteManifestState,
} from '../../src/router/internal-document-route-manifest-loader.js';
import { readSiteUrlContextFromDocumentMeta } from '../../src/site/read-site-url-context-from-document-meta.js';

const BUILD_ID = 'build-current';
const BUILD_LABEL = 'build-label';
const GENERATED_AT = '2026-01-01T00:00:00.000Z';

const createManifest = (
  overrides: Partial<
    Record<
      'version' | 'buildId' | 'buildLabel' | 'generatedAt' | 'siteOrigin' | 'basePath' | 'routes',
      unknown
    >
  > = {},
): Record<string, unknown> => ({
  version: INTERNAL_DOCUMENT_ROUTE_MANIFEST_VERSION,
  buildId: BUILD_ID,
  buildLabel: BUILD_LABEL,
  generatedAt: GENERATED_AT,
  siteOrigin: DEFAULT_SITE_URL_CONTEXT.siteOrigin,
  basePath: DEFAULT_SITE_URL_CONTEXT.basePath,
  routes: ['/', '/search/', '/notes/example/'],
  ...overrides,
});

const createResponse = (
  options: {
    readonly body?: unknown;
    readonly status?: number;
    readonly contentType?: string | null;
  } = {},
): Response => {
  const headers = new Headers();
  if (options.contentType !== null) {
    headers.set('content-type', options.contentType ?? 'application/json');
  }

  return new Response(JSON.stringify(options.body ?? createManifest()), {
    status: options.status ?? 200,
    headers,
  });
};

const load = async (
  options: {
    readonly manifestUrl?: string;
    readonly siteUrlContext?: SiteUrlContext;
    readonly buildId?: string;
    readonly version?: number;
    readonly response?: Response;
    readonly fetcher?: typeof fetch;
    readonly currentLocation?: Location;
  } = {},
): Promise<InternalDocumentRouteManifestState> =>
  loadInternalDocumentRouteManifest({
    manifestUrl:
      options.manifestUrl ?? '/assets/internal-document-routes.json?buildId=build-current',
    siteUrlContext: options.siteUrlContext ?? DEFAULT_SITE_URL_CONTEXT,
    buildId: options.buildId ?? BUILD_ID,
    version: options.version ?? INTERNAL_DOCUMENT_ROUTE_MANIFEST_VERSION,
    fetcher: options.fetcher ?? (async () => options.response ?? createResponse()),
    ...(options.currentLocation !== undefined ? { currentLocation: options.currentLocation } : {}),
  });

const expectState = async (
  actual: Promise<InternalDocumentRouteManifestState>,
  status: InternalDocumentRouteManifestState['status'],
): Promise<void> => {
  expect((await actual).status).to.equal(status);
};

describe('internal document route manifest loader contract', () => {
  it('buildId query が 1 個だけ一致する manifest URL だけを fetch すること', async () => {
    const fetchedUrls: string[] = [];
    const fetcher = (async (input: RequestInfo | URL) => {
      fetchedUrls.push(String(input));
      return createResponse();
    }) as typeof fetch;

    await expectState(load({ fetcher }), 'loaded');
    expect(fetchedUrls).to.deep.equal([
      `${DEFAULT_SITE_URL_CONTEXT.siteOrigin}/assets/internal-document-routes.json?buildId=build-current`,
    ]);

    const invalidManifestUrls = [
      '/assets/internal-document-routes.json',
      '/assets/internal-document-routes.json?buildId=',
      '/assets/internal-document-routes.json?buildId=build-stale',
      '/assets/internal-document-routes.json?buildId=build-current&buildId=build-current',
    ];

    for (const manifestUrl of invalidManifestUrls) {
      let fetched = false;
      await expectState(
        load({
          manifestUrl,
          fetcher: (async () => {
            fetched = true;
            return createResponse();
          }) as typeof fetch,
        }),
        'invalid',
      );
      expect(fetched).to.equal(false);
    }
  });

  it('credentials / origin mismatch / basePath mismatch の manifest URL は fetch 前に invalid にすること', async () => {
    const cases = [
      'https://user@example.com/assets/internal-document-routes.json?buildId=build-current',
      'https://other.example/assets/internal-document-routes.json?buildId=build-current',
      'https://rouault.invalid/outside/internal-document-routes.json?buildId=build-current',
    ];

    for (const manifestUrl of cases) {
      let fetched = false;
      await expectState(
        load({
          manifestUrl,
          siteUrlContext: { siteOrigin: DEFAULT_SITE_URL_CONTEXT.siteOrigin, basePath: '/rouault' },
          fetcher: (async () => {
            fetched = true;
            return createResponse();
          }) as typeof fetch,
        }),
        'invalid',
      );
      expect(fetched).to.equal(false);
    }
  });

  it('current location の origin / basePath 不一致は invalid にすること', async () => {
    await expectState(
      load({
        currentLocation: { origin: 'https://other.example', pathname: '/' } as Location,
      }),
      'invalid',
    );
    await expectState(
      load({
        siteUrlContext: { siteOrigin: DEFAULT_SITE_URL_CONTEXT.siteOrigin, basePath: '/rouault' },
        manifestUrl: '/rouault/assets/internal-document-routes.json?buildId=build-current',
        currentLocation: {
          origin: DEFAULT_SITE_URL_CONTEXT.siteOrigin,
          pathname: '/outside/',
        } as Location,
      }),
      'invalid',
    );
  });

  it('fetch は manual redirect / same-origin credentials で行うこと', async () => {
    let init: RequestInit | undefined;
    await load({
      fetcher: (async (_input: RequestInfo | URL, nextInit?: RequestInit) => {
        init = nextInit;
        return createResponse();
      }) as typeof fetch,
    });

    expect(init?.redirect).to.equal('manual');
    expect(init?.credentials).to.equal('same-origin');
  });

  it('non-2xx / network error / redirect を契約どおり分類すること', async () => {
    await expectState(load({ response: createResponse({ status: 404 }) }), 'unavailable');
    await expectState(
      load({
        fetcher: (async () => {
          throw new TypeError('network failed');
        }) as typeof fetch,
      }),
      'unavailable',
    );
    await expectState(load({ response: createResponse({ status: 302 }) }), 'invalid');
  });

  it('Content-Type は JSON media type 契約で検証すること', async () => {
    for (const contentType of [
      null,
      '',
      'text/plain',
      'application/json; charset=shift_jis',
      'application/json; profile=x',
    ]) {
      await expectState(load({ response: createResponse({ contentType }) }), 'invalid');
    }

    await expectState(
      load({ response: createResponse({ contentType: 'Application/JSON; Charset=UTF-8' }) }),
      'loaded',
    );
  });

  it('invalid JSON / schema mismatch / version mismatch は invalid にすること', async () => {
    await expectState(
      load({
        response: new Response('{', {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      }),
      'invalid',
    );
    await expectState(load({ response: createResponse({ body: { invalid: true } }) }), 'invalid');
    await expectState(load({ version: 2 }), 'invalid');
    await expectState(
      load({ response: createResponse({ body: createManifest({ version: 2 }) }) }),
      'invalid',
    );
  });

  it('manifest metadata mismatch は stale / invalid に分類すること', async () => {
    await expectState(
      load({ response: createResponse({ body: createManifest({ buildId: 'build-stale' }) }) }),
      'stale',
    );
    await expectState(
      load({
        response: createResponse({ body: createManifest({ siteOrigin: 'https://other.example' }) }),
      }),
      'invalid',
    );
    await expectState(
      load({
        siteUrlContext: { siteOrigin: DEFAULT_SITE_URL_CONTEXT.siteOrigin, basePath: '/rouault' },
        manifestUrl: '/rouault/assets/internal-document-routes.json?buildId=build-current',
        response: createResponse({ body: createManifest({ basePath: '' }) }),
      }),
      'invalid',
    );
  });

  it('document meta から読み込む場合も manifest URL buildId query を必須にすること', async () => {
    document.head.replaceChildren();
    for (const [name, content] of [
      ['rouault-site-origin', DEFAULT_SITE_URL_CONTEXT.siteOrigin],
      ['rouault-base-path', DEFAULT_SITE_URL_CONTEXT.basePath],
      ['rouault-route-manifest', '/assets/internal-document-routes.json'],
      ['rouault-route-manifest-build-id', BUILD_ID],
      ['rouault-route-manifest-version', String(INTERNAL_DOCUMENT_ROUTE_MANIFEST_VERSION)],
    ] as const) {
      const meta = document.createElement('meta');
      meta.name = name;
      meta.content = content;
      document.head.append(meta);
    }

    let fetched = false;
    await expectState(
      loadInternalDocumentRouteManifestFromDocument({
        document,
        fetcher: (async () => {
          fetched = true;
          return createResponse();
        }) as typeof fetch,
      }),
      'invalid',
    );
    expect(fetched).to.equal(false);
  });
});

describe('document meta siteUrlContext reader contract', () => {
  beforeEach(() => {
    document.head.replaceChildren();
  });

  afterEach(() => {
    document.head.replaceChildren();
  });

  const appendMeta = (name: string, content: string): void => {
    const meta = document.createElement('meta');
    meta.name = name;
    meta.content = content;
    document.head.append(meta);
  };

  it('rouault-base-path content="" は root 配信として受け入れること', () => {
    appendMeta('rouault-site-origin', 'https://example.com');
    appendMeta('rouault-base-path', '');

    expect(readSiteUrlContextFromDocumentMeta(document)).to.deep.equal({
      siteOrigin: 'https://example.com',
      basePath: '',
    });
  });

  it('site origin または basePath meta 要素自体が欠落した場合は null にすること', () => {
    appendMeta('rouault-site-origin', 'https://example.com');
    expect(readSiteUrlContextFromDocumentMeta(document)).to.equal(null);

    document.head.replaceChildren();
    appendMeta('rouault-base-path', '');
    expect(readSiteUrlContextFromDocumentMeta(document)).to.equal(null);
  });
});
