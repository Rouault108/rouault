import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  authorizePreviewDelivery,
  type PreviewDeliveryPolicy,
  type PreviewTrustedExecution,
} from './csp-preview-authority.js';
import { PreviewGithubAdapter } from './csp-preview-github.js';
import { PreviewPagesAdapter } from './csp-preview-pages.js';
import {
  PreviewJournalAdapter,
  createPreviewR2JournalStore,
  type PreviewCasStore,
} from './csp-preview-journal.js';
import { inspectPreviewPacket, verifyApprovedPreviewPacket } from './csp-preview-packet.js';
import { extractPreviewZip } from './csp-preview-zip.js';
import {
  executePreviewTransaction,
  reconcilePreviewAttempt,
  verifyPreviewDeployment,
  type PreviewAttempt,
} from './csp-preview-transaction.js';
import { verifyPreviewHttp, type PreviewHttpEvidence } from './csp-preview-http.js';
import { runTrustedPreviewWrangler, type PreviewProcess } from './csp-preview-wrangler.js';
import { type PreviewFetch } from './csp-preview-transport.js';

export interface PreviewRuntimeBindings {
  githubToken: string;
  pagesToken: string;
  journal: { accessKeyId: string; secretAccessKey: string };
}
export interface PreviewRuntimeResult {
  schema: 1;
  attempt: PreviewAttempt;
  http: PreviewHttpEvidence | null;
  browserObservation: 'not-run';
}

// 接続前にdefault branchのauthorityを検査する。factoryは試験用transport/storage/processだけを差し替える。
export const runPreviewDelivery = async (
  request: {
    trustedRoot: string;
    policy: PreviewDeliveryPolicy;
    approvalId: string;
    execution: PreviewTrustedExecution;
    operation: 'publish' | 'reconcile';
    bindings: () => PreviewRuntimeBindings;
  },
  ports: {
    transport?: PreviewFetch;
    process?: PreviewProcess;
    store?: (accountId: string, credentials: PreviewRuntimeBindings['journal']) => PreviewCasStore;
  } = {},
): Promise<PreviewRuntimeResult> => {
  const approval = authorizePreviewDelivery(request.policy, request.approvalId, request.execution);
  const account = request.policy.accountId,
    binding = request.policy.journal;
  if (!account || !binding?.writeApproved)
    throw new Error('[preview-delivery] journal authority missing');
  const credentials = request.bindings(),
    github = new PreviewGithubAdapter(credentials.githubToken, ports.transport),
    pages = new PreviewPagesAdapter(account, credentials.pagesToken, ports.transport),
    journal = new PreviewJournalAdapter(
      (ports.store ?? createPreviewR2JournalStore)(account, credentials.journal),
      binding.generation,
    );
  await github.assertTrustedHead(request.execution.workflowSha);
  const evidence = await github.approvedEvidence(approval);
  await pages.project();
  const history = await journal.history();
  const root = await mkdtemp(path.join(tmpdir(), 'rouault-csp-packet-')),
    packet = path.join(root, 'packet');
  let http: PreviewHttpEvidence | null = null;
  try {
    await extractPreviewZip(await github.archive(approval), packet);
    verifyApprovedPreviewPacket(approval, await inspectPreviewPacket(packet, approval.sourceSha));
    const verifyHttp = async (
      deployment: { id: string; url: string },
      attempt: PreviewAttempt,
    ): Promise<boolean> => {
      const before = verifyPreviewDeployment(
        await pages.deployment(deployment.id),
        approval.sourceSha,
      );
      if (before.url !== deployment.url)
        throw new Error('[preview-delivery] deployment identity changed');
      const verified = await verifyPreviewHttp(packet, attempt, before.url, ports.transport);
      const after = verifyPreviewDeployment(
        await pages.deployment(deployment.id),
        approval.sourceSha,
      );
      if (after.id !== before.id || after.url !== before.url)
        throw new Error('[preview-delivery] alias changed during HTTP verification');
      http = verified;
      return true;
    };
    // staleなdefault branchのauthorityではCAS・uploadを開始しない。
    const persist = async (attempt: PreviewAttempt): Promise<void> => {
      await github.assertTrustedHead(request.execution.workflowSha);
      await journal.persist(attempt);
    };
    let attempt: PreviewAttempt;
    if (request.operation === 'reconcile') {
      const prior = await journal.attempt(approval.id);
      if (
        prior.sourceSha !== approval.sourceSha ||
        prior.packetDigest !== approval.packetDigest ||
        prior.accountId !== account ||
        prior.mode !== approval.mode ||
        prior.payloadDigest !==
          (approval.mode === 'baseline' ? approval.baselineDigest : approval.artifactDigest)
      )
        throw new Error('[preview-delivery] reconciliation authority mismatch');
      if (prior.status === 'verified')
        throw new Error('[preview-delivery] already verified; no repeat operation');
      attempt = await reconcilePreviewAttempt(prior, await pages.snapshot(), verifyHttp);
      await persist(attempt);
    } else {
      attempt = await executePreviewTransaction(
        { ...request, evidence, packetRoot: packet, history },
        {
          snapshot: () => pages.snapshot(),
          reserve: async (attempt) => {
            await github.assertTrustedHead(request.execution.workflowSha);
            await journal.reserve(attempt);
          },
          persist,
          upload: async () => {
            await github.assertTrustedHead(request.execution.workflowSha);
            const current = await journal.attempt(approval.id);
            if (current.status !== 'upload-started')
              throw new Error('[preview-delivery] durable upload start missing');
            return runTrustedPreviewWrangler(
              {
                trustedRoot: request.trustedRoot,
                packetRoot: packet,
                approval,
                attemptId: current.attemptId,
                accountId: account,
                token: credentials.pagesToken,
              },
              ports.process,
            );
          },
          observe: () => pages.snapshot(),
          verifyHttp,
        },
      );
    }
    return { schema: 1, attempt, http, browserObservation: 'not-run' };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
};
