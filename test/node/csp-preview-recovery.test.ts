import { describe, it, expect } from 'vitest';
import { PreviewJournalAdapter } from '../../scripts/deploy/csp-preview-journal.js';
import {
  reconcilePreviewAttempt,
  snapshotBeforeUpload,
  assertRecoverablePreviewSnapshot,
  type PreviewAttempt,
} from '../../scripts/deploy/csp-preview-transaction.js';
import {
  parsePreviewApproval,
  type PreviewApproval,
} from '../../scripts/deploy/csp-preview-authority.js';
import { runPreviewDelivery } from '../../scripts/deploy/csp-preview-runtime.js';
import { inspectPreviewPacket } from '../../scripts/deploy/csp-preview-packet.js';
import {
  makeAttempt,
  memoryJournal,
  githubFixture,
  zipPacket,
  assetJwt,
  fakeAssetOutput,
  jsonResponse,
} from './helpers/csp-preview-adapter-fixture.js';
import {
  deployment,
  observation,
  fixture,
  approval,
  withPacket,
  policy,
  execution,
} from './helpers/csp-preview-delivery-fixture.js';
import { withPreviewHttpServer } from './helpers/csp-preview-http-fixture.js';
const generation = '11111111-2222-3333-4444-555555555555';
const started = (attempt = makeAttempt()): PreviewAttempt => ({
  ...attempt,
  uploadStartedAt: '2026-11-02T00:00:01.500Z',
  status: 'upload-started',
  operationStatus: 'unknown',
});
const failed = async () =>
  reconcilePreviewAttempt(
    { ...started(), status: 'deployed-unverified', deploymentId: deployment().id },
    observation(),
    async () => false,
  );
const rollback = (prior: PreviewAttempt): PreviewAttempt => ({
  ...makeAttempt(),
  approvalId: 'rollback-2',
  runId: '202',
  attemptId: '202.1.bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee',
  mode: 'baseline',
  recoveryFrom: {
    approvalId: prior.approvalId,
    attemptId: prior.attemptId,
    deploymentId: prior.deploymentId ?? '',
  },
  before: snapshotBeforeUpload({ ...observation(), observedAt: '2026-11-02T00:00:05.000Z' }),
});
const setup = async () => {
  const memory = memoryJournal(),
    journal = new PreviewJournalAdapter(memory.store, generation);
  await journal.initialize();
  await journal.reserve(makeAttempt());
  await journal.persist(started());
  await journal.persist({
    ...started(),
    status: 'deployed-unverified',
    deploymentId: deployment().id,
  });
  const prior = await failed();
  await journal.persist(prior);
  return { memory, journal, prior };
};

