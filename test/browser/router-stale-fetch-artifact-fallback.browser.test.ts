import { expect } from '@open-wc/testing';

import {
  NAVIGATION_ENVELOPE_SCHEMA_VERSION,
  type NavigationEnvelope,
} from '../../shared/navigation/navigation-envelope.js';
import { Router } from '../../src/router/router.js';
import { LocationAdapter } from '../../src/router/location-adapter.js';
import type {
  ContentUpdateAdapter,
  NavigationResult,
  RouterRuntimeUrlDependencies,
} from '../../src/router/router-types.js';

const BUILD_ID = 'build-current';
const GENERATED_AT = '2026-01-01T00:00:00.000Z';

const createEnvelope = (overrides: Partial<NavigationEnvelope> = {}): NavigationEnvelope => ({
  schemaVersion: NAVIGATION_ENVELOPE_SCHEMA_VERSION,
  buildId: BUILD_ID,
  generatedAt: GENERATED_AT,
  document: {
    html: '<main><p>本文</p></main>',
    title: 'Next',
    description: null,
    renderedKind: 'page',
  },
  shell: {
    headerHtml: '<header data-layout-header></header>',
    sidebarProjection: null,
  },
  hydrationPlan: null,
  ...overrides,
});

const createRouteManifestState = (): RouterRuntimeUrlDependencies['routeManifestState'] => ({
  status: 'loaded',
  manifest: {
    version: 1,
    buildId: BUILD_ID,
    buildLabel: 'test',
    generatedAt: GENERATED_AT,
    siteOrigin: window.location.origin,
    basePath: '',
    routes: ['/', '/about/', '/search/', '/notes/current', '/notes/next'],
  },
  routeSet: {
    routes: ['/', '/about/', '/search/', '/notes/current', '/notes/next'],
    has(pathname: string) {
      return (
        pathname === '/' ||
        pathname === '/about/' ||
        pathname === '/search/' ||
        pathname === '/notes/current' ||
        pathname === '/notes/next'
      );
    },
  },
});

const createUrlDependencies = (): RouterRuntimeUrlDependencies => ({
  siteUrlContext: { siteOrigin: window.location.origin, basePath: '' },
  isInternalDocumentPathname(pathname: string) {
    return pathname === '/' || pathname === '/notes/current/' || pathname === '/notes/next/';
  },
  routeManifestState: createRouteManifestState(),
});

const appendMeta = (name: string, content: string): void => {
  const meta = document.createElement('meta');
  meta.name = name;
  meta.content = content;
  document.head.append(meta);
};

const appendStaticHeader = (): void => {
  const header = document.createElement('header');
  header.setAttribute('data-layout-header', '');
  header.setAttribute('data-note-layout', 'false');
  header.setAttribute('data-sidebar-enabled', 'false');
  header.setAttribute('data-toc-trigger-reserved', 'false');
  header.setAttribute('data-sidebar-id', 'test-sidebar');
  header.setAttribute('data-current-corpus-key', 'all');
  header.setAttribute('data-toc-presence', 'absent');
  document.body.append(header);
};

const setupCurrentDocument = (
  options: {
    readonly buildId?: string | null;
    readonly generatedAt?: string | null;
  } = {},
): HTMLElement => {
  document.head.querySelectorAll('meta[name^="rouault-"]').forEach((meta) => meta.remove());
  document.body.replaceChildren();
  window.history.replaceState(null, '', '/notes/current/');

  if (options.buildId !== null) {
    appendMeta('rouault-build-id', options.buildId ?? BUILD_ID);
  }
  if (options.generatedAt !== null) {
    appendMeta('rouault-generated-at', options.generatedAt ?? GENERATED_AT);
  }
  appendStaticHeader();

  const outlet = document.createElement('main');
  outlet.id = 'router-outlet';
  document.body.append(outlet);
  return outlet;
};

const withFetchResponse = (body: unknown, run: () => Promise<void>): Promise<void> => {
  const originalFetch = window.fetch;
  window.fetch = (async () =>
    new Response(JSON.stringify(body), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })) as typeof fetch;

  return run().finally(() => {
    window.fetch = originalFetch;
  });
};

const withFetchRawResponse = (response: Response, run: () => Promise<void>): Promise<void> => {
  const originalFetch = window.fetch;
  window.fetch = (async () => response.clone()) as typeof fetch;

  return run().finally(() => {
    window.fetch = originalFetch;
  });
};

