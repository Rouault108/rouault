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
  readonly workflowStepOrder?: 'valid' | 'preflight-after-upload';
  readonly deployScriptSource?: string;
  readonly uploadR2ScriptSource?: string;
  readonly productionPreflightScriptSource?: string;
  readonly packageWranglerVersion?: string;
  readonly lockWranglerSpecifier?: string;
  readonly lockWranglerVersion?: string;
}) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'rouault-workflow-contract-'));
  const workflowPath = path.join(root, 'ci-cd.yml');
  const snapshotRoot = path.join(root, 'external-action-snapshots');
  const snapshotDirectory = path.join(snapshotRoot, 'actions-example');
  const readmePath = path.join(snapshotRoot, 'README.md');
  const deployScriptPath = path.join(root, 'deploy-cloudflare-pages.ts');
  const uploadR2ScriptPath = path.join(root, 'upload-r2-media.ts');
  const productionPreflightScriptPath = path.join(root, 'production-authority-preflight.ts');
  const packageJsonPath = path.join(root, 'package.json');
  const lockfilePath = path.join(root, 'pnpm-lock.yaml');
  const runsUsing = options.runsUsing ?? 'node24';
  const workflowUses = options.workflowUses ?? `${actionName}@${reviewedCommitSha}`;
  const packageWranglerVersion = options.packageWranglerVersion ?? '4.100.0';
  const lockWranglerSpecifier = options.lockWranglerSpecifier ?? packageWranglerVersion;
  const lockWranglerVersion = options.lockWranglerVersion ?? packageWranglerVersion;
  const workflowDeploySteps =
    options.workflowStepOrder === 'preflight-after-upload'
      ? [
          '      - uses: ./actions/download-artifact@0123456789abcdef0123456789abcdef01234567',
          '      - id: upload-r2-media',
          '        continue-on-error: true',
          '        run: pnpm exec tsx scripts/upload-r2-media.ts',
          '      - id: upload-r2-attempt-artifact',
          '        uses: ./actions/upload-artifact@0123456789abcdef0123456789abcdef01234567',
          '        with:',
          '          path: .generated/deployment/r2-attempt.json',
          '          if-no-files-found: error',
          '      - id: verify-media-delivery',
          '        continue-on-error: true',
          '        run: pnpm exec tsx scripts/deploy/verify-media-delivery.ts',
          '      - id: upload-media-delivery-attempt-artifact',
          '        uses: ./actions/upload-artifact@0123456789abcdef0123456789abcdef01234567',
          '        with:',
          '          path: .generated/deployment/media-delivery-attempt.json',
          '          if-no-files-found: error',
          '      - run: pnpm exec tsx scripts/deploy/production-authority-preflight.ts',
          '      - id: finalize-r2-upload-failure',
          '        env:',
          '          RELEASE_FAILURE_PHASE: r2-upload',
          '        run: pnpm exec tsx scripts/deploy/finalize-release-failure.ts',
          '      - id: finalize-media-delivery-failure',
          '        env:',
          '          RELEASE_FAILURE_PHASE: media-delivery',
          '        run: pnpm exec tsx scripts/deploy/finalize-release-failure.ts',
          '      - id: deploy-cloudflare-pages',
          '        run: pnpm exec tsx scripts/deploy/deploy-cloudflare-pages.ts',
          '      - id: finalize-pages-deploy-failure',
          '        env:',
          '          RELEASE_FAILURE_PHASE: pages-deploy',
          '        run: pnpm exec tsx scripts/deploy/finalize-release-failure.ts',
          '      release-state-artifact-name: ${{ steps.deploy-cloudflare-pages.outputs.release-state-artifact-name || steps.finalize-r2-upload-failure.outputs.release-state-artifact-name || steps.finalize-media-delivery-failure.outputs.release-state-artifact-name || steps.finalize-pages-deploy-failure.outputs.release-state-artifact-name }}',
          '      release-state-artifact-id: ${{ steps.upload-release-state-artifact.outputs.artifact-id }}',
          '      release-state-sha256: ${{ steps.deploy-cloudflare-pages.outputs.release-state-sha256 || steps.finalize-r2-upload-failure.outputs.release-state-sha256 || steps.finalize-media-delivery-failure.outputs.release-state-sha256 || steps.finalize-pages-deploy-failure.outputs.release-state-sha256 }}',
          '      - id: upload-release-state-artifact',
          '        uses: ./actions/upload-artifact@0123456789abcdef0123456789abcdef01234567',
          '        with:',
          '          path: .generated/deployment/release-attempt-final.json',
          '          if-no-files-found: error',
          '      - id: download-release-state',
          '        uses: ./actions/download-artifact@0123456789abcdef0123456789abcdef01234567',
          '        continue-on-error: true',
          '        with:',
          '          artifact-ids: ${{ needs.deploy-production.outputs.release-state-artifact-id }}',
          '          digest-mismatch: error',
          '      - run: pnpm exec tsx scripts/deploy/record-runtime-verification.ts',
          '        env:',
          '          EXPECTED_RELEASE_STATE_SHA256: ${{ needs.deploy-production.outputs.release-state-sha256 }}',
          '      - id: record-release-state-resolution-failed',
          '        env:',
          '          RUNTIME_VERIFICATION_STATUS: release-state-resolution-failed',
          '      - if: ${{ steps.record-release-state-resolution-failed.outcome == \'success\' }}',
        ]
      : [
          '      - run: pnpm exec tsx scripts/deploy/production-authority-preflight.ts',
          '      - uses: ./actions/download-artifact@0123456789abcdef0123456789abcdef01234567',
          '      - id: upload-r2-media',
          '        continue-on-error: true',
          '        run: pnpm exec tsx scripts/upload-r2-media.ts',
          '      - id: upload-r2-attempt-artifact',
          '        uses: ./actions/upload-artifact@0123456789abcdef0123456789abcdef01234567',
          '        with:',
          '          path: .generated/deployment/r2-attempt.json',
          '          if-no-files-found: error',
          '      - id: verify-media-delivery',
          '        continue-on-error: true',
          '        run: pnpm exec tsx scripts/deploy/verify-media-delivery.ts',
          '      - id: upload-media-delivery-attempt-artifact',
          '        uses: ./actions/upload-artifact@0123456789abcdef0123456789abcdef01234567',
          '        with:',
          '          path: .generated/deployment/media-delivery-attempt.json',
          '          if-no-files-found: error',
          '      - id: finalize-r2-upload-failure',
          '        env:',
          '          RELEASE_FAILURE_PHASE: r2-upload',
          '        run: pnpm exec tsx scripts/deploy/finalize-release-failure.ts',
          '      - id: finalize-media-delivery-failure',
          '        env:',
          '          RELEASE_FAILURE_PHASE: media-delivery',
          '        run: pnpm exec tsx scripts/deploy/finalize-release-failure.ts',
          '      - id: deploy-cloudflare-pages',
          '        run: pnpm exec tsx scripts/deploy/deploy-cloudflare-pages.ts',
          '      - id: finalize-pages-deploy-failure',
          '        env:',
          '          RELEASE_FAILURE_PHASE: pages-deploy',
          '        run: pnpm exec tsx scripts/deploy/finalize-release-failure.ts',
          '      release-state-artifact-name: ${{ steps.deploy-cloudflare-pages.outputs.release-state-artifact-name || steps.finalize-r2-upload-failure.outputs.release-state-artifact-name || steps.finalize-media-delivery-failure.outputs.release-state-artifact-name || steps.finalize-pages-deploy-failure.outputs.release-state-artifact-name }}',
          '      release-state-artifact-id: ${{ steps.upload-release-state-artifact.outputs.artifact-id }}',
          '      release-state-sha256: ${{ steps.deploy-cloudflare-pages.outputs.release-state-sha256 || steps.finalize-r2-upload-failure.outputs.release-state-sha256 || steps.finalize-media-delivery-failure.outputs.release-state-sha256 || steps.finalize-pages-deploy-failure.outputs.release-state-sha256 }}',
          '      - id: upload-release-state-artifact',
          '        uses: ./actions/upload-artifact@0123456789abcdef0123456789abcdef01234567',
          '        with:',
          '          path: .generated/deployment/release-attempt-final.json',
          '          if-no-files-found: error',
          '      - id: download-release-state',
          '        uses: ./actions/download-artifact@0123456789abcdef0123456789abcdef01234567',
          '        continue-on-error: true',
          '        with:',
          '          artifact-ids: ${{ needs.deploy-production.outputs.release-state-artifact-id }}',
          '          digest-mismatch: error',
          '      - run: pnpm exec tsx scripts/deploy/record-runtime-verification.ts',
          '        env:',
          '          EXPECTED_RELEASE_STATE_SHA256: ${{ needs.deploy-production.outputs.release-state-sha256 }}',
          '      - id: record-release-state-resolution-failed',
          '        env:',
          '          RUNTIME_VERIFICATION_STATUS: release-state-resolution-failed',
          '      - if: ${{ steps.record-release-state-resolution-failed.outcome == \'success\' }}',
        ];

  await mkdir(snapshotDirectory, { recursive: true });
  await writeFile(
    workflowPath,
    [
      'jobs:',
      '  test:',
      '    steps:',
      `      - uses: ${workflowUses}`,
      options.extraRun ? `      - run: ${options.extraRun}` : '',
      ...workflowDeploySteps,
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
        "observeProductionBranchHead(authority, 'cloudflare-pages-deploy');",
        'void output;',
        'void parser;',
        'void commitDirty;',
        '',
      ].join('\n'),
    'utf8',
  );
  await writeFile(
    uploadR2ScriptPath,
    options.uploadR2ScriptSource ??
      "observeProductionBranchHead(authority, 'r2-media-upload');\nconst failed = { uploadedObjects: [] };\nvoid failed;\n",
    'utf8',
  );
  await writeFile(
    productionPreflightScriptPath,
    options.productionPreflightScriptSource ??
      "console.log('[production-authority] wrote validated production context');\n",
    'utf8',
  );
  await writeFile(
    packageJsonPath,
    JSON.stringify(
      {
        devDependencies: {
          wrangler: packageWranglerVersion,
        },
      },
      null,
      2,
    ),
    'utf8',
  );
  await writeFile(
    lockfilePath,
    [
      'importers:',
      '  .:',
      '    devDependencies:',
      '      wrangler:',
      `        specifier: ${lockWranglerSpecifier}`,
      `        version: ${lockWranglerVersion}`,
      '',
      'packages:',
      '',
      `  wrangler@${lockWranglerVersion}:`,
      '    resolution: {integrity: sha512-fixture}',
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

  return {
    workflowPath,
    snapshotRoot,
    readmePath,
    deployScriptPath,
    packageJsonPath,
    lockfilePath,
    uploadR2ScriptPath,
    productionPreflightScriptPath,
  };
};

describe('workflow source contract', () => {
  it('pins external actions to reviewed Node 24 commit snapshots', async () => {
    const report = await assertWorkflowSourceContract();

    expect(report.actionEvidence.length).toBeGreaterThan(0);
    expect(report.actionEvidence.every((evidence) => evidence.runsUsing === 'node24')).toBe(true);
    expect(report.workflowPath).toBe('.github/workflows/ci-cd.yml');
    expect(report.wranglerVersion).toBe('4.100.0');
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
        "observeProductionBranchHead(authority, 'cloudflare-pages-deploy');",
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

  it('rejects unpinned Wrangler package versions', async () => {
    const fixture = await writeWorkflowContractFixture({ packageWranglerVersion: '^4.100.0' });

    await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(/exact devDependency/u);
  });

  it('rejects package and lockfile Wrangler drift', async () => {
    const fixture = await writeWorkflowContractFixture({ lockWranglerVersion: '4.99.0' });

    await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(/pnpm-lock|lockfile/u);
  });

  it('rejects production preflight after production side effects', async () => {
    const fixture = await writeWorkflowContractFixture({ workflowStepOrder: 'preflight-after-upload' });

    await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(
      /preflight before production side effects/u,
    );
  });

  it('rejects missing current head gate before R2 upload', async () => {
    const fixture = await writeWorkflowContractFixture({ uploadR2ScriptSource: 'void 0;\n' });

    await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(/R2 upload/u);
  });

  it('rejects missing current head gate before Pages deploy', async () => {
    const fixture = await writeWorkflowContractFixture({
      deployScriptSource: [
        "const output = 'WRANGLER_OUTPUT_FILE_PATH';",
        "const parser = 'parseWranglerPagesDeployStructuredOutput';",
        "const commitDirty = '--commit-dirty=false';",
        'void output;',
        'void parser;',
        'void commitDirty;',
        '',
      ].join('\n'),
    });

    await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(/Pages deploy/u);
  });

  it('rejects full release state JSON in job outputs', async () => {
    const fixture = await writeWorkflowContractFixture({
      extraRun: 'echo "release-state-json=${FULL_RELEASE_STATE_JSON}" >> "$GITHUB_OUTPUT"',
    });

    await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(/full release state JSON/u);
  });

  it('rejects local absolute paths in production job logs', async () => {
    const fixture = await writeWorkflowContractFixture({
      productionPreflightScriptSource: 'console.log(`[production-authority] ${OUTPUT_PATH}`);\n',
    });

    await expect(assertWorkflowSourceContract(fixture)).rejects.toThrow(/local absolute paths/u);
  });
});
