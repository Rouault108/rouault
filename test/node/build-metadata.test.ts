import { describe, expect, it } from 'vitest';

import {
  normalizeBuildLabel,
  resolveBuildLabel,
  resolveGitShortSha,
} from '../../build/metadata/build-metadata.js';

describe('build metadata', () => {
  it('短い SHA 形式の値は build ラベルへ正規化すること', () => {
    expect(normalizeBuildLabel('abcdef1')).to.equal('build abcdef1');
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
      if (previousBuildLabel === undefined) {
        delete process.env['ROUAULT_BUILD_LABEL'];
      } else {
        process.env['ROUAULT_BUILD_LABEL'] = previousBuildLabel;
      }
    }
  });

  it('git short SHA が利用できる場合は build ラベルを返すこと', () => {
    const gitLabel = resolveGitShortSha();

    if (gitLabel === undefined) {
      return;
    }

    expect(gitLabel).to.match(/^build [0-9a-f]{7}$/i);
  });
});
