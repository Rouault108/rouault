/// <reference types="node" />

import { appendFile, mkdir, readFile, stat } from 'node:fs/promises';
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
const WRANGLER_OUTPUT_PATH = path.resolve(
  process.cwd(),
  '.generated',
  'deployment',
  'wrangler-pages-deploy.jsonl',
);
const DIST_DIRECTORY = path.resolve(process.cwd(), 'dist');
const MAX_FILE_BYTES = 1_048_576;
const MAX_LINE_BYTES = 16_384;
const MAX_ENTRY_COUNT = 64;
const MAX_STRING_FIELD_BYTES = 4096;
const MAX_ALIAS_COUNT = 32;
const COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/u;
const DEPLOYMENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/u;

interface CloudflarePagesDeployResult {
  readonly schemaVersion: 1;
  readonly deploymentId: string;
  readonly deploymentUrl: string;
  readonly projectName: string;
  readonly branch: 'main';
  readonly commitSha: string;
  readonly wranglerOutputKind: 'jsonl-structured-output';
  readonly wranglerVersion: string;
}

interface WranglerStructuredParseOptions {
  readonly filePath: string;
  readonly expectedWranglerVersion: string;
  readonly expectedDistDirectory: string;
  readonly expectedProjectName: string;
  readonly expectedBranch: 'main';
  readonly expectedCommitSha: string;
}

