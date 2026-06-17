import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('navigation artifact mode boundary', () => {
  it('production artifact emit path は strict-artifact mode を使うこと', () => {
    const source = readFileSync('build/navigation/emit-navigation-artifacts.ts', 'utf8');

    expect(source).toMatch(
      /createNavigationEnvelopeFromHtml\(\s*html,\s*htmlFilePath,\s*\{\s*mode: 'strict-artifact'/su,
    );
  });

  it('dev middleware request path は strict-artifact mode と injected generatedAt を使うこと', () => {
    const source = readFileSync('build/dev/dev-router-artifact-middleware.ts', 'utf8');

    expect(source).toMatch(
      /createNavigationEnvelopeFromHtml\(\s*html,\s*htmlFilePath,\s*\{\s*mode: 'strict-artifact',\s*buildId,\s*generatedAt/su,
    );
    expect(source).not.toContain("mode: 'legacy-fixture'");
    expect(source).not.toMatch(/new Date\(\)\.toISOString\(\)/u);
  });

  it('production / dev artifact path は共有 helper で currentUrl を組み立てること', () => {
    const productionSource = readFileSync('build/navigation/emit-navigation-artifacts.ts', 'utf8');
    const devSource = readFileSync('build/dev/dev-router-artifact-middleware.ts', 'utf8');
    const helperSource = readFileSync('build/content/generated-document-route-set.ts', 'utf8');

    expect(helperSource).toContain('export const resolveGeneratedDocumentCurrentUrlFromHtmlFile');
    expect(productionSource).toContain('resolveGeneratedDocumentCurrentUrlFromHtmlFile');
    expect(devSource).toContain('resolveGeneratedDocumentCurrentUrlFromHtmlFile');
    expect(productionSource).not.toMatch(
      /currentUrl:\s*`\$\{options\.siteUrlContext\.siteOrigin\}/u,
    );
    expect(devSource).not.toMatch(/currentUrl:\s*`\$\{options\.siteUrlContext\.siteOrigin\}/u);
  });

  it('BaseLayout も generated document currentUrl helper を使うこと', () => {
    const source = readFileSync('src/layouts/BaseLayout.11ty.ts', 'utf8');

    expect(source).toContain('resolveGeneratedDocumentCurrentUrl');
  });

  it('production / dev script path では legacy-fixture literal を使わないこと', () => {
    const productionSources = [
      'scripts/emit-navigation-artifacts.ts',
      'scripts/run-production-build.ts',
      'build/dev/dev-router-artifact-middleware.ts',
    ];

    for (const filePath of productionSources) {
      expect(readFileSync(filePath, 'utf8'), filePath).not.toContain("mode: 'legacy-fixture'");
    }
  });

  it('strict artifact path には boolean option / generatedAt fallback / footer build-label fallback を残さないこと', () => {
    const sources = [
      'build/navigation/emit-navigation-artifacts.ts',
      'build/dev/dev-router-artifact-middleware.ts',
      'scripts/emit-navigation-artifacts.ts',
    ];

    for (const filePath of sources) {
      const source = readFileSync(filePath, 'utf8');
      expect(source, filePath).not.toContain('strictBuildMetadata');
      expect(source, filePath).not.toMatch(/new Date\(\)\.toISOString\(\)/u);
      expect(source, filePath).not.toMatch(/layout-footer|build-label|buildLabel/u);
    }
  });
});
