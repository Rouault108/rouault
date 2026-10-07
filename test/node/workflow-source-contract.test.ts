import { describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { runInNewContext } from 'node:vm';

import {
  assertProductionE2EMatrixContract,
  assertWorkflowSourceContract,
  collectWorkflowUses,
} from '../../scripts/ci/assert-workflow-source-contract.js';

const actionName = 'actions/example';
const reviewedCommitSha = '0123456789abcdef0123456789abcdef01234567';

const repositoryWorkflowPath = '.github/workflows/ci-cd.yml';
const writeMutatedWorkflow = async (mutate: (source: string) => string) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rouault-workflow-mutation-'));
  const workflowPath = path.join(root, 'ci-cd.yml');
  const source = await readFile(repositoryWorkflowPath, 'utf8');
  const mutated = mutate(source);
  expect(mutated).not.toBe(source);
  await writeFile(workflowPath, mutated, 'utf8');
  return { workflowPath };
};

const jobSteps = (source: string, job: string): readonly string[] => {
  const jobSource = new RegExp(`^  ${job}:[\\s\\S]*?(?=^  [\\w-]+:|(?![\\s\\S]))`, 'mu').exec(
    source,
  )?.[0];
  return (
    jobSource
      ?.split(/^ {4}steps:\r?\n/mu)[1]
      ?.split(/^ {6}- /mu)
      .slice(1) ?? []
  );
};

const conditionHolds = (step: string, state: Readonly<Record<string, string>>): boolean => {
  const condition = /^ {8}if: \$\{\{ (.*) \}\}$/mu.exec(step)?.[1] ?? '';
  expect(condition).toContain('always()');
  const expression = condition
    .replace(/always\(\)/gu, 'true')
    .replace(/(?:needs|steps)\.[\w.-]+/gu, (key) => {
      expect(state[key], key).toBeDefined();
      return JSON.stringify(state[key]);
    });
  const result: unknown = runInNewContext(expression, {}, { timeout: 100 });
  expect(typeof result).toBe('boolean');
  return result === true;
};

const workflowRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('workflow fixture must be a mapping');
  }
  return value as Record<string, unknown>;
};

interface YamlApi {
  readonly load: (source: string) => unknown;
  readonly dump: (
    value: unknown,
    options?: { readonly indent?: number; readonly sortKeys?: boolean },
  ) => string;
}
const yamlModule: unknown = createRequire(import.meta.url)('js-yaml');
const yamlRecord = workflowRecord(yamlModule);
if (typeof yamlRecord['load'] !== 'function' || typeof yamlRecord['dump'] !== 'function') {
  throw new Error('js-yaml.load/dump is required');
}
const yaml = yamlModule as YamlApi;

const matrixFixture = async () => {
  const workflow = workflowRecord(yaml.load(await readFile(repositoryWorkflowPath, 'utf8')));
  const jobs = workflowRecord(workflow['jobs']);
  const job = workflowRecord(jobs['test-e2e-production']);
  const strategy = workflowRecord(job['strategy']);
  const matrix = workflowRecord(strategy['matrix']);
  const readRecords = (value: unknown): Record<string, unknown>[] => {
    if (!Array.isArray(value)) throw new Error('workflow fixture must be a sequence');
    return value.map(workflowRecord);
  };
  const entries = readRecords(matrix['include']);
  const steps = readRecords(job['steps']);
  job['steps'] = steps;
  const test = workflowRecord(steps.find((step) => step['id'] === 'playwright-production'));
  const install = workflowRecord(
    steps.find((step) => String(step['run']).includes('playwright install')),
  );
  const upload = workflowRecord(
    steps.find((step) => step['name'] === 'preserve production E2E diagnostics'),
  );
  const options = workflowRecord(upload['with']);
  const gate = workflowRecord(jobs['ci-required']);
  const validator = workflowRecord(
    readRecords(gate['steps']).find(
      (step) => step['run'] === 'python3 scripts/ci/validate_required_needs.py',
    ),
  );
  return {
    workflow,
    job,
    strategy,
    matrix,
    entries,
    steps,
    test,
    install,
    upload,
    options,
    gate,
    validator,
    validatorEnv: workflowRecord(validator['env']),
  };
};

type MatrixFixture = Awaited<ReturnType<typeof matrixFixture>>;
const mutateEntry = (fixture: MatrixFixture, target: string): Record<string, unknown> =>
  workflowRecord(fixture.entries.find((entry) => entry['target'] === target));

