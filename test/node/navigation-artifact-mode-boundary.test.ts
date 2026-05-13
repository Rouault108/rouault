import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('navigation artifact mode boundary', () => {
  it('production artifact emit path は strict-artifact mode を使うこと', () => {
    const source = readFileSync('build/navigation/emit-navigation-artifacts.ts', 'utf8');

    expect(source).toMatch(/createNavigationEnvelopeFromHtml\(html, htmlFilePath, \{\s*mode: 'strict-artifact'/su);
  });

  it('dev middleware request path は strict-artifact mode と injected generatedAt を使うこと', () => {
    const source = readFileSync('build/dev/dev-router-artifact-middleware.ts', 'utf8');

    expect(source).toMatch(/createNavigationEnvelopeFromHtml\(html, htmlFilePath, \{\s*mode: 'strict-artifact',\s*buildId,\s*generatedAt/su);
    expect(source).not.toContain("mode: 'legacy-fixture'");
    expect(source).not.toMatch(/new Date\(\)\.toISOString\(\)/u);
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
});
