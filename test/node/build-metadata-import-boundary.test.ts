import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('build metadata import boundary', () => {
  it('src/data/buildMetadata.ts は環境変数と Vite define を直接読まないこと', () => {
    const source = readFileSync('src/data/buildMetadata.ts', 'utf8');

    expect(source).not.toMatch(/process\.env/u);
    expect(source).not.toMatch(/import\.meta\.env/u);
    expect(source).not.toMatch(/__ROUAULT_/u);
  });

  it('static footer renderer は loadBuildMetadataData fallback を持たないこと', () => {
    const source = readFileSync('src/layouts/footer-html.ts', 'utf8');

    expect(source).not.toContain('loadBuildMetadataData');
  });

  it('loadBuildMetadataData の引数なし呼び出しを残さないこと', () => {
    const checkedFiles = [
      'src/data/buildMetadata.ts',
      'eleventy.config.ts',
      'test/ssr/base-layout.test.ts',
      'test/node/layout-footer-options.test.ts',
    ];

    for (const filePath of checkedFiles) {
      const source = readFileSync(filePath, 'utf8');
      expect(source, filePath).not.toMatch(/loadBuildMetadataData\(\s*\)/u);
    }
  });
});
