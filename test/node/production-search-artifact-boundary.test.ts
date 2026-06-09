import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { RUN_BUILD_STEPS } from '../../scripts/run-build-process.js';

const repoRoot = process.cwd();
const readRepoFile = (filePath: string): string =>
  readFileSync(path.join(repoRoot, filePath), 'utf8');

describe('production search artifact boundary', () => {
  it('build script が navigation artifact 後かつ Pagefind 前に search catalog を生成すること', () => {
    const packageJson = JSON.parse(readRepoFile('package.json')) as {
      scripts: Record<string, string>;
    };
    const stepLabels = RUN_BUILD_STEPS.map((step) => step.label);
    const navigationIndex = stepLabels.indexOf('emit-navigation-artifacts');
    const searchIndex = stepLabels.indexOf('emit-search-artifacts');
    const pagefindIndex = stepLabels.indexOf('build-pagefind');

    expect(packageJson.scripts['build']).to.equal('pnpm exec tsx scripts/run-build.ts');
    expect(RUN_BUILD_STEPS[navigationIndex]?.pnpmArgs).to.deep.equal([
      'exec',
      'tsx',
      'scripts/emit-navigation-artifacts.ts',
    ]);
    expect(RUN_BUILD_STEPS[searchIndex]?.pnpmArgs).to.deep.equal([
      'exec',
      'tsx',
      'scripts/emit-search-artifacts.ts',
    ]);
    expect(RUN_BUILD_STEPS[pagefindIndex]?.pnpmArgs).to.deep.equal([
      'exec',
      'tsx',
      'scripts/build-pagefind.ts',
    ]);
    expect(searchIndex).to.be.greaterThan(-1);
    expect(navigationIndex).to.be.lessThan(searchIndex);
    expect(searchIndex).to.be.lessThan(pagefindIndex);
  });

  it('search artifact entrypoint は生成責務だけを持つこと', () => {
    const source = readRepoFile('scripts/emit-search-artifacts.ts');

    expect(source).to.contain("../build/data/notes.js");
    expect(source).to.contain('../build/search/emit-search-artifacts.js');
    expect(source).to.contain('emitSearchArtifacts');
    expect(source).not.to.match(/\brm(?:Sync)?\b|emptyDir|rimraf/u);
    expect(source).not.to.contain('pagefind');
    expect(source).not.to.contain('resolveDevelopmentSiteUrlContext');
    expect(source).not.to.contain('resolveProductionSiteUrlContext');
  });

  it('build-pagefind に search catalog 生成責務を混ぜないこと', () => {
    expect(readRepoFile('scripts/build-pagefind.ts')).not.to.contain('emitSearchArtifacts');
  });

  it('production assertion が resolver と manifest を正本にすること', () => {
    const source = readRepoFile('scripts/assert-production-search-artifacts.ts');
    const rawCheckIndex = source.indexOf('assertRawSearchCatalogItems');
    const parseIndex = source.indexOf('parseCatalogForAssertion');

    expect(source).to.contain('options: AssertProductionSearchArtifactsOptions = {}');
    expect(source).to.contain('resolveProductionSiteUrlContext');
    expect(source).to.contain('resolveSearchCatalogUrl');
    expect(source).to.contain('resolveInternalDocumentRouteManifestPathname');
    expect(source).to.contain('createSearchArtifactUrlResolver');
    expect(source).to.contain("resolvePagefindAssetUrl('pagefind.js')");
    expect(source).to.contain("resolvePagefindAssetUrl('pagefind-entry.json')");
    expect(source).to.contain('parseInternalDocumentRouteManifest');
    expect(source).to.contain('toInternalDocumentRouteSet');
    expect(source).to.contain('createSearchJsonParseDiagnosticSink');
    expect(source).to.contain('parseSearchCatalogJson');
    expect(source).to.contain('assertUniqueCanonicalPathnames');
    expect(source).to.contain('assertPayloadMatches');
    expect(source).to.contain("Object.hasOwn(item, 'tags')");
    expect(source).to.contain("Object.hasOwn(item, 'genres')");
    expect(source).to.contain('outside basePath');
    expect(rawCheckIndex).to.be.lessThan(parseIndex);
    expect(source).to.contain('await assertProductionSearchArtifacts();');
  });

  it('production build は Pagefind skip を dist 削除前に拒否し、search assertion を production path で呼ぶこと', () => {
    const source = readRepoFile('scripts/run-production-build.ts');
    const skipIndex = source.indexOf("ROUAULT_SKIP_PAGEFIND'] === '1'");
    const rmIndex = source.indexOf('await rm(distDir');
    const assertionCall = 'await assertProductionSearchArtifacts();';

    expect(source).to.contain("import { assertProductionSearchArtifacts }");
    expect(source).to.contain(assertionCall);
    expect(source).not.to.contain('assertProductionSearchArtifacts({');
    expect(skipIndex).to.be.greaterThan(-1);
    expect(skipIndex).to.be.lessThan(rmIndex);
    expect(source).to.contain(
      '[production-build] ROUAULT_SKIP_PAGEFIND=1 is not allowed for production builds.',
    );
  });
});