describe('production E2E matrix structural contract', () => {
  it.each([2, 4])(
    'accepts reordered YAML mappings and include entries at indent=%i',
    async (indent) => {
      const fixture = await matrixFixture();
      fixture.matrix['include'] = [...fixture.entries].reverse();
      expect(() =>
        assertProductionE2EMatrixContract(yaml.dump(fixture.workflow, { indent, sortKeys: true })),
      ).not.toThrow();
    },
  );

  const mutations: readonly [string, (fixture: MatrixFixture) => void][] = [
    [
      'separate shell command',
      (f) => {
        f.test['run'] = 'pnpm run test:e2e:production\n${{ matrix.projects }}';
      },
    ],
    [
      'entry newline',
      (f) => {
        mutateEntry(f, 'webkit')['projects'] =
          '--project=webkit-final-check\n--project=webkit-mobile-final-check';
      },
    ],
    [
      'conditional test skip',
      (f) => {
        f.test['if'] = '${{ false }}';
      },
    ],
    [
      'conditional browser skip',
      (f) => {
        f.install['if'] = '${{ false }}';
      },
    ],
    [
      'conditional validator skip',
      (f) => {
        f.validator['if'] = '${{ false }}';
      },
    ],
    [
      'missing mobile WebKit',
      (f) => {
        mutateEntry(f, 'webkit')['projects'] = '--project=webkit-final-check';
      },
    ],
    [
      'duplicate project',
      (f) => {
        mutateEntry(f, 'webkit')['projects'] =
          '--project=webkit-final-check --project=webkit-mobile-final-check --project=webkit-final-check';
      },
    ],
    [
      'wrong project group',
      (f) => {
        mutateEntry(f, 'firefox')['projects'] = '--project=chromium-integration';
      },
    ],
    [
      'missing variation',
      (f) => {
        f.matrix['include'] = f.entries.slice(0, 2);
      },
    ],
    [
      'duplicate target',
      (f) => {
        mutateEntry(f, 'webkit')['target'] = 'chromium';
      },
    ],
    [
      'fourth variation',
      (f) => {
        f.matrix['include'] = [...f.entries, f.entries[0]];
      },
    ],
    [
      'extra axis',
      (f) => {
        f.matrix['os'] = ['ubuntu-latest', 'ubuntu-24.04'];
      },
    ],
    [
      'exclude',
      (f) => {
        f.matrix['exclude'] = [{ target: 'firefox' }];
      },
    ],
    [
      'fail-fast',
      (f) => {
        f.strategy['fail-fast'] = true;
      },
    ],
    [
      'max-parallel',
      (f) => {
        f.strategy['max-parallel'] = 1;
      },
    ],
    [
      'shared concurrency',
      (f) => {
        f.job['concurrency'] = { group: 'production-e2e' };
      },
    ],
    [
      'job failure suppression',
      (f) => {
        f.job['continue-on-error'] = true;
      },
    ],
    [
      'test failure suppression',
      (f) => {
        f.test['continue-on-error'] = true;
      },
    ],
    [
      'setup failure suppression',
      (f) => {
        f.install['continue-on-error'] = true;
      },
    ],
    [
      'wrong runner',
      (f) => {
        f.job['runs-on'] = 'paid-runner';
      },
    ],
    [
      'targetless display name',
      (f) => {
        f.job['name'] = 'test-e2e-production';
      },
    ],
    [
      'wrong browser mapping',
      (f) => {
        mutateEntry(f, 'firefox')['browser'] = 'chromium';
      },
    ],
    [
      'wrong browser command',
      (f) => {
        f.install['run'] = 'pnpm exec playwright install --with-deps chromium';
      },
    ],
    [
      'all browser install',
      (f) => {
        f.install['run'] = 'pnpm exec playwright install --with-deps';
      },
    ],
    [
      'standalone --',
      (f) => {
        f.test['run'] = 'pnpm run test:e2e:production -- ${{ matrix.projects }}';
      },
    ],
    [
      'quoted project options',
      (f) => {
        f.test['run'] = 'pnpm run test:e2e:production "${{ matrix.projects }}"';
      },
    ],
    [
      'quoted matrix entry',
      (f) => {
        mutateEntry(f, 'webkit')['projects'] =
          '"--project=webkit-final-check --project=webkit-mobile-final-check"';
      },
    ],
    [
      'extra filter',
      (f) => {
        f.test['run'] = 'pnpm run test:e2e:production ${{ matrix.projects }} --grep=search';
      },
    ],
    [
      'entry filter',
      (f) => {
        mutateEntry(f, 'chromium')['projects'] = '--project=chromium-integration router.spec.ts';
      },
    ],
    [
      'hidden exit failure',
      (f) => {
        f.test['run'] = 'pnpm run test:e2e:production ${{ matrix.projects }} || true';
      },
    ],
    [
      'targetless artifact',
      (f) => {
        f.options['name'] = 'rouault-e2e-production-diagnostics';
      },
    ],
    [
      'success upload',
      (f) => {
        f.upload['if'] = '${{ always() }}';
      },
    ],
    [
      'long retention',
      (f) => {
        f.options['retention-days'] = 30;
      },
    ],
    [
      'extra diagnostic path',
      (f) => {
        f.options['path'] = 'playwright-report/\ntest-results/\n.env';
      },
    ],
    [
      'blocking diagnostics',
      (f) => {
        delete f.upload['continue-on-error'];
      },
    ],
    [
      'missing-file error',
      (f) => {
        f.options['if-no-files-found'] = 'error';
      },
    ],
    [
      'second artifact',
      (f) => {
        f.steps.push({ ...f.upload, if: '${{ always() }}' });
      },
    ],
    [
      'serial dependency',
      (f) => {
        f.job['needs'] = ['detect-changes', 'prebuild-gate', 'test-e2e-dev'];
      },
    ],
    [
      'app gate',
      (f) => {
        f.job['if'] = String(f.job['if']).replace(
          "needs.detect-changes.outputs.app == 'true'",
          'true',
        );
      },
    ],
    [
      'event gate',
      (f) => {
        f.job['if'] = String(f.job['if']).replace("github.base_ref == 'main'", 'true');
      },
    ],
    [
      'prerequisite gate',
      (f) => {
        f.job['if'] = String(f.job['if']).replace(
          "needs.prebuild-gate.result == 'success'",
          'true',
        );
      },
    ],
    [
      'cancellation gate',
      (f) => {
        f.job['if'] = String(f.job['if']).replace('!cancelled()', 'true');
      },
    ],
    [
      'media URL',
      (f) => {
        workflowRecord(f.job['env'])['ROUAULT_MEDIA_BASE_URL'] = 'https://wrong.example';
      },
    ],
    [
      'late build label',
      (f) => {
        f.steps.push(...f.steps.splice(1, 1));
      },
    ],
    [
      'missing required Production',
      (f) => {
        f.gate['needs'] = ['detect-changes', 'prebuild-gate', 'test-e2e-dev', 'build-production'];
      },
    ],
    [
      'conditional required gate',
      (f) => {
        f.gate['if'] = '${{ success() }}';
      },
    ],
    [
      'gate failure suppression',
      (f) => {
        f.gate['continue-on-error'] = true;
      },
    ],
    [
      'validator failure suppression',
      (f) => {
        f.validator['continue-on-error'] = true;
      },
    ],
    [
      'result model bypass',
      (f) => {
        f.validator['run'] = 'true';
      },
    ],
    [
      'needs input',
      (f) => {
        f.validatorEnv['NEEDS_JSON'] = '{}';
      },
    ],
    [
      'skip event context',
      (f) => {
        delete f.validatorEnv['GITHUB_EVENT_NAME'];
      },
    ],
  ];
  it.each(mutations)('rejects %s', async (_name, mutate) => {
    const fixture = await matrixFixture();
    const before = yaml.dump(fixture.workflow);
    mutate(fixture);
    const after = yaml.dump(fixture.workflow);
    expect(after).not.toBe(before);
    expect(() => assertProductionE2EMatrixContract(after)).toThrow();
  });
});

