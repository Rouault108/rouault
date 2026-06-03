import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const workflowPath = path.resolve(projectRoot, '.github/workflows/ci-cd.yml');
const playwrightConfigPath = path.resolve(projectRoot, 'playwright.config.ts');
const packageJsonPath = path.resolve(projectRoot, 'package.json');
const buildEntrypointPath = path.resolve(projectRoot, 'scripts/run-build.ts');
const productionBuildEntrypointPath = path.resolve(projectRoot, 'scripts/run-production-build.ts');
const productionCssArtifactAssertionPath = path.resolve(
  projectRoot,
  'scripts/assert-production-css-artifacts.ts',
);

const sliceWorkflowJob = (workflow: string, jobName: string, nextJobName: string): string => {
  const start = workflow.indexOf(`${jobName}:`);
  const end = workflow.indexOf(`${nextJobName}:`);

  if (start < 0 || end < 0 || end <= start) {
    throw new Error(`workflow から ${jobName} job を切り出せません`);
  }

  return workflow.slice(start, end);
};

describe('production build entrypoint contract', () => {
  it('Playwright preview 起動前に共有 production build entrypoint を使うこと', () => {
    const playwrightConfig = readFileSync(playwrightConfigPath, 'utf8');
    const normalizedPlaywrightConfig = playwrightConfig.replace(/\s+/g, ' ');

    expect(normalizedPlaywrightConfig).toContain(
      "command: 'pnpm run build:production && pnpm exec vite preview --config vite.preview.config.ts --host 127.0.0.1 --port 4173 --strictPort'",
    );
  });

  it('Playwright production e2e は未指定時の local build label を明示注入すること', () => {
    const playwrightConfig = readFileSync(playwrightConfigPath, 'utf8');

    expect(playwrightConfig).toContain('const resolveE2EBuildLabel = (): string => {');
    expect(playwrightConfig).toContain("process.env['ROUAULT_BUILD_LABEL']?.trim()");
    expect(playwrightConfig).toContain("process.env['GITHUB_SHA']?.trim()");
    expect(playwrightConfig).toContain("return 'e2e local';");
    expect(playwrightConfig).toContain('ROUAULT_BUILD_LABEL: resolveE2EBuildLabel(),');
  });

  it('build-production と dev/prod e2e jobs が同じ media base URL と build label 経路を使うこと', () => {
    const workflow = readFileSync(workflowPath, 'utf8');
    const testE2eProductionJob = sliceWorkflowJob(workflow, 'test-e2e-production', 'test-e2e-dev');
    const testE2eDevJob = sliceWorkflowJob(workflow, 'test-e2e-dev', 'build-production');
    const buildProductionJob = sliceWorkflowJob(workflow, 'build-production', 'ci-required');
    const mediaBaseUrlPattern = /ROUAULT_MEDIA_BASE_URL: \$\{\{ vars\.ROUAULT_MEDIA_BASE_URL \}\}/g;
    const buildLabelPattern = /echo "ROUAULT_BUILD_LABEL=\$\{GITHUB_SHA::7\}" >> "\$GITHUB_ENV"/g;

    expect(workflow).toContain('test-e2e-production:');
    expect(workflow).toContain('test-e2e-dev:');
    expect(workflow).toContain('build-production:');

    expect(testE2eProductionJob.match(mediaBaseUrlPattern) ?? []).toHaveLength(1);
    expect(testE2eDevJob.match(mediaBaseUrlPattern) ?? []).toHaveLength(1);
    expect(buildProductionJob.match(mediaBaseUrlPattern) ?? []).toHaveLength(1);

    expect(testE2eProductionJob.match(buildLabelPattern) ?? []).toHaveLength(1);
    expect(testE2eDevJob.match(buildLabelPattern) ?? []).toHaveLength(1);
    expect(buildProductionJob.match(buildLabelPattern) ?? []).toHaveLength(1);

    expect(workflow).toContain('- run: pnpm run test:e2e:production');
    expect(workflow).toContain('- run: pnpm run test:e2e:dev');
    expect(workflow).toContain('- run: pnpm build:production');
  });

  it('workflow_dispatch は full run 対象に含め、deploy は push main のみに限定すること', () => {
    const workflow = readFileSync(workflowPath, 'utf8');
    const storybookSmokeJob = sliceWorkflowJob(
      workflow,
      'test-storybook-smoke',
      'test-e2e-production',
    );
    const testE2eProductionJob = sliceWorkflowJob(workflow, 'test-e2e-production', 'test-e2e-dev');
    const testE2eDevJob = sliceWorkflowJob(workflow, 'test-e2e-dev', 'build-production');
    const deployProductionJob = workflow.slice(workflow.indexOf('deploy-production:'));
    const fullRunCondition =
      "if: ${{ !cancelled() && needs.detect-changes.result == 'success' && needs.prebuild-gate.result == 'success' && needs.detect-changes.outputs.app == 'true' && ((github.event_name == 'push' && github.ref == 'refs/heads/main') || github.event_name == 'workflow_dispatch' || (github.event_name == 'pull_request' && github.base_ref == 'main')) }}";

    expect(storybookSmokeJob).toContain(fullRunCondition);
    expect(testE2eProductionJob).toContain(fullRunCondition);
    expect(testE2eDevJob).toContain(fullRunCondition);
    expect(deployProductionJob).toContain('if: >-');
    expect(deployProductionJob).toContain("github.event_name == 'push'");
    expect(deployProductionJob).toContain("github.ref == 'refs/heads/main'");
    expect(deployProductionJob).toContain("needs.detect-changes.outputs.build == 'true'");
    expect(deployProductionJob).not.toContain("github.event_name == 'workflow_dispatch'");
  });

  it('production build entrypoint は生成後に CSS artifact assertion を実行すること', () => {
    const productionBuildEntrypoint = readFileSync(productionBuildEntrypointPath, 'utf8');

    expect(productionBuildEntrypoint).toContain(
      "import { assertProductionCssArtifacts } from './assert-production-css-artifacts.js';",
    );
    expect(productionBuildEntrypoint).toContain('await assertProductionCssArtifacts();');
  });

  it('production build entrypoint は build metadata を subprocess env に注入すること', () => {
    const productionBuildEntrypoint = readFileSync(productionBuildEntrypointPath, 'utf8');

    expect(productionBuildEntrypoint).toContain(
      "import { resolveProductionBuildMetadata } from '../build/metadata/build-metadata.js';",
    );
    expect(productionBuildEntrypoint).toContain(
      'const buildMetadata = resolveProductionBuildMetadata();',
    );
    expect(productionBuildEntrypoint).toContain("env['ROUAULT_BUILD_ID'] = buildMetadata.buildId;");
    expect(productionBuildEntrypoint).toContain(
      "env['ROUAULT_BUILD_LABEL'] = buildMetadata.buildLabel;",
    );
    expect(productionBuildEntrypoint).toContain(
      "env['ROUAULT_GENERATED_AT'] = buildMetadata.generatedAt;",
    );
    expect(productionBuildEntrypoint).toMatch(/spawnSync\(command, \['build'\], \{\s*env,/su);
  });

  it('通常 build entrypoint は build metadata を一度だけ解決して subprocess env に注入すること', () => {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
      readonly scripts?: Record<string, string>;
    };
    const buildEntrypoint = readFileSync(buildEntrypointPath, 'utf8');

    expect(packageJson.scripts?.['build']).toBe('tsx scripts/run-build.ts');
    expect(buildEntrypoint).toContain(
      "import { resolveDevelopmentBuildMetadata } from '../build/metadata/build-metadata.js';",
    );
    expect(buildEntrypoint).toContain('const buildMetadata = (() => {');
    expect(buildEntrypoint).toContain('ROUAULT_BUILD_ID: buildMetadata.buildId,');
    expect(buildEntrypoint).toContain('ROUAULT_BUILD_LABEL: buildMetadata.buildLabel,');
    expect(buildEntrypoint).toContain('ROUAULT_GENERATED_AT: buildMetadata.generatedAt,');
    expect(buildEntrypoint).toContain("['tsx', ['scripts/emit-navigation-artifacts.ts']],");
    expect(buildEntrypoint).toMatch(
      /spawnSync\(commandName\(command\), \[\.\.\.args\], \{\s*env,/su,
    );
  });

  it('production CSS artifact assertion は reachable CSS 全体と styling hook を検査すること', () => {
    const assertionSource = readFileSync(productionCssArtifactAssertionPath, 'utf8');

    expect(assertionSource).not.toContain('TOC_MOBILE_PANEL_SELECTOR');
    expect(assertionSource).toContain('TOC_MOBILE_PANEL_STYLING_SELECTOR');
    expect(assertionSource).toContain('TOC_MOBILE_PANEL_CSS_ARTIFACT_PATH');
    expect(assertionSource).toContain("const reachableCss = [...cssByAsset.values()].join('\\n');");
    expect(assertionSource).toContain('--toc-item-inactive-upper-max-lines');
    expect(assertionSource).toContain('expectRuleHasDeclarations');
    expect(assertionSource).toContain('var(--toc-item-inactive-max-lines, 2)');
    expect(assertionSource).toContain('var(--toc-item-active-max-lines, 3)');
  });
});
