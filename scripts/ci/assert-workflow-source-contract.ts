/// <reference types="node" />

import { readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPOSITORY_ROOT = process.cwd();
const DEFAULT_WORKFLOW_PATH = path.join(REPOSITORY_ROOT, '.github', 'workflows', 'ci-cd.yml');
const DEFAULT_SNAPSHOT_ROOT = path.join(REPOSITORY_ROOT, 'external-action-snapshots');
const DEFAULT_README_PATH = path.join(DEFAULT_SNAPSHOT_ROOT, 'README.md');
const DEFAULT_DEPLOY_SCRIPT_PATH = path.join(
  REPOSITORY_ROOT,
  'scripts',
  'deploy',
  'deploy-cloudflare-pages.ts',
);
const DEFAULT_PACKAGE_JSON_PATH = path.join(REPOSITORY_ROOT, 'package.json');
const DEFAULT_LOCKFILE_PATH = path.join(REPOSITORY_ROOT, 'pnpm-lock.yaml');
const DEFAULT_UPLOAD_R2_SCRIPT_PATH = path.join(REPOSITORY_ROOT, 'scripts', 'upload-r2-media.ts');
const DEFAULT_VERIFY_MEDIA_DELIVERY_SCRIPT_PATH = path.join(
  REPOSITORY_ROOT,
  'scripts',
  'deploy',
  'verify-media-delivery.ts',
);
const DEFAULT_RELEASE_STATE_SCHEMA_PATH = path.join(
  REPOSITORY_ROOT,
  'scripts',
  'deploy',
  'release-state-schema.ts',
);
const DEFAULT_MEDIA_OBJECT_CONTRACT_PATH = path.join(
  REPOSITORY_ROOT,
  'shared',
  'media',
  'media-object-contract.ts',
);
const DEFAULT_PRODUCTION_PREFLIGHT_SCRIPT_PATH = path.join(
  REPOSITORY_ROOT,
  'scripts',
  'deploy',
  'production-authority-preflight.ts',
);
const DEFAULT_DEPLOYMENT_DOCS_PATH = path.join(
  REPOSITORY_ROOT,
  'docs',
  'guides',
  'operations',
  'deployment.md',
);
const DEV_DEPENDENCIES_FIELD = 'devDependencies';
const WRANGLER_FIELD = 'wrangler';
const SHA_PIN_PATTERN = /^[a-z0-9-]+\/[a-z0-9_.-]+@[0-9a-f]{40}$/u;
const ACTION_USES_PATTERN = /^[\t ]*(?:-[\t ]+)?uses:[\t ]*(.*)$/gmu;
const FIXED_PACKAGE_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;
const PLAYWRIGHT_RESOLUTE_IMAGE =
  'mcr.microsoft.com/playwright:v1.63.0-resolute@sha256:b022639ae9197f864040f92eef7b57c6d4b47db2190f77c909d8a5d902dd4b7e';

interface ActionEvidence {
  readonly actionName: string;
  readonly adoptedTag: string;
  readonly reviewedCommitSha: string;
  readonly workflowUsesSha: string;
  readonly runsUsing: 'node24';
}

interface SourceContractReport {
  readonly schemaVersion: 1;
  readonly workflowPath: string;
  readonly workflowUses: readonly string[];
  readonly actionEvidence: readonly ActionEvidence[];
  readonly wranglerVersion: string;
}

interface WorkflowSourceContractOptions {
  readonly workflowPath?: string;
  readonly snapshotRoot?: string;
  readonly readmePath?: string;
  readonly deployScriptPath?: string;
  readonly packageJsonPath?: string;
  readonly lockfilePath?: string;
  readonly uploadR2ScriptPath?: string;
  readonly verifyMediaDeliveryScriptPath?: string;
  readonly releaseStateSchemaPath?: string;
  readonly mediaObjectContractPath?: string;
  readonly productionPreflightScriptPath?: string;
  readonly deploymentDocsPath?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readJson = async (filePath: string): Promise<unknown> =>
  JSON.parse(await readFile(filePath, 'utf8')) as unknown;

const toRepositoryRelativePath = (filePath: string): string =>
  path.relative(REPOSITORY_ROOT, filePath).split(path.sep).join('/');

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');

const assertCondition = (condition: boolean, message: string): void => {
  if (!condition) {
    throw new Error(`[workflow-source-contract] ${message}`);
  }
};

export const collectWorkflowUses = (workflowSource: string): readonly string[] => {
  const uses: string[] = [];
  // runのblock scalar内にある文字列をAction参照として誤認しない。
  let blockIndent: number | undefined;
  for (const line of workflowSource.split(/\r?\n/u)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const indent = /^[\t ]*/u.exec(line)?.[0].length ?? 0;
    if (blockIndent !== undefined) {
      if (indent > blockIndent) continue;
      blockIndent = undefined;
    }
    if (/^[\t ]*(?:-[\t ]+)?[^:]+:[\t ]*[|>][+-]?[1-9]?[\t ]*(?:#.*)?$/u.test(line)) {
      blockIndent = indent + (line.trimStart().startsWith('- ') ? 2 : 0);
      continue;
    }
    const match = [...line.matchAll(ACTION_USES_PATTERN)][0];
    if (match === undefined) continue;
    const scalar = match[1]?.trim() ?? '';
    const coordinate = /^(?:'([^']*)'|"([^"\\]*)"|([^\s'"#]+))(?:\s+#.*)?\s*$/u.exec(scalar);
    assertCondition(coordinate !== null, `unsupported uses scalar: ${scalar}`);
    uses.push(coordinate?.[1] ?? coordinate?.[2] ?? coordinate?.[3] ?? '');
  }
  return uses;
};

const workflowJobSteps = (source: string, job: string): readonly string[] => {
  const jobSource = new RegExp(
    `^  ${escapeRegExp(job)}:[\\s\\S]*?(?=^  [\\w-]+:|(?![\\s\\S]))`,
    'mu',
  ).exec(source)?.[0];
  assertCondition(jobSource !== undefined, `workflow must contain ${job}`);
  return (
    (jobSource ?? '')
      .split(/^ {4}steps:\r?\n/mu)[1]
      ?.split(/^ {6}- /mu)
      .slice(1) ?? []
  );
};

const stepField = (step: string, field: string): string =>
  new RegExp(`^(?:        )?${escapeRegExp(field)}: (.*)$`, 'mu').exec(step)?.[1]?.trim() ?? '';

const stepCondition = (step: string): string =>
  stepField(step, 'if')
    .replace(/^\$\{\{\s*|\s*\}\}$/gu, '')
    .replace(/\s+/gu, ' ')
    .trim();

const requiredStep = (steps: readonly string[], field: string, value: string): string => {
  const matches = steps.filter((step) => stepField(step, field) === value);
  assertCondition(matches.length === 1, `workflow must contain one ${field}: ${value}`);
  return matches[0] ?? '';
};

const assertDeploymentVerificationContract = (source: string): void => {
  const steps = workflowJobSteps(source, 'verify-production-deployment');
  const validation = requiredStep(steps, 'id', 'validate-deployment-result');
  const enforcement = requiredStep(steps, 'name', 'enforce production deployment verification');
  const buildGuard = "always() && needs.detect-changes.outputs.build == 'true'";
  const downloaded = "steps.download-release-state.outcome == 'success'";
  const resolved = `${downloaded} && steps.verify-release-state-digest.outcome == 'success'`;
  const deployed = "needs.deploy-production.result == 'success'";
  const runtimeSuccess = "steps.verify-runtime-artifacts.outcome == 'success'";
  assertCondition(
    stepField(validation, 'continue-on-error') === 'true' &&
      stepField(validation, 'run') === 'python3 scripts/ci/validate_deployment_needs.py',
    'deployment validator must preserve its outcome for final enforcement',
  );
  assertCondition(
    steps.indexOf(validation) === 1,
    'deployment validator must precede evidence collection',
  );
  for (const step of steps.slice(2, -1)) {
    assertCondition(
      stepCondition(step) === buildGuard || stepCondition(step).startsWith(`${buildGuard} && `),
      'deployment evidence steps must be reachable after failure and skipped for build=false',
    );
  }
  const download = requiredStep(steps, 'id', 'download-release-state');
  assertCondition(
    stepCondition(download) ===
      `${buildGuard} && needs.deploy-production.outputs.release-state-artifact-id != ''` &&
      stepField(download, 'continue-on-error') === 'true' &&
      download.includes('digest-mismatch: error') &&
      download.includes(
        'artifact-ids: ${{ needs.deploy-production.outputs.release-state-artifact-id }}',
      ),
    'release state download must require an artifact ID and fail closed on digest mismatch',
  );
  const digest = requiredStep(steps, 'id', 'verify-release-state-digest');
  assertCondition(
    stepCondition(digest) === `${buildGuard} && ${downloaded}` &&
      stepField(digest, 'continue-on-error') === 'true' &&
      digest.includes("Path('.generated/deployment/release-attempt-final.json').read_bytes()") &&
      digest.includes('hashlib.sha256(raw).hexdigest() != expected') &&
      digest.includes("raise SystemExit('release state SHA-256 mismatch')") &&
      digest.includes(
        'EXPECTED_RELEASE_STATE_SHA256: ${{ needs.deploy-production.outputs.release-state-sha256 }}',
      ),
    'release state SHA-256 must be checked before runtime verification and recording',
  );
  const runtime = requiredStep(steps, 'id', 'verify-runtime-artifacts');
  assertCondition(
    stepCondition(runtime) === `${buildGuard} && ${deployed} && ${resolved}` &&
      stepField(runtime, 'continue-on-error') === 'true' &&
      stepField(runtime, 'run') === 'python3 scripts/ci/verify_production_artifacts_http.py' &&
      steps.indexOf(download) < steps.indexOf(digest) &&
      steps.indexOf(digest) < steps.indexOf(runtime),
    'HTTP verification must observe failures and run only after deployment and release state resolution succeed',
  );
  const records = [
    [
      'record-runtime-verification-success',
      `${buildGuard} && ${deployed} && ${resolved} && ${runtimeSuccess}`,
      'verified-by-production-runtime-artifacts',
    ],
    [
      'record-runtime-verification-failure',
      `${buildGuard} && ${deployed} && ${resolved} && steps.verify-runtime-artifacts.outcome != 'success'`,
      'verification-failed',
    ],
    [
      'record-deploy-failure-state',
      `${buildGuard} && needs.deploy-production.result != 'success' && ${resolved}`,
      'verification-failed',
    ],
    [
      'record-release-state-resolution-failed',
      `${buildGuard} && (steps.download-release-state.outcome != 'success' || steps.verify-release-state-digest.outcome != 'success')`,
      'release-state-resolution-failed',
    ],
  ] as const;
  for (const [id, condition, status] of records) {
    const step = requiredStep(steps, 'id', id);
    assertCondition(
      stepCondition(step) === condition &&
        stepField(step, 'run') === 'pnpm exec tsx scripts/deploy/record-runtime-verification.ts' &&
        step.includes(`RUNTIME_VERIFICATION_STATUS: ${status}`) &&
        step.includes(
          'EXPECTED_RELEASE_STATE_SHA256: ${{ needs.deploy-production.outputs.release-state-sha256 }}',
        ) &&
        stepField(step, 'continue-on-error') !== 'true' &&
        steps.indexOf(runtime) < steps.indexOf(step),
      `deployment record branch ${id} must be mutually exclusive and preserve SHA validation`,
    );
  }
  const upload =
    steps.find((step) => step.includes('name: rouault-release-verification-state')) ?? '';
  assertCondition(
    stepCondition(upload) ===
      `${buildGuard} && (${records.map(([id]) => `steps.${id}.outcome == 'success'`).join(' || ')})` &&
      upload.includes('path: .generated/deployment/release-verification-final.json') &&
      records.every(([id]) => steps.indexOf(requiredStep(steps, 'id', id)) < steps.indexOf(upload)),
    'verification state upload must require a successful record branch',
  );
  assertCondition(
    steps.at(-1) === enforcement &&
      stepCondition(enforcement) === 'always()' &&
      stepField(enforcement, 'continue-on-error') !== 'true' &&
      enforcement.includes(
        'DEPLOYMENT_VALIDATION_OUTCOME: ${{ steps.validate-deployment-result.outcome }}',
      ) &&
      enforcement.includes('DEPLOYMENT_RESULT: ${{ needs.deploy-production.result }}') &&
      enforcement.includes(
        'RUNTIME_VERIFICATION_OUTCOME: ${{ steps.verify-runtime-artifacts.outcome }}',
      ) &&
      enforcement.includes('test "$DEPLOYMENT_VALIDATION_OUTCOME" = "success"') &&
      enforcement.includes('if [ "$DEPLOYMENT_RESULT" = "success" ]; then') &&
      enforcement.includes('test "$RUNTIME_VERIFICATION_OUTCOME" = "success"'),
    'final deployment enforcement must always require validator success and deployed runtime success',
  );
};

const assertE2EDiagnosticsContract = (source: string): void => {
  assertProductionE2EMatrixContract(source);
  for (const target of ['dev']) {
    const steps = workflowJobSteps(source, `test-e2e-${target}`);
    const test = requiredStep(steps, 'id', `playwright-${target}`);
    const upload = requiredStep(steps, 'name', `preserve ${target} E2E diagnostics`);
    assertCondition(
      stepField(test, 'run') === `pnpm run test:e2e:${target}` &&
        stepField(test, 'continue-on-error') !== 'true' &&
        stepCondition(upload) === `always() && steps.playwright-${target}.outcome == 'failure'` &&
        steps.indexOf(test) < steps.indexOf(upload) &&
        stepField(upload, 'continue-on-error') === 'true' &&
        /^(?:\.\/)?actions\/upload-artifact@/u.test(collectWorkflowUses(upload)[0] ?? '') &&
        upload.includes(`          name: rouault-e2e-${target}-diagnostics`) &&
        /^ {10}path: \|\r?\n {12}playwright-report\/\r?\n {12}test-results\/\r?\n {10}retention-days: 7\r?\n {10}if-no-files-found: warn\s*$/u.test(
          upload.slice(upload.indexOf('          path: |')),
        ),
      `${target} E2E diagnostics must preserve test failure and upload only the two diagnostic directories for seven days`,
    );
  }
};

const requireWorkflowRecord = (value: unknown, location: string): Record<string, unknown> => {
  if (!isRecord(value) || Array.isArray(value)) {
    throw new Error(`[workflow-source-contract] ${location} must be a mapping`);
  }
  return value;
};

const yamlModule: unknown = createRequire(import.meta.url)('js-yaml');
if (!isRecord(yamlModule) || typeof yamlModule['load'] !== 'function') {
  throw new Error('[workflow-source-contract] js-yaml.load is required');
}
const loadWorkflowYaml = yamlModule['load'] as (source: string) => unknown;

const workflowRecords = (value: unknown, location: string): readonly Record<string, unknown>[] => {
  if (!Array.isArray(value)) {
    throw new Error(`[workflow-source-contract] ${location} must be a sequence`);
  }
  return value.map((item: unknown) => requireWorkflowRecord(item, `${location}[]`));
};

const assertWorkflowNeeds = (value: unknown, expected: readonly string[]): void => {
  assertCondition(
    Array.isArray(value) &&
      value.length === expected.length &&
      expected.every((job) => value.filter((item: unknown) => item === job).length === 1),
    'Production E2E matrix and required gate must retain their needs',
  );
};

const normalizeWorkflowExpression = (value: unknown): string =>
  typeof value === 'string' ? value.replace(/\s+/gu, ' ').trim() : '';

// 承認された単純な引数列だけを認め、quote・shell制御・追加filterによるcoverage変化を拒否する。
const matrixCommandArguments = (
  value: unknown,
  entry: Record<string, unknown>,
): readonly string[] => {
  assertCondition(typeof value === 'string', 'Production E2E matrix command must be a string');
  const expanded = (typeof value === 'string' ? value : '').replace(
    /\$\{\{\s*matrix\.(\w+)\s*\}\}/gu,
    (_expression: string, field: string) => {
      const replacement = entry[field];
      assertCondition(typeof replacement === 'string', `unknown matrix command field: ${field}`);
      return typeof replacement === 'string' ? replacement : '';
    },
  );
  const command = expanded.trim();
  assertCondition(
    !/[\r\n]/u.test(command),
    'Production E2E matrix exact project arguments must belong to one shell command',
  );
  return command.split(/\s+/u);
};

export const assertProductionE2EMatrixContract = (source: string): void => {
  const workflow = requireWorkflowRecord(loadWorkflowYaml(source), 'workflow');
  const jobs = requireWorkflowRecord(workflow['jobs'], 'jobs');
  const job = requireWorkflowRecord(jobs['test-e2e-production'], 'test-e2e-production');
  const strategy = requireWorkflowRecord(job['strategy'], 'Production E2E matrix strategy');
  const matrix = requireWorkflowRecord(strategy['matrix'], 'Production E2E matrix');
  assertCondition(
    Object.keys(matrix).length === 1 && Object.hasOwn(matrix, 'include'),
    'Production E2E matrix must use include only, without extra axes or exclude',
  );
  const entries = workflowRecords(matrix['include'], 'Production E2E matrix include');
  const expectedProjects: Readonly<Record<string, readonly string[]>> = {
    chromium: ['chromium-integration'],
    firefox: ['firefox-final-check'],
    webkit: ['webkit-final-check', 'webkit-mobile-final-check'],
  };
  assertCondition(
    entries.length === 3 &&
      Object.keys(expectedProjects).every(
        (target) => entries.filter((entry) => entry['target'] === target).length === 1,
      ),
    'Production E2E matrix must contain exactly three unique browser targets',
  );
  assertCondition(
    strategy['fail-fast'] === false &&
      !Object.hasOwn(strategy, 'max-parallel') &&
      !Object.hasOwn(job, 'concurrency') &&
      !Object.hasOwn(job, 'continue-on-error') &&
      job['runs-on'] === 'ubuntu-26.04' &&
      typeof job['name'] === 'string' &&
      job['name'].includes('${{ matrix.target }}'),
    'Production E2E matrix must allow independent standard runners without failure suppression',
  );
  const container = requireWorkflowRecord(job['container'], 'Production E2E container');
  assertCondition(
    Object.keys(container).length === 2 &&
      container['image'] === PLAYWRIGHT_RESOLUTE_IMAGE &&
      container['options'] === '--ipc=host',
    'Production E2E matrix must use only the approved digest-pinned Playwright resolute container',
  );
  assertWorkflowNeeds(job['needs'], ['detect-changes', 'prebuild-gate']);
  assertCondition(
    normalizeWorkflowExpression(job['if']) ===
      "${{ !cancelled() && needs.detect-changes.result == 'success' && needs.prebuild-gate.result == 'success' && needs.detect-changes.outputs.app == 'true' && ((github.event_name == 'push' && github.ref == 'refs/heads/main') || github.event_name == 'workflow_dispatch' || (github.event_name == 'pull_request' && github.base_ref == 'main')) }}",
    'Production E2E matrix must preserve app, prerequisite, cancellation and event gates',
  );
  const env = requireWorkflowRecord(job['env'], 'Production E2E matrix env');
  assertCondition(
    env['ROUAULT_MEDIA_BASE_URL'] === '${{ vars.ROUAULT_MEDIA_BASE_URL }}',
    'Production E2E matrix must preserve the media URL',
  );
  const steps = workflowRecords(job['steps'], 'Production E2E matrix steps');
  const tests = steps.filter((step) => step['id'] === 'playwright-production');
  const verifications = steps.filter((step) => step['id'] === 'verify-e2e-container');
  assertCondition(
    tests.length === 1 && verifications.length === 1,
    'Production E2E matrix needs one test and one pinned-container verification step',
  );
  const test = requireWorkflowRecord(tests[0], 'Production E2E matrix test');
  const verification = requireWorkflowRecord(
    verifications[0],
    'Production E2E matrix container verification',
  );
  assertCondition(
    !Object.hasOwn(test, 'if') && !Object.hasOwn(verification, 'if'),
    'Production E2E matrix must not skip its container verification or selected tests',
  );
  const labels = steps.filter(
    (step) =>
      normalizeWorkflowExpression(step['run']) ===
      'echo "ROUAULT_BUILD_LABEL=${GITHUB_SHA::7}" >> "$GITHUB_ENV"',
  );
  assertCondition(
    labels.length === 1 &&
      steps.indexOf(labels[0] ?? {}) < steps.indexOf(test) &&
      steps.indexOf(verification) < steps.indexOf(test),
    'Production E2E matrix build label and container verification must precede tests',
  );
  assertCondition(
    steps.every(
      (step) =>
        typeof step['run'] !== 'string' || !step['run'].includes('playwright install --with-deps'),
    ),
    'Production E2E container jobs must not reinstall browsers or OS dependencies',
  );
  for (const entry of entries) {
    const target = String(entry['target']);
    const projects = expectedProjects[target] ?? [];
    const verificationLines = String(verification['run'])
      .replace(/\$\{\{\s*matrix\.browser\s*\}\}/gu, String(entry['browser']))
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter(Boolean);
    assertCondition(
      entry['browser'] === target &&
        JSON.stringify(verificationLines) ===
          JSON.stringify([
            'set -euo pipefail',
            'test "$PLAYWRIGHT_BROWSERS_PATH" = "/ms-playwright"',
            'command -v bash',
            'test "$(node --version)" = "v${NODE_VERSION}"',
            'test "$(pnpm --version)" = "11.7.0"',
            `pnpm exec playwright install --dry-run ${target}`,
          ]) &&
        JSON.stringify(matrixCommandArguments(test['run'], entry)) ===
          JSON.stringify([
            'pnpm',
            'run',
            'test:e2e:production',
            ...projects.map((project) => `--project=${project}`),
          ]),
      'Production E2E matrix must verify the pinned environment and pass exact project arguments directly to pnpm run',
    );
  }
  const uploads = steps.filter(
    (step) =>
      typeof step['uses'] === 'string' && /^(?:\.\/)?actions\/upload-artifact@/u.test(step['uses']),
  );
  assertCondition(
    uploads.length === 1,
    'production E2E diagnostics must have one failure-only upload',
  );
  const upload = requireWorkflowRecord(uploads[0], 'production E2E diagnostics upload');
  const options = requireWorkflowRecord(upload['with'], 'production E2E diagnostics options');
  assertCondition(
    upload['name'] === 'preserve production E2E diagnostics' &&
      normalizeWorkflowExpression(upload['if']) ===
        "${{ always() && steps.playwright-production.outcome == 'failure' }}" &&
      steps.indexOf(test) < steps.indexOf(upload) &&
      upload['continue-on-error'] === true &&
      steps.every((step) => step === upload || !Object.hasOwn(step, 'continue-on-error')) &&
      options['name'] === 'rouault-e2e-production-${{ matrix.target }}-diagnostics' &&
      typeof options['path'] === 'string' &&
      options['path'].trim() === 'playwright-report/\ntest-results/' &&
      options['retention-days'] === 7 &&
      options['if-no-files-found'] === 'warn',
    'production E2E diagnostics must preserve test failure and upload only the two diagnostic directories for seven days with unique target names',
  );
  const gate = requireWorkflowRecord(jobs['ci-required'], 'ci-required');
  assertWorkflowNeeds(gate['needs'], [
    'detect-changes',
    'prebuild-gate',
    'test-e2e-production',
    'test-e2e-dev',
    'build-production',
  ]);
  const validators = workflowRecords(gate['steps'], 'ci-required.steps').filter(
    (step) => step['run'] === 'python3 scripts/ci/validate_required_needs.py',
  );
  const validator = requireWorkflowRecord(validators[0], 'ci-required validator');
  const validatorEnv = requireWorkflowRecord(validator['env'], 'ci-required validator env');
  assertCondition(
    normalizeWorkflowExpression(gate['if']) === '${{ always() }}' &&
      !Object.hasOwn(gate, 'continue-on-error') &&
      !Object.hasOwn(validator, 'continue-on-error') &&
      !Object.hasOwn(validator, 'if') &&
      validators.length === 1 &&
      validatorEnv['NEEDS_JSON'] === '${{ toJson(needs) }}' &&
      validatorEnv['GITHUB_EVENT_NAME'] === '${{ github.event_name }}' &&
      validatorEnv['GITHUB_REF'] === '${{ github.ref }}' &&
      validatorEnv['GITHUB_BASE_REF'] === '${{ github.base_ref }}',
    'Production E2E matrix must preserve always-on required-result validation and skip semantics',
  );
};

const readStringField = (
  evidence: Record<string, unknown>,
  evidencePath: string,
  fieldNames: readonly string[],
): string => {
  for (const fieldName of fieldNames) {
    const value = evidence[fieldName];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  throw new Error(
    `[workflow-source-contract] ${evidencePath} is missing string field ${fieldNames.join('/')}`,
  );
};

const extractRunsUsing = (source: string, filePath: string): string => {
  const match = /^\s*using:\s*['"]?(node[0-9]+)['"]?\s*$/mu.exec(source);
  assertCondition(match !== null, `${filePath} must declare runs.using`);
  return match?.[1] ?? '';
};

const loadEvidence = async (
  snapshotRoot: string,
  snapshotDirectory: string,
): Promise<ActionEvidence> => {
  const evidencePath = path.join(snapshotRoot, snapshotDirectory, 'tag-evidence.json');
  const evidence = await readJson(evidencePath);
  if (!isRecord(evidence)) {
    throw new Error(`[workflow-source-contract] ${evidencePath} must contain an object`);
  }

  const actionName = readStringField(evidence, evidencePath, ['actionName', 'action']);
  const adoptedTag = readStringField(evidence, evidencePath, ['adoptedTag', 'adopted_tag']);
  const reviewedCommitSha = readStringField(evidence, evidencePath, [
    'reviewedCommitSha',
    'reviewed_commit_sha',
  ]);
  const workflowUsesSha = readStringField(evidence, evidencePath, [
    'workflowUsesSha',
    'reviewed_commit_sha',
  ]);
  const runsUsing = readStringField(evidence, evidencePath, [
    'runsUsing',
    'runtimeReadiness',
    'action_yml_runs_using',
  ]);

  if (typeof reviewedCommitSha !== 'string' || !/^[0-9a-f]{40}$/u.test(reviewedCommitSha)) {
    throw new Error(
      `[workflow-source-contract] ${evidencePath} reviewedCommitSha must be a 40 character SHA`,
    );
  }
  if (workflowUsesSha !== reviewedCommitSha) {
    throw new Error(
      `[workflow-source-contract] ${evidencePath} workflowUsesSha must match reviewedCommitSha`,
    );
  }
  if (runsUsing !== 'node24') {
    throw new Error(`[workflow-source-contract] ${evidencePath} runsUsing must be node24`);
  }

  const commitSnapshotPath = path.join(snapshotRoot, snapshotDirectory, 'action.commit.yml');
  const tagSnapshotPath = path.join(snapshotRoot, snapshotDirectory, 'action.tag.yml');
  const commitSnapshot = await readFile(commitSnapshotPath, 'utf8');
  const tagSnapshot = await readFile(tagSnapshotPath, 'utf8');
  const commitRunsUsing = extractRunsUsing(commitSnapshot, commitSnapshotPath);
  const tagRunsUsing = extractRunsUsing(tagSnapshot, tagSnapshotPath);

  assertCondition(commitRunsUsing === 'node24', `${commitSnapshotPath} must use node24`);
  assertCondition(tagRunsUsing === 'node24', `${tagSnapshotPath} must use node24`);
  assertCondition(
    !commitSnapshot.includes('node20'),
    `${commitSnapshotPath} must not mention node20`,
  );
  assertCondition(!tagSnapshot.includes('node20'), `${tagSnapshotPath} must not mention node20`);
  assertCondition(
    commitSnapshot === tagSnapshot,
    `${snapshotDirectory} commit and tag action metadata snapshots must match`,
  );

  return {
    actionName,
    adoptedTag,
    reviewedCommitSha,
    workflowUsesSha: reviewedCommitSha,
    runsUsing: 'node24',
  };
};

const assertReadmeMatchesEvidence = async (
  readmePath: string,
  evidence: readonly ActionEvidence[],
): Promise<void> => {
  const readme = await readFile(readmePath, 'utf8');
  const rows = new Set(
    readme
      .split(/\r?\n/u)
      .filter((line) => line.trim().startsWith('|'))
      .map((line) =>
        line
          .split('|')
          .slice(1, -1)
          .map((cell) => cell.trim())
          .join('|'),
      ),
  );

  for (const item of evidence) {
    const expectedRow = [
      `\`${item.actionName}\``,
      `\`${item.adoptedTag}\``,
      `\`${item.reviewedCommitSha}\``,
      '`node24`',
      `\`${item.workflowUsesSha}\``,
    ].join('|');
    assertCondition(
      rows.has(expectedRow),
      `${readmePath} must include reviewed source binding row for ${item.actionName}`,
    );
  }
};

const assertDeployScriptContract = async (deployScriptPath: string): Promise<void> => {
  const source = await readFile(deployScriptPath, 'utf8');
  assertCondition(
    source.includes('WRANGLER_OUTPUT_FILE_PATH'),
    `${deployScriptPath} must enable Wrangler structured output`,
  );
  assertCondition(
    source.includes('parseWranglerPagesDeployStructuredOutput'),
    `${deployScriptPath} must parse Wrangler structured output through the checked parser`,
  );
  assertCondition(
    source.includes("'--commit-dirty=false'"),
    `${deployScriptPath} must use canonical Pages deploy commit dirty argument`,
  );
  assertCondition(
    !/['"]--json['"]/u.test(source),
    `${deployScriptPath} must not request Wrangler stdout JSON output`,
  );
  assertCondition(
    !/deploymentUrl[\s\S]{0,120}stdout|stdout[\s\S]{0,120}deploymentUrl/u.test(source),
    `${deployScriptPath} must not derive deployment URL from stdout`,
  );
  assertCondition(
    source.includes("observeProductionBranchHead(authority, 'cloudflare-pages-deploy')"),
    `${deployScriptPath} must gate the current production head immediately before Pages deploy`,
  );
};

const assertWranglerPackageContract = async (
  packageJsonPath: string,
  lockfilePath: string,
): Promise<string> => {
  const packageJson = await readJson(packageJsonPath);
  if (!isRecord(packageJson)) {
    throw new Error(`[workflow-source-contract] ${packageJsonPath} must contain a JSON object`);
  }
  const devDependencies = packageJson[DEV_DEPENDENCIES_FIELD];
  if (!isRecord(devDependencies)) {
    throw new Error(`[workflow-source-contract] ${packageJsonPath} must contain devDependencies`);
  }

  const wranglerVersion = devDependencies[WRANGLER_FIELD];
  assertCondition(
    typeof wranglerVersion === 'string' && FIXED_PACKAGE_VERSION_PATTERN.test(wranglerVersion),
    `${packageJsonPath} must pin wrangler as an exact devDependency version`,
  );

  const lockfile = await readFile(lockfilePath, 'utf8');
  const escapedVersion = escapeRegExp(wranglerVersion as string);
  assertCondition(
    new RegExp(
      `wrangler:\\r?\\n\\s+specifier: ${escapedVersion}\\r?\\n\\s+version: ${escapedVersion}`,
      'u',
    ).test(lockfile),
    `${lockfilePath} must keep the importer wrangler specifier and version aligned with package.json`,
  );
  assertCondition(
    new RegExp(`^\\s{2}wrangler@${escapedVersion}:`, 'mu').test(lockfile),
    `${lockfilePath} must contain the pinned wrangler package snapshot`,
  );

  return wranglerVersion as string;
};

const assertWorkflowDeploymentOrder = (workflowSource: string, workflowPath: string): void => {
  const preflightIndex = workflowSource.indexOf(
    'pnpm exec tsx scripts/deploy/production-authority-preflight.ts',
  );
  const downloadIndex = workflowSource.indexOf('actions/download-artifact@');
  const r2UploadIndex = workflowSource.indexOf('pnpm exec tsx scripts/upload-r2-media.ts');
  const mediaDeliveryIndex = workflowSource.indexOf(
    'pnpm exec tsx scripts/deploy/verify-media-delivery.ts',
  );
  const pagesDeployIndex = workflowSource.indexOf(
    'pnpm exec tsx scripts/deploy/deploy-cloudflare-pages.ts',
  );

  assertCondition(preflightIndex >= 0, `${workflowPath} must run production authority preflight`);
  assertCondition(downloadIndex >= 0, `${workflowPath} must download the production artifact`);
  assertCondition(r2UploadIndex >= 0, `${workflowPath} must run the R2 upload script`);
  assertCondition(
    mediaDeliveryIndex >= 0,
    `${workflowPath} must run media delivery verification after R2 upload`,
  );
  assertCondition(pagesDeployIndex >= 0, `${workflowPath} must run the Pages deploy script`);
  assertCondition(
    preflightIndex < downloadIndex &&
      preflightIndex < r2UploadIndex &&
      preflightIndex < pagesDeployIndex,
    `${workflowPath} must run production authority preflight before production side effects`,
  );
  assertCondition(
    r2UploadIndex < mediaDeliveryIndex && mediaDeliveryIndex < pagesDeployIndex,
    `${workflowPath} must verify R2 media delivery before Pages deploy`,
  );
};

const assertUploadR2ScriptContract = async (uploadR2ScriptPath: string): Promise<void> => {
  const source = await readFile(uploadR2ScriptPath, 'utf8');
  assertCondition(
    source.includes("observeProductionBranchHead(authority, 'r2-media-upload')"),
    `${uploadR2ScriptPath} must gate the current production head immediately before R2 upload`,
  );
  assertCondition(
    source.includes('uploadedObjects: []'),
    `${uploadR2ScriptPath} must normalize failed R2 attempts to uploadedObjects: []`,
  );
};

const assertMediaEvidenceSourceContract = async (
  uploadR2ScriptPath: string,
  verifyMediaDeliveryScriptPath: string,
  releaseStateSchemaPath: string,
  mediaObjectContractPath: string,
): Promise<void> => {
  const uploadR2Source = await readFile(uploadR2ScriptPath, 'utf8');
  const verifyMediaDeliverySource = await readFile(verifyMediaDeliveryScriptPath, 'utf8');
  const releaseStateSchemaSource = await readFile(releaseStateSchemaPath, 'utf8');
  const mediaObjectContractSource = await readFile(mediaObjectContractPath, 'utf8');

  assertCondition(
    mediaObjectContractSource.includes(
      'objectIdentities.size !== MEDIA_VARIANTS.length * MEDIA_FORMATS.length',
    ) && mediaObjectContractSource.includes('media item は variant × format の9件'),
    `${mediaObjectContractPath} must validate variant × format count per media item`,
  );
  for (const [filePath, source] of [
    [uploadR2ScriptPath, uploadR2Source],
    [verifyMediaDeliveryScriptPath, verifyMediaDeliverySource],
    [releaseStateSchemaPath, releaseStateSchemaSource],
  ] as const) {
    assertCondition(
      !/(?:objectCount|uploadedObjects\.length|verifiedObjects\.length|uploadPlan\.length)\s*[!=]==?\s*9/u.test(
        source,
      ),
      `${filePath} must not enforce a deployment-wide fixed 9 object count`,
    );
  }
  assertCondition(
    releaseStateSchemaSource.includes('assertUploadedVerifiedObjectSetConsistency') &&
      releaseStateSchemaSource.includes('uploadedObjects and verifiedObjects object sets differ'),
    `${releaseStateSchemaPath} must enforce uploadedObjects and verifiedObjects set consistency`,
  );
};

const assertReleaseStateWorkflowContract = (workflowSource: string, workflowPath: string): void => {
  assertCondition(
    /release-state-artifact-name:\s*\$\{\{[\s\S]*steps\.deploy-cloudflare-pages\.outputs\.release-state-artifact-name[\s\S]*steps\.finalize-r2-upload-failure\.outputs\.release-state-artifact-name[\s\S]*steps\.finalize-media-delivery-failure\.outputs\.release-state-artifact-name[\s\S]*steps\.finalize-pages-deploy-failure\.outputs\.release-state-artifact-name[\s\S]*\}\}/u.test(
      workflowSource,
    ),
    `${workflowPath} must expose the release state artifact name as a deploy job output on success and failed attempts`,
  );
  assertCondition(
    /release-state-artifact-id:\s*\$\{\{\s*steps\.upload-release-state-artifact\.outputs\.artifact-id\s*\}\}/u.test(
      workflowSource,
    ),
    `${workflowPath} must expose the release state artifact ID as a deploy job output`,
  );
  assertCondition(
    /release-state-sha256:\s*\$\{\{[\s\S]*steps\.deploy-cloudflare-pages\.outputs\.release-state-sha256[\s\S]*steps\.finalize-r2-upload-failure\.outputs\.release-state-sha256[\s\S]*steps\.finalize-media-delivery-failure\.outputs\.release-state-sha256[\s\S]*steps\.finalize-pages-deploy-failure\.outputs\.release-state-sha256[\s\S]*\}\}/u.test(
      workflowSource,
    ),
    `${workflowPath} must expose release state SHA-256 as a deploy job output on success and failed attempts`,
  );
  assertCondition(
    workflowSource.includes('path: .generated/deployment/r2-attempt.json') &&
      workflowSource.includes('if-no-files-found: error') &&
      workflowSource.includes('path: .generated/deployment/media-delivery-attempt.json'),
    `${workflowPath} must upload deterministic R2 and media delivery attempt artifacts`,
  );
  assertCondition(
    workflowSource.includes('pnpm exec tsx scripts/deploy/finalize-release-failure.ts') &&
      workflowSource.includes('RELEASE_FAILURE_PHASE: r2-upload') &&
      workflowSource.includes('RELEASE_FAILURE_PHASE: media-delivery') &&
      workflowSource.includes('RELEASE_FAILURE_PHASE: pages-deploy'),
    `${workflowPath} must normalize R2, media delivery, and Pages failures into release state artifacts`,
  );
  assertCondition(
    workflowSource.includes('path: .generated/deployment/release-attempt-final.json'),
    `${workflowPath} must upload release state JSON as an artifact`,
  );
  assertCondition(
    /id:\s*upload-pages-deploy-diagnostic-artifact[\s\S]{0,180}continue-on-error:\s*true/u.test(
      workflowSource,
    ) &&
      workflowSource.includes('name: rouault-wrangler-pages-deploy-diagnostic') &&
      workflowSource.includes('path: |') &&
      workflowSource.includes('.generated/deployment/wrangler-pages-deploy.jsonl') &&
      workflowSource.includes('.generated/deployment/wrangler-pages-deploy-diagnostic.json') &&
      workflowSource.includes('if-no-files-found: warn'),
    `${workflowPath} must upload Wrangler Pages deploy diagnostics as a non-blocking artifact`,
  );
  assertCondition(
    workflowSource.includes(
      'artifact-ids: ${{ needs.deploy-production.outputs.release-state-artifact-id }}',
    ),
    `${workflowPath} verify job must download release state by deploy job artifact-id output`,
  );
  assertCondition(
    workflowSource.includes(
      'EXPECTED_RELEASE_STATE_SHA256: ${{ needs.deploy-production.outputs.release-state-sha256 }}',
    ),
    `${workflowPath} verify job must re-check release state SHA-256`,
  );
  assertCondition(
    workflowSource.includes('pnpm exec tsx scripts/deploy/record-runtime-verification.ts'),
    `${workflowPath} must reflect runtime verification state into a release state artifact`,
  );
  assertCondition(
    workflowSource.includes('RUNTIME_VERIFICATION_STATUS: release-state-resolution-failed'),
    `${workflowPath} must normalize release state resolution failures`,
  );
  assertCondition(
    /steps\.record-release-state-resolution-failed\.outcome\s*==\s*'success'/u.test(workflowSource),
    `${workflowPath} must upload release state resolution failure artifacts`,
  );
  assertCondition(
    !/release-state-json|release_state_json|toJson\(\s*steps\.deploy-cloudflare-pages\.outputs\s*\)/iu.test(
      workflowSource,
    ),
    `${workflowPath} must not expose full release state JSON through job outputs`,
  );
};

const assertProductionOutputSafety = async (
  productionPreflightScriptPath: string,
  deployScriptPath: string,
): Promise<void> => {
  const preflightSource = await readFile(productionPreflightScriptPath, 'utf8');
  const deploySource = await readFile(deployScriptPath, 'utf8');
  const outputSensitiveSources = [
    [productionPreflightScriptPath, preflightSource],
    [deployScriptPath, deploySource],
  ] as const;

  for (const [filePath, source] of outputSensitiveSources) {
    assertCondition(
      !/console\.log\([^)]*(?:OUTPUT_PATH|WRANGLER_OUTPUT_PATH|process\.env)/su.test(source),
      `${filePath} must not write raw environment values or local absolute paths to job logs`,
    );
    assertCondition(
      !/appendFile\(\s*githubOutput\s*,\s*(?:`[^`]*(?:process\.env|OUTPUT_PATH|WRANGLER_OUTPUT_PATH)[^`]*`|"[^"]*(?:process\.env|OUTPUT_PATH|WRANGLER_OUTPUT_PATH)[^"]*"|'[^']*(?:process\.env|OUTPUT_PATH|WRANGLER_OUTPUT_PATH)[^']*')/u.test(
        source,
      ),
      `${filePath} must not write raw environment values or local absolute paths to job outputs`,
    );
    assertCondition(
      !/appendFile\(\s*githubOutput[\s\S]{0,400}JSON\.stringify/u.test(source),
      `${filePath} must not write full JSON artifacts to job outputs`,
    );
  }
};

const assertDeploymentDocsContract = async (deploymentDocsPath: string): Promise<void> => {
  const docs = await readFile(deploymentDocsPath, 'utf8');
  assertCondition(
    docs.includes('stdout や raw command output を deployment data source として扱ってはいけない'),
    `${deploymentDocsPath} must forbid stdout and raw command output as deployment data sources`,
  );
  assertCondition(
    docs.includes('release state artifact') && docs.includes('release state SHA-256'),
    `${deploymentDocsPath} must document release state artifacts as deployment evidence`,
  );
  assertCondition(
    !docs.includes('Wrangler command output'),
    `${deploymentDocsPath} must not require Wrangler command output as deployment evidence`,
  );
};

export const assertWorkflowSourceContract = async (
  options: WorkflowSourceContractOptions = {},
): Promise<SourceContractReport> => {
  const workflowPath = options.workflowPath ?? DEFAULT_WORKFLOW_PATH;
  const snapshotRoot = options.snapshotRoot ?? DEFAULT_SNAPSHOT_ROOT;
  const readmePath = options.readmePath ?? DEFAULT_README_PATH;
  const deployScriptPath = options.deployScriptPath ?? DEFAULT_DEPLOY_SCRIPT_PATH;
  const packageJsonPath = options.packageJsonPath ?? DEFAULT_PACKAGE_JSON_PATH;
  const lockfilePath = options.lockfilePath ?? DEFAULT_LOCKFILE_PATH;
  const uploadR2ScriptPath = options.uploadR2ScriptPath ?? DEFAULT_UPLOAD_R2_SCRIPT_PATH;
  const verifyMediaDeliveryScriptPath =
    options.verifyMediaDeliveryScriptPath ?? DEFAULT_VERIFY_MEDIA_DELIVERY_SCRIPT_PATH;
  const releaseStateSchemaPath =
    options.releaseStateSchemaPath ?? DEFAULT_RELEASE_STATE_SCHEMA_PATH;
  const mediaObjectContractPath =
    options.mediaObjectContractPath ?? DEFAULT_MEDIA_OBJECT_CONTRACT_PATH;
  const productionPreflightScriptPath =
    options.productionPreflightScriptPath ?? DEFAULT_PRODUCTION_PREFLIGHT_SCRIPT_PATH;
  const deploymentDocsPath = options.deploymentDocsPath ?? DEFAULT_DEPLOYMENT_DOCS_PATH;
  const workflowSource = await readFile(workflowPath, 'utf8');
  const workflowUses = collectWorkflowUses(workflowSource);
  const wranglerVersion = await assertWranglerPackageContract(packageJsonPath, lockfilePath);

  assertCondition(
    !workflowSource.includes('cloudflare/wrangler-action'),
    'cloudflare/wrangler-action must not be used',
  );
  assertCondition(
    !workflowSource.includes('command-output'),
    'Wrangler command-output must not be a deployment data source',
  );
  assertCondition(
    !/grep[^\n]*(https?:\/\/|deployment-url|deployment url)/iu.test(workflowSource),
    'deployment URL must not be scraped from stdout with grep',
  );
  assertWorkflowDeploymentOrder(workflowSource, workflowPath);
  assertReleaseStateWorkflowContract(workflowSource, workflowPath);
  assertDeploymentVerificationContract(workflowSource);
  assertE2EDiagnosticsContract(workflowSource);

  const externalUses = workflowUses.filter((use) => !use.startsWith('./'));
  for (const use of externalUses) {
    assertCondition(SHA_PIN_PATTERN.test(use), `external action must use a full SHA pin: ${use}`);
  }

  const snapshotDirectories = (await readdir(snapshotRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const evidence = await Promise.all(
    snapshotDirectories.map((directory) => loadEvidence(snapshotRoot, directory)),
  );
  const uniqueExternalUses = new Set(externalUses);
  const expectedUses = new Set(
    evidence.map((item) => `${item.actionName}@${item.reviewedCommitSha}`),
  );

  assertCondition(
    uniqueExternalUses.size === expectedUses.size,
    'workflow unique external action count must match reviewed evidence count',
  );

  for (const workflowUse of uniqueExternalUses) {
    assertCondition(
      expectedUses.has(workflowUse),
      `workflow use ${workflowUse} is missing matching reviewed evidence`,
    );
  }
  await assertReadmeMatchesEvidence(readmePath, evidence);
  await assertDeployScriptContract(deployScriptPath);
  await assertUploadR2ScriptContract(uploadR2ScriptPath);
  await assertMediaEvidenceSourceContract(
    uploadR2ScriptPath,
    verifyMediaDeliveryScriptPath,
    releaseStateSchemaPath,
    mediaObjectContractPath,
  );
  await assertProductionOutputSafety(productionPreflightScriptPath, deployScriptPath);
  await assertDeploymentDocsContract(deploymentDocsPath);

  return {
    schemaVersion: 1,
    workflowPath: toRepositoryRelativePath(workflowPath),
    workflowUses,
    actionEvidence: evidence,
    wranglerVersion,
  };
};

const entryPoint = process.argv[1];
if (typeof entryPoint === 'string' && fileURLToPath(import.meta.url) === path.resolve(entryPoint)) {
  assertWorkflowSourceContract()
    .then((report) => {
      console.log(JSON.stringify(report, null, 2));
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : String(error));
      process.exitCode = 1;
    });
}
