import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const repoRoot = process.cwd();

const readRepoFile = (filePath: string): string =>
  readFileSync(path.join(repoRoot, filePath), 'utf8');

describe('production site URL context boundary', () => {
  it('scripts/run-production-build.ts が default site URL fallback を参照しないこと', () => {
    const source = readRepoFile('scripts/run-production-build.ts');

    expect(source).not.to.contain('DEFAULT_SITE_URL_CONTEXT');
    expect(source).not.to.contain('rouault.invalid');
  });

  it('production artifact 生成経路が DEFAULT_SITE_URL_CONTEXT fallback を使わないこと', () => {
    const productionArtifactSources = [
      'scripts/run-production-build.ts',
      'scripts/emit-navigation-artifacts.ts',
      'build/navigation/internal-document-route-manifest.ts',
      'build/navigation/internal-document-routes.ts',
      'build/site/site-url-context.ts',
    ];

    const offenders = productionArtifactSources.filter((filePath) =>
      readRepoFile(filePath).includes('DEFAULT_SITE_URL_CONTEXT'),
    );

    expect(offenders).to.deep.equal([]);
  });
});
