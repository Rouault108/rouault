import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { previewDigest } from '../../build/security/csp-preview-artifact.js';
import { inspectPreviewPacket, type PreviewPacketIdentity } from './csp-preview-packet.js';
import { PreviewGithubAdapter } from './csp-preview-github.js';
import { PreviewPagesAdapter } from './csp-preview-pages.js';
import { previewSinglePost } from './csp-preview-post.js';
import { uploadSupervisedPreviewAssets, type PreviewProcess } from './csp-preview-wrangler.js';
import { verifyPreviewHttp } from './csp-preview-http.js';
import { nativePreviewFetch, type PreviewFetch } from './csp-preview-transport.js';
import {
  supervisePreviewOnce,
  reconcileSupervisedPreview,
  supervisedReviewDigest,
  supervisedMarker,
  type SupervisedReview,
  type SupervisedPorts,
} from './csp-preview-supervised.js';
import { inspectSupervisedRecord } from './csp-preview-supervised-record.js';
import type { PreviewHttpEvidence } from './csp-preview-http.js';
import { verifyPreviewDeployment, type PreviewAttempt } from './csp-preview-transaction.js';
import { parseSupervisedReview } from './csp-preview-supervised.js';

// 今回確認済みの公開済みsourceと独立packet digestだけを対象にする。汎用の任意成果物公開入口にしない。
export const SUPERVISED_SOURCE = {
  publishedMainSha: 'b61a536546f30c9df4cb7386205728d0336219d5',
  packet: {
    sourceSha: '0f6eac670e3e769f654c89f999eb75885ab0a018',
    buildId: '0f6eac67',
    packetDigest: 'e1326f3619c62ee880f7b78478d86e948d0f601c5b2e177ef0bfa589aeb1d734',
    receiptDigest: '053245b30df0a8db8c596b89fc89d8421f2679994b3c4f97cfed19727802d423',
    artifactDigest: '3873aec89f88504cb2b503afcba27bf248ea8fa0565cdc5e7ea24eb37fe8336c',
    baselineDigest: '3b7352e21fcc969b985e29702a863675675946153861592449ac6d7997be94bb',
    fileCount: 432,
  },
  sourceCI: {
    runId: '41744799022',
    attempt: 1,
    workflowDigest: '74cffd61e05a977bfbc7627299037f9a4062742477b27ee8d8cd75752bad3075',
  },
} as const;

export const inspectSupervisedPacket = async (
  packetRoot: string,
): Promise<PreviewPacketIdentity> => {
  const packet = await inspectPreviewPacket(packetRoot, SUPERVISED_SOURCE.packet.sourceSha);
  if (JSON.stringify(packet) !== JSON.stringify(SUPERVISED_SOURCE.packet))
    throw new Error('supervised-reviewed-packet-differs');
  return packet;
};
export const assertSupervisedEnvironment = (env: NodeJS.ProcessEnv): void => {
  if (env['NODE_DEBUG'] || env['DEBUG'] || env['NODE_TLS_REJECT_UNAUTHORIZED'] === '0')
    throw new Error('supervised-debug-or-insecure-tls-environment');
  // 既存build token・R2・OAuth cacheをこの経路へ自動採用しない。値は読まない。
  if (
    [
      'CLOUDFLARE_API_TOKEN',
      'CF_API_TOKEN',
      'CLOUDFLARE_API_KEY',
      'CF_API_KEY',
      'R2_ACCESS_KEY_ID',
      'R2_SECRET_ACCESS_KEY',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
    ].some((k) => env[k] !== undefined)
  )
    throw new Error('supervised-broad-credential-environment');
};

