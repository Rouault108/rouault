/// <reference types="node" />

import { appendFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import {
  observeProductionBranchHead,
  productionAuthorityFromProcessEnv,
  writeJsonAtomically,
} from './production-authority.js';

const OUTPUT_PATH = path.resolve(
  process.cwd(),
  '.generated',
  'deployment',
  'cloudflare-pages-deploy-result.json',
);

interface CloudflarePagesDeployResult {
  readonly schemaVersion: 1;
  readonly deploymentId: string;
  readonly deploymentUrl: string;
  readonly projectName: string;
  readonly branch: 'main';
  readonly commitSha: string;
  readonly wranglerOutputKind: 'json';
}

const readRequiredEnv = (name: string): string => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`[pages-deploy] missing required environment variable: ${name}`);
  }
  return value;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const findString = (value: unknown, keys: readonly string[]): string | null => {
  if (!isRecord(value)) {
    return null;
  }

  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  for (const candidate of Object.values(value)) {
    const found = findString(candidate, keys);
    if (found !== null) {
      return found;
    }
  }

  return null;
};

const parseWranglerJson = (stdout: string): unknown => {
  const trimmed = stdout.trim();
  if (!trimmed) {
    throw new Error('[pages-deploy] Wrangler produced no JSON output');
  }

  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const jsonLines = trimmed
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.startsWith('{') && line.endsWith('}'));

    if (jsonLines.length === 0) {
      throw new Error('[pages-deploy] Wrangler output was not machine-readable JSON');
    }

    return JSON.parse(jsonLines.at(-1) ?? '{}') as unknown;
  }
};

const normalizeWranglerResult = (
  rawWranglerOutput: unknown,
  projectName: string,
  commitSha: string,
): CloudflarePagesDeployResult => {
  const deploymentId = findString(rawWranglerOutput, ['id', 'deploymentId']);
  const deploymentUrl = findString(rawWranglerOutput, ['url', 'deploymentUrl']);

  if (deploymentId === null) {
    throw new Error('[pages-deploy] Wrangler JSON output did not include a deployment ID');
  }

  if (deploymentUrl === null) {
    throw new Error('[pages-deploy] Wrangler JSON output did not include a deployment URL');
  }

  const parsedDeploymentUrl = new URL(deploymentUrl);
  if (parsedDeploymentUrl.protocol !== 'https:') {
    throw new Error('[pages-deploy] deployment URL must be HTTPS');
  }

  return {
    schemaVersion: 1,
    deploymentId,
    deploymentUrl: parsedDeploymentUrl.toString(),
    projectName,
    branch: 'main',
    commitSha,
    wranglerOutputKind: 'json',
  };
};

const runWranglerPagesDeploy = async (
  projectName: string,
  commitSha: string,
): Promise<CloudflarePagesDeployResult> =>
  new Promise((resolve, reject) => {
    const child = spawn(
      'pnpm',
      [
        'exec',
        'wrangler',
        'pages',
        'deploy',
        'dist',
        '--project-name',
        projectName,
        '--branch',
        'main',
        '--commit-hash',
        commitSha,
        '--json',
      ],
      {
        cwd: process.cwd(),
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

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
      if (exitCode !== 0) {
        reject(
          new Error(
            `[pages-deploy] Wrangler failed with exit code ${String(exitCode)}: ${stderr.trim()}`,
          ),
        );
        return;
      }

      try {
        resolve(normalizeWranglerResult(parseWranglerJson(stdout), projectName, commitSha));
      } catch (error) {
        reject(error);
      }
    });
  });

const writeGithubOutput = async (result: CloudflarePagesDeployResult): Promise<void> => {
  const githubOutput = process.env['GITHUB_OUTPUT']?.trim();
  if (!githubOutput) {
    return;
  }

  await appendFile(
    githubOutput,
    `deployment-url=${result.deploymentUrl}\ndeployment-id=${result.deploymentId}\n`,
    'utf8',
  );
};

const writeGithubSummary = async (result: CloudflarePagesDeployResult): Promise<void> => {
  const githubStepSummary = process.env['GITHUB_STEP_SUMMARY']?.trim();
  if (!githubStepSummary) {
    return;
  }

  await appendFile(
    githubStepSummary,
    [
      '## Production deployment',
      '',
      `- GITHUB_SHA: ${result.commitSha}`,
      `- Cloudflare Pages project: ${result.projectName}`,
      `- Cloudflare deployment ID: ${result.deploymentId}`,
      `- Cloudflare deployment URL: ${result.deploymentUrl}`,
      '',
    ].join('\n'),
    'utf8',
  );
};

const run = async (): Promise<void> => {
  const authority = productionAuthorityFromProcessEnv();
  const projectName = readRequiredEnv('CF_PAGES_PROJECT');

  await observeProductionBranchHead(authority, 'cloudflare-pages-deploy');
  const result = await runWranglerPagesDeploy(projectName, authority.commitSha);

  await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await writeJsonAtomically(OUTPUT_PATH, result);
  await writeGithubOutput(result);
  await writeGithubSummary(result);

  const written = await readFile(OUTPUT_PATH, 'utf8');
  console.log(`[pages-deploy] wrote normalized deployment result (${String(written.length)} bytes)`);
};

const entryPoint = process.argv[1];
if (typeof entryPoint === 'string' && fileURLToPath(import.meta.url) === path.resolve(entryPoint)) {
  void run();
}