const withFetchStatus = (status: number, run: () => Promise<void>): Promise<void> => {
  const originalFetch = window.fetch;
  window.fetch = (async () =>
    new Response('{}', {
      status,
      headers: { 'content-type': 'application/json' },
    })) as typeof fetch;

  return run().finally(() => {
    window.fetch = originalFetch;
  });
};

const withFetchError = (error: Error, run: () => Promise<void>): Promise<void> => {
  const originalFetch = window.fetch;
  window.fetch = (async () => {
    throw error;
  }) as typeof fetch;

  return run().finally(() => {
    window.fetch = originalFetch;
  });
};

const withNavigateDocumentSpy = async (
  run: (calls: { readonly url: string; readonly historyMode: string }[]) => Promise<void>,
): Promise<void> => {
  const originalNavigateDocument = LocationAdapter.prototype.navigateDocument;
  const calls: { readonly url: string; readonly historyMode: string }[] = [];
  LocationAdapter.prototype.navigateDocument = function navigateDocument(url, historyMode) {
    calls.push({ url, historyMode });
  };

  try {
    await run(calls);
  } finally {
    LocationAdapter.prototype.navigateDocument = originalNavigateDocument;
  }
};

const assertDocumentNavigationFallback = (
  result: NavigationResult,
  reason:
    | 'fetch-navigation-envelope-invalid'
    | 'fetch-build-id-mismatch'
    | 'fetch-schema-version-mismatch'
    | 'fetch-navigation-envelope-http-status'
    | 'current-build-id-invalid',
): void => {
  expect(result.kind).to.equal('document-navigation-fallback');
  if (result.kind !== 'document-navigation-fallback') {
    throw new Error('document navigation fallback result expected');
  }
  expect(result.reason).to.equal(reason);
  expect(result.source).to.equal('document-navigation-fallback');
};