export const supervisedPorts = (
  input: {
    trustedRoot: string;
    packetRoot: string;
    review: SupervisedReview;
    token: () => string;
    confirm: SupervisedPorts['confirm'];
  },
  ports: { transport?: PreviewFetch; post?: PreviewFetch; process?: PreviewProcess } = {},
) => {
  const review = parseSupervisedReview(
      input.review,
      new Date(Date.parse(input.review.expiresAt) - 1).toISOString(),
    ),
    baseTransport = ports.transport ?? nativePreviewFetch;
  const overall = AbortSignal.timeout(10 * 60 * 1000);
  const signal = (input?: AbortSignal | null) =>
    input ? AbortSignal.any([input, overall]) : overall;
  const transport: PreviewFetch = (url, init) => {
    if (init.method !== 'GET' && init.method !== 'HEAD')
      throw new Error('supervised-read-transport-only');
    return baseTransport(url, { ...init, signal: signal(init.signal) });
  };
  const singlePost = ports.post ?? previewSinglePost();
  const post: PreviewFetch = (url, init) =>
    singlePost(url, { ...init, signal: signal(init.signal) });
  let pages: PreviewPagesAdapter | undefined,
    http: PreviewHttpEvidence | null = null;
  const api = () =>
    (pages ??= new PreviewPagesAdapter(review.accountId, input.token(), transport, post));
  const payload: Pick<PreviewAttempt, 'mode' | 'sourceSha' | 'payloadDigest'> = {
    mode: review.mode,
    sourceSha: review.packet.sourceSha,
    payloadDigest:
      review.mode === 'baseline' ? review.packet.baselineDigest : review.packet.artifactDigest,
  };
  const fixed: SupervisedPorts = {
    verifyPacketAndCI: async () => {
      const git = (...args: string[]) =>
        execFileSync('git', ['--no-optional-locks', ...args], {
          cwd: input.trustedRoot,
          encoding: 'utf8',
          env: Object.fromEntries(
            Object.entries(process.env).filter(([key]) => key !== 'CSP_SUPERVISED_PAGES_TOKEN'),
          ),
          stdio: ['ignore', 'pipe', 'ignore'],
        }).trim();
      if (
        git('status', '--porcelain') ||
        git('rev-parse', 'HEAD') !== review.trustedToolSha ||
        review.publishedMainSha !== SUPERVISED_SOURCE.publishedMainSha ||
        JSON.stringify(review.packet) !== JSON.stringify(SUPERVISED_SOURCE.packet) ||
        JSON.stringify(review.sourceCI) !== JSON.stringify(SUPERVISED_SOURCE.sourceCI)
      )
        throw new Error('supervised-trusted-checkout-or-source-differs');
      if (
        previewDigest(await readFile(input.trustedRoot + '/.github/workflows/ci-cd.yml')) !==
        review.toolCI.workflowDigest
      )
        throw new Error('supervised-tool-ci-definition-differs');
      await inspectSupervisedPacket(input.packetRoot);
      const github = new PreviewGithubAdapter(null, transport);
      await github.assertTrustedHead(review.publishedMainSha);
      await github.verifiedCI({ ...review.sourceCI, sha: review.packet.sourceSha });
      await github.verifiedCI({ ...review.toolCI, sha: review.trustedToolSha });
    },
    project: () => api().project('rouault.pages.dev'),
    snapshot: () => api().snapshot(),
    confirm: input.confirm,
    uploadAssets: async () =>
      uploadSupervisedPreviewAssets(
        {
          trustedRoot: input.trustedRoot,
          packetRoot: input.packetRoot,
          selection: { ...review.packet, mode: review.mode },
          jwt: await api().uploadToken(),
          signal: overall,
          transportEnv: {
            ...Object.fromEntries(
              [
                'HTTP_PROXY',
                'HTTPS_PROXY',
                'NO_PROXY',
                'http_proxy',
                'https_proxy',
                'no_proxy',
                'NODE_EXTRA_CA_CERTS',
              ]
                .filter((k) => process.env[k] !== undefined)
                .map((k) => [k, process.env[k]]),
            ),
          },
        },
        ports.process,
      ),
    create: (assets, marker) =>
      api().createSupervisedDeployment(review.packet.sourceSha, marker, assets),
    wait: (id) => api().waitForDeployment(id),
    verifyHttp: async (deployment) => {
      // serviceのalias/IDとHTTPの前後を同じsourceへ拘束する。
      const before = verifyPreviewDeployment(
        await api().deployment(deployment.id),
        review.packet.sourceSha,
      );
      if (before.url !== deployment.url) throw new Error('supervised-service-url-differs');
      const checked = await verifyPreviewHttp(input.packetRoot, payload, deployment.url, transport);
      const after = verifyPreviewDeployment(
        await api().deployment(deployment.id),
        review.packet.sourceSha,
      );
      if (JSON.stringify(before) !== JSON.stringify(after))
        throw new Error('supervised-service-changed-during-http');
      http = checked;
    },
  };
  return {
    ports: fixed,
    get http() {
      return http;
    },
  };
};