const writeWorkflowContractFixture = async (options: {
  readonly workflowUses?: string;
  readonly runsUsing?: 'node20' | 'node24';
  readonly extraRun?: string;
  readonly workflowStepOrder?: 'valid' | 'preflight-after-upload';
  readonly deployScriptSource?: string;
  readonly uploadR2ScriptSource?: string;
  readonly verifyMediaDeliveryScriptSource?: string;
  readonly releaseStateSchemaSource?: string;
  readonly mediaObjectContractSource?: string;
  readonly productionPreflightScriptSource?: string;
  readonly packageWranglerVersion?: string;
  readonly lockWranglerSpecifier?: string;
  readonly lockWranglerVersion?: string;
  readonly evidenceWorkflowUsesSha?: string;
  readonly readmeWorkflowUsesSha?: string;
  readonly deploymentDocsSource?: string;
  readonly actionStepSource?: string;
}) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rouault-workflow-contract-'));
  const workflowPath = path.join(root, 'ci-cd.yml');
  const snapshotRoot = path.join(root, 'external-action-snapshots');
  const snapshotDirectory = path.join(snapshotRoot, 'actions-example');
  const readmePath = path.join(snapshotRoot, 'README.md');
  const deployScriptPath = path.join(root, 'deploy-cloudflare-pages.ts');
  const uploadR2ScriptPath = path.join(root, 'upload-r2-media.ts');
  const verifyMediaDeliveryScriptPath = path.join(root, 'verify-media-delivery.ts');
  const releaseStateSchemaPath = path.join(root, 'release-state-schema.ts');
  const mediaObjectContractPath = path.join(root, 'media-object-contract.ts');
  const productionPreflightScriptPath = path.join(root, 'production-authority-preflight.ts');
  const deploymentDocsPath = path.join(root, 'deployment.md');
  const packageJsonPath = path.join(root, 'package.json');
  const lockfilePath = path.join(root, 'pnpm-lock.yaml');
  const runsUsing = options.runsUsing ?? 'node24';
  const workflowUses = options.workflowUses ?? `${actionName}@${reviewedCommitSha}`;
  const packageWranglerVersion = options.packageWranglerVersion ?? '4.100.0';
  const lockWranglerSpecifier = options.lockWranglerSpecifier ?? packageWranglerVersion;
  const lockWranglerVersion = options.lockWranglerVersion ?? packageWranglerVersion;
  const evidenceWorkflowUsesSha = options.evidenceWorkflowUsesSha ?? reviewedCommitSha;
  const readmeWorkflowUsesSha = options.readmeWorkflowUsesSha ?? evidenceWorkflowUsesSha;
  const workflowDeploySteps =
    options.workflowStepOrder === 'preflight-after-upload'
      ? [
          '      - uses: ./actions/download-artifact@0123456789abcdef0123456789abcdef01234567',
          '      - id: upload-r2-media',
          '        continue-on-error: true',
          '        run: pnpm exec tsx scripts/upload-r2-media.ts',
          '      - id: upload-r2-attempt-artifact',
          '        uses: ./actions/upload-artifact@0123456789abcdef0123456789abcdef01234567',
          '        with:',
          '          path: .generated/deployment/r2-attempt.json',
          '          if-no-files-found: error',
          '      - id: verify-media-delivery',
          '        continue-on-error: true',
          '        run: pnpm exec tsx scripts/deploy/verify-media-delivery.ts',
          '      - id: upload-media-delivery-attempt-artifact',
          '        uses: ./actions/upload-artifact@0123456789abcdef0123456789abcdef01234567',
          '        with:',
          '          path: .generated/deployment/media-delivery-attempt.json',
          '          if-no-files-found: error',
          '      - run: pnpm exec tsx scripts/deploy/production-authority-preflight.ts',
          '      - id: finalize-r2-upload-failure',
          '        env:',
          '          RELEASE_FAILURE_PHASE: r2-upload',
          '        run: pnpm exec tsx scripts/deploy/finalize-release-failure.ts',
          '      - id: finalize-media-delivery-failure',
          '        env:',
          '          RELEASE_FAILURE_PHASE: media-delivery',
          '        run: pnpm exec tsx scripts/deploy/finalize-release-failure.ts',
          '      - id: deploy-cloudflare-pages',
          '        run: pnpm exec tsx scripts/deploy/deploy-cloudflare-pages.ts',
          '      - id: upload-pages-deploy-diagnostic-artifact',
          '        continue-on-error: true',
          '        uses: ./actions/upload-artifact@0123456789abcdef0123456789abcdef01234567',
          '        with:',
          '          name: rouault-wrangler-pages-deploy-diagnostic',
          '          path: |',
          '            .generated/deployment/wrangler-pages-deploy.jsonl',
          '            .generated/deployment/wrangler-pages-deploy-diagnostic.json',
          '          if-no-files-found: warn',
          '      - id: finalize-pages-deploy-failure',
          '        env:',
          '          RELEASE_FAILURE_PHASE: pages-deploy',
          '        run: pnpm exec tsx scripts/deploy/finalize-release-failure.ts',
          '      release-state-artifact-name: ${{ steps.deploy-cloudflare-pages.outputs.release-state-artifact-name || steps.finalize-r2-upload-failure.outputs.release-state-artifact-name || steps.finalize-media-delivery-failure.outputs.release-state-artifact-name || steps.finalize-pages-deploy-failure.outputs.release-state-artifact-name }}',
          '      release-state-artifact-id: ${{ steps.upload-release-state-artifact.outputs.artifact-id }}',
          '      release-state-sha256: ${{ steps.deploy-cloudflare-pages.outputs.release-state-sha256 || steps.finalize-r2-upload-failure.outputs.release-state-sha256 || steps.finalize-media-delivery-failure.outputs.release-state-sha256 || steps.finalize-pages-deploy-failure.outputs.release-state-sha256 }}',
          '      - id: upload-release-state-artifact',
          '        uses: ./actions/upload-artifact@0123456789abcdef0123456789abcdef01234567',
          '        with:',
          '          path: .generated/deployment/release-attempt-final.json',
          '          if-no-files-found: error',
          '      - id: download-release-state',
          '        uses: ./actions/download-artifact@0123456789abcdef0123456789abcdef01234567',
          '        continue-on-error: true',
          '        with:',
          '          artifact-ids: ${{ needs.deploy-production.outputs.release-state-artifact-id }}',
          '          digest-mismatch: error',
          '      - run: pnpm exec tsx scripts/deploy/record-runtime-verification.ts',
          '        env:',
          '          EXPECTED_RELEASE_STATE_SHA256: ${{ needs.deploy-production.outputs.release-state-sha256 }}',
          '      - id: record-release-state-resolution-failed',
          '        env:',
          '          RUNTIME_VERIFICATION_STATUS: release-state-resolution-failed',
          "      - if: ${{ steps.record-release-state-resolution-failed.outcome == 'success' }}",
        ]
      : [
          '      - run: pnpm exec tsx scripts/deploy/production-authority-preflight.ts',
          '      - uses: ./actions/download-artifact@0123456789abcdef0123456789abcdef01234567',
          '      - id: upload-r2-media',
          '        continue-on-error: true',
          '        run: pnpm exec tsx scripts/upload-r2-media.ts',
          '      - id: upload-r2-attempt-artifact',
          '        uses: ./actions/upload-artifact@0123456789abcdef0123456789abcdef01234567',
          '        with:',
          '          path: .generated/deployment/r2-attempt.json',
          '          if-no-files-found: error',
          '      - id: verify-media-delivery',
          '        continue-on-error: true',
          '        run: pnpm exec tsx scripts/deploy/verify-media-delivery.ts',
          '      - id: upload-media-delivery-attempt-artifact',
          '        uses: ./actions/upload-artifact@0123456789abcdef0123456789abcdef01234567',
          '        with:',
          '          path: .generated/deployment/media-delivery-attempt.json',
          '          if-no-files-found: error',
          '      - id: finalize-r2-upload-failure',
          '        env:',
          '          RELEASE_FAILURE_PHASE: r2-upload',
          '        run: pnpm exec tsx scripts/deploy/finalize-release-failure.ts',
          '      - id: finalize-media-delivery-failure',
          '        env:',
          '          RELEASE_FAILURE_PHASE: media-delivery',
          '        run: pnpm exec tsx scripts/deploy/finalize-release-failure.ts',
          '      - id: deploy-cloudflare-pages',
          '        run: pnpm exec tsx scripts/deploy/deploy-cloudflare-pages.ts',
          '      - id: upload-pages-deploy-diagnostic-artifact',
          '        continue-on-error: true',
          '        uses: ./actions/upload-artifact@0123456789abcdef0123456789abcdef01234567',
          '        with:',
          '          name: rouault-wrangler-pages-deploy-diagnostic',
          '          path: |',
          '            .generated/deployment/wrangler-pages-deploy.jsonl',
          '            .generated/deployment/wrangler-pages-deploy-diagnostic.json',
          '          if-no-files-found: warn',
          '      - id: finalize-pages-deploy-failure',
          '        env:',
          '          RELEASE_FAILURE_PHASE: pages-deploy',
          '        run: pnpm exec tsx scripts/deploy/finalize-release-failure.ts',
          '      release-state-artifact-name: ${{ steps.deploy-cloudflare-pages.outputs.release-state-artifact-name || steps.finalize-r2-upload-failure.outputs.release-state-artifact-name || steps.finalize-media-delivery-failure.outputs.release-state-artifact-name || steps.finalize-pages-deploy-failure.outputs.release-state-artifact-name }}',
          '      release-state-artifact-id: ${{ steps.upload-release-state-artifact.outputs.artifact-id }}',
          '      release-state-sha256: ${{ steps.deploy-cloudflare-pages.outputs.release-state-sha256 || steps.finalize-r2-upload-failure.outputs.release-state-sha256 || steps.finalize-media-delivery-failure.outputs.release-state-sha256 || steps.finalize-pages-deploy-failure.outputs.release-state-sha256 }}',
          '      - id: upload-release-state-artifact',
          '        uses: ./actions/upload-artifact@0123456789abcdef0123456789abcdef01234567',
          '        with:',
          '          path: .generated/deployment/release-attempt-final.json',
          '          if-no-files-found: error',
          '      - id: download-release-state',
          '        uses: ./actions/download-artifact@0123456789abcdef0123456789abcdef01234567',
          '        continue-on-error: true',
          '        with:',
          '          artifact-ids: ${{ needs.deploy-production.outputs.release-state-artifact-id }}',
          '          digest-mismatch: error',
          '      - run: pnpm exec tsx scripts/deploy/record-runtime-verification.ts',
          '        env:',
          '          EXPECTED_RELEASE_STATE_SHA256: ${{ needs.deploy-production.outputs.release-state-sha256 }}',
          '      - id: record-release-state-resolution-failed',
          '        env:',
          '          RUNTIME_VERIFICATION_STATUS: release-state-resolution-failed',
          "      - if: ${{ steps.record-release-state-resolution-failed.outcome == 'success' }}",
        ];

  await mkdir(snapshotDirectory, { recursive: true });
  // binding fixtureでも実際のorchestration契約を満たし、Actionだけをlocal fixtureへ置き換える。
  const repositoryWorkflow = await readFile('.github/workflows/ci-cd.yml', 'utf8');
  const orchestrationJobs = [
    'test-e2e-production',
    'test-e2e-dev',
    'ci-required',
    'verify-production-deployment',
  ].map((job) => {
    const source = new RegExp(`^  ${job}:[\\s\\S]*?(?=^  [\\w-]+:|(?![\\s\\S]))`, 'mu').exec(
      repositoryWorkflow,
    )?.[0];
    if (source === undefined) throw new Error(`missing fixture job ${job}`);
    return source.replace(/uses: /gu, 'uses: ./');
  });
  await writeFile(
    workflowPath,
    [
      'jobs:',
      '  test:',
      '    steps:',
      options.actionStepSource ?? `      - uses: ${workflowUses}`,
      options.extraRun ? `      - run: ${options.extraRun}` : '',
      ...workflowDeploySteps.map((line) => line.replace(/^ {6}(release-state-)/u, '        $1')),
      ...orchestrationJobs,
      '',
    ].join('\n'),
    'utf8',
  );
  await writeFile(
    deployScriptPath,
    options.deployScriptSource ??
      [
        "const output = 'WRANGLER_OUTPUT_FILE_PATH';",
        "const parser = 'parseWranglerPagesDeployStructuredOutput';",
        "const commitDirty = '--commit-dirty=false';",
        "observeProductionBranchHead(authority, 'cloudflare-pages-deploy');",
        'void output;',
        'void parser;',
        'void commitDirty;',
        '',
      ].join('\n'),
    'utf8',
  );
  await writeFile(
    uploadR2ScriptPath,
    options.uploadR2ScriptSource ??
      "observeProductionBranchHead(authority, 'r2-media-upload');\nconst failed = { uploadedObjects: [] };\nvoid failed;\n",
    'utf8',
  );
  await writeFile(
    verifyMediaDeliveryScriptPath,
    options.verifyMediaDeliveryScriptSource ??
      'const objectCount = uploadAttempt.uploadedObjects.length;\nassertUploadedVerifiedObjectSetConsistency(uploadAttempt.uploadedObjects, verifiedObjects);\nvoid objectCount;\n',
    'utf8',
  );
  await writeFile(
    releaseStateSchemaPath,
    options.releaseStateSchemaSource ??
      "const message = 'uploadedObjects and verifiedObjects object sets differ';\nfunction assertUploadedVerifiedObjectSetConsistency() { return message; }\nvoid assertUploadedVerifiedObjectSetConsistency;\n",
    'utf8',
  );
  await writeFile(
    mediaObjectContractPath,
    options.mediaObjectContractSource ??
      "if (objectIdentities.size !== MEDIA_VARIANTS.length * MEDIA_FORMATS.length) { throw new Error('media item は variant × format の9件を持つ必要があります'); }\n",
    'utf8',
  );
  await writeFile(
    productionPreflightScriptPath,
    options.productionPreflightScriptSource ??
      "console.log('[production-authority] wrote validated production context');\n",
    'utf8',
  );
  await writeFile(
    packageJsonPath,
    JSON.stringify(
      {
        devDependencies: {
          wrangler: packageWranglerVersion,
        },
      },
      null,
      2,
    ),
    'utf8',
  );
  await writeFile(
    lockfilePath,
    [
      'importers:',
      '  .:',
      '    devDependencies:',
      '      wrangler:',
      `        specifier: ${lockWranglerSpecifier}`,
      `        version: ${lockWranglerVersion}`,
      '',
      'packages:',
      '',
      `  wrangler@${lockWranglerVersion}:`,
      '    resolution: {integrity: sha512-fixture}',
      '',
    ].join('\n'),
    'utf8',
  );
  await writeFile(
    path.join(snapshotDirectory, 'tag-evidence.json'),
    JSON.stringify(
      {
        action: actionName,
        adopted_tag: 'v1.0.0',
        reviewed_commit_sha: reviewedCommitSha,
        workflowUsesSha: evidenceWorkflowUsesSha,
        runtimeReadiness: 'node24',
        action_yml_runs_using: 'node24',
      },
      null,
      2,
    ),
    'utf8',
  );
  await writeFile(
    path.join(snapshotDirectory, 'action.commit.yml'),
    `runs:\n  using: ${runsUsing}\n  main: dist/index.js\n`,
    'utf8',
  );
  await writeFile(
    path.join(snapshotDirectory, 'action.tag.yml'),
    `runs:\n  using: ${runsUsing}\n  main: dist/index.js\n`,
    'utf8',
  );
  await writeFile(
    readmePath,
    [
      '| action name | adopted tag | reviewed commit SHA | runs.using | workflow uses SHA |',
      '| --- | --- | --- | --- | --- |',
      `| \`${actionName}\` | \`v1.0.0\` | \`${reviewedCommitSha}\` | \`node24\` | \`${readmeWorkflowUsesSha}\` |`,
      '',
    ].join('\n'),
    'utf8',
  );
  await writeFile(
    deploymentDocsPath,
    options.deploymentDocsSource ??
      [
        '# Deployment Operations',
        '',
        'deployment URL や deployment ID の正本は Wrangler structured output file を parser で正規化した cloudflare-pages-deploy-result.json と、そこから生成する release state artifact である。stdout や raw command output を deployment data source として扱ってはいけない。',
        '',
        '機械検証は release state artifact、release state SHA-256、R2 attempt manifest、media delivery attempt manifest、runtime verification artifact を使って行う。',
        '',
      ].join('\n'),
    'utf8',
  );

  return {
    workflowPath,
    snapshotRoot,
    readmePath,
    deployScriptPath,
    packageJsonPath,
    lockfilePath,
    uploadR2ScriptPath,
    verifyMediaDeliveryScriptPath,
    releaseStateSchemaPath,
    mediaObjectContractPath,
    productionPreflightScriptPath,
    deploymentDocsPath,
  };
};