describe('bounded independently approved baseline recovery', () => {
  it('keeps failed validation as failure and links a new reservation without clearing history', async () => {
    const { journal, prior } = await setup();
    expect(prior).toMatchObject({
      status: 'failed-confirmed',
      operationStatus: 'confirmed',
      contentStatus: 'differs',
      verificationFailure: 'http-differs',
    });
    const next = rollback(prior);
    await journal.reserve(next);
    expect((await journal.read()).journal.events.map((e) => e.attempt.status)).toEqual([
      'reserved',
      'upload-started',
      'deployed-unverified',
      'failed-confirmed',
      'reserved',
    ]);
    expect(await journal.attempt(prior.approvalId)).toEqual(prior);
    expect((await journal.attempt(next.approvalId)).recoveryFrom).toEqual(next.recoveryFrom);
  });
  it.each([
    'no-reference',
    'wrong-attempt',
    'wrong-id',
    'not-baseline',
    'stale',
    'missing-id',
    'wrong-account',
  ])('rejects %s recovery without writing', async (mode) => {
    const { journal, prior, memory } = await setup(),
      next = rollback(prior),
      writes = memory.writes;
    if (mode === 'no-reference') next.recoveryFrom = null;
    if (mode === 'wrong-attempt' && next.recoveryFrom)
      next.recoveryFrom.attemptId = '999.1.bbbbbbbb-bbbb-cccc-dddd-eeeeeeeeeeee';
    if (mode === 'wrong-id' && next.recoveryFrom)
      next.recoveryFrom.deploymentId = '11234567-89ab-cdef-0123-456789abcdef';
    if (mode === 'not-baseline') next.mode = 'report-only';
    if (mode === 'stale')
      next.before = snapshotBeforeUpload({
        ...observation(),
        observedAt: '2026-11-02T00:00:02.000Z',
      });
    if (mode === 'missing-id')
      next.before = snapshotBeforeUpload({
        ...observation([]),
        observedAt: '2026-11-02T00:00:05.000Z',
      });
    if (mode === 'wrong-account') next.accountId = 'd'.repeat(32);
    await expect(journal.reserve(next)).rejects.toThrow();
    expect(memory.writes).toBe(writes);
  });
  it('does not release an unknown operation with a baseline label', async () => {
    const memory = memoryJournal(),
      journal = new PreviewJournalAdapter(memory.store, generation);
    await journal.initialize();
    await journal.reserve(makeAttempt());
    await journal.persist(started());
    await journal.persist({ ...started(), status: 'uncertain' });
    await expect(journal.reserve(rollback(await failed()))).rejects.toThrow();
  });
  it('atomically accepts one recovery reservation under competition', async () => {
    const { journal, prior, memory } = await setup(),
      other = new PreviewJournalAdapter(memory.store, generation),
      next = rollback(prior);
    const results = await Promise.allSettled([
      journal.reserve(next),
      other.reserve({
        ...next,
        approvalId: 'rollback-3',
        attemptId: '202.1.cccccccc-bbbb-cccc-dddd-eeeeeeeeeeee',
      }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect((await journal.read()).journal.events).toHaveLength(5);
  });
  it('requires current unique service identity and stable alias ownership', async () => {
    const prior = await failed(),
      snapshot = { ...observation(), observedAt: '2026-11-02T00:00:05.000Z' };
    assertRecoverablePreviewSnapshot(prior, snapshot);
    for (const deployments of [
      [],
      [{ ...deployment(), aliases: [] }],
      [deployment(), { ...deployment(), id: '11234567-89ab-cdef-0123-456789abcdef' }],
    ])
      expect(() => assertRecoverablePreviewSnapshot(prior, { ...snapshot, deployments })).toThrow();
    expect(() =>
      parsePreviewApproval({ ...approval, recoveryFrom: rollback(prior).recoveryFrom }),
    ).toThrow('baseline');
    expect(
      parsePreviewApproval({
        ...approval,
        mode: 'baseline',
        recoveryFrom: rollback(prior).recoveryFrom,
      }).mode,
    ).toBe('baseline');
  });
  it('executes a separately approved baseline after confirmed HTTP failure and preserves all eight events', async () =>
    fixture(async (_root, packet) => {
      const identity = await inspectPreviewPacket(packet, approval.sourceSha),
        archive = await zipPacket(packet),
        github = githubFixture(archive),
        base = {
          ...github.approval,
          ...withPacket(identity),
          ciWorkflowDigest: github.approval.ciWorkflowDigest,
          artifactZipDigest: github.approval.artifactZipDigest,
        },
        currentPolicy = policy(),
        memory = memoryJournal(),
        journal = new PreviewJournalAdapter(memory.store, currentPolicy.journal?.generation ?? '');
      await journal.initialize();
      let posts = 0;
      const deployments: ReturnType<typeof deployment>[] = [];
      const execute = async (
        approved: PreviewApproval,
        mode: 'report-only' | 'baseline',
        badHttp = false,
      ) =>
        withPreviewHttpServer(packet, mode, async (http) => {
          const transport: typeof github.transport = async (url, init) => {
            if (url.startsWith('https://api.github.com/') || url.includes('blob.core'))
              return github.transport(url, init);
            if (url.startsWith('https://api.cloudflare.com/')) {
              const pathname = new URL(url).pathname;
              if (init.method === 'POST') {
                posts++;
                const form = await new Request(url, {
                  method: 'POST',
                  headers: init.headers ?? {},
                  body: init.body ?? null,
                }).formData();
                for (const item of deployments) item.aliases = [];
                const value = {
                  ...deployment(),
                  id: posts === 1 ? deployment().id : '11234567-89ab-cdef-0123-456789abcdef',
                  created_on: posts === 1 ? '2026-11-02T00:00:02.000Z' : '2026-11-02T00:00:06.000Z',
                  deployment_trigger: {
                    metadata: {
                      ...deployment().deployment_trigger.metadata,
                      commit_message: String(form.get('commit_message')),
                    },
                  },
                };
                deployments.push(value);
                return jsonResponse({ success: true, errors: [], result: value });
              }
              const result = pathname.endsWith('/upload-token')
                ? { jwt: assetJwt }
                : pathname.endsWith('/rouault')
                  ? { name: 'rouault', production_branch: 'main' }
                  : pathname.endsWith('/deployments')
                    ? deployments
                    : deployments.find((d) => pathname.endsWith(d.id));
              return jsonResponse(
                {
                  success: true,
                  errors: [],
                  result,
                  result_info: {
                    page: 1,
                    per_page: 25,
                    count: deployments.length,
                    total_count: deployments.length,
                  },
                },
                {
                  date:
                    posts === 0
                      ? 'Mon, 02 Nov 2026 00:00:01 GMT'
                      : posts === 1
                        ? 'Mon, 02 Nov 2026 00:00:05 GMT'
                        : 'Mon, 02 Nov 2026 00:00:07 GMT',
                },
              );
            }
            const response = await http(url, init);
            return badHttp && new URL(url).pathname === '/'
              ? new Response('damaged', { headers: response.headers })
              : response;
          };
          return runPreviewDelivery(
            {
              trustedRoot: process.cwd(),
              policy: { ...currentPolicy, approvals: [approved] },
              approvalId: approved.id,
              execution: { ...execution, runId: mode === 'baseline' ? '202' : '201' },
              operation: 'publish',
              bindings: () => ({
                githubToken: 'mock',
                pagesToken: 'mock-pages',
                journal: { accessKeyId: 'mock', secretAccessKey: 'mock' },
              }),
            },
            {
              transport,
              store: () => memory.store,
              process: async (request) => {
                await fakeAssetOutput(request);
                return { started: true, interrupted: false, exitCode: 0, signal: null };
              },
            },
          );
        });
      const first = await execute(base, 'report-only', true);
      expect(first.attempt.status).toBe('failed-confirmed');
      expect(posts).toBe(1);
      await expect(
        execute({ ...base, id: 'unbound-baseline', mode: 'baseline' }, 'baseline'),
      ).rejects.toThrow();
      expect(posts).toBe(1);
      const recovered = await execute(
        {
          ...base,
          id: 'approved-rollback',
          mode: 'baseline',
          recoveryFrom: {
            approvalId: first.attempt.approvalId,
            attemptId: first.attempt.attemptId,
            deploymentId: first.attempt.deploymentId ?? '',
          },
        },
        'baseline',
      );
      expect(recovered.attempt.status).toBe('verified');
      expect(posts).toBe(2);
      expect((await journal.read()).journal.events).toHaveLength(8);
      expect((await journal.attempt(first.attempt.approvalId)).status).toBe('failed-confirmed');
    }, true));
});
