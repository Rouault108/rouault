import { expect } from 'vitest';
import { describe, it } from 'vitest';
import {
  NAVIGATION_ENVELOPE_SCHEMA_VERSION,
  type NavigationEnvelope,
} from '../../shared/navigation/navigation-envelope.js';
import { validateNavigationEnvelope } from '../../src/router/navigation-envelope-validator.js';

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
});
