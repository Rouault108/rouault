import { describe, it, expect, vi } from 'vitest';
import { mkdtemp, readFile, writeFile, unlink, rm, rename } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PREVIEW_TARGET } from '../../build/security/csp-preview-artifact.js';
import { previewWranglerEnvironment } from '../../scripts/deploy/csp-preview-wrangler.js';
import { assetJwt } from './helpers/csp-preview-adapter-fixture.js';
import { previewPostAgent } from '../../scripts/deploy/csp-preview-post.js';
import { PreviewGithubAdapter } from '../../scripts/deploy/csp-preview-github.js';
import { PreviewPagesAdapter } from '../../scripts/deploy/csp-preview-pages.js';
import { jsonResponse } from './helpers/csp-preview-adapter-fixture.js';
import { githubFixture } from './helpers/csp-preview-adapter-fixture.js';
import {
  parseSupervisedReview,
  supervisePreviewOnce,
  reconcileSupervisedPreview,
  supervisedMarker,
  supervisedReviewDigest,
  type SupervisedReview,
  type SupervisedPorts,
} from '../../scripts/deploy/csp-preview-supervised.js';
import { inspectSupervisedRecord } from '../../scripts/deploy/csp-preview-supervised-record.js';
import { snapshotBeforeUpload } from '../../scripts/deploy/csp-preview-transaction.js';
import { assertSupervisedEnvironment } from '../../scripts/deploy/csp-preview-supervised-runtime.js';
import { supervisedPorts } from '../../scripts/deploy/csp-preview-supervised-runtime.js';
import { deployment, approval } from './helpers/csp-preview-delivery-fixture.js';