describe('Router stale fetch artifact fallback', () => {
  let router: Router | null = null;

  afterEach(() => {
    router?.destroy();
    router = null;
    document.head.querySelectorAll('meta[name^="rouault-"]').forEach((meta) => meta.remove());
    document.body.replaceChildren();
  });

  it('fetch artifact buildId mismatch は SPA commit せず document navigation fallback へ送ること', async () => {
    const outlet = setupCurrentDocument();
    const contentAdapter: ContentUpdateAdapter = {
      prepare() {
        throw new Error('content commit must not run');
      },
    };
    let postCommitCalled = false;
    let contentLoadCount = 0;
    let urlStateChangeCount = 0;
    let errorCount = 0;
    const afterResults: NavigationResult[] = [];

    await withFetchResponse(createEnvelope({ buildId: 'build-stale' }), async () => {
      await withNavigateDocumentSpy(async (calls) => {
        router = new Router(outlet, createUrlDependencies(), {
          contentAdapter,
          skipInitialNavigation: true,
          postCommitController: {
            run() {
              postCommitCalled = true;
            },
          },
        });
        router.on('content:load', () => {
          contentLoadCount += 1;
        });
        router.on('ui-url-state-change', () => {
          urlStateChangeCount += 1;
        });
        router.on('error', () => {
          errorCount += 1;
        });
        router.on('after:navigate', (result) => {
          afterResults.push(result);
        });

        await router.start();
        const result = await router.navigate({ url: '/notes/next/', historyMode: 'push' });

        assertDocumentNavigationFallback(result, 'fetch-build-id-mismatch');
        expect(calls).to.deep.equal([{ url: '/notes/next', historyMode: 'push' }]);
        expect(contentLoadCount).to.equal(0);
        expect(urlStateChangeCount).to.equal(0);
        expect(errorCount).to.equal(0);
        expect(postCommitCalled).to.equal(false);
        expect(afterResults).to.deep.equal([result]);
      });
    });
  });

  it('fetch artifact schemaVersion mismatch は専用 reason の fallback にすること', async () => {
    const outlet = setupCurrentDocument();

    await withFetchResponse({ ...createEnvelope(), schemaVersion: 1 }, async () => {
      await withNavigateDocumentSpy(async (calls) => {
        router = new Router(outlet, createUrlDependencies(), { skipInitialNavigation: true });
        await router.start();

        const result = await router.navigate({ url: '/notes/next/', historyMode: 'push' });

        assertDocumentNavigationFallback(result, 'fetch-schema-version-mismatch');
        expect(calls).to.deep.equal([{ url: '/notes/next', historyMode: 'push' }]);
      });
    });
  });

  it('fetch artifact HTTP status error は目的 document の HTTP error として commit しないこと', async () => {
    const outlet = setupCurrentDocument();

    await withFetchStatus(404, async () => {
      await withNavigateDocumentSpy(async (calls) => {
        router = new Router(outlet, createUrlDependencies(), { skipInitialNavigation: true });
        await router.start();

        const result = await router.navigate({ url: '/notes/next/', historyMode: 'push' });

        assertDocumentNavigationFallback(result, 'fetch-navigation-envelope-http-status');
        expect(calls).to.deep.equal([{ url: '/notes/next', historyMode: 'push' }]);
      });
    });
  });

  it('missing-route-candidate の fetch artifact HTTP 404 は not-found として SPA commit すること', async () => {
    const outlet = setupCurrentDocument();

    await withFetchStatus(404, async () => {
      await withNavigateDocumentSpy(async (calls) => {
        router = new Router(outlet, createUrlDependencies(), { skipInitialNavigation: true });
        await router.start();

        const result = await router.navigate({
          url: '/__playwright_missing_route__?from=browser#section-x',
          historyMode: 'push',
        });

        expect(result.kind).to.equal('completed');
        expect(result.outcome).to.equal('completed');
        expect(result.source).to.equal('error-fallback');
        expect(result.renderedKind).to.equal('not-found');
        expect(result.committed).to.equal(true);
        expect(result.normalizedUrl).to.equal('/__playwright_missing_route__?from=browser#section-x');
        expect(calls).to.deep.equal([]);
        expect(outlet.querySelector('[data-not-found-fallback]')).to.not.equal(null);
        expect(outlet.textContent).to.contain('/__playwright_missing_route__?from=browser#section-x');
      });
    });
  });

  it('missing-route-candidate の fetch artifact HTTP 500 は not-found に寄せないこと', async () => {
    const outlet = setupCurrentDocument();

    await withFetchStatus(500, async () => {
      await withNavigateDocumentSpy(async (calls) => {
        router = new Router(outlet, createUrlDependencies(), { skipInitialNavigation: true });
        await router.start();

        const result = await router.navigate({
          url: '/__playwright_missing_route__',
          historyMode: 'push',
        });

        assertDocumentNavigationFallback(result, 'fetch-navigation-envelope-http-status');
        expect(calls).to.deep.equal([{ url: '/__playwright_missing_route__', historyMode: 'push' }]);
      });
    });
  });

  it('missing-route-candidate の schemaVersion mismatch は not-found に寄せないこと', async () => {
    const outlet = setupCurrentDocument();

    await withFetchResponse({ ...createEnvelope(), schemaVersion: 1 }, async () => {
      await withNavigateDocumentSpy(async (calls) => {
        router = new Router(outlet, createUrlDependencies(), { skipInitialNavigation: true });
        await router.start();

        const result = await router.navigate({
          url: '/__playwright_missing_route__',
          historyMode: 'push',
        });

        assertDocumentNavigationFallback(result, 'fetch-schema-version-mismatch');
        expect(calls).to.deep.equal([{ url: '/__playwright_missing_route__', historyMode: 'push' }]);
      });
    });
  });

  it('missing-route-candidate の buildId mismatch は not-found に寄せないこと', async () => {
    const outlet = setupCurrentDocument();

    await withFetchResponse(createEnvelope({ buildId: 'build-stale' }), async () => {
      await withNavigateDocumentSpy(async (calls) => {
        router = new Router(outlet, createUrlDependencies(), { skipInitialNavigation: true });
        await router.start();

        const result = await router.navigate({
          url: '/__playwright_missing_route__',
          historyMode: 'push',
        });

        assertDocumentNavigationFallback(result, 'fetch-build-id-mismatch');
        expect(calls).to.deep.equal([{ url: '/__playwright_missing_route__', historyMode: 'push' }]);
      });
    });
  });

  it('fetch artifact redirect は invalid artifact reason の fallback にすること', async () => {
    const outlet = setupCurrentDocument();

    await withFetchRawResponse(
      new Response(JSON.stringify(createEnvelope()), {
        status: 302,
        headers: { 'content-type': 'application/json' },
      }),
      async () => {
        await withNavigateDocumentSpy(async (calls) => {
          router = new Router(outlet, createUrlDependencies(), { skipInitialNavigation: true });
          await router.start();

          const result = await router.navigate({ url: '/notes/next/', historyMode: 'push' });

          assertDocumentNavigationFallback(result, 'fetch-navigation-envelope-invalid');
          expect(calls).to.deep.equal([{ url: '/notes/next', historyMode: 'push' }]);
        });
      },
    );
  });

  it('fetch artifact invalid content-type は invalid artifact reason の fallback にすること', async () => {
    const outlet = setupCurrentDocument();

    await withFetchRawResponse(
      new Response(JSON.stringify(createEnvelope()), {
        status: 200,
        headers: { 'content-type': 'text/plain' },
      }),
      async () => {
        await withNavigateDocumentSpy(async (calls) => {
          router = new Router(outlet, createUrlDependencies(), { skipInitialNavigation: true });
          await router.start();

          const result = await router.navigate({ url: '/notes/next/', historyMode: 'push' });

          assertDocumentNavigationFallback(result, 'fetch-navigation-envelope-invalid');
          expect(calls).to.deep.equal([{ url: '/notes/next', historyMode: 'push' }]);
        });
      },
    );
  });

  it('fetch artifact invalid JSON は invalid artifact reason の fallback にすること', async () => {
    const outlet = setupCurrentDocument();

    await withFetchRawResponse(
      new Response('{', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
      async () => {
        await withNavigateDocumentSpy(async (calls) => {
          router = new Router(outlet, createUrlDependencies(), { skipInitialNavigation: true });
          await router.start();

          const result = await router.navigate({ url: '/notes/next/', historyMode: 'push' });

          assertDocumentNavigationFallback(result, 'fetch-navigation-envelope-invalid');
          expect(calls).to.deep.equal([{ url: '/notes/next', historyMode: 'push' }]);
        });
      },
    );
  });

  it('fetch artifact の schemaVersion 一致・構造不正 envelope は invalid artifact reason の fallback にすること', async () => {
    const outlet = setupCurrentDocument();

    await withFetchResponse(
      {
        ...createEnvelope(),
        shell: null,
      },
      async () => {
        await withNavigateDocumentSpy(async (calls) => {
          router = new Router(outlet, createUrlDependencies(), { skipInitialNavigation: true });
          await router.start();

          const result = await router.navigate({ url: '/notes/next/', historyMode: 'push' });

          assertDocumentNavigationFallback(result, 'fetch-navigation-envelope-invalid');
          expect(calls).to.deep.equal([{ url: '/notes/next', historyMode: 'push' }]);
        });
      },
    );
  });

  it('fetch network error は document navigation fallback せず既存 error fallback semantics を維持すること', async () => {
    const outlet = setupCurrentDocument();

    await withFetchError(new TypeError('fetch failed'), async () => {
      await withNavigateDocumentSpy(async (calls) => {
        router = new Router(outlet, createUrlDependencies(), { skipInitialNavigation: true });
        await router.start();

        const result = await router.navigate({ url: '/notes/next/', historyMode: 'push' });

        expect(result.source).to.equal('error-fallback');
        expect(result.renderedKind).to.equal('error');
        expect(result.errorReason).to.equal('network');
        expect(calls).to.deep.equal([]);
      });
    });
  });

  it('fetch TimeoutError は document navigation fallback しないこと', async () => {
    const outlet = setupCurrentDocument();
    const error = new Error('timeout');
    error.name = 'TimeoutError';

    await withFetchError(error, async () => {
      await withNavigateDocumentSpy(async (calls) => {
        router = new Router(outlet, createUrlDependencies(), { skipInitialNavigation: true });
        await router.start();

        const result = await router.navigate({ url: '/notes/next/', historyMode: 'push' });

        expect(result.source).to.equal('error-fallback');
        expect(result.renderedKind).to.equal('error');
        expect(result.errorReason).to.equal('timeout');
        expect(calls).to.deep.equal([]);
      });
    });
  });

  it('superseded navigation の fetch AbortError は document navigation fallback しないこと', async () => {
    const outlet = setupCurrentDocument();
    const originalFetch = window.fetch;
    let fetchCount = 0;
    let markFirstFetchStarted: (() => void) | null = null;
    const firstFetchStarted = new Promise<void>((resolve) => {
      markFirstFetchStarted = resolve;
    });
    window.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      fetchCount += 1;
      if (fetchCount === 1) {
        markFirstFetchStarted?.();
        return await new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => {
              const error = new Error('aborted');
              error.name = 'AbortError';
              reject(error);
            },
            { once: true },
          );
        });
      }

      return new Response(JSON.stringify(createEnvelope()), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    try {
      await withNavigateDocumentSpy(async (calls) => {
        router = new Router(outlet, createUrlDependencies(), { skipInitialNavigation: true });
        await router.start();

        const firstNavigation = router.navigate({ url: '/notes/next/', historyMode: 'push' });
        await firstFetchStarted;
        const secondNavigation = router.navigate({ url: '/notes/current/', historyMode: 'replace' });
        const [firstResult, secondResult] = await Promise.all([firstNavigation, secondNavigation]);

        expect(firstResult.kind).to.equal('superseded');
        expect(secondResult.kind).to.equal('completed');
        expect(secondResult.source).to.equal('fetch');
        expect(calls).to.deep.equal([]);
      });
    } finally {
      window.fetch = originalFetch;
    }
  });

  it('current document 側 generatedAt missing でも buildId 一致 fetch artifact を commit すること', async () => {
    const outlet = setupCurrentDocument({ generatedAt: null });

    await withFetchResponse(createEnvelope(), async () => {
      await withNavigateDocumentSpy(async (calls) => {
        router = new Router(outlet, createUrlDependencies(), { skipInitialNavigation: true });
        await router.start();

        const result = await router.navigate({ url: '/notes/next/', historyMode: 'push' });

        expect(result.kind).to.equal('completed');
        expect(result.source).to.equal('fetch');
        expect(result.committed).to.equal(true);
        expect(result.renderedKind).to.equal('page');
        expect(calls).to.deep.equal([]);
      });
    });
  });

  it('current document 側 generatedAt invalid でも buildId 一致 fetch artifact を commit すること', async () => {
    const outlet = setupCurrentDocument({ generatedAt: 'invalid-generated-at' });

    await withFetchResponse(createEnvelope(), async () => {
      await withNavigateDocumentSpy(async (calls) => {
        router = new Router(outlet, createUrlDependencies(), { skipInitialNavigation: true });
        await router.start();

        const result = await router.navigate({ url: '/notes/next/', historyMode: 'push' });

        expect(result.kind).to.equal('completed');
        expect(result.source).to.equal('fetch');
        expect(result.committed).to.equal(true);
        expect(result.renderedKind).to.equal('page');
        expect(calls).to.deep.equal([]);
      });
    });
  });

  it('state-only navigation では fetch と document navigation fallback を呼ばないこと', async () => {
    const outlet = setupCurrentDocument();
    let fetchCalled = false;
    const originalFetch = window.fetch;
    window.fetch = (async () => {
      fetchCalled = true;
      return new Response(JSON.stringify(createEnvelope()), {
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    try {
      await withNavigateDocumentSpy(async (calls) => {
        router = new Router(outlet, createUrlDependencies(), {
          skipInitialNavigation: true,
          urlStateNavigationPolicy: {
            evaluate() {
              return { kind: 'state-only' };
            },
          },
        });
        await router.start();

        const result = await router.navigate({ url: '/notes/next/', historyMode: 'push' });

        expect(result.source).to.equal('state-only');
        expect(fetchCalled).to.equal(false);
        expect(calls).to.deep.equal([]);
      });
    } finally {
      window.fetch = originalFetch;
    }
  });

  it('document-route 由来の不正 envelope は document navigation fallback で隠さないこと', async () => {
    const outlet = setupCurrentDocument();
    let fetchCalled = false;
    const originalFetch = window.fetch;
    window.fetch = (async () => {
      fetchCalled = true;
      return new Response(JSON.stringify(createEnvelope()), {
        headers: { 'content-type': 'application/json' },
      });
    }) as typeof fetch;

    try {
      await withNavigateDocumentSpy(async (calls) => {
        router = new Router(outlet, createUrlDependencies(), { skipInitialNavigation: true });
        router.addDocumentRoute('/notes/next', () => ({
          ...createEnvelope(),
          shell: null,
        }) as unknown as NavigationEnvelope);
        await router.start();

        const result = await router.navigate({ url: '/notes/next/', historyMode: 'push' });

        expect(result.source).to.equal('error-fallback');
        expect(result.renderedKind).to.equal('error');
        expect(fetchCalled).to.equal(false);
        expect(calls).to.deep.equal([]);
      });
    } finally {
      window.fetch = originalFetch;
    }
  });

  it('初期 navigation の current buildId invalid は document navigation せず error fallback commit へ戻すこと', async () => {
    const outlet = setupCurrentDocument({ buildId: null });
    window.history.replaceState(null, '', '/notes/current/');
    const afterResults: NavigationResult[] = [];
    let errorCount = 0;

    await withNavigateDocumentSpy(async (calls) => {
      router = new Router(outlet, createUrlDependencies());
      router.on('after:navigate', (result) => {
        afterResults.push(result);
      });
      router.on('error', () => {
        errorCount += 1;
      });

      const result = await router.start();

      expect(result?.source).to.equal('error-fallback');
      expect(result?.kind).to.equal('completed');
      expect(result?.renderedKind).to.equal('error');
      expect(calls).to.deep.equal([]);
      expect(errorCount).to.equal(1);
      expect(afterResults).to.deep.equal([result]);
    });
  });
});
