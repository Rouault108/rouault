import { describe, expect, it } from 'vitest';

import {
  isBuildLabelString,
  normalizeBuildLabel,
  normalizeOptionalBuildLabel,
  requireBuildLabelInput,
  validateBuildLabelInput,
} from '../../shared/navigation/build-label-contract.js';

describe('buildLabel contract', () => {
  it('表示用 label として空白を trim し buildId grammar とは独立して受理すること', () => {
    expect(normalizeBuildLabel(' release 2026.04.11 ')).toBe('release 2026.04.11');
    expect(isBuildLabelString('release with spaces')).toBe(true);
    expect(validateBuildLabelInput(' build local ')).toEqual({
      kind: 'valid',
      value: 'build local',
    });
    expect(requireBuildLabelInput(' build local ')).toBe('build local');
    expect(normalizeOptionalBuildLabel(' build local ')).toBe('build local');
  });

  it('missing / empty / invalid-type / too-long を唯一の reason union として返すこと', () => {
    const tooLong = 'x'.repeat(257);

    expect(validateBuildLabelInput(undefined)).toEqual({ kind: 'missing' });
    expect(validateBuildLabelInput(null)).toEqual({ kind: 'missing' });
    expect(validateBuildLabelInput('   ')).toEqual({ kind: 'empty' });
    expect(validateBuildLabelInput(123)).toEqual({ kind: 'invalid-type', value: 123 });
    expect(validateBuildLabelInput(tooLong)).toEqual({ kind: 'too-long', value: tooLong });
    expect(normalizeBuildLabel(tooLong)).toBeNull();
    expect(normalizeOptionalBuildLabel(tooLong)).toBeUndefined();
  });
});
