import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  isGeneratedAtString,
  normalizeGeneratedAt,
  requireGeneratedAtInput,
  validateOptionalGeneratedAtInput,
} from '../../shared/navigation/generated-at-contract.js';

describe('generatedAt contract', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  it('canonical UTC timestamp だけを valid として正規化すること', () => {
    expect(normalizeGeneratedAt(' 2026-04-11T00:00:00.000Z ')).toBe('2026-04-11T00:00:00.000Z');
    expect(isGeneratedAtString('2026-04-11T00:00:00.000Z')).toBe(true);
    expect(validateOptionalGeneratedAtInput('2026-04-11T00:00:00.000Z')).toEqual({
      kind: 'valid',
      value: '2026-04-11T00:00:00.000Z',
    });
    expect(requireGeneratedAtInput('2026-04-11T00:00:00.000Z')).toBe('2026-04-11T00:00:00.000Z');
  });

  it('missing / empty / invalid-type を区別すること', () => {
    expect(validateOptionalGeneratedAtInput(undefined)).toEqual({ kind: 'missing' });
    expect(validateOptionalGeneratedAtInput(null)).toEqual({ kind: 'missing' });
    expect(validateOptionalGeneratedAtInput('   ')).toEqual({ kind: 'empty' });
    expect(validateOptionalGeneratedAtInput(123)).toEqual({ kind: 'invalid-type', value: 123 });
  });

  it('timezone offset / millisecond 欠落 / impossible date / non-canonical date を reject すること', () => {
    expect(validateOptionalGeneratedAtInput('2026-04-11T09:00:00.000+09:00')).toEqual({
      kind: 'invalid-format',
      value: '2026-04-11T09:00:00.000+09:00',
    });
    expect(validateOptionalGeneratedAtInput('2026-04-11T00:00:00Z')).toEqual({
      kind: 'invalid-format',
      value: '2026-04-11T00:00:00Z',
    });
    expect(validateOptionalGeneratedAtInput('not-a-date')).toEqual({
      kind: 'invalid-format',
      value: 'not-a-date',
    });
    expect(validateOptionalGeneratedAtInput('2026-13-11T00:00:00.000Z')).toEqual({
      kind: 'invalid-date',
      value: '2026-13-11T00:00:00.000Z',
    });
    expect(validateOptionalGeneratedAtInput('2026-02-31T00:00:00.000Z')).toEqual({
      kind: 'non-canonical',
      value: '2026-02-31T00:00:00.000Z',
    });
    expect(normalizeGeneratedAt('2026-02-31T00:00:00.000Z')).toBeNull();
  });

  it('createBuildGeneratedAtOnce() は process-local に stable な generatedAt を返すこと', async () => {
    vi.resetModules();

    const { createBuildGeneratedAtOnce } = await import('../../build/metadata/generated-at.js');

    expect(createBuildGeneratedAtOnce('2026-04-11T00:00:00.000Z')).toBe(
      '2026-04-11T00:00:00.000Z',
    );
    expect(createBuildGeneratedAtOnce('2026-04-11T00:00:01.000Z')).toBe(
      '2026-04-11T00:00:00.000Z',
    );

    vi.resetModules();
  });

});
