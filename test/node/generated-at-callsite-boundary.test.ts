import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const expectNoBuildGeneratedAtOnceCall = (filePath: string): void => {
  const source = readFileSync(filePath, 'utf8');
  expect(source, filePath).not.toContain('createBuildGeneratedAtOnce');
};

const expectNoGeneratedAtFactoryAlias = (filePath: string): void => {
  const source = readFileSync(filePath, 'utf8');
  expect(source, filePath).not.toContain('resolveProductionBuildMetadata');
  expect(source, filePath).not.toContain('resolveBuildMetadata');
};

describe('generatedAt call-site boundary', () => {
  it('request / artifact path では createBuildGeneratedAtOnce を呼ばないこと', () => {
    for (const filePath of [
      'build/navigation/emit-navigation-artifacts.ts',
      'build/dev/dev-router-artifact-middleware.ts',
      'scripts/emit-navigation-artifacts.ts',
      'src/router/navigation-envelope-validator.ts',
    ]) {
      expectNoBuildGeneratedAtOnceCall(filePath);
      expectNoGeneratedAtFactoryAlias(filePath);
    }
  });

  it('runtime src は build/metadata/generated-at を import しないこと', () => {
    const checkedFiles = [
      'src/data/buildMetadata.ts',
      'src/router/document-loader.ts',
      'src/router/document-route-envelope.ts',
      'src/router/navigation-envelope-validator.ts',
    ];

    for (const filePath of checkedFiles) {
      const source = readFileSync(filePath, 'utf8');
      expect(source, filePath).not.toMatch(/build\/metadata\/generated-at/u);
    }
  });

  it('createNavigationEnvelopeFromHtml は generatedAt を生成しないこと', () => {
    const source = readFileSync('build/navigation/emit-navigation-artifacts.ts', 'utf8');
    const createFunctionSource = source.slice(source.indexOf('export const createNavigationEnvelopeFromHtml'));

    expect(createFunctionSource).not.toMatch(/new Date\(\)\.toISOString\(\)/u);
    expect(createFunctionSource).not.toContain('createBuildGeneratedAtOnce');
  });
});
