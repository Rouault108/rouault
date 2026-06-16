/// <reference types="node" />

import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/u;
const PRODUCTION_REF = 'refs/heads/main';
const PRODUCTION_BRANCH = 'main';

export interface ProductionAuthorityEnvironment {
  readonly githubEventName: string | undefined;
  readonly githubRef: string | undefined;
  readonly githubRefName: string | undefined;
  readonly githubSha: string | undefined;
  readonly githubRepository: string | undefined;
  readonly githubServerUrl: string | undefined;
}

export interface ValidatedProductionAuthority {
  readonly schemaVersion: 1;
  readonly productionRef: typeof PRODUCTION_REF;
  readonly productionBranch: typeof PRODUCTION_BRANCH;
  readonly eventName: 'push';
  readonly commitSha: string;
  readonly repository: string | null;
  readonly serverUrl: string | null;
}

export interface ProductionHeadObservation {
  readonly schemaVersion: 1;
  readonly boundary: string;
  readonly productionBranch: typeof PRODUCTION_BRANCH;
  readonly expectedCommitSha: string;
  readonly observedCommitSha: string;
  readonly observedAt: string;
  readonly remoteName: 'origin';
}

const requireNonEmpty = (name: string, value: string | undefined): string => {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`[production-authority] missing ${name}`);
  }
  return normalized;
};

export const validateProductionAuthority = (
  environment: ProductionAuthorityEnvironment,
): ValidatedProductionAuthority => {
  const githubEventName = requireNonEmpty('GITHUB_EVENT_NAME', environment.githubEventName);
  const githubRef = requireNonEmpty('GITHUB_REF', environment.githubRef);
  const githubRefName = requireNonEmpty('GITHUB_REF_NAME', environment.githubRefName);
  const githubSha = requireNonEmpty('GITHUB_SHA', environment.githubSha);

  if (githubEventName !== 'push') {
    throw new Error(
      `[production-authority] production deployment requires push event, got ${githubEventName}`,
    );
  }

  if (githubRef !== PRODUCTION_REF || githubRefName !== PRODUCTION_BRANCH) {
    throw new Error(
      `[production-authority] production deployment requires ${PRODUCTION_REF}, got ${githubRef}`,
    );
  }

  if (!COMMIT_SHA_PATTERN.test(githubSha)) {
    throw new Error('[production-authority] GITHUB_SHA must be a 40 character lowercase commit SHA');
  }

  return {
    schemaVersion: 1,
    productionRef: PRODUCTION_REF,
    productionBranch: PRODUCTION_BRANCH,
    eventName: 'push',
    commitSha: githubSha,
    repository: environment.githubRepository?.trim() || null,
    serverUrl: environment.githubServerUrl?.trim() || null,
  };
};

const runGit = async (args: readonly string[]): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn('git', args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', reject);
    child.on('close', (exitCode) => {
      if (exitCode === 0) {
        resolve(stdout);
        return;
      }

      reject(
        new Error(
          `[production-authority] git ${args.join(' ')} failed with exit code ${String(
            exitCode,
          )}: ${stderr.trim()}`,
        ),
      );
    });
  });

export const observeProductionBranchHead = async (
  authority: ValidatedProductionAuthority,
  boundary: string,
): Promise<ProductionHeadObservation> => {
  if (!boundary.trim()) {
    throw new Error('[production-authority] mutation boundary label is required');
  }

  const stdout = await runGit(['ls-remote', '--heads', 'origin', PRODUCTION_BRANCH]);
  const firstLine = stdout.split(/\r?\n/u).find((line) => line.trim().length > 0);
  const [observedCommitSha, observedRef] = firstLine?.trim().split(/\s+/u) ?? [];

  if (observedRef !== PRODUCTION_REF || !observedCommitSha) {
    throw new Error('[production-authority] failed to observe production branch head');
  }

  if (!COMMIT_SHA_PATTERN.test(observedCommitSha)) {
    throw new Error('[production-authority] observed production branch head is not a commit SHA');
  }

  if (observedCommitSha !== authority.commitSha) {
    throw new Error(
      `[production-authority] stale production run at ${boundary}: expected ${authority.commitSha}, observed ${observedCommitSha}`,
    );
  }

  return {
    schemaVersion: 1,
    boundary,
    productionBranch: PRODUCTION_BRANCH,
    expectedCommitSha: authority.commitSha,
    observedCommitSha,
    observedAt: new Date().toISOString(),
    remoteName: 'origin',
  };
};

export const productionAuthorityFromProcessEnv = (): ValidatedProductionAuthority =>
  validateProductionAuthority({
    githubEventName: process.env['GITHUB_EVENT_NAME'],
    githubRef: process.env['GITHUB_REF'],
    githubRefName: process.env['GITHUB_REF_NAME'],
    githubSha: process.env['GITHUB_SHA'],
    githubRepository: process.env['GITHUB_REPOSITORY'],
    githubServerUrl: process.env['GITHUB_SERVER_URL'],
  });

const stableJson = (value: unknown): string => `${JSON.stringify(value, null, 2)}\n`;

export const sha256Hex = (value: string): string =>
  createHash('sha256').update(value, 'utf8').digest('hex');

export const writeJsonAtomically = async (filePath: string, value: unknown): Promise<string> => {
  const targetPath = path.resolve(filePath);
  const targetDirectory = path.dirname(targetPath);
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'rouault-production-authority-'));
  const temporaryPath = path.join(temporaryDirectory, path.basename(targetPath));
  const payload = stableJson(value);

  try {
    await mkdir(targetDirectory, { recursive: true });
    await writeFile(temporaryPath, payload, { encoding: 'utf8', flag: 'wx' });
    await rename(temporaryPath, targetPath);
    const written = await readFile(targetPath, 'utf8');
    if (sha256Hex(written) !== sha256Hex(payload)) {
      throw new Error('[production-authority] atomic JSON write digest mismatch');
    }
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }

  return targetDirectory;
};
