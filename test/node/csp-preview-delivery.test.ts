import { copyFile, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import yaml from 'js-yaml';
import {
  copyPreviewBaseline,
  PREVIEW_TARGET,
  previewBuildStamp,
  previewReceipt,
  scanPreviewFiles,
} from '../../build/security/csp-preview-artifact.js';
import { collectCspStageOne, renderCspHeaders } from '../../build/security/csp-report-only.js';
import { assemblePreviewHeaders } from '../../build/security/csp-preview-headers.js';
import { buildThemeDocumentBootstrapScript } from '../../src/theme/theme-document-bootstrap.js';
import { buildThemeChromeBootstrapScript } from '../../src/theme/theme-chrome-bootstrap.js';
import { escapeInlineExecutableScriptText } from '../../src/layouts/html-output.js';
import {
  authorizePreviewDelivery,
  deliveryRecord,
  parsePreviewApproval,
  parsePreviewDeliveryPolicy,
  PREVIEW_REPOSITORY,
  PREVIEW_WORKFLOW,
  verifyPreviewServiceEvidence,
  type PreviewApproval,
  type PreviewDeliveryPolicy,
} from '../../scripts/deploy/csp-preview-authority.js';
import {
  inspectPreviewPacket,
  stagePreviewPacket,
  verifyApprovedPreviewPacket,
  type PreviewPacketIdentity,
} from '../../scripts/deploy/csp-preview-packet.js';
import {
  assertUnusedPreviewApproval,
  executePreviewTransaction,
  previewWranglerArgs,
  reconcilePreviewAttempt,
  verifyPreviewDeployment,
  type PreviewAttempt,
  type PreviewDeliveryPorts,
} from '../../scripts/deploy/csp-preview-transaction.js';

const sha = '12345678'.repeat(5),
  trustedSha = 'a'.repeat(40),
  digest = 'b'.repeat(64);
const approval: PreviewApproval = {
  id: 'review-1',
  mode: 'report-only',
  sourceSha: sha,
  producerRunId: '101',
  producerAttempt: 1,
  producerWorkflowSha: trustedSha,
  artifactId: '102',
  artifactZipDigest: `sha256:${digest}`,
  packetDigest: digest,
  receiptDigest: digest,
  artifactDigest: digest,
  baselineDigest: digest,
  ciRunId: '103',
  ciWorkflowDigest: digest,
  approvalRef: 'Sentinel_review_1',
};
const withPacket = (identity: PreviewPacketIdentity): PreviewApproval => ({
  ...approval,
  sourceSha: identity.sourceSha,
  packetDigest: identity.packetDigest,
  receiptDigest: identity.receiptDigest,
  artifactDigest: identity.artifactDigest,
  baselineDigest: identity.baselineDigest,
});
const policy = (): PreviewDeliveryPolicy => ({
  schema: 1,
  repository: PREVIEW_REPOSITORY,
  target: PREVIEW_TARGET,
  deliveryEnabled: true,
  accountId: 'c'.repeat(32),
  existingCredentialBinding: 'reviewed-existing-binding',
  credentialScopeConfirmed: true,
  actionsReadApproved: true,
  destinationReviewed: true,
  stage0Reviewed: true,
  rollbackRetentionConfirmed: true,
  approvals: [approval],
});
const execution = {
  repository: PREVIEW_REPOSITORY,
  event: 'workflow_dispatch',
  ref: 'refs/heads/main',
  workflowRef: `${PREVIEW_REPOSITORY}/${PREVIEW_WORKFLOW}@refs/heads/main`,
  workflowSha: trustedSha,
  checkoutSha: trustedSha,
};
const evidence = () => ({
  producer: {
    id: 101,
    run_attempt: 1,
    path: PREVIEW_WORKFLOW,
    head_sha: trustedSha,
    head_branch: 'main',
    event: 'workflow_dispatch',
    status: 'completed',
    conclusion: 'success',
    repository: { full_name: PREVIEW_REPOSITORY },
  },
  artifact: {
    id: 102,
    name: 'rouault-csp-preview-packet',
    expired: false,
    digest: `sha256:${digest}`,
    workflow_run: { id: 101, head_sha: trustedSha },
  },
  ci: {
    id: 103,
    path: '.github/workflows/ci-cd.yml',
    head_sha: sha,
    event: 'workflow_dispatch',
    status: 'completed',
    conclusion: 'success',
    repository: { full_name: PREVIEW_REPOSITORY },
  },
  ciWorkflowDigest: digest,
});
const deployment = () => ({
  id: '01234567-89ab-cdef-0123-456789abcdef',
  url: 'https://1234abcd.rouault.pages.dev',
  project_name: 'rouault',
  environment: 'preview',
  aliases: [PREVIEW_TARGET.origin],
  deployment_trigger: { metadata: { branch: 'csp-verify', commit_hash: sha, commit_dirty: false } },
  latest_stage: { name: 'deploy', status: 'success' },
});

// packet構造の小fixture。source-owned allowlistと実WASMの合格は、既存試験・実buildで別に確認する。
const fixture = async (run: (root: string, packet: string) => Promise<void>) => {
  const root = await mkdtemp(path.join(tmpdir(), 'csp-delivery-'));
  const dist = path.join(root, 'dist'),
    packet = path.join(root, '.generated/csp-preview');
  try {
    for (const directory of [
      dist + '/client-assets',
      root + '/.generated/csp',
      root + '/.generated/client/.vite',
      packet,
      root + '/src/assets/css',
      dist + '/assets/css',
    ])
      await mkdir(directory, { recursive: true });
    const scripts = [buildThemeDocumentBootstrapScript(), buildThemeChromeBootstrapScript()].map(
      escapeInlineExecutableScriptText,
    );
    await writeFile(
      path.join(dist, 'index.html'),
      `<html><head><meta name="rouault-site-origin" content="${PREVIEW_TARGET.origin}"><meta name="rouault-build-id" content="12345678"><script>${scripts[0]}</script><script type="module" src="/client-assets/app.js"></script></head><body><script>${scripts[1]}</script></body></html>`,
    );
    await writeFile(
      path.join(dist, 'client-assets/app.js'),
      'new Worker(new URL("./worker.js",import.meta.url),{type:"module"});',
    );
    await writeFile(path.join(dist, 'client-assets/worker.js'), 'export {};');
    for (const destination of [
      root + '/src/assets/css/about-shell.css',
      dist + '/assets/css/about-shell.css',
    ])
      await copyFile('src/assets/css/about-shell.css', destination);
    await copyFile('_redirects', path.join(dist, '_redirects'));
    const cache = '/client-assets/*\n  Cache-Control: public, max-age=31536000, immutable\n';
    await writeFile(path.join(dist, '_headers'), cache);
    const viteManifestFile = path.join(root, '.generated/client/.vite/manifest.json');
    await writeFile(
      viteManifestFile,
      JSON.stringify({ 'src/client.ts': { file: 'client-assets/app.js', isEntry: true } }),
    );
    const manifest = await collectCspStageOne(dist, PREVIEW_TARGET.mediaOrigin, {
      viteManifestFile,
    });
    const fragment = renderCspHeaders(manifest),
      files = await scanPreviewFiles(dist);
    await writeFile(path.join(root, '.generated/csp/manifest.json'), JSON.stringify(manifest));
    await writeFile(path.join(root, '.generated/csp/report-only.headers'), fragment);
    await writeFile(
      path.join(root, '.generated/csp-preview-build.json'),
      previewBuildStamp(sha, files),
    );
    await copyPreviewBaseline(dist, packet + '/baseline', files);
    await copyPreviewBaseline(dist, packet + '/report-only', files);
    await writeFile(
      path.join(packet, 'report-only/_headers'),
      assemblePreviewHeaders(cache, fragment, manifest),
    );
    const receipt = previewReceipt(
      sha,
      manifest,
      files,
      await scanPreviewFiles(packet + '/report-only'),
      fragment,
    );
    await writeFile(path.join(packet, 'preparation.json'), JSON.stringify(receipt, null, 2) + '\n');
    await stagePreviewPacket(root, sha);
    await run(root, packet);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
};

describe('preview delivery authority', () => {
  it('requires independent approval and keeps repository policy inactive', async () => {
    const actual = parsePreviewDeliveryPolicy(
      JSON.parse(await readFile('.github/csp-preview-delivery.json', 'utf8')) as unknown,
    );
    expect(actual.deliveryEnabled).toBe(false);
    expect(actual.approvals).toEqual([]);
    expect(() => authorizePreviewDelivery(actual, 'review-1', execution)).toThrow('confirmed');
    expect(authorizePreviewDelivery(policy(), 'review-1', execution)).toEqual(approval);
    expect(() => authorizePreviewDelivery(policy(), 'candidate-receipt', execution)).toThrow(
      'independently',
    );
  });
  it.each([
    'deliveryEnabled',
    'credentialScopeConfirmed',
    'actionsReadApproved',
    'destinationReviewed',
    'stage0Reviewed',
    'rollbackRetentionConfirmed',
  ] as const)('blocks missing %s', (key) => {
    expect(() =>
      authorizePreviewDelivery({ ...policy(), [key]: false }, 'review-1', execution),
    ).toThrow();
  });
  it.each(['accountId', 'existingCredentialBinding'] as const)('blocks unknown %s', (key) => {
    expect(() =>
      authorizePreviewDelivery({ ...policy(), [key]: null }, 'review-1', execution),
    ).toThrow();
  });
  it.each([
    { ref: 'refs/heads/verify/candidate' },
    { event: 'push' },
    { checkoutSha: sha },
    { workflowSha: 'main' },
    { workflowRef: `${PREVIEW_REPOSITORY}/${PREVIEW_WORKFLOW}@refs/heads/candidate` },
    { repository: 'other/rouault' },
  ])('rejects candidate authority %j', (change) => {
    expect(() =>
      authorizePreviewDelivery(policy(), 'review-1', { ...execution, ...change }),
    ).toThrow('trusted');
  });
  it.each([
    { ...PREVIEW_TARGET, branch: 'main' },
    { ...PREVIEW_TARGET, origin: 'https://rouault.page' },
    { ...PREVIEW_TARGET, project: 'other' },
    { ...PREVIEW_TARGET, origin: 'https://other.pages.dev' },
  ])('rejects wrong or production target', (target) => {
    expect(() => parsePreviewDeliveryPolicy({ ...policy(), target })).toThrow('target');
  });
  it('rejects incomplete/extended approvals, short SHA and duplicate IDs', () => {
    for (const change of [
      { sourceSha: '12345678' },
      { artifactZipDigest: digest },
      { arbitraryPath: '../production' },
    ])
      expect(() => parsePreviewApproval({ ...approval, ...change })).toThrow();
    expect(() =>
      parsePreviewDeliveryPolicy({ ...policy(), approvals: [approval, approval] }),
    ).toThrow('duplicate');
    expect(() => parsePreviewDeliveryPolicy({ ...policy(), token: 'not-saved' })).toThrow('fields');
  });
  it('checks service identity independently of candidate receipt', () => {
    verifyPreviewServiceEvidence(approval, evidence());
    for (const field of ['producer', 'artifact', 'ci'] as const) {
      const changed = evidence();
      changed[field].id = 999;
      expect(() => verifyPreviewServiceEvidence(approval, changed)).toThrow('identity');
    }
    const changed = evidence();
    changed.artifact.digest = 'sha256:' + 'f'.repeat(64);
    expect(() => verifyPreviewServiceEvidence(approval, changed)).toThrow('digest');
    expect(() =>
      verifyPreviewServiceEvidence(approval, { ...evidence(), ciWorkflowDigest: 'f'.repeat(64) }),
    ).toThrow('definition');
  });
  it.each([
    ['producer', { head_sha: sha }],
    ['producer', { event: 'push' }],
    ['producer', { head_branch: 'candidate' }],
    ['producer', { run_attempt: 2 }],
    ['producer', { conclusion: 'failure' }],
    ['artifact', { expired: true }],
    ['artifact', { workflow_run: { id: 999, head_sha: trustedSha } }],
    ['ci', { head_sha: trustedSha }],
    ['ci', { path: '.github/workflows/other.yml' }],
    ['ci', { conclusion: 'failure' }],
    ['ci', { repository: { full_name: 'other/repo' } }],
  ] as const)('rejects changed service evidence %s', (field, change) => {
    const current = evidence();
    expect(() =>
      verifyPreviewServiceEvidence(approval, {
        ...current,
        [field]: { ...current[field], ...change },
      }),
    ).toThrow();
  });
});

describe('trusted preview packet', () => {
  it('recomputes header-only transformation and independent digests', async () =>
    fixture(async (_root, packet) => {
      const result = await inspectPreviewPacket(packet, sha);
      expect(result.fileCount).toBe(6);
      expect(result.artifactDigest).not.toBe(result.baselineDigest);
      verifyApprovedPreviewPacket(withPacket(result), result);
      expect(() => verifyApprovedPreviewPacket(approval, result)).toThrow('independently');
      await expect(inspectPreviewPacket(packet, 'f'.repeat(40))).rejects.toThrow();
    }));
  it.each([
    'report-only/diagnostics.json',
    'report-only/functions/index.js',
    'report-only/_worker.js',
    'baseline/_routes.json',
    'report-only/private/index.html',
    'proof/extra.json',
  ])('rejects extra payload %s', async (file) =>
    fixture(async (_root, packet) => {
      await mkdir(path.dirname(path.join(packet, file)), { recursive: true });
      await writeFile(path.join(packet, file), 'unapproved');
      await expect(inspectPreviewPacket(packet, sha)).rejects.toThrow();
    }),
  );
  it.each([
    'report-only/client-assets/worker.js',
    'baseline/index.html',
    'baseline/assets/css/about-shell.css',
    'proof/build.json',
    'preparation.json',
  ])('rejects changed bytes %s', async (file) =>
    fixture(async (_root, packet) => {
      await writeFile(path.join(packet, file), 'changed');
      await expect(inspectPreviewPacket(packet, sha)).rejects.toThrow();
    }),
  );
  it('rejects Worker leakage and symlink roots', async () =>
    fixture(async (root, packet) => {
      const headers = path.join(packet, 'report-only/_headers');
      await writeFile(
        headers,
        (await readFile(headers, 'utf8')).replace('  ! Content-', '  # Content-'),
      );
      await expect(inspectPreviewPacket(packet, sha)).rejects.toThrow();
      await symlink(packet, root + '/linked');
      await expect(inspectPreviewPacket(root + '/linked', sha)).rejects.toThrow('indirect');
    }));
});

describe('preview transaction model without live adapters', () => {
  const history = { complete: true, attemptedApprovalIds: [] };
  it('fixes branch and command; incomplete or used histories never retry', () => {
    expect(previewWranglerArgs(approval)).toEqual([
      'pages',
      'deploy',
      'payload',
      '--project-name=rouault',
      '--branch=csp-verify',
      `--commit-hash=${sha}`,
      '--commit-dirty=false',
    ]);
    for (const h of [
      { complete: false, attemptedApprovalIds: [] },
      { complete: true, attemptedApprovalIds: [approval.id] },
    ])
      expect(() => assertUnusedPreviewApproval(approval, h)).toThrow('reconciliation');
  });
  it.each(['report-only', 'baseline'] as const)(
    'validates authority before reservation, then selects %s',
    async (mode) =>
      fixture(async (_root, packet) => {
        const identity = await inspectPreviewPacket(packet, sha),
          approved = { ...withPacket(identity), mode };
        const p = { ...policy(), approvals: [approved] },
          calls: string[] = [];
        const ports: PreviewDeliveryPorts = {
          reserve: async () => {
            calls.push('reserve');
          },
          persist: async (v) => {
            calls.push(v.status);
          },
          upload: async (_args, payload) => {
            calls.push('upload');
            expect(payload.directory).toBe(path.join(packet, mode));
            expect(payload.digest).toBe(
              mode === 'baseline' ? identity.baselineDigest : identity.artifactDigest,
            );
          },
          observe: async () => deployment(),
          verifyHttp: async () => true,
        };
        const request = {
          policy: p,
          approvalId: approval.id,
          execution,
          evidence: evidence(),
          packetRoot: packet,
          history,
        };
        await expect(
          executePreviewTransaction(
            { ...request, policy: { ...p, deliveryEnabled: false } },
            ports,
          ),
        ).rejects.toThrow();
        expect(calls).toEqual([]);
        expect((await executePreviewTransaction(request, ports)).status).toBe('verified');
        expect(calls).toEqual([
          'reserve',
          'upload-started',
          'upload',
          'deployed-unverified',
          'verified',
        ]);
      }),
  );
  it('persists unknown upload results and never repeats the operation', async () =>
    fixture(async (_root, packet) => {
      const approved = withPacket(await inspectPreviewPacket(packet, sha));
      const saved: PreviewAttempt[] = [];
      let uploads = 0;
      const ports: PreviewDeliveryPorts = {
        reserve: async (v) => {
          saved.push(v);
        },
        persist: async (v) => {
          saved.push(v);
        },
        upload: async () => {
          uploads++;
          throw new Error('unknown result');
        },
        observe: async () => deployment(),
        verifyHttp: async () => true,
      };
      const result = await executePreviewTransaction(
        {
          policy: { ...policy(), approvals: [approved] },
          approvalId: approved.id,
          execution,
          evidence: evidence(),
          packetRoot: packet,
          history,
        },
        ports,
      );
      expect(uploads).toBe(1);
      expect(result.status).toBe('uncertain');
      expect(saved.at(-1)).toEqual(result);
      expect((await reconcilePreviewAttempt(result, [], async () => true)).status).toBe(
        'uncertain',
      );
      expect(
        (await reconcilePreviewAttempt(result, [deployment(), deployment()], async () => true))
          .status,
      ).toBe('uncertain');
      expect(
        (await reconcilePreviewAttempt(result, [deployment()], async () => false)).status,
      ).toBe('uncertain');
      expect((await reconcilePreviewAttempt(result, [deployment()], async () => true)).status).toBe(
        'verified',
      );
    }));
  it.each(['reserve', 'persist'] as const)('never uploads after %s failure', async (phase) =>
    fixture(async (_root, packet) => {
      const approved = withPacket(await inspectPreviewPacket(packet, sha));
      let uploads = 0;
      const ports: PreviewDeliveryPorts = {
        reserve: async () => {
          if (phase === 'reserve') throw new Error('reservation unavailable');
        },
        persist: async () => {
          throw new Error('journal unavailable');
        },
        upload: async () => {
          uploads++;
        },
        observe: async () => deployment(),
        verifyHttp: async () => true,
      };
      await expect(
        executePreviewTransaction(
          {
            policy: { ...policy(), approvals: [approved] },
            approvalId: approved.id,
            execution,
            evidence: evidence(),
            packetRoot: packet,
            history,
          },
          ports,
        ),
      ).rejects.toThrow();
      expect(uploads).toBe(0);
    }),
  );
  it('rejects production/source/alias mismatch in API evidence', () => {
    verifyPreviewDeployment(deployment(), sha);
    for (const change of [
      { environment: 'production' },
      { project_name: 'other' },
      { aliases: [] },
      { aliases: [PREVIEW_TARGET.origin, 'https://rouault.page'] },
      { url: 'https://rouault.page/' },
      { latest_stage: { name: 'deploy', status: 'failure' } },
      {
        deployment_trigger: { metadata: { branch: 'main', commit_hash: sha, commit_dirty: false } },
      },
    ])
      expect(() => verifyPreviewDeployment({ ...deployment(), ...change }, sha)).toThrow();
    expect(() => verifyPreviewDeployment(deployment(), trustedSha)).toThrow();
  });
});

describe('preview delivery workflow and CLI boundary', () => {
  it('separates uncredentialed candidate execution and trusted preflight without extra grants', async () => {
    const raw = await readFile('.github/workflows/csp-preview-delivery.yml', 'utf8');
    const w = deliveryRecord(yaml.load(raw)),
      jobs = deliveryRecord(w['jobs']);
    expect(w['permissions']).toEqual({ contents: 'read' });
    expect(Object.keys(deliveryRecord(w['on']))).toEqual(['workflow_dispatch']);
    expect(raw).not.toMatch(
      /secrets\.|environment:|R2_|CLOUDFLARE_API_TOKEN|actions: read|pages deploy/u,
    );
    for (const job of Object.values(jobs)) {
      const row = deliveryRecord(job);
      expect(row['if']).toContain("github.ref == 'refs/heads/main'");
    }
    const steps = deliveryRecord(jobs['prepare'])['steps'];
    if (!Array.isArray(steps)) throw new Error('workflow steps missing');
    const commands = steps
      .map((s: unknown) => deliveryRecord(s)['run'])
      .filter((s: unknown) => typeof s === 'string');
    const required = [
      'pnpm build:csp-preview',
      'pnpm generate:csp-stage1',
      'pnpm verify:csp-stage1',
      'pnpm prepare:csp-preview',
      'pnpm dry-run:csp-preview',
    ];
    const indices = required.map((s) => commands.indexOf(s));
    expect(indices.every((index) => index >= 0)).toBe(true);
    expect([...indices].sort((a, b) => a - b)).toEqual(indices);
    expect(raw).toContain('ref: ${{ github.workflow_sha }}');
    expect(raw).toContain('persist-credentials: false');
    expect(raw).not.toContain('${{ inputs.approval_id }}');
  });
  it.each(['preflight', 'publish'])(
    'blocks %s without leaking supplied data or invoking upload',
    async (action) => {
      const root = await mkdtemp(path.join(tmpdir(), 'csp-delivery-input-'));
      const event = path.join(root, 'event.json');
      await writeFile(event, JSON.stringify({ inputs: { approval_id: 'sensitive?query=marker' } }));
      try {
        const p = spawnSync(
          process.execPath,
          ['--import', 'tsx', 'scripts/deploy/prepare-csp-preview-delivery.ts', action],
          {
            encoding: 'utf8',
            env: { ...process.env, GITHUB_EVENT_PATH: event },
          },
        );
        expect(p.status).toBe(1);
        expect(p.stdout).toBe('');
        expect(p.stderr).toBe(
          '[preview-delivery] blocked; no publication attempted; confirm trusted policy and pending delivery adapters\n',
        );
        expect(p.stderr).not.toContain('marker');
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  );
});
