import { describe, expect, it } from 'vitest';

import { loadBuildMetadataData } from '../../src/data/buildMetadata.js';
import { loadSiteUrlContextData } from '../../src/data/siteUrlContext.js';

const captureError = (run: () => unknown): Error => {
  try {
    run();
  } catch (error) {
    if (error instanceof Error) return error;
    throw error;
  }
  throw new Error('Expected a data-loader error');
};

describe('data-loader error context', () => {
  it('preserves build metadata context and its validation cause', () => {
    const error = captureError(() =>
      loadBuildMetadataData({
        buildId: '',
        buildLabel: 'fixture build',
        generatedAt: '2026-04-11T00:00:00.000Z',
        sourceLabel: 'fixture',
      }),
    );
    expect(error.cause).toBeInstanceOf(Error);
    if (!(error.cause instanceof Error)) throw new Error('Expected the validation cause');
    expect(error.name).toBe('Error');
    expect(error.message).toBe(`[buildMetadata:fixture] ${error.cause.message}`);
  });

  it('keeps valid build metadata unchanged', () => {
    expect(
      loadBuildMetadataData({
        buildId: 'fixture-build-id',
        buildLabel: 'fixture build',
        generatedAt: '2026-04-11T00:00:00.000Z',
        sourceLabel: 'fixture',
      }),
    ).toEqual({
      buildId: 'fixture-build-id',
      buildLabel: 'fixture build',
      generatedAt: '2026-04-11T00:00:00.000Z',
    });
  });

  it('preserves site URL context and its validation cause', () => {
    const error = captureError(() =>
      loadSiteUrlContextData({
        siteOrigin: 'https://example.com/path',
        basePath: '',
        sourceLabel: 'fixture',
      }),
    );
    expect(error.cause).toBeInstanceOf(Error);
    if (!(error.cause instanceof Error)) throw new Error('Expected the validation cause');
    expect(error.name).toBe('Error');
    expect(error.message).toBe(`[siteUrlContext:fixture] ${error.cause.message}`);
  });

  it('keeps valid site URL normalization unchanged', () => {
    expect(
      loadSiteUrlContextData({
        siteOrigin: 'https://example.com',
        basePath: '/docs/',
        sourceLabel: 'fixture',
      }),
    ).toEqual({ siteOrigin: 'https://example.com', basePath: '/docs' });
  });
});
