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
const SHA_PIN_PATTERN = /^[a-z0-9-]+\/[a-z0-9_.-]+@[0-9a-f]{40}$/u;
const ACTION_USES_PATTERN = /^\s*-\s+uses:\s+([^\s#]+)\s*$/gmu;

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
}

interface WorkflowSourceContractOptions {
  readonly workflowPath?: string;
  readonly snapshotRoot?: string;
  readonly readmePath?: string;
  readonly deployScriptPath?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readJson = async (filePath: string): Promise<unknown> =>
  JSON.parse(await readFile(filePath, 'utf8')) as unknown;

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
  const match = source.match(/^\s*using:\s*['"]?(node[0-9]+)['"]?\s*$/mu);
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
  assertCondition(!/node20/u.test(commitSnapshot), `${commitSnapshotPath} must not mention node20`);
  assertCondition(!/node20/u.test(tagSnapshot), `${tagSnapshotPath} must not mention node20`);
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
};

export const assertWorkflowSourceContract = async (
  options: WorkflowSourceContractOptions = {},
): Promise<SourceContractReport> => {
  const workflowPath = options.workflowPath ?? DEFAULT_WORKFLOW_PATH;
  const snapshotRoot = options.snapshotRoot ?? DEFAULT_SNAPSHOT_ROOT;
  const readmePath = options.readmePath ?? DEFAULT_README_PATH;
  const deployScriptPath = options.deployScriptPath ?? DEFAULT_DEPLOY_SCRIPT_PATH;
  const workflowSource = await readFile(workflowPath, 'utf8');
  const workflowUses = collectWorkflowUses(workflowSource);

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

  return {
    schemaVersion: 1,
    workflowPath,
    workflowUses,
    actionEvidence: evidence,
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
