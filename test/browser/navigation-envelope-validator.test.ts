import { expect } from '@open-wc/testing';

import { NAVIGATION_ENVELOPE_SCHEMA_VERSION } from '../../shared/navigation/navigation-envelope.js';
import {
  validateLoadedEnvelope,
  validateNavigationEnvelope,
} from '../../src/router/navigation-envelope-validator.js';
import {
  NavigationEnvelopeContractError,
  NavigationEnvelopeMetadataMismatchError,
} from '../../src/router/navigation-envelope-errors.js';

const createEnvelope = (metadata?: { buildId?: unknown; generatedAt?: unknown }): unknown => ({
  schemaVersion: NAVIGATION_ENVELOPE_SCHEMA_VERSION,
  ...(Object.prototype.hasOwnProperty.call(metadata ?? {}, 'buildId')
    ? { buildId: metadata?.buildId }
    : { buildId: 'build-current' }),
  ...(Object.prototype.hasOwnProperty.call(metadata ?? {}, 'generatedAt')
    ? { generatedAt: metadata?.generatedAt }
    : { generatedAt: '2026-04-11T00:00:00.000Z' }),
  document: {
    html: '<p>Example</p>',
    title: 'Example - Rouault',
    description: null,
    renderedKind: 'page',
  },
  shellProjection: null,
  hydrationPlan: null,
});

describe('navigation envelope validator browser contract', () => {
  it('validateLoadedEnvelope は strict loaded envelope 型境界として buildId / generatedAt を必須にすること', () => {
    const envelope = validateLoadedEnvelope({
      envelope: validateNavigationEnvelope(createEnvelope()),
      source: 'fetch',
      currentBuildId: 'build-current',
      currentGeneratedAt: '2026-04-11T00:00:00.000Z',
      normalizedUrl: '/notes/example',
    });

    expect(envelope.buildId).to.equal('build-current');
    expect(envelope.generatedAt).to.equal('2026-04-11T00:00:00.000Z');
  });

  it('missing / null / empty / invalid-type build metadata は mismatch ではなく contract error にすること', () => {
    const invalidCases: Array<{ buildId?: unknown; generatedAt?: unknown }> = [
      { buildId: undefined },
      { buildId: null },
      { buildId: '' },
      { generatedAt: undefined },
      { generatedAt: null },
      { generatedAt: '' },
      { buildId: 123 },
      { buildId: {} },
      { generatedAt: 123 },
      { generatedAt: [] },
    ];

    for (const invalid of invalidCases) {
      expect(() =>
        validateLoadedEnvelope({
          envelope: validateNavigationEnvelope(createEnvelope(invalid)),
          source: 'fetch',
          currentBuildId: 'build-current',
          currentGeneratedAt: '2026-04-11T00:00:00.000Z',
          normalizedUrl: '/notes/example',
        }),
      ).to.throw(NavigationEnvelopeContractError);
    }
  });



  it('present sidebar payload の navHtml missing / undefined / null / empty / non-string を contract error に変換すること', () => {
    const createPresentSidebarEnvelope = (navHtml: unknown): unknown => ({
      ...createEnvelope(),
      shellProjection: {
        header: {
          corpora: [],
          currentCorpusKey: 'all',
          noteLayout: true,
          sidebarEnabled: true,
          sidebarId: 'note-primary',
          tocPresence: 'absent',
        },
        sidebar: {
          present: true,
          sidebarId: 'note-primary',
          stateScopeId: 'note-navigation',
          selectedId: null,
          initialExpandedIds: [],
          topologyRevision: 'topology:test',
          navHtml,
          heading: null,
          fixedBreakpoint: 1024,
          presentation: 'auto',
        },
      },
    });

    for (const navHtml of [undefined, null, '', '   ', 42]) {
      expect(() => validateNavigationEnvelope(createPresentSidebarEnvelope(navHtml))).to.throw(
        NavigationEnvelopeContractError,
      );
    }

    const missingNavHtmlEnvelope = createPresentSidebarEnvelope('<nav></nav>') as {
      shellProjection: { sidebar: Record<string, unknown> };
    };
    delete missingNavHtmlEnvelope.shellProjection.sidebar['navHtml'];

    expect(() => validateNavigationEnvelope(missingNavHtmlEnvelope)).to.throw(
      NavigationEnvelopeContractError,
    );
  });

  it('NavigationEnvelopeMetadataMismatchError は object constructor API を使うこと', () => {
    const error = new NavigationEnvelopeMetadataMismatchError({
      kind: 'generatedAt',
      currentValue: '2026-04-11T00:00:00.000Z',
      envelopeValue: '2026-04-11T00:00:01.000Z',
      normalizedUrl: '/notes/example',
    });

    expect(error.kind).to.equal('generatedAt');
    expect(error.field).to.equal('generatedAt');
    expect(error.currentValue).to.equal('2026-04-11T00:00:00.000Z');
    expect(error.envelopeValue).to.equal('2026-04-11T00:00:01.000Z');
    expect(error.normalizedUrl).to.equal('/notes/example');
  });

  it('buildId / generatedAt mismatch は metadata mismatch taxonomy を使うこと', () => {
    expect(() =>
      validateLoadedEnvelope({
        envelope: validateNavigationEnvelope(createEnvelope({ buildId: 'build-stale' })),
        source: 'fetch',
        currentBuildId: 'build-current',
        currentGeneratedAt: '2026-04-11T00:00:00.000Z',
        normalizedUrl: '/notes/example',
      }),
    ).to.throw(NavigationEnvelopeMetadataMismatchError);

    expect(() =>
      validateLoadedEnvelope({
        envelope: validateNavigationEnvelope(
          createEnvelope({ generatedAt: '2026-04-11T00:00:01.000Z' }),
        ),
        source: 'fetch',
        currentBuildId: 'build-current',
        currentGeneratedAt: '2026-04-11T00:00:00.000Z',
        normalizedUrl: '/notes/example',
      }),
    ).to.throw(NavigationEnvelopeMetadataMismatchError);
  });
});
