import { expect } from '@open-wc/testing';

import {
  NAVIGATION_ENVELOPE_SCHEMA_VERSION,
  type NavigationEnvelope,
} from '../../shared/navigation/navigation-envelope.js';
import { DocumentLoader } from '../../src/router/document-loader.js';
import {
  CurrentBuildMetadataInvalidError,
  NavigationEnvelopeContractError,
  NavigationEnvelopeMetadataMismatchError,
} from '../../src/router/navigation-envelope-errors.js';
import { LocationAdapter } from '../../src/router/location-adapter.js';
import { RouteRegistry } from '../../src/router/route-registry.js';

const CURRENT_BUILD_ID = 'build-current';
const CURRENT_GENERATED_AT = '2026-04-11T00:00:00.000Z';

const installCurrentMetadata = (buildId: string | null, generatedAt: string | null): void => {
  document.head
    .querySelectorAll('meta[name="rouault-build-id"], meta[name="rouault-generated-at"]')
    .forEach((meta) => meta.remove());

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

const hasOwn = (value: object, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

const createEnvelopeObject = (options: {
  buildId?: string | null;
  omitBuildId?: boolean;
  generatedAt?: string | null;
  omitGeneratedAt?: boolean;
} = {}): NavigationEnvelope => {
  const envelope: NavigationEnvelope = {
    schemaVersion: NAVIGATION_ENVELOPE_SCHEMA_VERSION,
    document: {
      html: '<p>Example</p>',
      title: 'Example - Rouault',
      description: null,
      renderedKind: 'page',
    },
    shellProjection: null,
    hydrationPlan: null,
  };

  if (options.omitBuildId !== true) {
    envelope.buildId = hasOwn(options, 'buildId') ? options.buildId : CURRENT_BUILD_ID;
  }

  if (options.omitGeneratedAt !== true) {
    envelope.generatedAt = hasOwn(options, 'generatedAt')
      ? options.generatedAt
      : CURRENT_GENERATED_AT;
  }

  return envelope;
};

const createEnvelopeResponse = (options?: Parameters<typeof createEnvelopeObject>[0]): Response =>
  new Response(JSON.stringify(createEnvelopeObject(options)), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });

const loadWithFetchEnvelope = async (
  options?: Parameters<typeof createEnvelopeObject>[0],
): Promise<Awaited<ReturnType<DocumentLoader['load']>>> => {
  globalThis.fetch = (async () => createEnvelopeResponse(options)) as typeof globalThis.fetch;
  return new DocumentLoader(new RouteRegistry(), new LocationAdapter()).load(
    '/notes/example',
    new AbortController().signal,
  );
};

describe('DocumentLoader build metadata strict contract', () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    installCurrentMetadata(CURRENT_BUILD_ID, CURRENT_GENERATED_AT);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    installCurrentMetadata(null, null);
  });

  it('current build metadata 欠落時は document-route / fetch を実行せず error-fallback にすること', async () => {
    let fetched = false;
    let executed = false;
    globalThis.fetch = (async () => {
      fetched = true;
      return createEnvelopeResponse();
    }) as typeof globalThis.fetch;

    installCurrentMetadata(null, CURRENT_GENERATED_AT);
    const routes = new RouteRegistry();
    routes.add('/notes/example', () => {
      executed = true;
      return createEnvelopeObject();
    });

    const result = await new DocumentLoader(routes, new LocationAdapter()).load(
      '/notes/example',
      new AbortController().signal,
    );

    expect(executed).to.equal(false);
    expect(fetched).to.equal(false);
    expect(result.source).to.equal('error-fallback');
    expect(result.error).to.be.instanceOf(CurrentBuildMetadataInvalidError);
  });

  it('current metadata reader は missing / empty / invalid-format を buildId と generatedAt で区別すること', async () => {
    const cases: Array<{
      field: 'buildId' | 'generatedAt';
      buildId: string | null;
      generatedAt: string | null;
      reason: string;
      value?: string;
    }> = [
      { field: 'buildId', buildId: null, generatedAt: CURRENT_GENERATED_AT, reason: 'missing' },
      { field: 'buildId', buildId: '   ', generatedAt: CURRENT_GENERATED_AT, reason: 'empty' },
      {
        field: 'buildId',
        buildId: 'build current',
        generatedAt: CURRENT_GENERATED_AT,
        reason: 'invalid-format',
        value: 'build current',
      },
      { field: 'generatedAt', buildId: CURRENT_BUILD_ID, generatedAt: null, reason: 'missing' },
      { field: 'generatedAt', buildId: CURRENT_BUILD_ID, generatedAt: '   ', reason: 'empty' },
      {
        field: 'generatedAt',
        buildId: CURRENT_BUILD_ID,
        generatedAt: '2026-04-11T00:00:00Z',
        reason: 'invalid-format',
        value: '2026-04-11T00:00:00Z',
      },
    ];

    for (const testCase of cases) {
      let fetched = false;
      let executed = false;
      globalThis.fetch = (async () => {
        fetched = true;
        return createEnvelopeResponse();
      }) as typeof globalThis.fetch;

      installCurrentMetadata(testCase.buildId, testCase.generatedAt);
      const routes = new RouteRegistry();
      routes.add('/notes/example', () => {
        executed = true;
        return createEnvelopeObject();
      });
      const result = await new DocumentLoader(routes, new LocationAdapter()).load(
        '/notes/example',
        new AbortController().signal,
      );

      expect(executed).to.equal(false);
      expect(fetched).to.equal(false);
      expect(result.source).to.equal('error-fallback');
      expect(result.error).to.be.instanceOf(CurrentBuildMetadataInvalidError);
      expect((result.error as CurrentBuildMetadataInvalidError).field).to.equal(testCase.field);
      expect((result.error as CurrentBuildMetadataInvalidError).reason).to.equal(testCase.reason);
      expect((result.error as CurrentBuildMetadataInvalidError).value).to.equal(testCase.value);
    }
  });

  it('document-route の missing / null metadata は current metadata で補完すること', async () => {
    const routes = new RouteRegistry();
    let callIndex = 0;
    routes.add('/notes/example', () => {
      callIndex += 1;
      return callIndex === 1
        ? createEnvelopeObject({ omitBuildId: true, omitGeneratedAt: true })
        : createEnvelopeObject({ buildId: null, generatedAt: null });
    });

    const loader = new DocumentLoader(routes, new LocationAdapter());
    const first = await loader.load('/notes/example', new AbortController().signal);
    const second = await loader.load('/notes/example', new AbortController().signal);

    expect(first.source).to.equal('document-route');
    expect(first.envelope.buildId).to.equal(CURRENT_BUILD_ID);
    expect(first.envelope.generatedAt).to.equal(CURRENT_GENERATED_AT);
    expect(second.source).to.equal('document-route');
    expect(second.envelope.buildId).to.equal(CURRENT_BUILD_ID);
    expect(second.envelope.generatedAt).to.equal(CURRENT_GENERATED_AT);
  });

  it('document-route の empty / invalid-format metadata は補完せず contract error にすること', async () => {
    const cases: Array<Parameters<typeof createEnvelopeObject>[0]> = [
      { buildId: '' },
      { buildId: 'build current' },
      { generatedAt: '' },
      { generatedAt: '2026-04-11T00:00:00Z' },
    ];

    for (const testCase of cases) {
      const routes = new RouteRegistry();
      routes.add('/notes/example', () => createEnvelopeObject(testCase));
      const result = await new DocumentLoader(routes, new LocationAdapter()).load(
        '/notes/example',
        new AbortController().signal,
      );

      expect(result.source).to.equal('error-fallback');
      expect(result.error).to.be.instanceOf(NavigationEnvelopeContractError);
    }
  });

  it('fetch artifact の missing / null / empty metadata は補完せず contract error にすること', async () => {
    const cases: Array<Parameters<typeof createEnvelopeObject>[0]> = [
      { omitBuildId: true },
      { buildId: null },
      { buildId: '' },
      { buildId: 'build current' },
      { omitGeneratedAt: true },
      { generatedAt: null },
      { generatedAt: '' },
      { generatedAt: '2026-04-11T00:00:00Z' },
    ];

    for (const testCase of cases) {
      const result = await loadWithFetchEnvelope(testCase);

      expect(result.source).to.equal('error-fallback');
      expect(result.error).to.be.instanceOf(NavigationEnvelopeContractError);
    }
  });

  it('generatedAt mismatch を NavigationEnvelopeMetadataMismatchError として error-fallback にすること', async () => {
    const result = await loadWithFetchEnvelope({ generatedAt: '2026-04-11T00:00:01.000Z' });

    expect(result.source).to.equal('error-fallback');
    expect(result.error).to.be.instanceOf(NavigationEnvelopeMetadataMismatchError);
    expect((result.error as NavigationEnvelopeMetadataMismatchError).kind).to.equal('generatedAt');
  });
});
