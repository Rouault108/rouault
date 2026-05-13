import { expect } from '@open-wc/testing';
import { NAVIGATION_ENVELOPE_SCHEMA_VERSION } from '../../shared/navigation/navigation-envelope.js';
import { DocumentLoader } from '../../src/router/document-loader.js';
import { LocationAdapter } from '../../src/router/location-adapter.js';
import { NavigationEnvelopeMetadataMismatchError } from '../../src/router/navigation-envelope-errors.js';
import { RouteRegistry } from '../../src/router/route-registry.js';

const createEnvelopeResponse = (options?: {
  buildId?: string | null;
  generatedAt?: string | null;
  html?: string;
  title?: string;
  description?: string | null;
}): Response =>
  new Response(
    JSON.stringify({
      schemaVersion: NAVIGATION_ENVELOPE_SCHEMA_VERSION,
      buildId: options?.buildId ?? 'build-current',
      generatedAt: options?.generatedAt ?? '2026-04-11T00:00:00.000Z',
      document: {
        html: options?.html ?? '<p>Example</p>',
        title: options?.title ?? 'Example - Rouault',
        description: options?.description ?? 'description',
        renderedKind: 'page',
      },
      shellProjection: null,
      hydrationPlan: null,
    }),
    {
      status: 200,
      headers: {
        'content-type': 'application/json',
      },
    },
  );

describe('DocumentLoader', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    const buildIdMeta = document.createElement('meta');
    buildIdMeta.setAttribute('name', 'rouault-build-id');
    buildIdMeta.setAttribute('content', 'build-current');
    const generatedAtMeta = document.createElement('meta');
    generatedAtMeta.setAttribute('name', 'rouault-generated-at');
    generatedAtMeta.setAttribute('content', '2026-04-11T00:00:00.000Z');
    document.head.append(buildIdMeta, generatedAtMeta);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    document.head.querySelectorAll('meta[name="rouault-build-id"], meta[name="rouault-generated-at"]').forEach((meta) => meta.remove());
  });

  it('snapshot 404 時は content URL を再取得せず not-found envelope を返すこと', async () => {
    const requestedUrls: string[] = [];
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString();
      requestedUrls.push(url);
      return new Response('', { status: 404 });
    }) as typeof globalThis.fetch;

    const loader = new DocumentLoader(new RouteRegistry(), new LocationAdapter());
    const result = await loader.load('/notes/example', new AbortController().signal);

    expect(requestedUrls).to.deep.equal(['/__router/notes/example/index.router.json']);
    expect(result.envelope.document.renderedKind).to.equal('not-found');
    expect(result.source).to.equal('error-fallback');
  });

  it('HTML parse fallback を使わず JSON 契約エラーへ縮退すること', async () => {
    globalThis.fetch = (async () =>
      new Response('<!DOCTYPE html><html></html>', { status: 200 })) as typeof globalThis.fetch;

    const loader = new DocumentLoader(new RouteRegistry(), new LocationAdapter());
    const result = await loader.load('/notes/example', new AbortController().signal);

    expect(result.envelope.document.renderedKind).to.equal('error');
    expect(result.error?.name).to.equal('NavigationEnvelopeContractError');
  });

  it('current buildId と fetched buildId が不一致なら error envelope へ縮退すること', async () => {
    globalThis.fetch = (async () =>
      createEnvelopeResponse({
        buildId: 'build-stale',
      })) as typeof globalThis.fetch;

    const loader = new DocumentLoader(new RouteRegistry(), new LocationAdapter());
    const result = await loader.load('/notes/example', new AbortController().signal);

    expect(result.envelope.document.renderedKind).to.equal('error');
    expect(result.error).to.be.instanceOf(NavigationEnvelopeMetadataMismatchError);
  });
});
