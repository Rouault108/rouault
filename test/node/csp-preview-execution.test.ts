import { describe, it, expect, vi } from 'vitest';
import { access, readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import {
  runTrustedPreviewWrangler,
  nativePreviewProcess,
  previewWranglerEnvironment,
  type PreviewProcessRequest,
} from '../../scripts/deploy/csp-preview-wrangler.js';
import { verifyPreviewHttp } from '../../scripts/deploy/csp-preview-http.js';
import { PreviewJournalAdapter } from '../../scripts/deploy/csp-preview-journal.js';
import { runPreviewDelivery } from '../../scripts/deploy/csp-preview-runtime.js';
import { inspectPreviewPacket } from '../../scripts/deploy/csp-preview-packet.js';
import { type PreviewApproval } from '../../scripts/deploy/csp-preview-authority.js';
import {
  fixture,
  approval,
  withPacket,
  policy,
  execution,
  deployment,
} from './helpers/csp-preview-delivery-fixture.js';
import {
  makeAttempt,
  memoryJournal,
  githubFixture,
  zipPacket,
  jsonResponse,
} from './helpers/csp-preview-adapter-fixture.js';
import { withPreviewHttpServer } from './helpers/csp-preview-http-fixture.js';

const structuredOutput = (request: PreviewProcessRequest, approved: PreviewApproval): string => {
  const d = deployment();
  return [
    {
      type: 'wrangler-session',
      version: 1,
      wrangler_version: '4.100.0',
      command_line_args: request.args.slice(1),
    },
    { type: 'pages-deploy', version: 1, pages_project: 'rouault', deployment_id: d.id, url: d.url },
    {
      type: 'pages-deploy-detailed',
      version: 1,
      pages_project: 'rouault',
      deployment_id: d.id,
      url: d.url,
      alias: d.aliases[0],
      environment: 'preview',
      production_branch: 'main',
      deployment_trigger: { metadata: { commit_hash: approved.sourceSha } },
    },
  ]
    .map((value) => JSON.stringify(value))
    .join('\n');
};
describe('isolated trusted uploader', () => {
  it('passes only copied payload and minimum environment, then removes owned raw output', async () =>
    fixture(async (_root, packet) => {
      const approved = withPacket(await inspectPreviewPacket(packet, approval.sourceSha));
      let cwd = '';
      const result = await runTrustedPreviewWrangler(
        {
          trustedRoot: process.cwd(),
          packetRoot: packet,
          approval: approved,
          attemptId: makeAttempt().attemptId,
          accountId: 'c'.repeat(32),
          token: 'mock-pages',
        },
        async (request) => {
          cwd = request.cwd;
          expect(request.command).toBe(process.execPath);
          expect(request.env['CLOUDFLARE_API_TOKEN']).toBe('mock-pages');
          expect(
            Object.keys(request.env).some((key) => /GITHUB|AWS|R2|NODE_OPTIONS/u.test(key)),
          ).toBe(false);
          expect(await readdir(request.cwd)).toEqual(
            expect.arrayContaining(['payload', 'state', 'wrangler.json']),
          );
          expect(await readFile(path.join(request.cwd, 'payload/_headers'), 'utf8')).toContain(
            'Content-Security-Policy-Report-Only',
          );
          await writeFile(
            request.env['WRANGLER_OUTPUT_FILE_PATH'] ?? '',
            structuredOutput(request, approved),
          );
          return { started: true, interrupted: false, exitCode: 0, signal: null };
        },
      );
      expect(result.deploymentId).toBe(deployment().id);
      await expect(access(cwd)).rejects.toThrow();
    }));
  it.each(['tamper', 'identity', 'interrupted', 'exit', 'missing-output'])(
    'stops on uploader %s without retry',
    async (mode) =>
      fixture(async (_root, packet) => {
        const approved = withPacket(await inspectPreviewPacket(packet, approval.sourceSha));
        let calls = 0;
        await expect(
          runTrustedPreviewWrangler(
            {
              trustedRoot: process.cwd(),
              packetRoot: packet,
              approval: approved,
              attemptId: makeAttempt().attemptId,
              accountId: 'c'.repeat(32),
              token: 'mock',
            },
            async (request) => {
              calls++;
              if (mode === 'tamper')
                await writeFile(path.join(request.cwd, 'payload/index.html'), 'tampered');
              if (mode !== 'missing-output')
                await writeFile(
                  request.env['WRANGLER_OUTPUT_FILE_PATH'] ?? '',
                  mode === 'identity'
                    ? structuredOutput(request, { ...approved, sourceSha: '0'.repeat(40) })
                    : structuredOutput(request, approved),
                );
              return {
                started: true,
                interrupted: mode === 'interrupted',
                exitCode: mode === 'exit' ? 1 : 0,
                signal: null,
              };
            },
          ),
        ).rejects.toThrow();
        expect(calls).toBe(1);
      }),
  );
  it('does not inherit arbitrary process variables or start an already aborted process', async () => {
    const env = previewWranglerEnvironment('/tmp/mock', 'c'.repeat(32), 'mock');
    expect(env['NODE_OPTIONS']).toBeUndefined();
    expect(
      await nativePreviewProcess({
        command: process.execPath,
        args: ['-e', 'process.exit(0)'],
        cwd: process.cwd(),
        env: {},
        timeoutMs: 1000,
        signal: AbortSignal.abort(),
      }),
    ).toMatchObject({ started: false, interrupted: true });
  });
  it('runs a controlled local child and bounds hung or verbose children without publishing', async () => {
    const base = { command: process.execPath, cwd: process.cwd(), env: {}, timeoutMs: 500 };
    expect(await nativePreviewProcess({ ...base, args: ['-e', 'process.exit(0)'] })).toMatchObject({
      exitCode: 0,
      started: true,
      interrupted: false,
    });
    expect(
      await nativePreviewProcess({ ...base, args: ['-e', 'setInterval(()=>{},100)'] }),
    ).toMatchObject({ interrupted: true });
    expect(
      await nativePreviewProcess({
        ...base,
        args: ['-e', "process.stdout.write('x'.repeat(2*1024*1024));setInterval(()=>{},100)"],
      }),
    ).toMatchObject({ interrupted: true });
  });
});

describe('preview HTTP verifier on actual loopback responses', () => {
  it.each(['report-only', 'baseline'] as const)(
    'checks %s alias and immutable body/policy/404/cache/304 independently',
    async (mode) =>
      fixture(async (_root, packet) => {
        const identity = await inspectPreviewPacket(packet, approval.sourceSha),
          attempt = {
            ...makeAttempt(),
            mode,
            payloadDigest: mode === 'baseline' ? identity.baselineDigest : identity.artifactDigest,
          };
        await withPreviewHttpServer(packet, mode, async (transport) =>
          expect(
            await verifyPreviewHttp(packet, attempt, deployment().url, transport),
          ).toMatchObject({
            hostsVerified: 2,
            routesVerified: 1,
            conditionalRequestsVerified: 4,
            browserCache: 'not-run',
            browserEnforcement: 'not-run',
          }),
        );
      }, true),
  );
  it.each(['worker-leak', 'enforce', 'mime', 'cache', 'nosniff', 'body', '304'])(
    'rejects %s from real HTTP responses',
    async (mutation) =>
      fixture(async (_root, packet) => {
        const identity = await inspectPreviewPacket(packet, approval.sourceSha),
          attempt = { ...makeAttempt(), payloadDigest: identity.artifactDigest };
        await withPreviewHttpServer(
          packet,
          'report-only',
          async (transport) =>
            await expect(
              verifyPreviewHttp(packet, attempt, deployment().url, transport),
            ).rejects.toThrow(),
          mutation,
        );
      }, true),
  );
});

describe('composed preview adapters with no external connection', () => {
  it('rejects disabled policy before requesting bindings, storage, transport or process', async () => {
    const bindings = vi.fn(),
      transport = vi.fn(),
      store = vi.fn(),
      processPort = vi.fn();
    await expect(
      runPreviewDelivery(
        {
          trustedRoot: process.cwd(),
          policy: { ...policy(), deliveryEnabled: false },
          approvalId: approval.id,
          execution,
          operation: 'publish',
          bindings,
        },
        { transport, store, process: processPort },
      ),
    ).rejects.toThrow();
    for (const port of [bindings, transport, store, processPort])
      expect(port).not.toHaveBeenCalled();
  });
  it.each(['normal', 'lost-upload-response', 'old-identical', 'concurrent'])(
    'handles %s with persisted identity, bounded packet and HTTP readback',
    async (mode) =>
      fixture(async (_root, packet) => {
        const identity = await inspectPreviewPacket(packet, approval.sourceSha),
          archive = await zipPacket(packet),
          github = githubFixture(archive),
          approved = {
            ...github.approval,
            ...withPacket(identity),
            ciWorkflowDigest: github.approval.ciWorkflowDigest,
            artifactZipDigest: github.approval.artifactZipDigest,
          },
          currentPolicy = { ...policy(), approvals: [approved] },
          memory = memoryJournal(),
          journal = new PreviewJournalAdapter(
            memory.store,
            currentPolicy.journal?.generation ?? '',
          );
        await journal.initialize();
        let uploads = 0,
          uploaded = false,
          marker = '';
        await withPreviewHttpServer(packet, 'report-only', async (http) => {
          const live = () => ({
            ...deployment(),
            deployment_trigger: {
              metadata: {
                ...deployment().deployment_trigger.metadata,
                commit_message:
                  mode === 'old-identical'
                    ? 'rouault-preview:100.1.aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
                    : marker,
              },
            },
          });
          const transport: typeof github.transport = async (url, init) => {
            if (url.startsWith('https://api.github.com/') || url.includes('blob.core'))
              return github.transport(url, init);
            if (url.startsWith('https://api.cloudflare.com/')) {
              const u = new URL(url),
                rows = uploaded || mode === 'old-identical' ? [live()] : [];
              const result = u.pathname.endsWith('/rouault')
                ? { name: 'rouault', production_branch: 'main' }
                : u.pathname.endsWith('/deployments')
                  ? rows
                  : live();
              return jsonResponse(
                {
                  success: true,
                  errors: [],
                  result,
                  result_info: {
                    page: 1,
                    per_page: 25,
                    count: rows.length,
                    total_count: rows.length,
                  },
                },
                {
                  date: uploaded
                    ? 'Mon, 02 Nov 2026 00:00:03 GMT'
                    : 'Mon, 02 Nov 2026 00:00:02 GMT',
                },
              );
            }
            return http(url, init);
          };
          const request = {
            trustedRoot: process.cwd(),
            policy: currentPolicy,
            approvalId: approval.id,
            execution,
            operation: 'publish' as const,
            bindings: () => ({
              githubToken: 'mock-github',
              pagesToken: 'mock-pages',
              journal: { accessKeyId: 'mock', secretAccessKey: 'mock' },
            }),
          };
          const ports = {
            transport,
            store: () => memory.store,
            process: async (input: PreviewProcessRequest) => {
              uploads++;
              uploaded = true;
              marker =
                input.args
                  .find((arg) => arg.startsWith('--commit-message='))
                  ?.slice('--commit-message='.length) ?? '';
              if (mode === 'lost-upload-response')
                throw new Error('connection lost after service accepted');
              await writeFile(
                input.env['WRANGLER_OUTPUT_FILE_PATH'] ?? '',
                structuredOutput(input, approved),
              );
              return { started: true, interrupted: false, exitCode: 0, signal: null };
            },
          };
          if (mode === 'concurrent') {
            const results = await Promise.allSettled([
              runPreviewDelivery(request, ports),
              runPreviewDelivery(request, ports),
            ]);
            expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
            expect(uploads).toBe(1);
          } else {
            const result = await runPreviewDelivery(request, ports);
            expect(result.attempt.status).toBe(mode === 'normal' ? 'verified' : 'uncertain');
            if (mode === 'lost-upload-response') {
              const restored = await runPreviewDelivery(
                { ...request, operation: 'reconcile' },
                ports,
              );
              expect(restored.attempt.status).toBe('verified');
              expect(uploads).toBe(1);
            }
            if (mode === 'old-identical') {
              const restored = await runPreviewDelivery(
                { ...request, operation: 'reconcile' },
                ports,
              );
              expect(restored.attempt).toMatchObject({
                status: 'uncertain',
                contentStatus: 'matches',
                operationStatus: 'unknown',
              });
            }
          }
          await expect(runPreviewDelivery(request, ports)).rejects.toThrow();
          expect((await journal.history()).attemptedApprovalIds).toEqual([approval.id]);
          expect(JSON.stringify((await journal.read()).journal)).not.toContain('mock-pages');
        });
      }, true),
  );
});
