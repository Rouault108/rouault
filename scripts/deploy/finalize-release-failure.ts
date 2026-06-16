/// <reference types="node" />

import { appendFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  productionAuthorityFromProcessEnv,
  sha256Hex,
  writeJsonAtomically,
} from './production-authority.js';
import {
  assertMediaDeliveryAttemptManifest,
  assertProductionReleaseFailedStateArtifact,
  assertR2UploadAttemptManifest,
  toFailureReason,
  type ProductionReleaseFailedStateArtifact,
} from './release-state-schema.js';

const R2_ATTEMPT_PATH = path.resolve(process.cwd(), '.generated', 'deployment', 'r2-attempt.json');
const MEDIA_DELIVERY_ATTEMPT_PATH = path.resolve(
  process.cwd(),
  '.generated',
  'deployment',
  'media-delivery-attempt.json',
);
const RELEASE_STATE_PATH = path.resolve(
  process.cwd(),
  '.generated',
  'deployment',
  'release-attempt-final.json',
);

const releaseStateArtifactName = (): string => {
  const runId = process.env['GITHUB_RUN_ID']?.trim();
  const runAttempt = process.env['GITHUB_RUN_ATTEMPT']?.trim();
  if (runId && runAttempt && /^\d+$/u.test(runId) && /^\d+$/u.test(runAttempt)) {
    return `rouault-release-state-${runId}-${runAttempt}`;
  }
  return 'rouault-release-state-local';
};

const readJson = async (filePath: string): Promise<unknown> =>
  JSON.parse(await readFile(filePath, 'utf8')) as unknown;

type FailedReleasePhase = ProductionReleaseFailedStateArtifact['failedPhase'];

const failurePhaseFromProcessEnv = (): FailedReleasePhase => {
  const phase = process.env['RELEASE_FAILURE_PHASE']?.trim();
  if (phase === 'r2-upload' || phase === 'media-delivery' || phase === 'pages-deploy') {
    return phase;
  }
  throw new Error('[release-state] RELEASE_FAILURE_PHASE is invalid');
};

const assertFailedAttemptShape = async (failedPhase: FailedReleasePhase): Promise<void> => {
  if (failedPhase === 'r2-upload') {
    const r2Attempt = assertR2UploadAttemptManifest(await readJson(R2_ATTEMPT_PATH));
    if (r2Attempt.status !== 'failed' || r2Attempt.uploadedObjects.length !== 0) {
      throw new Error('[release-state] failed R2 release must have empty uploadedObjects');
    }
    return;
  }

  const r2Attempt = assertR2UploadAttemptManifest(await readJson(R2_ATTEMPT_PATH));
  if (r2Attempt.status !== 'succeeded') {
    throw new Error('[release-state] media/pages failure requires successful R2 upload');
  }

  if (failedPhase === 'media-delivery') {
    const mediaAttempt = assertMediaDeliveryAttemptManifest(
      await readJson(MEDIA_DELIVERY_ATTEMPT_PATH),
    );
    if (mediaAttempt.status !== 'failed' || mediaAttempt.verifiedObjects.length !== 0) {
      throw new Error('[release-state] failed media release must have empty verifiedObjects');
    }
    return;
  }

  const mediaAttempt = assertMediaDeliveryAttemptManifest(await readJson(MEDIA_DELIVERY_ATTEMPT_PATH));
  if (mediaAttempt.status !== 'succeeded') {
    throw new Error('[release-state] Pages failure requires successful media delivery');
  }
};

const buildFailedReleaseState = async (): Promise<ProductionReleaseFailedStateArtifact> => {
  const authority = productionAuthorityFromProcessEnv();
  const failedPhase = failurePhaseFromProcessEnv();
  await assertFailedAttemptShape(failedPhase);

  return assertProductionReleaseFailedStateArtifact({
    schemaVersion: 1,
    artifactKind: 'production-release-failed-state',
    commitSha: authority.commitSha,
    createdAt: new Date().toISOString(),
    failedPhase,
    failureReason: `error:${failedPhase}`,
    uploadedObjects: [],
    verifiedObjects: [],
    runtimeVerification: {
      status: 'not-run',
      checkedAt: null,
    },
  });
};

const writeGithubOutput = async (releaseStateSha256: string): Promise<void> => {
  const githubOutput = process.env['GITHUB_OUTPUT']?.trim();
  if (!githubOutput) {
    return;
  }

  await appendFile(
    githubOutput,
    [
      `release-state-artifact-name=${releaseStateArtifactName()}`,
      `release-state-sha256=${releaseStateSha256}`,
      '',
    ].join('\n'),
    'utf8',
  );
};

const run = async (): Promise<void> => {
  try {
    const failedReleaseState = await buildFailedReleaseState();
    await writeJsonAtomically(RELEASE_STATE_PATH, failedReleaseState);
    const written = await readFile(RELEASE_STATE_PATH, 'utf8');
    const releaseStateSha256 = sha256Hex(written);
    await writeGithubOutput(releaseStateSha256);
    console.log(
      `[release-state] wrote failed release state artifact for ${failedReleaseState.failedPhase}`,
    );
  } catch (error) {
    const failedReleaseState = assertProductionReleaseFailedStateArtifact({
      schemaVersion: 1,
      artifactKind: 'production-release-failed-state',
      commitSha: productionAuthorityFromProcessEnv().commitSha,
      createdAt: new Date().toISOString(),
      failedPhase: failurePhaseFromProcessEnv(),
      failureReason: toFailureReason(error),
      uploadedObjects: [],
      verifiedObjects: [],
      runtimeVerification: {
        status: 'not-run',
        checkedAt: null,
      },
    });
    await writeJsonAtomically(RELEASE_STATE_PATH, failedReleaseState);
    const written = await readFile(RELEASE_STATE_PATH, 'utf8');
    const releaseStateSha256 = sha256Hex(written);
    await writeGithubOutput(releaseStateSha256);
    console.log(`[release-state] normalized failed release state after ${toFailureReason(error)}`);
  }
};

const entryPoint = process.argv[1];
if (typeof entryPoint === 'string' && fileURLToPath(import.meta.url) === path.resolve(entryPoint)) {
  void run();
}
