import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';
import { assertCspWorkflowContract } from '../../scripts/ci/assert-workflow-source-contract.js';

const yaml = createRequire(import.meta.url)('js-yaml') as {
  load: (source: string) => unknown;
  dump: (value: unknown) => string;
};
const record = (value: unknown) => value as Record<string, unknown>;
describe('independent mandatory CSP coverage workflow', () => {
  it.each([
    'app-trigger',
    'missing-needs',
    'coverage-suppression',
    'conditional-coverage',
    'bypass-public-gate',
    'removed-matrix',
    'raw-artifact',
    'old-coverage-gate',
    'missing-stage-artifact',
  ])('rejects %s', async (change) => {
    const workflow = record(yaml.load(await readFile('.github/workflows/ci-cd.yml', 'utf8')));
    const jobs = record(workflow['jobs']);
    const job = record(jobs['test-csp']);
    const steps = job['steps'] as Record<string, unknown>[];
    if (change === 'app-trigger')
      job['if'] = String(job['if']).replace('outputs.build', 'outputs.app');
    if (change === 'missing-needs') record(jobs['csp-required'])['needs'] = ['detect-changes'];
    if (change === 'coverage-suppression')
      record(steps.find((step) => step['id'] === 'verify-csp-coverage'))['continue-on-error'] =
        true;
    if (change === 'conditional-coverage')
      delete record(steps.find((step) => step['id'] === 'verify-csp-coverage'))['if'];
    if (change === 'bypass-public-gate')
      record(jobs['deploy-production'])['if'] = String(
        record(jobs['deploy-production'])['if'],
      ).replace("needs.csp-required.result == 'success'", 'true');
    if (change === 'removed-matrix')
      record(job['strategy'])['matrix'] = {
        include: [{ target: 'chromium', browser: 'chromium' }],
      };
    if (change === 'old-coverage-gate')
      record(steps.find((step) => step['id'] === 'verify-csp-coverage'))['run'] =
        'pnpm exec tsx scripts/ci/assert-csp-coverage.ts ${{ matrix.target }}-csp';
    if (change === 'missing-stage-artifact') {
      const options = record(
        record(steps.find((step) => step['name'] === 'preserve CSP results'))['with'],
      );
      options['path'] = String(options['path']).replace('.generated/csp/acceptance-*.json\n', '');
    }
    if (change === 'raw-artifact')
      record(record(steps.find((step) => step['name'] === 'preserve CSP results'))['with'])[
        'path'
      ] = '.generated/csp/';
    expect(() => assertCspWorkflowContract(yaml.dump(workflow))).toThrow();
  });
});