describe('workflow source contract', () => {
  it('documents the implemented production build label resolution order', async () => {
    const docs = await readFile('docs/guides/operations/deployment.md', 'utf8');
    const section = docs.split('## Production Build Label')[1]?.split('\n## ')[0] ?? '';
    const build = await readFile('scripts/run-production-build.ts', 'utf8');
    expect(section).toContain('1. 明示された空でない`ROUAULT_BUILD_LABEL`');
    expect(section).toContain('2. 空でない`GITHUB_SHA`の先頭7文字');
    expect(section).toContain('3. `production local`');
    expect(section).toContain('人間向け診断ラベル');
    expect(section).toContain('`buildId`の代替ではない');
    expect(section).toContain('`${GITHUB_SHA::7}`');
    expect(section).not.toContain('未指定の場合、production buildは契約違反として失敗する');
    expect(section).not.toContain('fallbackを使わない');
    expect(build.indexOf("process.env['ROUAULT_BUILD_LABEL']")).toBeLessThan(
      build.indexOf("process.env['GITHUB_SHA']"),
    );
    expect(build).toContain('return githubSha.slice(0, 7);');
    expect(build).toContain("return 'production local';");
    const workflow = await readFile(repositoryWorkflowPath, 'utf8');
    expect(workflow).toContain('ROUAULT_BUILD_LABEL=${GITHUB_SHA::7}');
  });

  it('collects reordered, quoted, commented and local uses without reading block scalar text', () => {
    const coordinate = `${actionName}@${reviewedCommitSha}`;
    const source = [
      `      - uses: ${coordinate}`,
      '      - id: first',
      `        uses: '${coordinate}' # reviewed`,
      '      - name: named',
      `        uses: "${coordinate}" # reviewed`,
      '      - uses: ./local/action # local',
      '      - run: |',
      '          uses: ignored/action@v1',
      '      - name: another',
      `        uses: ${coordinate} # reviewed`,
    ].join('\n');
    expect(collectWorkflowUses(source)).toEqual([
      coordinate,
      coordinate,
      coordinate,
      './local/action',
      coordinate,
    ]);
  });

  it.each([
    ['dash', '- uses: VALUE'],
    ['id-first', '- id: first\n        uses: VALUE'],
    ['name-first', '- name: named\n        uses: VALUE'],
    ['single-quote', "- id: quoted\n        uses: 'VALUE' # reviewed"],
    ['double-quote', '- name: quoted\n        uses: "VALUE" # reviewed'],
  ])('validates full SHA and reviewed binding for %s scalars', async (_name, template) => {
    for (const [sha, error] of [
      ['v1.0.0', /full SHA pin/u],
      ['1111111111111111111111111111111111111111', /missing matching reviewed evidence/u],
    ] as const) {
      const fixture = await writeWorkflowContractFixture({
        actionStepSource: `      ${template.replace('VALUE', `${actionName}@${sha}`)}`,
      });
      await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(error);
    }
    const fixture = await writeWorkflowContractFixture({
      actionStepSource: `      ${template.replace('VALUE', `${actionName}@${reviewedCommitSha}`)}`,
    });
    await expect(assertWorkflowSourceContract(fixture)).resolves.toBeDefined();
  });

  it.each([
    'upload-r2-attempt-artifact',
    'upload-media-delivery-attempt-artifact',
    'upload-pages-deploy-diagnostic-artifact',
    'upload-release-state-artifact',
    'download-release-state',
  ])('rejects tags and SHA drift in the formerly missed %s step', async (id) => {
    for (const [replacement, error] of [
      ['v1', /full SHA pin/u],
      ['1111111111111111111111111111111111111111', /workflow unique external action count/u],
    ] as const) {
      const fixture = await writeMutatedWorkflow((source) =>
        source.replace(
          new RegExp(`(- id: ${id}\\r?\\n[\\s\\S]*?uses: [^@\\r\\n]+@)[0-9a-f]{40}`, 'u'),
          `$1${replacement}`,
        ),
      );
      await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(error);
    }
  });

  it('keeps local action references out of external binding validation', async () => {
    const fixture = await writeWorkflowContractFixture({
      actionStepSource: `      - uses: ${actionName}@${reviewedCommitSha}\n      - id: local\n        uses: './local/action' # no external SHA`,
    });
    const report = await assertWorkflowSourceContract(fixture);
    expect(report.workflowUses).toContain('./local/action');
    expect(report.actionEvidence).toHaveLength(1);
  });

  it.each([
    ['no-deploy', 'false', 'skipped', 'skipped', 'skipped', 'skipped', undefined],
    [
      'deployed',
      'true',
      'success',
      'success',
      'success',
      'success',
      'record-runtime-verification-success',
    ],
    [
      'HTTP failure',
      'true',
      'success',
      'success',
      'success',
      'failure',
      'record-runtime-verification-failure',
    ],
    [
      'deploy failure with evidence',
      'true',
      'failure',
      'success',
      'success',
      'skipped',
      'record-deploy-failure-state',
    ],
    [
      'deploy skipped with evidence',
      'true',
      'skipped',
      'success',
      'success',
      'skipped',
      'record-deploy-failure-state',
    ],
    [
      'deploy failure without artifact',
      'true',
      'failure',
      'skipped',
      'skipped',
      'skipped',
      'record-release-state-resolution-failed',
    ],
    [
      'deploy skipped without artifact',
      'true',
      'skipped',
      'skipped',
      'skipped',
      'skipped',
      'record-release-state-resolution-failed',
    ],
    [
      'download failure',
      'true',
      'success',
      'failure',
      'skipped',
      'skipped',
      'record-release-state-resolution-failed',
    ],
    [
      'digest mismatch',
      'true',
      'success',
      'success',
      'failure',
      'skipped',
      'record-release-state-resolution-failed',
    ],
  ])(
    'selects one evidence branch for %s even after an earlier failure',
    async (_name, build, deploy, download, digest, runtime, expectedRecord) => {
      const steps = jobSteps(
        await readFile(repositoryWorkflowPath, 'utf8'),
        'verify-production-deployment',
      );
      const state: Record<string, string> = {
        'needs.detect-changes.outputs.build': build,
        'needs.deploy-production.result': deploy,
        'needs.deploy-production.outputs.release-state-artifact-id':
          download === 'skipped' ? '' : '123',
        'steps.download-release-state.outcome': download,
        'steps.verify-release-state-digest.outcome': digest,
        'steps.verify-runtime-artifacts.outcome': runtime,
      };
      const records = steps.filter((step) => step.startsWith('id: record-'));
      const active = records.filter((step) => conditionHolds(step, state));
      expect(active.map((step) => /^id: (.*)$/mu.exec(step)?.[1]?.trim())).toEqual(
        expectedRecord ? [expectedRecord] : [],
      );
      const runtimeStep =
        steps.find((step) => step.startsWith('id: verify-runtime-artifacts')) ?? '';
      expect(conditionHolds(runtimeStep, state)).toBe(
        build === 'true' && deploy === 'success' && download === 'success' && digest === 'success',
      );
      for (const record of records) {
        const id = /^id: (.*)$/mu.exec(record)?.[1]?.trim() ?? '';
        state[`steps.${id}.outcome`] = id === expectedRecord ? 'success' : 'skipped';
      }
      const upload =
        steps.find((step) => step.includes('name: rouault-release-verification-state')) ?? '';
      expect(conditionHolds(upload, state)).toBe(expectedRecord !== undefined);
      if (build === 'false') {
        for (const step of steps.slice(2, -1)) expect(conditionHolds(step, state)).toBe(false);
      }
    },
  );

  it.each([
    [
      "always() && needs.detect-changes.outputs.build == 'true'",
      "needs.detect-changes.outputs.build == 'true'",
      /evidence steps/u,
    ],
    ['digest-mismatch: error', 'digest-mismatch: warn', /fail closed/u],
    ['hashlib.sha256(raw).hexdigest() != expected', 'False', /SHA-256 must be checked/u],
    [
      "steps.verify-runtime-artifacts.outcome != 'success'",
      "steps.verify-runtime-artifacts.outcome == 'success'",
      /mutually exclusive/u,
    ],
    ['test "$DEPLOYMENT_VALIDATION_OUTCOME" = "success"', 'true', /final deployment enforcement/u],
    ['test "$RUNTIME_VERIFICATION_OUTCOME" = "success"', 'true', /final deployment enforcement/u],
  ])('rejects deployment evidence or enforcement regression: %s', async (before, after, error) => {
    const fixture = await writeMutatedWorkflow((source) => source.replace(before, after));
    await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(error);
  });

  it.each(['production', 'dev'])(
    'preserves only failed %s Playwright diagnostics',
    async (target) => {
      const steps = jobSteps(await readFile(repositoryWorkflowPath, 'utf8'), `test-e2e-${target}`);
      const upload =
        steps.find((step) => step.includes(`name: preserve ${target} E2E diagnostics`)) ?? '';
      for (const outcome of ['success', 'failure', 'skipped', 'cancelled']) {
        expect(conditionHolds(upload, { [`steps.playwright-${target}.outcome`]: outcome })).toBe(
          outcome === 'failure',
        );
      }
      for (const [before, after] of [
        [`always() && steps.playwright-${target}.outcome == 'failure'`, 'failure()'],
        ['retention-days: 7', 'retention-days: 30'],
        ['            test-results/', '            test-results/\n            .env'],
        [`id: playwright-${target}`, `id: playwright-${target}\n        continue-on-error: true`],
        ['if-no-files-found: warn', 'if-no-files-found: error'],
      ]) {
        const fixture = await writeMutatedWorkflow((source) => {
          const job = new RegExp(
            `(^  test-e2e-${target}:[\\s\\S]*?)(?=^  [\\w-]+:|(?![\\s\\S]))`,
            'mu',
          );
          return source.replace(job, (section) => section.replace(before ?? '', after ?? ''));
        });
        await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(/E2E diagnostics/u);
      }
    },
  );

  it('pins external actions to reviewed Node 24 commit snapshots', async () => {
    const report = await assertWorkflowSourceContract();

    expect(report.actionEvidence.length).toBeGreaterThan(0);
    expect(report.actionEvidence.every((evidence) => evidence.runsUsing === 'node24')).toBe(true);
    expect(report.workflowPath).toBe('.github/workflows/ci-cd.yml');
    expect(report.wranglerVersion).toBe('4.100.0');
    expect(report.workflowUses).toHaveLength(46);
    const source = await readFile('.github/workflows/ci-cd.yml', 'utf8');
    expect(source.match(/^[\t ]*(?:-[\t ]+)?uses:/gmu)).toHaveLength(46);
    const reviewed = new Set(
      report.actionEvidence.map((item) => `${item.actionName}@${item.reviewedCommitSha}`),
    );
    expect(report.workflowUses.every((use) => reviewed.has(use))).toBe(true);
  });

  it('rejects Node.js 20 Action runtime snapshots', async () => {
    const fixture = await writeWorkflowContractFixture({ runsUsing: 'node20' });

    await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(/must use node24/u);
  });

  it('rejects tag coordinates in workflow uses', async () => {
    const fixture = await writeWorkflowContractFixture({ workflowUses: `${actionName}@v1.0.0` });

    await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(/full SHA pin/u);
  });

  it('rejects cloudflare wrangler action usage', async () => {
    const fixture = await writeWorkflowContractFixture({
      workflowUses: 'cloudflare/wrangler-action@0123456789abcdef0123456789abcdef01234567',
    });

    await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(
      /cloudflare\/wrangler-action/u,
    );
  });

  it('rejects non-lowercase external action SHA pins', async () => {
    const fixture = await writeWorkflowContractFixture({
      workflowUses: `${actionName}@0123456789ABCDEF0123456789ABCDEF01234567`,
    });

    await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(/full SHA pin/u);
  });

  it('rejects source binding evidence SHA drift', async () => {
    const fixture = await writeWorkflowContractFixture({
      evidenceWorkflowUsesSha: '1111111111111111111111111111111111111111',
    });

    await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(
      /workflowUsesSha must match reviewedCommitSha/u,
    );
  });

  it('rejects source binding table SHA drift', async () => {
    const fixture = await writeWorkflowContractFixture({
      readmeWorkflowUsesSha: '1111111111111111111111111111111111111111',
    });

    await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(
      /reviewed source binding row/u,
    );
  });

  it('rejects deployment URL stdout grep scraping', async () => {
    const fixture = await writeWorkflowContractFixture({
      extraRun: "wrangler pages deploy dist | grep -Eo 'https://[^ ]+'",
    });

    await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(/scraped from stdout/u);
  });

  it('rejects Wrangler stdout JSON deployment parsing in the deploy script', async () => {
    const fixture = await writeWorkflowContractFixture({
      deployScriptSource: [
        "const output = 'WRANGLER_OUTPUT_FILE_PATH';",
        "const parser = 'parseWranglerPagesDeployStructuredOutput';",
        "const commitDirty = '--commit-dirty=false';",
        "observeProductionBranchHead(authority, 'cloudflare-pages-deploy');",
        "const obsolete = '--json';",
        'const deploymentUrl = stdout;',
        'void output;',
        'void parser;',
        'void commitDirty;',
        'void obsolete;',
        'void deploymentUrl;',
        '',
      ].join('\n'),
    });

    await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(/stdout JSON output/u);
  });

  it('rejects unpinned Wrangler package versions', async () => {
    const fixture = await writeWorkflowContractFixture({ packageWranglerVersion: '^4.100.0' });

    await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(/exact devDependency/u);
  });

  it('rejects package and lockfile Wrangler drift', async () => {
    const fixture = await writeWorkflowContractFixture({ lockWranglerVersion: '4.99.0' });

    await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(/pnpm-lock|lockfile/u);
  });

  it('rejects production preflight after production side effects', async () => {
    const fixture = await writeWorkflowContractFixture({
      workflowStepOrder: 'preflight-after-upload',
    });

    await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(
      /preflight before production side effects/u,
    );
  });

  it('rejects missing current head gate before R2 upload', async () => {
    const fixture = await writeWorkflowContractFixture({ uploadR2ScriptSource: 'void 0;\n' });

    await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(/R2 upload/u);
  });

  it('rejects missing current head gate before Pages deploy', async () => {
    const fixture = await writeWorkflowContractFixture({
      deployScriptSource: [
        "const output = 'WRANGLER_OUTPUT_FILE_PATH';",
        "const parser = 'parseWranglerPagesDeployStructuredOutput';",
        "const commitDirty = '--commit-dirty=false';",
        'void output;',
        'void parser;',
        'void commitDirty;',
        '',
      ].join('\n'),
    });

    await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(/Pages deploy/u);
  });

  it('rejects missing per-media-item variant format validation source', async () => {
    const fixture = await writeWorkflowContractFixture({
      mediaObjectContractSource: 'const deploymentObjectCount = 9;\nvoid deploymentObjectCount;\n',
    });

    await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(/per media item/u);
  });

  it('rejects deployment-wide fixed 9 object count source', async () => {
    const fixture = await writeWorkflowContractFixture({
      uploadR2ScriptSource:
        "observeProductionBranchHead(authority, 'r2-media-upload');\nif (objectCount !== 9) { throw new Error('bad count'); }\nconst failed = { uploadedObjects: [] };\nvoid failed;\n",
    });

    await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(
      /deployment-wide fixed 9 object count/u,
    );
  });

  it('rejects full release state JSON in job outputs', async () => {
    const fixture = await writeWorkflowContractFixture({
      extraRun: 'echo "release-state-json=${FULL_RELEASE_STATE_JSON}" >> "$GITHUB_OUTPUT"',
    });

    await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(/full release state JSON/u);
  });

  it('rejects local absolute paths in production job logs', async () => {
    const fixture = await writeWorkflowContractFixture({
      productionPreflightScriptSource: 'console.log(`[production-authority] ${OUTPUT_PATH}`);\n',
    });

    await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(/local absolute paths/u);
  });

  it('rejects deployment docs that restore Wrangler command output as evidence', async () => {
    const fixture = await writeWorkflowContractFixture({
      deploymentDocsSource: [
        '# Deployment Operations',
        '',
        'deployment URL や deployment ID の正本は Wrangler structured output file を parser で正規化した cloudflare-pages-deploy-result.json と、そこから生成する release state artifact である。stdout や raw command output を deployment data source として扱ってはいけない。',
        '',
        '機械検証は release state artifact、release state SHA-256、R2 attempt manifest、media delivery attempt manifest、runtime verification artifact を使って行う。',
        '',
        'deploy-production job は次をログと step summary に記録する。',
        '',
        '- Cloudflare deployment URL',
        '- Wrangler command output',
        '',
      ].join('\n'),
    });

    await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(/Wrangler command output/u);
  });
});
