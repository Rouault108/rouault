import { describe, expect, it } from 'vitest';

import {
  normalizeBuildLabel,
  resolveBuildLabel,
  resolveBuildMetadata,
  resolveDevelopmentBuildMetadata,
  resolveGitShortSha,
} from '../../build/metadata/build-metadata.js';

const restoreEnv = (previousBuildLabel: string | undefined): void => {
  if (previousBuildLabel === undefined) {
    delete process.env['ROUAULT_BUILD_LABEL'];
    return;
  }

  process.env['ROUAULT_BUILD_LABEL'] = previousBuildLabel;
};

describe('build metadata', () => {
  it('buildLabel は shared contract の正本に従い、SHA 形式も identity として解釈しないこと', () => {
    expect(normalizeBuildLabel('abcdef1')).to.equal('abcdef1');
  });

  it('build プレフィックス付きの値はそのまま返すこと', () => {
    expect(normalizeBuildLabel('build release-2026.04.03')).to.equal('build release-2026.04.03');
  });

  it('ROUAULT_BUILD_LABEL を explicit より後ろで使うこと', () => {
    const previousBuildLabel = process.env['ROUAULT_BUILD_LABEL'];
    process.env['ROUAULT_BUILD_LABEL'] = 'release 2026.04.03';

    try {
      expect(resolveBuildLabel('explicit 2026.04.04')).to.equal('explicit 2026.04.04');
      expect(resolveBuildLabel()).to.equal('release 2026.04.03');
    } finally {
      restoreEnv(previousBuildLabel);
    }
  });

  it('ROUAULT_BUILD_LABEL が設定されている場合は git fallback より優先すること', () => {
    const previousBuildLabel = process.env['ROUAULT_BUILD_LABEL'];
    process.env['ROUAULT_BUILD_LABEL'] = 'release 2026.04.03';

    try {
      const gitLabel = resolveGitShortSha();

      expect(resolveBuildLabel()).to.equal('release 2026.04.03');
      if (gitLabel !== undefined) {
        expect(resolveBuildLabel()).not.to.equal(gitLabel);
      }
    } finally {
      restoreEnv(previousBuildLabel);
    }
  });

  it('ROUAULT_BUILD_LABEL が未設定なら buildLabel は missing として扱うこと', () => {
    const previousBuildLabel = process.env['ROUAULT_BUILD_LABEL'];
    delete process.env['ROUAULT_BUILD_LABEL'];

    try {
      expect(resolveBuildLabel()).to.equal(undefined);
    } finally {
      restoreEnv(previousBuildLabel);
    }
  });


  it('production metadata は buildLabel missing を hard fail すること', () => {
    const previousBuildLabel = process.env['ROUAULT_BUILD_LABEL'];
    delete process.env['ROUAULT_BUILD_LABEL'];

    try {
      expect(() => resolveBuildMetadata()).toThrow(/buildLabel is required/u);
    } finally {
      restoreEnv(previousBuildLabel);
    }
  });

  it('development metadata だけが local buildLabel fallback を持つこと', () => {
    const previousBuildLabel = process.env['ROUAULT_BUILD_LABEL'];
    delete process.env['ROUAULT_BUILD_LABEL'];

    try {
      expect(resolveDevelopmentBuildMetadata({ buildId: 'dev', generatedAt: '2026-04-11T00:00:00.000Z' }).buildLabel).to.equal('build local');
    } finally {
      restoreEnv(previousBuildLabel);
    }
  });

  it('git short SHA は buildId fallback 用の raw identity として返すこと', () => {
    const gitSha = resolveGitShortSha();

    if (gitSha === undefined) {
      return;
    }

    expect(gitSha).to.match(/^[0-9a-f]{7,40}$/i);
  });
});
