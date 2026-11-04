import { execFileSync } from 'node:child_process';
import { setGlobalProxyFromEnv } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { PREVIEW_TARGET } from '../../build/security/csp-preview-artifact.js';
import { deliveryRecord } from './csp-preview-authority.js';
import { previewTimestamp } from './csp-preview-transaction.js';
import { parseSupervisedReview, supervisedMarker } from './csp-preview-supervised.js';
import {
  SUPERVISED_SOURCE,
  inspectSupervisedPacket,
  assertSupervisedEnvironment,
  runSupervisedPreview,
  observeSupervisedPreview,
} from './csp-preview-supervised-runtime.js';

const run = async () => {
  assertSupervisedEnvironment(process.env);
  const root = path.resolve(fileURLToPath(new URL('../../', import.meta.url)));
  if (
    process.cwd() !== root ||
    process.argv.length !== 3 ||
    !['inspect', 'supervise', 'reconcile'].includes(process.argv[2] ?? '')
  )
    throw new Error('fixed-supervised-entry-required');
  const git = (...args: string[]) =>
    execFileSync('git', ['--no-optional-locks', ...args], {
      cwd: root,
      encoding: 'utf8',
      env: Object.fromEntries(
        Object.entries(process.env).filter(([key]) => key !== 'CSP_SUPERVISED_PAGES_TOKEN'),
      ),
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  if (git('status', '--porcelain')) throw new Error('clean-supervised-checkout-required');
  const trustedToolSha = git('rev-parse', 'HEAD'),
    packetRoot = path.join(root, '.generated/csp-preview');
  const packet = await inspectSupervisedPacket(packetRoot);
  if (process.argv[2] === 'inspect') {
    console.log(
      JSON.stringify({
        schema: 1,
        kind: 'supervised-preview-preparation',
        target: PREVIEW_TARGET,
        trustedToolSha,
        ...SUPERVISED_SOURCE,
        packet,
        publicationAllowed: false,
        pending: [
          'account-and-non-build-pages-auth-review',
          'session-network-permission',
          'tool-CI-review',
          'destination-and-previous-alias-review',
          'retained-baseline-and-local-record',
          'fresh-live-supervision',
        ],
        noR2Journal: true,
        mainWorkflowRegistrationRequired: false,
        restoreMayPublish: false,
        stageAcceptanceComplete: false,
        globalExactlyOnce: false,
        crossProcessReplayProtection: 'supervisor-required',
        browserROObservation: 'not-run',
        productionHostVerification: 'not-run',
      }),
    );
    return;
  }
  // standalone processだけのproxy設定。保存や接続許可の変更は行わない。
  const restoreProxy = setGlobalProxyFromEnv();
  try {
    // recordやcandidate receiptを公開承認へ昇格させない。非秘密reviewは事前確認した固定場所だけから読む。
    const raw: unknown = JSON.parse(
      await readFile(path.join(root, '.generated/csp-supervised/review.json'), 'utf8'),
    );
    const observation = process.argv[2] === 'reconcile';
    const now = observation
      ? new Date(Date.parse(previewTimestamp(deliveryRecord(raw)['expiresAt'])) - 1).toISOString()
      : new Date().toISOString();
    const review = parseSupervisedReview(raw, now);
    if (review.trustedToolSha !== trustedToolSha) throw new Error('supervised-tool-sha-differs');
    if (!observation && (!process.stdin.isTTY || !process.stdout.isTTY))
      throw new Error('live-supervisor-terminal-required');
    const recordFile = path.join(
      root,
      '.generated/csp-supervised',
      supervisedMarker(review).slice('rouault-supervised:'.length) + '.jsonl',
    );
    const input = {
      trustedRoot: root,
      packetRoot,
      review,
      recordFile,
      token: () => {
        // OAuth cache、汎用build token、production R2へfallbackしない。
        const token = process.env['CSP_SUPERVISED_PAGES_TOKEN'];
        if (!token || /[\r\n]/u.test(token))
          throw new Error('reviewed-supervised-auth-unavailable');
        return token;
      },
      confirm: async (
        summary: Parameters<Parameters<typeof runSupervisedPreview>[0]['confirm']>[0],
      ) => {
        // この出力を監督者が保持する。challengeは生存中sessionだけで有効で、記録には保存しない。
        console.log(
          JSON.stringify({
            schema: 1,
            kind: 'supervised-preview-before',
            target: PREVIEW_TARGET,
            toolSha: trustedToolSha,
            sourceSha: packet.sourceSha,
            packetDigest: packet.packetDigest,
            artifactDigest: packet.artifactDigest,
            baselineDigest: packet.baselineDigest,
            marker: supervisedMarker(review),
            before: summary.before,
            approvalRef: review.approvalRef,
            recordLossMeansStop: true,
            creationPostsMaximum: 1,
          }),
        );
        const terminal = createInterface({ input: process.stdin, output: process.stdout });
        try {
          return await terminal.question(
            `One live session only. Type ${summary.challenge} to confirm: `,
            { signal: summary.signal },
          );
        } finally {
          terminal.close();
        }
      },
    };
    const result = observation
      ? await observeSupervisedPreview(input)
      : await runSupervisedPreview(input);
    console.log(JSON.stringify(result));
    if (
      result.operationStatus !== 'confirmed' ||
      result.contentStatus !== 'matches' ||
      ('sessionStatus' in result && result.sessionStatus === 'interrupted') ||
      ('recordStatus' in result && result.recordStatus === 'unavailable')
    )
      process.exitCode = 1;
  } finally {
    restoreProxy();
  }
};

try {
  await run();
} catch {
  console.error(
    '[supervised-preview] stopped; no automatic restart or retransmission; use read-only reconciliation and supervisor review; raw inputs omitted',
  );
  process.exitCode = 1;
}
