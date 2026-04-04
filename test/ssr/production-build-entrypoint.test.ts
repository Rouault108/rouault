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

  it('build-production と test-extended が同じ media base URL と build label 経路を使うこと', () => {
    const workflow = readFileSync(workflowPath, 'utf8');
    const testExtendedJob = sliceWorkflowJob(workflow, 'test-extended', 'build-production');
    const buildProductionJob = sliceWorkflowJob(workflow, 'build-production', 'deploy-production');
    const mediaBaseUrlPattern = /ROUAULT_MEDIA_BASE_URL: \$\{\{ vars\.ROUAULT_MEDIA_BASE_URL \}\}/g;
    const buildLabelPattern = /echo "ROUAULT_BUILD_LABEL=\$\{GITHUB_SHA::7\}" >> "\$GITHUB_ENV"/g;

    expect(workflow).toContain('test-extended:');
    expect(workflow).toContain('build-production:');
    expect(testExtendedJob.match(mediaBaseUrlPattern) ?? []).toHaveLength(1);
    expect(buildProductionJob.match(mediaBaseUrlPattern) ?? []).toHaveLength(1);
    expect(testExtendedJob.match(buildLabelPattern) ?? []).toHaveLength(1);
    expect(buildProductionJob.match(buildLabelPattern) ?? []).toHaveLength(1);
    expect(workflow).toContain('- run: pnpm build:production');
  });
});
