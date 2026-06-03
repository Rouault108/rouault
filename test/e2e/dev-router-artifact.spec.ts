import { expect, test } from '@playwright/test';

import { resolveRouterArtifactPathname } from '../../shared/navigation/router-artifact-path.js';
import { e2eNoteFixtures } from './support/note-fixtures.js';

interface DevRouterArtifactEnvelope {
  readonly schemaVersion: unknown;
  readonly shell?: {
    readonly headerHtml?: unknown;
  } | null;
  readonly shellProjection?: unknown;
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseDevRouterArtifactEnvelope = (value: unknown): DevRouterArtifactEnvelope => {
  expect(isObjectRecord(value)).toBe(true);

  return value as DevRouterArtifactEnvelope;
};

test.describe('Development router artifact', () => {
  test('dev server は静的 header の NavigationEnvelope smoke を返すこと', async ({
    request,
  }) => {
    const artifactPathname = resolveRouterArtifactPathname(e2eNoteFixtures.layoutRich.directPath);
    const response = await request.get(artifactPathname);

    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toMatch(/application\/json/ui);

    const envelope = parseDevRouterArtifactEnvelope(await response.json());
    expect(envelope.schemaVersion).toBe(2);
    expect(envelope.shell).not.toBeNull();
    expect(envelope.shell).not.toBeUndefined();
    expect('shellProjection' in envelope).toBe(false);

    const headerHtml = envelope.shell?.headerHtml;
    if (typeof headerHtml !== 'string') {
      throw new Error('dev router artifact shell.headerHtml must be a string.');
    }

    expect(headerHtml).toMatch(/<header\b[^>]*\bdata-layout-header\b/ui);
    expect(headerHtml).not.toMatch(/<\/?layout-header\b/ui);
    expect(headerHtml).not.toMatch(/<\/?ui-header\b/ui);
  });
});