interface WranglerParsedDeployment {
  readonly deploymentId: string;
  readonly deploymentUrl: string;
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

const readPackageWranglerVersion = async (): Promise<string> => {
  const rawPackageJson = await readFile(path.resolve(process.cwd(), 'package.json'), 'utf8');
  const packageJson = JSON.parse(rawPackageJson) as unknown;
  if (!isRecord(packageJson) || !isRecord(packageJson['devDependencies'])) {
    throw new Error('[pages-deploy] package.json devDependencies must be available');
  }

  const wranglerVersion = packageJson['devDependencies']['wrangler'];
  if (typeof wranglerVersion !== 'string' || !wranglerVersion.trim()) {
    throw new Error('[pages-deploy] package.json must pin wrangler in devDependencies');
  }

  return wranglerVersion.trim();
};

const byteLength = (value: string): number => Buffer.byteLength(value, 'utf8');

const assertBoundedJsonValue = (value: unknown): void => {
  if (typeof value === 'string') {
    if (byteLength(value) > MAX_STRING_FIELD_BYTES) {
      throw new Error('[pages-deploy] Wrangler structured output string field is too large');
    }
    return;
  }

  if (Array.isArray(value)) {
    if (value.length > MAX_ALIAS_COUNT) {
      throw new Error('[pages-deploy] Wrangler structured output aliases list is too large');
    }
    for (const item of value) {
      assertBoundedJsonValue(item);
    }
    return;
  }

  if (isRecord(value)) {
    for (const [key, item] of Object.entries(value)) {
      if (byteLength(key) > MAX_STRING_FIELD_BYTES) {
        throw new Error('[pages-deploy] Wrangler structured output object key is too large');
      }
      assertBoundedJsonValue(item);
    }
  }
};

const normalizeHttpsUrl = (value: string): string => {
  const parsedUrl = new URL(value);
  if (parsedUrl.protocol !== 'https:' || !parsedUrl.hostname) {
    throw new Error('[pages-deploy] deployment URL must be an absolute HTTPS URL');
  }

  parsedUrl.hash = '';
  parsedUrl.search = '';
  parsedUrl.hostname = parsedUrl.hostname.toLowerCase();
  parsedUrl.pathname = parsedUrl.pathname.replace(/\/+$/u, '');
  return parsedUrl.toString();
};

const expectedCommandLineArgs = (options: WranglerStructuredParseOptions): readonly string[] => [
  'pages',
  'deploy',
  options.expectedDistDirectory,
  '--project-name',
  options.expectedProjectName,
  '--branch',
  options.expectedBranch,
  '--commit-hash',
  options.expectedCommitSha,
  '--commit-dirty=false',
];

const readBoundedJsonLines = async (filePath: string): Promise<readonly Record<string, unknown>[]> => {
  const fileStats = await stat(filePath);
  if (fileStats.size > MAX_FILE_BYTES) {
    throw new Error('[pages-deploy] Wrangler structured output file is too large');
  }

  const raw = await readFile(filePath, 'utf8');
  const events: Record<string, unknown>[] = [];
  for (const line of raw.split(/\r?\n/u)) {
    if (!line.trim()) {
      continue;
    }
    if (byteLength(line) > MAX_LINE_BYTES) {
      throw new Error('[pages-deploy] Wrangler structured output line is too large');
    }
    if (events.length >= MAX_ENTRY_COUNT) {
      throw new Error('[pages-deploy] Wrangler structured output entry count exceeded');
    }

    const parsed = JSON.parse(line) as unknown;
    if (!isRecord(parsed)) {
      throw new Error('[pages-deploy] Wrangler structured output entry must be an object');
    }
    assertBoundedJsonValue(parsed);
    events.push(parsed);
  }

  return events;
};

export const parseWranglerPagesDeployStructuredOutput = async (
  options: WranglerStructuredParseOptions,
): Promise<WranglerParsedDeployment> => {
  if (!path.isAbsolute(options.expectedDistDirectory)) {
    throw new Error('[pages-deploy] expected dist directory must be absolute');
  }
  if (!COMMIT_SHA_PATTERN.test(options.expectedCommitSha)) {
    throw new Error('[pages-deploy] expected commit SHA must be a 40 character lowercase SHA');
  }

  const events = await readBoundedJsonLines(options.filePath);
  if (events.some((event) => event['type'] === 'pages_deploy_result')) {
    throw new Error('[pages-deploy] obsolete synthetic Pages deploy result event is forbidden');
  }

  const sessions = events.filter((event) => event['type'] === 'wrangler-session');
  const pagesDeployEvents = events.filter((event) => event['type'] === 'pages-deploy');
  if (sessions.length !== 1) {
    throw new Error('[pages-deploy] Wrangler structured output must contain exactly one session event');
  }
  if (pagesDeployEvents.length !== 1) {
    throw new Error('[pages-deploy] Wrangler structured output must contain exactly one Pages deploy event');
  }

  const session = sessions[0] ?? {};
  const pagesDeploy = pagesDeployEvents[0] ?? {};
  if (session['version'] !== 1 || pagesDeploy['version'] !== 1) {
    throw new Error('[pages-deploy] Wrangler structured output version is unsupported');
  }
  if (session['wrangler_version'] !== options.expectedWranglerVersion) {
    throw new Error('[pages-deploy] Wrangler structured output version does not match package.json');
  }

  const commandLineArgs = session['command_line_args'];
  if (
    !Array.isArray(commandLineArgs) ||
    JSON.stringify(commandLineArgs) !== JSON.stringify(expectedCommandLineArgs(options))
  ) {
    throw new Error('[pages-deploy] Wrangler command line args are not canonical');
  }

  const deploymentId = pagesDeploy['deployment_id'];
  const deploymentUrl = pagesDeploy['url'];
  const projectName = pagesDeploy['project_name'];
  const branch = pagesDeploy['branch'];
  const environment = pagesDeploy['environment'];
  const commitHash = pagesDeploy['commit_hash'];
  if (
    typeof deploymentId !== 'string' ||
    typeof deploymentUrl !== 'string' ||
    typeof projectName !== 'string' ||
    typeof branch !== 'string' ||
    typeof environment !== 'string' ||
    typeof commitHash !== 'string'
  ) {
    throw new Error('[pages-deploy] Wrangler Pages deploy event is missing required fields');
  }
  if (!DEPLOYMENT_ID_PATTERN.test(deploymentId)) {
    throw new Error('[pages-deploy] Wrangler Pages deploy deployment ID has invalid syntax');
  }
  if (projectName !== options.expectedProjectName) {
    throw new Error('[pages-deploy] Wrangler Pages deploy project name mismatch');
  }
  if (branch !== options.expectedBranch) {
    throw new Error('[pages-deploy] Wrangler Pages deploy branch mismatch');
  }
  if (environment !== 'production') {
    throw new Error('[pages-deploy] Wrangler Pages deploy environment mismatch');
  }
  if (commitHash !== options.expectedCommitSha) {
    throw new Error('[pages-deploy] Wrangler Pages deploy commit hash mismatch');
  }

  const aliases = pagesDeploy['aliases'];
  const candidates = [deploymentUrl];
  if (Array.isArray(aliases)) {
    for (const alias of aliases) {
      if (typeof alias !== 'string') {
        throw new Error('[pages-deploy] Wrangler Pages deploy aliases must be strings');
      }
      candidates.push(alias);
    }
  }

  const normalizedDeploymentUrl = normalizeHttpsUrl(deploymentUrl);
  for (const candidate of candidates) {
    normalizeHttpsUrl(candidate);
  }

  return {
    deploymentId,
    deploymentUrl: normalizedDeploymentUrl,
  };
};

const runWranglerPagesDeploy = async (
  projectName: string,
  commitSha: string,
  wranglerVersion: string,
): Promise<CloudflarePagesDeployResult> =>
  new Promise((resolve, reject) => {
    const child = spawn(
      'pnpm',
      [
        'exec',
        'wrangler',
        'pages',
        'deploy',
        DIST_DIRECTORY,
        '--project-name',
        projectName,
        '--branch',
        'main',
        '--commit-hash',
        commitSha,
        '--commit-dirty=false',
      ],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          WRANGLER_OUTPUT_FILE_PATH: WRANGLER_OUTPUT_PATH,
        },
        stdio: ['ignore', 'ignore', 'pipe'],
      },
    );

    let stderr = '';
    child.stderr.setEncoding('utf8');
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
        parseWranglerPagesDeployStructuredOutput({
          filePath: WRANGLER_OUTPUT_PATH,
          expectedWranglerVersion: wranglerVersion,
          expectedDistDirectory: DIST_DIRECTORY,
          expectedProjectName: projectName,
          expectedBranch: 'main',
          expectedCommitSha: commitSha,
        })
          .then((parsed) => {
            resolve({
              schemaVersion: 1,
              deploymentId: parsed.deploymentId,
              deploymentUrl: parsed.deploymentUrl,
              projectName,
              branch: 'main',
              commitSha,
              wranglerOutputKind: 'jsonl-structured-output',
              wranglerVersion,
            });
          })
          .catch((error: unknown) => {
            reject(error instanceof Error ? error : new Error(String(error)));
          });
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
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
  const wranglerVersion = await readPackageWranglerVersion();

  await observeProductionBranchHead(authority, 'cloudflare-pages-deploy');
  await mkdir(path.dirname(WRANGLER_OUTPUT_PATH), { recursive: true });
  const result = await runWranglerPagesDeploy(projectName, authority.commitSha, wranglerVersion);

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
