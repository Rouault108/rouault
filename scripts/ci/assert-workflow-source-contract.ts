/// <reference types="node" />

import { readdir, readFile } from 'node:fs/promises';
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
const DEFAULT_PRODUCTION_PREFLIGHT_SCRIPT_PATH = path.join(
  REPOSITORY_ROOT,
  'scripts',
  'deploy',
  'production-authority-preflight.ts',
);
const DEV_DEPENDENCIES_FIELD = 'devDependencies';
const WRANGLER_FIELD = 'wrangler';
const SHA_PIN_PATTERN = /^[a-z0-9-]+\/[a-z0-9_.-]+@[0-9a-f]{40}$/u;
const ACTION_USES_PATTERN = /^\s*-\s+uses:\s+([^\s#]+)\s*$/gmu;
const FIXED_PACKAGE_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u;

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
  readonly productionPreflightScriptPath?: string;
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

const collectWorkflowUses = (workflowSource: string): readonly string[] =>
  [...workflowSource.matchAll(ACTION_USES_PATTERN)].map((match) => match[1] ?? '');

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
  assertCondition(!commitSnapshot.includes('node20'), `${commitSnapshotPath} must not mention node20`);
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
  for (const item of evidence) {
    const expectedRow = `| \`${item.actionName}\` | \`${item.adoptedTag}\` | \`${item.reviewedCommitSha}\` | \`node24\` | \`${item.workflowUsesSha}\` |`;
    assertCondition(
      readme.includes(expectedRow),
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
    new RegExp(`wrangler:\\r?\\n\\s+specifier: ${escapedVersion}\\r?\\n\\s+version: ${escapedVersion}`, 'u').test(
      lockfile,
    ),
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
    preflightIndex < downloadIndex && preflightIndex < r2UploadIndex && preflightIndex < pagesDeployIndex,
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
    workflowSource.includes('artifact-ids: ${{ needs.deploy-production.outputs.release-state-artifact-id }}'),
    `${workflowPath} verify job must download release state by deploy job artifact-id output`,
  );
  assertCondition(
    /id:\s*download-release-state[\s\S]{0,260}continue-on-error:\s*true/u.test(workflowSource),
    `${workflowPath} verify job must preserve release state resolution failures as state`,
  );
  assertCondition(
    /id:\s*download-release-state[\s\S]{0,360}digest-mismatch:\s*error/u.test(workflowSource),
    `${workflowPath} verify job must fail closed on release state artifact digest mismatch`,
  );
  assertCondition(
    workflowSource.includes('EXPECTED_RELEASE_STATE_SHA256: ${{ needs.deploy-production.outputs.release-state-sha256 }}'),
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
      !/appendFile\(\s*githubOutput\s*,\s*(?:`[^`]*(?:process\.env|OUTPUT_PATH|WRANGLER_OUTPUT_PATH)[^`]*`|"[^"]*(?:process\.env|OUTPUT_PATH|WRANGLER_OUTPUT_PATH)[^"]*"|'[^']*(?:process\.env|OUTPUT_PATH|WRANGLER_OUTPUT_PATH)[^']*')/u.test(source),
      `${filePath} must not write raw environment values or local absolute paths to job outputs`,
    );
    assertCondition(
      !/appendFile\(\s*githubOutput[\s\S]{0,400}JSON\.stringify/u.test(source),
      `${filePath} must not write full JSON artifacts to job outputs`,
    );
  }
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
  const productionPreflightScriptPath =
    options.productionPreflightScriptPath ?? DEFAULT_PRODUCTION_PREFLIGHT_SCRIPT_PATH;
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
  const expectedUses = new Set(evidence.map((item) => `${item.actionName}@${item.reviewedCommitSha}`));

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
  await assertProductionOutputSafety(productionPreflightScriptPath, deployScriptPath);

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
