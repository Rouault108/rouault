import { expect } from 'vitest';
import { describe, it } from 'vitest';
import {
  NAVIGATION_ENVELOPE_SCHEMA_VERSION,
  type NavigationEnvelope,
} from '../../shared/navigation/navigation-envelope.js';
import { validateNavigationEnvelope } from '../../src/router/navigation-envelope-validator.js';
import { validateLoadedEnvelope } from '../../src/router/navigation-envelope-validator.js';
import { normalizeDocumentRouteEnvelope } from '../../src/router/document-route-envelope.js';
import {
  NavigationEnvelopeContractError,
  NavigationEnvelopeMetadataMismatchError,
} from '../../src/router/navigation-envelope-errors.js';

const headerHtml = '<header class="layout-header" data-layout-header="true"></header>';

const createEnvelope = (overrides: Partial<NavigationEnvelope> = {}): NavigationEnvelope => ({
  schemaVersion: NAVIGATION_ENVELOPE_SCHEMA_VERSION,
  buildId: 'test-build',
  generatedAt: '2026-01-01T00:00:00.000Z',
  document: {
    html: '<p>本文</p>',
    title: 'Test',
    description: null,
    renderedKind: 'page',
  },
  shell: {
    headerHtml,
    sidebarProjection: null,
  },
  hydrationPlan: null,
  ...overrides,
});

describe('NavigationEnvelope schema v2', () => {
  it('shell.headerHtml を必須の non-null shell として受け取ること', () => {
    const envelope = validateNavigationEnvelope(createEnvelope());

    expect(envelope.schemaVersion).toBe(2);
    expect(envelope.shell.headerHtml).toContain('data-layout-header');
    expect(envelope.shell.sidebarProjection).toBeNull();
  });

  it('shell が欠落した envelope を拒否すること', () => {
    const invalid = createEnvelope() as unknown as Record<string, unknown>;
    delete invalid['shell'];

    expect(() => validateNavigationEnvelope(invalid)).toThrow(/shell is required/u);
  });

  it('schemaVersion mismatch は code で分類できる contract error にすること', () => {
    const invalid = { ...createEnvelope(), schemaVersion: 1 };

    expect(() => validateNavigationEnvelope(invalid)).toThrow(NavigationEnvelopeContractError);
    try {
      validateNavigationEnvelope(invalid);
    } catch (error) {
      expect(error).toBeInstanceOf(NavigationEnvelopeContractError);
      expect((error as NavigationEnvelopeContractError).code).toBe('schema-version-mismatch');
    }
  });

  it('buildId が一致すれば generatedAt 不一致だけでは loaded envelope を拒否しないこと', () => {
    const envelope = createEnvelope({ generatedAt: '2026-01-02T00:00:00.000Z' });

    expect(
      validateLoadedEnvelope({
        envelope,
        source: 'fetch',
        currentBuildId: 'test-build',
        normalizedUrl: '/notes/example/',
      }).generatedAt,
    ).toBe('2026-01-02T00:00:00.000Z');
  });

  it('fetch artifact 側 generatedAt missing は contract error として拒否すること', () => {
    const envelope = createEnvelope({ generatedAt: undefined });

    expect(() =>
      validateLoadedEnvelope({
        envelope,
        source: 'fetch',
        currentBuildId: 'test-build',
        normalizedUrl: '/notes/example/',
      }),
    ).toThrow(NavigationEnvelopeContractError);
  });

  it('buildId mismatch だけを metadata mismatch として扱うこと', () => {
    const envelope = createEnvelope({ buildId: 'other-build' });

    expect(() =>
      validateLoadedEnvelope({
        envelope,
        source: 'fetch',
        currentBuildId: 'test-build',
        normalizedUrl: '/notes/example/',
      }),
    ).toThrow(NavigationEnvelopeMetadataMismatchError);
  });

  it('document-route envelope は buildId 欠落だけを current buildId で個別補完すること', () => {
    const envelope = createEnvelope({
      buildId: undefined,
      generatedAt: '2026-01-02T00:00:00.000Z',
    });

    const normalized = normalizeDocumentRouteEnvelope(envelope, {
      currentBuildId: 'current-build',
      currentGeneratedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(normalized.buildId).toBe('current-build');
    expect(normalized.generatedAt).toBe('2026-01-02T00:00:00.000Z');
  });

  it('document-route envelope は generatedAt 欠落だけを current generatedAt で個別補完すること', () => {
    const envelope = createEnvelope({
      buildId: 'route-build',
      generatedAt: undefined,
    });

    const normalized = normalizeDocumentRouteEnvelope(envelope, {
      currentBuildId: 'current-build',
      currentGeneratedAt: '2026-01-01T00:00:00.000Z',
    });

    expect(normalized.buildId).toBe('route-build');
    expect(normalized.generatedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('document-route envelope は current generatedAt 不在時に generatedAt 欠落を補完しないこと', () => {
    const envelope = createEnvelope({
      buildId: 'route-build',
      generatedAt: undefined,
    });

    const normalized = normalizeDocumentRouteEnvelope(envelope, {
      currentBuildId: 'current-build',
      currentGeneratedAt: null,
    });

    expect(normalized.buildId).toBe('route-build');
    expect(normalized.generatedAt).toBeUndefined();
  });
});
