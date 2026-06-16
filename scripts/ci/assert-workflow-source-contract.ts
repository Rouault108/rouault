/// <reference types="node" />

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPOSITORY_ROOT = process.cwd();
const WORKFLOW_PATH = path.join(REPOSITORY_ROOT, '.github', 'workflows', 'ci-cd.yml');
const SNAPSHOT_ROOT = path.join(REPOSITORY_ROOT, 'external-action-snapshots');
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

const extractRunsUsing = (source: string, filePath: string): string => {
  const match = source.match(/^\s*using:\s*['"]?(node[0-9]+)['"]?\s*$/mu);
  assertCondition(match !== null, `${filePath} must declare runs.using`);
  return match?.[1] ?? '';
};

const loadEvidence = async (snapshotDirectory: string): Promise<ActionEvidence> => {
  const evidencePath = path.join(SNAPSHOT_ROOT, snapshotDirectory, 'tag-evidence.json');
  const evidence = await readJson(evidencePath);
  if (!isRecord(evidence)) {
    throw new Error(`[workflow-source-contract] ${evidencePath} must contain an object`);
  }

  const actionName = evidence['actionName'];
  const adoptedTag = evidence['adoptedTag'];
  const reviewedCommitSha = evidence['reviewedCommitSha'];
  const workflowUsesSha = evidence['workflowUsesSha'];
  const runsUsing = evidence['runsUsing'];

  if (typeof actionName !== 'string') {
    throw new Error(`[workflow-source-contract] ${evidencePath} actionName must be a string`);
  }
  if (typeof adoptedTag !== 'string') {
    throw new Error(`[workflow-source-contract] ${evidencePath} adoptedTag must be a string`);
  }
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

  const commitSnapshotPath = path.join(SNAPSHOT_ROOT, snapshotDirectory, 'action.commit.yml');
  const tagSnapshotPath = path.join(SNAPSHOT_ROOT, snapshotDirectory, 'action.tag.yml');
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

export const assertWorkflowSourceContract = async (): Promise<SourceContractReport> => {
  const workflowSource = await readFile(WORKFLOW_PATH, 'utf8');
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
    !/grep\s+-Eo\s+['"]https:\/\/\[\^/u.test(workflowSource),
    'deployment URL must not be scraped from stdout with grep',
  );

  const externalUses = workflowUses.filter((use) => !use.startsWith('./'));
  for (const use of externalUses) {
    assertCondition(SHA_PIN_PATTERN.test(use), `external action must use a full SHA pin: ${use}`);
  }

  const snapshotDirectories = (await readdir(SNAPSHOT_ROOT, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  const evidence = await Promise.all(snapshotDirectories.map((directory) => loadEvidence(directory)));
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

  return {
    schemaVersion: 1,
    workflowPath: WORKFLOW_PATH,
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
