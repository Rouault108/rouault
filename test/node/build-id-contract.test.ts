import { describe, expect, it } from 'vitest';

import {
  isBuildIdString,
  normalizeBuildId,
  requireBuildIdInput,
  validateOptionalBuildIdInput,
} from '../../shared/navigation/build-id-contract.js';

describe('buildId contract', () => {
  it('canonical buildId grammar だけを valid として正規化すること', () => {
    expect(normalizeBuildId(' build-abcdef1 ')).toBe('build-abcdef1');
    expect(isBuildIdString('build_abcdef1:local.1')).toBe(true);
    expect(validateOptionalBuildIdInput(' build-abcdef1 ')).toEqual({
      kind: 'valid',
      value: 'build-abcdef1',
    });
    expect(requireBuildIdInput(' build-abcdef1 ')).toBe('build-abcdef1');
  });

  it('missing / empty / invalid-type を区別し、too-long は invalid-format として reject すること', () => {
    const tooLong = 'x'.repeat(129);

    expect(validateOptionalBuildIdInput(undefined)).toEqual({ kind: 'missing' });
    expect(validateOptionalBuildIdInput(null)).toEqual({ kind: 'missing' });
    expect(validateOptionalBuildIdInput('   ')).toEqual({ kind: 'empty' });
    expect(validateOptionalBuildIdInput(123)).toEqual({ kind: 'invalid-type', value: 123 });
    expect(validateOptionalBuildIdInput(tooLong)).toEqual({ kind: 'invalid-format', value: tooLong });
    expect(normalizeBuildId(tooLong)).toBeNull();
  });

  it('whitespace / slash / backslash / non ASCII を invalid-format として reject すること', () => {
    for (const value of ['build abcdef1', 'build/abcdef1', 'build\\abcdef1', 'ビルドabcdef1']) {
      expect(validateOptionalBuildIdInput(value)).toEqual({ kind: 'invalid-format', value });
      expect(normalizeBuildId(value)).toBeNull();
      expect(isBuildIdString(value)).toBe(false);
    }
  });
});