export const runSupervisedPreview = async (
  input: Parameters<typeof supervisedPorts>[0] & { recordFile: string },
  overrides: Parameters<typeof supervisedPorts>[1] = {},
) => {
  assertSupervisedEnvironment(process.env);
  const runtime = supervisedPorts(input, overrides);
  const observation = await supervisePreviewOnce(input.review, input.recordFile, runtime.ports);
  return {
    schema: 1,
    kind: 'supervised-preview-result',
    toolSha: input.review.trustedToolSha,
    sourceSha: input.review.packet.sourceSha,
    reviewDigest: supervisedReviewDigest(input.review),
    marker: supervisedMarker(input.review),
    ...observation,
    http: runtime.http,
    browserROObservation: 'not-run',
    productionHostVerification: 'not-run',
    automaticRetryAllowed: false,
    restorablePublishPermit: false,
    stageAcceptanceComplete: false,
    crossProcessReplayProtection: 'supervisor-required',
  };
};

export const observeSupervisedPreview = async (
  input: Parameters<typeof supervisedPorts>[0] & { recordFile: string },
  overrides: Parameters<typeof supervisedPorts>[1] = {},
) => {
  assertSupervisedEnvironment(process.env);
  const runtime = supervisedPorts(input, overrides);
  // 記録回復のGETは、後からmain/CIが変わっても許可する。新規公開authorityは返さない。
  await inspectSupervisedPacket(input.packetRoot);
  await runtime.ports.project();
  let before: PreviewAttempt['before'] | null = null,
    receiptId: string | null = null,
    recordState: 'available' | 'unavailable' = 'unavailable';
  try {
    const record = await inspectSupervisedRecord(
      input.recordFile,
      supervisedReviewDigest(input.review),
    );
    const first = record.events[0]?.before;
    if (
      first &&
      typeof first === 'object' &&
      'observedAt' in first &&
      'ids' in first &&
      'digest' in first
    )
      before = {
        observedAt: String(first.observedAt),
        ids: Array.isArray(first.ids) ? first.ids.map(String) : [],
        digest: String(first.digest),
      };
    receiptId =
      record.events
        .flatMap((e) => (typeof e.deploymentId === 'string' ? [e.deploymentId] : []))
        .at(-1) ?? null;
    recordState = 'available';
  } catch {
    /* 記録欠損時も読取だけ。before不成立のまま今回の操作成功へしない。 */
  }
  const observation = await reconcileSupervisedPreview(
    input.review,
    await runtime.ports.snapshot(),
    before,
    receiptId,
    runtime.ports.verifyHttp,
  );
  return {
    schema: 1,
    kind: 'supervised-preview-observation',
    ...observation,
    recordState,
    http: runtime.http,
    browserROObservation: 'not-run',
    productionHostVerification: 'not-run',
    automaticRetryAllowed: false,
    restorablePublishPermit: false,
    stageAcceptanceComplete: false,
    crossProcessReplayProtection: 'supervisor-required',
  };
};