const now = '2026-11-04T00:00:00.000Z';
const review = (): SupervisedReview => ({
  schema: 1,
  target: PREVIEW_TARGET,
  accountId: 'c'.repeat(32),
  packet: {
    sourceSha: approval.sourceSha,
    buildId: approval.sourceSha.slice(0, 8),
    packetDigest: 'b'.repeat(64),
    receiptDigest: 'b'.repeat(64),
    artifactDigest: 'b'.repeat(64),
    baselineDigest: 'b'.repeat(64),
    fileCount: 1,
  },
  publishedMainSha: 'a'.repeat(40),
  trustedToolSha: 'a'.repeat(40),
  sourceCI: { runId: '103', attempt: 1, workflowDigest: 'b'.repeat(64) },
  toolCI: { runId: '104', attempt: 1, workflowDigest: 'b'.repeat(64) },
  mode: 'report-only',
  previousAliasId: null,
  approvalRef: 'approved-once',
  credentialLabel: 'pages-preview',
  credentialReviewRef: 'reviewed-scope',
  credentialPurpose: 'pages-only-not-build-token',
  expiresAt: '2026-11-04T00:30:00.000Z',
});
const snapshot = (rows: unknown[] = []) => ({
  complete: true,
  observedAt: '2026-11-04T00:00:03.000Z',
  deployments: rows,
});
const row = (r: SupervisedReview) => ({
  ...deployment(),
  created_on: '2026-11-04T00:00:03.000Z',
  deployment_trigger: {
    metadata: {
      ...deployment().deployment_trigger.metadata,
      commit_message: supervisedMarker(r),
    },
  },
});
const fixture = async (run: (file: string) => Promise<void>) => {
  const dir = await mkdtemp(path.join(tmpdir(), 'csp-supervised-test-'));
  try {
    await run(path.join(dir, 'record.jsonl'));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};
const ports = (r: SupervisedReview) => {
  let posted = false;
  const p: SupervisedPorts = {
    verifyPacketAndCI: vi.fn(async () => undefined),
    project: vi.fn(async () => undefined),
    snapshot: vi.fn(async () => snapshot(posted ? [row(r)] : [])),
    confirm: vi.fn(async (s) => s.challenge),
    uploadAssets: vi.fn(async () => ({ manifest: {}, headers: '', redirects: '' })),
    create: vi.fn(async () => {
      posted = true;
      return { deploymentId: deployment().id };
    }),
    wait: vi.fn(async () => undefined),
    verifyHttp: vi.fn(async () => undefined),
    now: () => now,
  };
  return {
    p,
    setPosted: () => {
      posted = true;
    },
  };
};

describe('supervised local preview authority', () => {
  it('keeps creation on the single-POST port instead of the generic read transport', async () => {
    const r = review(),
      read = vi.fn(async () => {
        throw new Error('unexpected-read-port');
      }),
      post = vi.fn(async () => jsonResponse({ success: true, errors: [], result: row(r) }));
    const runtime = supervisedPorts(
      {
        trustedRoot: process.cwd(),
        packetRoot: '/unused-fixture',
        review: r,
        token: () => 'mock-only',
        confirm: async (s) => s.challenge,
      },
      { transport: read, post },
    );
    await expect(
      runtime.ports.create({ manifest: {}, headers: '', redirects: '' }, supervisedMarker(r)),
    ).resolves.toEqual({ deploymentId: deployment().id });
    expect(post).toHaveBeenCalledTimes(1);
    expect(read).not.toHaveBeenCalled();
  });
  it('retains an interrupted result when the record disappears after service acceptance', async () =>
    fixture(async (file) => {
      const r = review(),
        { p, setPosted } = ports(r);
      p.create = vi.fn(async () => {
        setPosted();
        await unlink(file);
        return { deploymentId: deployment().id };
      });
      const result = await supervisePreviewOnce(r, file, p);
      expect(result).toMatchObject({
        operationStatus: 'confirmed',
        sessionStatus: 'interrupted',
        recordStatus: 'unavailable',
        creationPostInvocations: 1,
      });
      expect(p.create).toHaveBeenCalledTimes(1);
      const again = ports(r);
      again.p.snapshot = async () => snapshot([row(r)]);
      await supervisePreviewOnce(r, file, again.p);
      expect(again.p.create).not.toHaveBeenCalled();
    }));
  it('checks the same reviewed CI anonymously without inventing a producer workflow', async () => {
    const github = githubFixture();
    await new PreviewGithubAdapter(null, github.transport).verifiedCI({
      sha: approval.sourceSha,
      runId: '103',
      attempt: 1,
      workflowDigest: github.approval.ciWorkflowDigest,
    });
    expect(github.calls.length).toBeGreaterThan(0);
    for (const call of github.calls) {
      expect(new Headers(call.init.headers).has('authorization')).toBe(false);
      expect(call.url).not.toMatch(/artifacts|runs\/101/u);
    }
    const bad = githubFixture(undefined, (key, value) =>
      key === '/actions/runs/103' ? { ...(value as object), head_sha: 'f'.repeat(40) } : value,
    );
    await expect(
      new PreviewGithubAdapter(null, bad.transport).verifiedCI({
        sha: approval.sourceSha,
        runId: '103',
        attempt: 1,
        workflowDigest: bad.approval.ciWorkflowDigest,
      }),
    ).rejects.toThrow();
  });
  it('requires the existing global Pages hostname in the reviewed account', async () => {
    for (const subdomain of ['other.pages.dev', undefined]) {
      const pages = new PreviewPagesAdapter('c'.repeat(32), 'mock', async () =>
        jsonResponse(
          {
            success: true,
            errors: [],
            result: { name: 'rouault', production_branch: 'main', subdomain },
          },
          { date: 'Wed, 04 Nov 2026 00:00:00 GMT' },
        ),
      );
      await expect(pages.project('rouault.pages.dev')).rejects.toThrow();
    }
    const pages = new PreviewPagesAdapter('c'.repeat(32), 'mock', async () =>
      jsonResponse(
        {
          success: true,
          errors: [],
          result: { name: 'rouault', production_branch: 'main', subdomain: 'rouault.pages.dev' },
        },
        { date: 'Wed, 04 Nov 2026 00:00:00 GMT' },
      ),
    );
    await expect(pages.project('rouault.pages.dev')).resolves.toBeUndefined();
  });
  it('bounds an unanswered confirmation and does not create a deployment', async () =>
    fixture(async (file) => {
      const r = review(),
        { p } = ports(r);
      p.confirm = () => new Promise<string>(() => undefined);
      p.confirmationTimeoutMs = 1;
      const result = await supervisePreviewOnce(r, file, p);
      expect(result).toMatchObject({ verifiedUrl: null, sessionStatus: 'interrupted' });
      expect(p.create).not.toHaveBeenCalled();
    }));
  it.each([
    'target',
    'main-origin',
    'expiry',
    'broad-token',
    'extra',
    'missing-baseline',
    'bad-ci',
  ])('rejects %s before service or credential access', async (mutation) =>
    fixture(async (file) => {
      const r: Record<string, unknown> = structuredClone(review()) as unknown as Record<
        string,
        unknown
      >;
      if (mutation === 'target') r['target'] = { ...PREVIEW_TARGET, branch: 'main' };
      if (mutation === 'main-origin')
        r['target'] = { ...PREVIEW_TARGET, origin: 'https://rouault.page' };
      if (mutation === 'expiry') r['expiresAt'] = now;
      if (mutation === 'broad-token') r['credentialLabel'] = 'rouault-build';
      if (mutation === 'extra') r['resume'] = true;
      if (mutation === 'missing-baseline') r['packet'] = { ...review().packet, baselineDigest: '' };
      if (mutation === 'bad-ci') r['toolCI'] = { ...review().toolCI, attempt: 0 };
      const { p } = ports(review());
      await expect(supervisePreviewOnce(r, file, p)).rejects.toThrow();
      expect(p.project).not.toHaveBeenCalled();
      expect(p.create).not.toHaveBeenCalled();
    }),
  );
  it('never adopts production build or R2 credentials', () => {
    for (const name of [
      'CLOUDFLARE_API_TOKEN',
      'CF_API_TOKEN',
      'CLOUDFLARE_API_KEY',
      'R2_ACCESS_KEY_ID',
      'AWS_ACCESS_KEY_ID',
    ])
      expect(() => assertSupervisedEnvironment({ [name]: 'mock' })).toThrow();
    expect(() => assertSupervisedEnvironment({ CSP_SUPERVISED_PAGES_TOKEN: 'mock' })).not.toThrow();
  });
  it('preserves approved lower-case proxy settings without inheriting parent credentials', () => {
    const env = previewWranglerEnvironment('/tmp/owned-fixture', assetJwt, {
      https_proxy: 'http://127.0.0.1:1234',
      no_proxy: '127.0.0.1',
    });
    expect(env['https_proxy']).toBe('http://127.0.0.1:1234');
    expect(env['no_proxy']).toBe('127.0.0.1');
    expect(env['CSP_SUPERVISED_PAGES_TOKEN']).toBeUndefined();
    expect(() => assertSupervisedEnvironment({ NODE_TLS_REJECT_UNAUTHORIZED: '0' })).toThrow();
    expect(() => assertSupervisedEnvironment({ NODE_DEBUG: 'https' })).toThrow();
  });
  it('uses an unshared proxy-aware agent without persistent sockets', () => {
    const env = { HTTPS_PROXY: 'http://127.0.0.1:12345' };
    const agent = previewPostAgent(env);
    try {
      expect(agent.options.keepAlive).toBe(false);
      expect(agent.maxSockets).toBe(1);
      expect(agent.options.proxyEnv).toEqual(env);
    } finally {
      agent.destroy();
    }
  });
  it('publishes only in the living confirmed session, keeping readback non-publishing', async () =>
    fixture(async (file) => {
      const r = review(),
        { p } = ports(r);
      const result = await supervisePreviewOnce(r, file, p);
      expect(result).toMatchObject({
        operationStatus: 'confirmed',
        contentStatus: 'matches',
        verifiedUrl: deployment().url,
      });
      expect(p.create).toHaveBeenCalledTimes(1);
      const loaded = await inspectSupervisedRecord(file, supervisedReviewDigest(r));
      expect(loaded).toMatchObject({ publicationAllowed: false, resumeAllowed: false });
      expect('publish' in loaded).toBe(false);
      const second = ports(r);
      await expect(supervisePreviewOnce(r, file, second.p)).rejects.toThrow();
      expect(second.p.create).not.toHaveBeenCalled();
    }));
  it('atomically refuses concurrent sessions for the same record', async () =>
    fixture(async (file) => {
      const r = review(),
        a = ports(r),
        b = ports(r);
      const result = await Promise.allSettled([
        supervisePreviewOnce(r, file, a.p),
        supervisePreviewOnce(r, file, b.p),
      ]);
      expect(result.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
      expect(
        vi.mocked(a.p.create).mock.calls.length + vi.mocked(b.p.create).mock.calls.length,
      ).toBe(1);
    }));
  it.each([
    'cancel',
    'old-confirmation',
    'lost',
    'replacement',
    'restored',
    'tampered',
    'expiry',
    'alias-move',
    'duplicate-marker',
    'bad-ci',
  ])('does not create or automatically retry after %s', async (mutation) =>
    fixture(async (file) => {
      const r = review(),
        { p } = ports(r);
      let original: Buffer | undefined,
        expired = false;
      p.now = () => (expired ? '2026-11-04T01:00:00.000Z' : now);
      const base = p.confirm;
      p.confirm = async (summary) => {
        original = await readFile(file);
        if (mutation === 'cancel') return '';
        if (mutation === 'old-confirmation') return 'previous-session-challenge';
        if (mutation === 'lost') await unlink(file);
        if (mutation === 'replacement') {
          await rename(file, file + '.old');
          await writeFile(file, original);
        }
        if (mutation === 'tampered') await writeFile(file, 'tampered');
        if (mutation === 'expiry') expired = true;
        if (mutation === 'alias-move')
          p.snapshot = async () =>
            snapshot([row({ ...r, packet: { ...r.packet, packetDigest: 'd'.repeat(64) } })]);
        if (mutation === 'duplicate-marker') p.snapshot = async () => snapshot([row(r)]);
        if (mutation === 'bad-ci')
          p.verifyPacketAndCI = async () => {
            throw new Error('missing-ci');
          };
        return base(summary);
      };
      const upload = p.uploadAssets;
      p.uploadAssets = async () => {
        if (mutation === 'restored' && original) await writeFile(file, original);
        return upload();
      };
      const result = await supervisePreviewOnce(r, file, p);
      expect(result.verifiedUrl).toBeNull();
      expect(p.create).not.toHaveBeenCalled();
    }),
  );
  it('counts all matching markers before using a successful receipt or alias', async () => {
    const r = review(),
      a = row(r),
      b = {
        ...row(r),
        id: '11111111-2222-3333-4444-555555555555',
        latest_stage: { name: 'deploy', status: 'active' },
        aliases: [],
      };
    await expect(
      reconcileSupervisedPreview(
        r,
        snapshot([a, b]),
        snapshotBeforeUpload(snapshot()),
        a.id,
        async () => undefined,
      ),
    ).rejects.toThrow('duplicate');
  });
  it('keeps old identical content and record loss separate from current operation success', async () => {
    const r = review(),
      a = row(r);
    const old = snapshotBeforeUpload(snapshot([a]));
    for (const before of [null, old])
      expect(
        await reconcileSupervisedPreview(r, snapshot([a]), before, null, async () => undefined),
      ).toMatchObject({
        contentStatus: 'matches',
        operationStatus: 'unknown',
        verifiedUrl: null,
        publicationAllowed: false,
      });
    expect(() => supervisedMarker({ ...r, approvalRef: 'new-ref' })).not.toThrow();
    expect(supervisedMarker({ ...r, approvalRef: 'new-ref' })).toBe(supervisedMarker(r));
  });
  it('reconciles a lost creation response using GET and HTTP, without another creation', async () =>
    fixture(async (file) => {
      const r = review(),
        { p, setPosted } = ports(r);
      p.create = vi.fn(async () => {
        setPosted();
        throw new Error('response-lost');
      });
      const result = await supervisePreviewOnce(r, file, p);
      expect(result.operationStatus).toBe('confirmed');
      expect(p.create).toHaveBeenCalledTimes(1);
    }));
  it.each(['8000000', 'disconnect', 'redirect', 'interruption'])(
    'does not retry when %s leaves creation unknown',
    async (reason) =>
      fixture(async (file) => {
        const r = review(),
          { p } = ports(r);
        p.create = vi.fn(async () => {
          throw new Error(reason);
        });
        const result = await supervisePreviewOnce(r, file, p);
        expect(result.operationStatus).toBe('unknown');
        expect(p.create).toHaveBeenCalledTimes(1);
      }),
  );
  it('requires an explicit separate baseline review; changing mode changes the attempt identity', () => {
    const r = review();
    expect(supervisedMarker({ ...r, mode: 'baseline' })).not.toBe(supervisedMarker(r));
    const parsed = parseSupervisedReview(
      { ...r, mode: 'baseline', approvalRef: 'separate-rollback' },
      now,
    );
    expect(parsed.mode).toBe('baseline');
    expect(parsed.packet.baselineDigest).toBe(r.packet.baselineDigest);
  });
});
