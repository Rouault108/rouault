import { describe, expect, it } from 'vitest';

import {
  NAVIGATION_ENVELOPE_SCHEMA_VERSION,
  type NavigationEnvelope,
} from '../../shared/navigation/navigation-envelope.js';
import { normalizeDocumentRouteEnvelope } from '../../src/router/document-route-envelope.js';
import { NavigationEnvelopeContractError } from '../../src/router/navigation-envelope-errors.js';
import type { DocumentRouteContext } from '../../src/router/router-types.js';

const currentContext: Pick<
  DocumentRouteContext,
  'currentBuildId' | 'currentGeneratedAt' | 'normalizedUrl'
> = {
  currentBuildId: 'build-current',
  currentGeneratedAt: '2026-04-11T00:00:00.000Z',
  normalizedUrl: '/notes/example',
};

const createEnvelope = (
  overrides: Partial<NavigationEnvelope> = {},
): NavigationEnvelope => ({
  schemaVersion: NAVIGATION_ENVELOPE_SCHEMA_VERSION,
  document: {
    html: '<p>Example</p>',
    title: 'Example - Rouault',
    description: null,
    renderedKind: 'page',
  },
  shellProjection: null,
  hydrationPlan: null,
  ...overrides,
});

describe('document-route envelope normalization', () => {
  it('document-route の missing / null metadata だけを current metadata で補完すること', () => {
    const missing = normalizeDocumentRouteEnvelope(createEnvelope(), currentContext);
    const explicitNull = normalizeDocumentRouteEnvelope(
      createEnvelope({ buildId: null, generatedAt: null }),
      currentContext,
    );

    expect(missing.buildId).toBe('build-current');
    expect(missing.generatedAt).toBe('2026-04-11T00:00:00.000Z');
    expect(explicitNull.buildId).toBe('build-current');
    expect(explicitNull.generatedAt).toBe('2026-04-11T00:00:00.000Z');
  });

  it('document-route の empty / invalid-format metadata は補完せず拒否すること', () => {
    for (const envelope of [
      createEnvelope({ buildId: '' }),
      createEnvelope({ buildId: 'build current' }),
      createEnvelope({ generatedAt: '' }),
      createEnvelope({ generatedAt: 'not-a-date' }),
    ]) {
      expect(() => normalizeDocumentRouteEnvelope(envelope, currentContext)).toThrow(
        NavigationEnvelopeContractError,
      );
    }
  });
});
