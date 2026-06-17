import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseWranglerPagesDeployStructuredOutput } from '../../scripts/deploy/deploy-cloudflare-pages.js';

const expectedDistDirectory = '/home/runner/work/rouault/rouault/dist';
const expectedProjectName = 'rouault';
const expectedBranch = 'main';
const expectedCommitSha = '0123456789abcdef0123456789abcdef01234567';
const expectedWranglerVersion = '4.100.0';

const writeJsonl = async (events: readonly unknown[]): Promise<string> => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rouault-wrangler-output-'));
  await mkdir(root, { recursive: true });
  const filePath = path.join(root, 'wrangler.jsonl');
  await writeFile(filePath, `${events.map((event) => JSON.stringify(event)).join('\n')}\n`, 'utf8');
  return filePath;
};

const wranglerSession = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  command_line_args: [
    'pages',
    'deploy',
    expectedDistDirectory,
    '--project-name',
    expectedProjectName,
    '--branch',
    expectedBranch,
    '--commit-hash',
    expectedCommitSha,
    '--commit-dirty=false',
  ],
  timestamp: '2026-01-01T00:00:00.000Z',
  type: 'wrangler-session',
  version: 1,
  wrangler_version: expectedWranglerVersion,
  ...overrides,
});

const pagesDeploy = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  aliases: ['https://fixture.pages.dev'],
  branch: expectedBranch,
  commit_hash: expectedCommitSha,
  deployment_id: 'fixture-deployment-id',
  deployment_trigger: { metadata: { branch: expectedBranch, commit_hash: expectedCommitSha } },
  environment: 'production',
  project_name: expectedProjectName,
  timestamp: '2026-01-01T00:00:01.000Z',
  type: 'pages-deploy',
  url: 'https://fixture.pages.dev',
  version: 1,
  ...overrides,
});

const pagesDeployWithNestedGitMetadataOnly = (
  overrides: Record<string, unknown> = {},
): Record<string, unknown> => {
  const event = pagesDeploy(overrides);
  delete event['branch'];
  delete event['commit_hash'];
  return event;
};

const parseFixture = async (events: readonly unknown[]) =>
  parseWranglerPagesDeployStructuredOutput({
    filePath: await writeJsonl(events),
    expectedWranglerVersion,
    expectedDistDirectory,
    expectedProjectName,
    expectedBranch,
    expectedCommitSha,
  });

describe('Cloudflare Pages Wrangler structured output parser', () => {
  it('normalizes deployment coordinates from JSONL structured output', async () => {
    await expect(parseFixture([wranglerSession(), pagesDeploy()])).resolves.toEqual({
      deploymentId: 'fixture-deployment-id',
      deploymentUrl: 'https://fixture.pages.dev/',
    });
  });

  it('accepts branch and commit hash from Wrangler deployment trigger metadata', async () => {
    await expect(
      parseFixture([wranglerSession(), pagesDeployWithNestedGitMetadataOnly()]),
    ).resolves.toEqual({
      deploymentId: 'fixture-deployment-id',
      deploymentUrl: 'https://fixture.pages.dev/',
    });
  });

  it('rejects relative dist command arguments', async () => {
    await expect(
      parseFixture([
        wranglerSession({
          command_line_args: [
            'pages',
            'deploy',
            'dist',
            '--project-name',
            expectedProjectName,
            '--branch',
            expectedBranch,
            '--commit-hash',
            expectedCommitSha,
            '--commit-dirty=false',
          ],
        }),
        pagesDeploy(),
      ]),
    ).rejects.toThrow(/command line args are not canonical/u);
  });

  it('rejects Node package Wrangler version drift', async () => {
    await expect(
      parseFixture([wranglerSession({ wrangler_version: '4.99.0' }), pagesDeploy()]),
    ).rejects.toThrow(/version does not match package\.json/u);
  });

  it('rejects duplicate Pages deploy events', async () => {
    await expect(parseFixture([wranglerSession(), pagesDeploy(), pagesDeploy()])).rejects.toThrow(
      /exactly one Pages deploy event/u,
    );
  });

  it('reports missing Pages deploy fields and available key paths', async () => {
    await expect(
      parseFixture([
        wranglerSession(),
        pagesDeployWithNestedGitMetadataOnly({
          deployment_trigger: { metadata: { branch: expectedBranch } },
        }),
      ]),
    ).rejects.toThrow(
      /missing: commit_hash .*available keys: .*deployment_trigger\.metadata\.branch/u,
    );
  });

  it('rejects non-HTTPS deployment URLs', async () => {
    await expect(
      parseFixture([wranglerSession(), pagesDeploy({ url: 'http://fixture.pages.dev' })]),
    ).rejects.toThrow(/deployment URL must be an absolute HTTPS URL/u);
  });
});
