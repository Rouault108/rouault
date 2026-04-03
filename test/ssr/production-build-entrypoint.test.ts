import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

const projectRoot = process.cwd();
const workflowPath = path.resolve(projectRoot, '.github/workflows/ci-cd.yml');
const playwrightConfigPath = path.resolve(projectRoot, 'playwright.config.ts');

describe('production build entrypoint contract', () => {
  it('Playwright preview 起動前に共有 production build entrypoint を使うこと', () => {
    const playwrightConfig = readFileSync(playwrightConfigPath, 'utf8');

    expect(playwrightConfig).toContain("command: 'pnpm run build:production &&");
  });

  it('build-production と test-extended が同じ media base URL と build label 経路を使うこと', () => {
    const workflow = readFileSync(workflowPath, 'utf8');
    const mediaBaseUrlEntries = workflow.match(
      /ROUAULT_MEDIA_BASE_URL: \$\{\{ vars\.ROUAULT_MEDIA_BASE_URL \}\}/g,
    );
    const buildLabelEntries = workflow.match(
      /echo "ROUAULT_BUILD_LABEL=\$\{GITHUB_SHA::7\}" >> "\$GITHUB_ENV"/g,
    );

    expect(workflow).toContain('test-extended:');
    expect(workflow).toContain('build-production:');
    expect(mediaBaseUrlEntries).toHaveLength(2);
    expect(buildLabelEntries).toHaveLength(3);
    expect(workflow).toContain('- run: pnpm build:production');
  });
});
