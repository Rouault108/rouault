/// <reference types="node" />

import { appendFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { sha256Hex, writeJsonAtomically } from './production-authority.js';
import {
  assertProductionReleaseStateArtifact,
  type ProductionReleaseStateArtifact,
  type RuntimeVerificationState,
} from './release-state-schema.js';

const RELEASE_STATE_PATH = path.resolve(
  process.cwd(),
  '.generated',
  'deployment',
  'release-attempt-final.json',
);
const RELEASE_VERIFICATION_STATE_PATH = path.resolve(
  process.cwd(),
  '.generated',
  'deployment',
  'release-verification-final.json',
);
const RELEASE_VERIFICATION_ARTIFACT_NAME = 'rouault-release-verification-state';

const readJson = async (filePath: string): Promise<unknown> =>
  JSON.parse(await readFile(filePath, 'utf8')) as unknown;

const readReleaseState = async (): Promise<ProductionReleaseStateArtifact> => {
  const expectedSha256 = process.env['EXPECTED_RELEASE_STATE_SHA256']?.trim();
  const raw = await readFile(RELEASE_STATE_PATH, 'utf8');
  if (expectedSha256 && sha256Hex(raw) !== expectedSha256) {
    throw new Error('[runtime-verification] release state SHA-256 mismatch');
  }
  return assertProductionReleaseStateArtifact(JSON.parse(raw) as unknown);
};

const runtimeVerificationFromProcessEnv = (): RuntimeVerificationState => {
  const status = process.env['RUNTIME_VERIFICATION_STATUS']?.trim() ?? '';
  if (
    status !== 'verified-by-production-runtime-artifacts' &&
    status !== 'verification-failed' &&
    status !== 'release-state-resolution-failed'
  ) {
    throw new Error('[runtime-verification] RUNTIME_VERIFICATION_STATUS is invalid');
  }

  return {
    status,
    checkedAt: new Date().toISOString(),
  };
};

const writeGithubOutput = async (releaseVerificationSha256: string): Promise<void> => {
  const githubOutput = process.env['GITHUB_OUTPUT']?.trim();
  if (!githubOutput) {
    return;
  }

  await appendFile(
    githubOutput,
    [
      `release-verification-artifact-name=${RELEASE_VERIFICATION_ARTIFACT_NAME}`,
      `release-verification-sha256=${releaseVerificationSha256}`,
      '',
    ].join('\n'),
    'utf8',
  );
};

const run = async (): Promise<void> => {
  const releaseState = await readReleaseState();
  const nextState = assertProductionReleaseStateArtifact({
    ...releaseState,
    runtimeVerification: runtimeVerificationFromProcessEnv(),
  });

  await writeJsonAtomically(RELEASE_VERIFICATION_STATE_PATH, nextState);
  const written = await readFile(RELEASE_VERIFICATION_STATE_PATH, 'utf8');
  const releaseVerificationSha256 = sha256Hex(written);
  await writeGithubOutput(releaseVerificationSha256);

  const verified = assertProductionReleaseStateArtifact(await readJson(RELEASE_VERIFICATION_STATE_PATH));
  console.log(
    `[runtime-verification] recorded ${verified.runtimeVerification.status} in release state artifact`,
  );
};

const entryPoint = process.argv[1];
if (typeof entryPoint === 'string' && fileURLToPath(import.meta.url) === path.resolve(entryPoint)) {
  void run();
}
