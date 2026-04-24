import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const workflowPath = path.resolve(projectRoot, '.github/workflows/ci-cd.yml');
const playwrightConfigPath = path.resolve(projectRoot, 'playwright.config.ts');

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
      "command: 'pnpm run build:production && pnpm exec vite preview --config vite.preview.config.ts --host 127.0.0.1 --port 8080 --strictPort'",
    );
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
      "if: needs.detect-changes.outputs.app == 'true' && (github.event_name == 'push' || github.event_name == 'workflow_dispatch' || github.base_ref == 'main')";

    expect(storybookSmokeJob).toContain(fullRunCondition);
    expect(testE2eProductionJob).toContain(fullRunCondition);
    expect(testE2eDevJob).toContain(fullRunCondition);
    expect(deployProductionJob).toContain(
      "if: github.event_name == 'push' && github.ref == 'refs/heads/main' && needs.detect-changes.outputs.build == 'true'",
    );
    expect(deployProductionJob).not.toContain("github.event_name == 'workflow_dispatch'");
  });
});
