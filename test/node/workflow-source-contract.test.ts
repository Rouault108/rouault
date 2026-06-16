import { describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { assertWorkflowSourceContract } from '../../scripts/ci/assert-workflow-source-contract.js';

const actionName = 'actions/example';
const reviewedCommitSha = '0123456789abcdef0123456789abcdef01234567';

const writeWorkflowContractFixture = async (options: {
  readonly workflowUses?: string;
  readonly runsUsing?: 'node20' | 'node24';
  readonly extraRun?: string;
  readonly deployScriptSource?: string;
}) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rouault-workflow-contract-'));
  const workflowPath = path.join(root, 'ci-cd.yml');
  const snapshotRoot = path.join(root, 'external-action-snapshots');
  const snapshotDirectory = path.join(snapshotRoot, 'actions-example');
  const readmePath = path.join(snapshotRoot, 'README.md');
  const deployScriptPath = path.join(root, 'deploy-cloudflare-pages.ts');
  const runsUsing = options.runsUsing ?? 'node24';
  const workflowUses = options.workflowUses ?? `${actionName}@${reviewedCommitSha}`;

  await mkdir(snapshotDirectory, { recursive: true });
  await writeFile(
    workflowPath,
    [
      'jobs:',
      '  test:',
      '    steps:',
      `      - uses: ${workflowUses}`,
      options.extraRun ? `      - run: ${options.extraRun}` : '',
      '',
    ].join('\n'),
    'utf8',
  );
  await writeFile(
    deployScriptPath,
    options.deployScriptSource ??
      [
        "const output = 'WRANGLER_OUTPUT_FILE_PATH';",
        "const parser = 'parseWranglerPagesDeployStructuredOutput';",
        "const commitDirty = '--commit-dirty=false';",
        'void output;',
        'void parser;',
        'void commitDirty;',
        '',
      ].join('\n'),
    'utf8',
  );
  await writeFile(
    path.join(snapshotDirectory, 'tag-evidence.json'),
    JSON.stringify(
      {
        action: actionName,
        adopted_tag: 'v1.0.0',
        reviewed_commit_sha: reviewedCommitSha,
        runtimeReadiness: 'node24',
        action_yml_runs_using: 'node24',
      },
      null,
      2,
    ),
    'utf8',
  );
  await writeFile(
    path.join(snapshotDirectory, 'action.commit.yml'),
    `runs:\n  using: ${runsUsing}\n  main: dist/index.js\n`,
    'utf8',
  );
  await writeFile(
    path.join(snapshotDirectory, 'action.tag.yml'),
    `runs:\n  using: ${runsUsing}\n  main: dist/index.js\n`,
    'utf8',
  );
  await writeFile(
    readmePath,
    [
      '| action name | adopted tag | reviewed commit SHA | runs.using | workflow uses SHA |',
      '| --- | --- | --- | --- | --- |',
      `| \`${actionName}\` | \`v1.0.0\` | \`${reviewedCommitSha}\` | \`node24\` | \`${reviewedCommitSha}\` |`,
      '',
    ].join('\n'),
    'utf8',
  );

  return { workflowPath, snapshotRoot, readmePath, deployScriptPath };
};

describe('workflow source contract', () => {
  it('pins external actions to reviewed Node 24 commit snapshots', async () => {
    const report = await assertWorkflowSourceContract();

    expect(report.actionEvidence.length).toBeGreaterThan(0);
    expect(report.actionEvidence.every((evidence) => evidence.runsUsing === 'node24')).toBe(true);
  });

  it('rejects Node.js 20 Action runtime snapshots', async () => {
    const fixture = await writeWorkflowContractFixture({ runsUsing: 'node20' });

    await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(/must use node24/u);
  });

  it('rejects tag coordinates in workflow uses', async () => {
    const fixture = await writeWorkflowContractFixture({ workflowUses: `${actionName}@v1.0.0` });

    await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(/full SHA pin/u);
  });

  it('rejects deployment URL stdout grep scraping', async () => {
    const fixture = await writeWorkflowContractFixture({
      extraRun: "wrangler pages deploy dist | grep -Eo 'https://[^ ]+'",
    });

    await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(/scraped from stdout/u);
  });

  it('rejects Wrangler stdout JSON deployment parsing in the deploy script', async () => {
    const fixture = await writeWorkflowContractFixture({
      deployScriptSource: [
        "const output = 'WRANGLER_OUTPUT_FILE_PATH';",
        "const parser = 'parseWranglerPagesDeployStructuredOutput';",
        "const commitDirty = '--commit-dirty=false';",
        "const obsolete = '--json';",
        "const deploymentUrl = stdout;",
        'void output;',
        'void parser;',
        'void commitDirty;',
        'void obsolete;',
        'void deploymentUrl;',
        '',
      ].join('\n'),
    });

    await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(/stdout JSON output/u);
  });
});
