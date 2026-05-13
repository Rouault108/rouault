import { expect } from '@open-wc/testing';

import { NAVIGATION_ENVELOPE_SCHEMA_VERSION } from '../../shared/navigation/navigation-envelope.js';
import { DocumentLoader } from '../../src/router/document-loader.js';
import {
  CurrentBuildMetadataInvalidError,
  NavigationEnvelopeMetadataMismatchError,
} from '../../src/router/navigation-envelope-errors.js';
import { LocationAdapter } from '../../src/router/location-adapter.js';
import { RouteRegistry } from '../../src/router/route-registry.js';

const installCurrentMetadata = (buildId: string | null, generatedAt: string | null): void => {
  document.head.querySelectorAll('meta[name="rouault-build-id"], meta[name="rouault-generated-at"]').forEach((meta) => meta.remove());
  if (buildId !== null) {
    const buildIdMeta = document.createElement('meta');
    buildIdMeta.setAttribute('name', 'rouault-build-id');
    buildIdMeta.setAttribute('content', buildId);
    document.head.append(buildIdMeta);
  }
  if (generatedAt !== null) {
    const generatedAtMeta = document.createElement('meta');
    generatedAtMeta.setAttribute('name', 'rouault-generated-at');
    generatedAtMeta.setAttribute('content', generatedAt);
    document.head.append(generatedAtMeta);
  }
};

const createEnvelopeResponse = (options?: { buildId?: string; generatedAt?: string }): Response =>
  new Response(
    JSON.stringify({
      schemaVersion: NAVIGATION_ENVELOPE_SCHEMA_VERSION,
      buildId: options?.buildId ?? 'build-current',
      generatedAt: options?.generatedAt ?? '2026-04-11T00:00:00.000Z',
      document: {
        html: '<p>Example</p>',
        title: 'Example - Rouault',
        description: null,
        renderedKind: 'page',
      },
      shellProjection: null,
      hydrationPlan: null,
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );

describe('DocumentLoader build metadata strict contract', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    installCurrentMetadata('build-current', '2026-04-11T00:00:00.000Z');
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    installCurrentMetadata(null, null);
  });

  it('current build metadata 欠落時は document-route / fetch を実行せず error-fallback にすること', async () => {
    let fetched = false;
    globalThis.fetch = (async () => {
      fetched = true;
      return createEnvelopeResponse();
    }) as typeof globalThis.fetch;

    installCurrentMetadata(null, '2026-04-11T00:00:00.000Z');
    const routes = new RouteRegistry();
    routes.register('/notes/example', () => {
      throw new Error('route must not execute');
    });

    const result = await new DocumentLoader(routes, new LocationAdapter()).load(
      '/notes/example',
      new AbortController().signal,
    );

    expect(fetched).to.equal(false);
    expect(result.source).to.equal('error-fallback');
    expect(result.error).to.be.instanceOf(CurrentBuildMetadataInvalidError);
  });

  it('generatedAt mismatch を NavigationEnvelopeMetadataMismatchError として error-fallback にすること', async () => {
    globalThis.fetch = (async () =>
      createEnvelopeResponse({ generatedAt: '2026-04-11T00:00:01.000Z' })) as typeof globalThis.fetch;

    const result = await new DocumentLoader(new RouteRegistry(), new LocationAdapter()).load(
      '/notes/example',
      new AbortController().signal,
    );

    expect(result.source).to.equal('error-fallback');
    expect(result.error).to.be.instanceOf(NavigationEnvelopeMetadataMismatchError);
    expect((result.error as NavigationEnvelopeMetadataMismatchError).kind).to.equal('generatedAt');
  });
});
