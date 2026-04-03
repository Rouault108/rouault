import { describe, expect, it } from 'vitest';

import { buildLayoutFooterOptions } from '../../src/components/layout/layout-footer.js';

const restoreEnv = (previousBuildLabel: string | undefined): void => {
  if (previousBuildLabel === undefined) {
    delete process.env['ROUAULT_BUILD_LABEL'];
    return;
  }

  process.env['ROUAULT_BUILD_LABEL'] = previousBuildLabel;
};

describe('buildLayoutFooterOptions', () => {
  it('build label 未指定時は共有 build metadata を fallback すること', () => {
    const previousBuildLabel = process.env['ROUAULT_BUILD_LABEL'];
    process.env['ROUAULT_BUILD_LABEL'] = 'abcdef1';

    try {
      const options = buildLayoutFooterOptions({
        footerId: 'footer-fallback',
        siteEyebrow: undefined,
        siteName: 'Rouault',
        siteUrl: undefined,
        siteDescription: undefined,
        copyrightText: '© 2026 Ruo Miyata.',
        buildLabel: undefined,
        navLabel: undefined,
        linksJson: undefined,
      });

      expect(options.meta.buildLabel).to.equal('build abcdef1');
    } finally {
      restoreEnv(previousBuildLabel);
    }
  });

  it('build label の明示入力が環境 fallback より優先されること', () => {
    const previousBuildLabel = process.env['ROUAULT_BUILD_LABEL'];
    process.env['ROUAULT_BUILD_LABEL'] = 'abcdef1';

    try {
      const options = buildLayoutFooterOptions({
        footerId: 'footer-explicit',
        siteEyebrow: undefined,
        siteName: 'Rouault',
        siteUrl: undefined,
        siteDescription: undefined,
        copyrightText: '© 2026 Ruo Miyata.',
        buildLabel: 'release 2026.04.04',
        navLabel: undefined,
        linksJson: undefined,
      });

      expect(options.meta.buildLabel).to.equal('release 2026.04.04');
    } finally {
      restoreEnv(previousBuildLabel);
    }
  });
});
