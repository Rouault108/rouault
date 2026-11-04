import { randomUUID } from 'node:crypto';
import { PREVIEW_TARGET, previewDigest } from '../../build/security/csp-preview-artifact.js';
import { deliveryRecord, exactDeliveryFields } from './csp-preview-authority.js';
import type { PreviewPacketIdentity } from './csp-preview-packet.js';
import {
  snapshotBeforeUpload,
  verifyPreviewDeployment,
  previewTimestamp,
  PREVIEW_UUID,
  type DeploymentSnapshot,
} from './csp-preview-transaction.js';
import type { PreviewUploadedAssets } from './csp-preview-wrangler.js';
import { SupervisedRecord } from './csp-preview-supervised-record.js';

export interface SupervisedReview {
  schema: 1;
  target: typeof PREVIEW_TARGET;
  accountId: string;
  packet: PreviewPacketIdentity;
  publishedMainSha: string;
  trustedToolSha: string;
  sourceCI: { runId: string; attempt: number; workflowDigest: string };
  toolCI: { runId: string; attempt: number; workflowDigest: string };
  mode: 'report-only' | 'baseline';
  previousAliasId: string | null;
  approvalRef: string;
  credentialLabel: string;
  credentialReviewRef: string;
  credentialPurpose: 'pages-only-not-build-token';
  expiresAt: string;
}

export const parseSupervisedReview = (input: unknown, now: string): SupervisedReview => {
  const row = deliveryRecord(input);
  exactDeliveryFields(row, [
    'schema',
    'target',
    'accountId',
    'packet',
    'publishedMainSha',
    'trustedToolSha',
    'sourceCI',
    'toolCI',
    'mode',
    'previousAliasId',
    'approvalRef',
    'credentialLabel',
    'credentialReviewRef',
    'credentialPurpose',
    'expiresAt',
  ]);
  const packet = deliveryRecord(row['packet']);
  exactDeliveryFields(packet, [
    'sourceSha',
    'buildId',
    'packetDigest',
    'receiptDigest',
    'artifactDigest',
    'baselineDigest',
    'fileCount',
  ]);
  const hex = (value: unknown, length: number): string => {
    if (typeof value !== 'string' || !new RegExp(`^[a-f0-9]{${String(length)}}$`, 'u').test(value))
      throw new Error('supervised-review-identity');
    return value;
  };
  const label = (value: unknown): string => {
    if (typeof value !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/u.test(value))
      throw new Error('supervised-review-reference');
    return value;
  };
  const ci = (value: unknown) => {
    const c = deliveryRecord(value);
    exactDeliveryFields(c, ['runId', 'attempt', 'workflowDigest']);
    if (
      typeof c['runId'] !== 'string' ||
      !/^[1-9][0-9]{0,19}$/u.test(c['runId']) ||
      !Number.isSafeInteger(c['attempt']) ||
      Number(c['attempt']) < 1
    )
      throw new Error('supervised-ci-identity');
    return {
      runId: c['runId'],
      attempt: Number(c['attempt']),
      workflowDigest: hex(c['workflowDigest'], 64),
    };
  };
  const sourceSha = hex(packet['sourceSha'], 40),
    buildId = packet['buildId'];
  const expiresAt = previewTimestamp(row['expiresAt']),
    current = Date.parse(previewTimestamp(now));
  if (
    row['schema'] !== 1 ||
    Object.keys(deliveryRecord(row['target'])).sort().join(',') !==
      Object.keys(PREVIEW_TARGET).sort().join(',') ||
    Object.entries(PREVIEW_TARGET).some(
      ([key, value]) => deliveryRecord(row['target'])[key] !== value,
    ) ||
    !['report-only', 'baseline'].includes(String(row['mode'])) ||
    row['credentialPurpose'] !== 'pages-only-not-build-token' ||
    /(?:rouault[-_]build|CLOUDFLARE_API_TOKEN|R2)/iu.test(String(row['credentialLabel'])) ||
    typeof buildId !== 'string' ||
    !/^[a-f0-9]{7,40}$/u.test(buildId) ||
    !sourceSha.startsWith(buildId) ||
    !Number.isSafeInteger(packet['fileCount']) ||
    Number(packet['fileCount']) < 1 ||
    Number(packet['fileCount']) > 2000 ||
    !(
      row['previousAliasId'] === null ||
      (typeof row['previousAliasId'] === 'string' && PREVIEW_UUID.test(row['previousAliasId']))
    ) ||
    Date.parse(expiresAt) <= current ||
    Date.parse(expiresAt) > current + 60 * 60 * 1000
  )
    throw new Error('supervised-review-scope-or-expiry');
  const result: SupervisedReview = {
    schema: 1,
    target: { ...PREVIEW_TARGET },
    accountId: hex(row['accountId'], 32),
    packet: {
      sourceSha,
      buildId,
      packetDigest: hex(packet['packetDigest'], 64),
      receiptDigest: hex(packet['receiptDigest'], 64),
      artifactDigest: hex(packet['artifactDigest'], 64),
      baselineDigest: hex(packet['baselineDigest'], 64),
      fileCount: Number(packet['fileCount']),
    },
    publishedMainSha: hex(row['publishedMainSha'], 40),
    trustedToolSha: hex(row['trustedToolSha'], 40),
    sourceCI: ci(row['sourceCI']),
    toolCI: ci(row['toolCI']),
    mode: row['mode'] === 'baseline' ? 'baseline' : 'report-only',
    previousAliasId: row['previousAliasId'],
    approvalRef: label(row['approvalRef']),
    credentialLabel: label(row['credentialLabel']),
    credentialReviewRef: label(row['credentialReviewRef']),
    credentialPurpose: 'pages-only-not-build-token',
    expiresAt,
  };
  for (const value of [result.target, result.packet, result.sourceCI, result.toolCI])
    Object.freeze(value);
  return Object.freeze(result);
};

// 同じpayload/modeのmarkerは承認refや再起動で変えない。serviceに残る既知試行も重複防止に使う。
export const supervisedMarker = (review: SupervisedReview): string =>
  'rouault-supervised:' +
  previewDigest(
    JSON.stringify({
      accountId: review.accountId,
      target: PREVIEW_TARGET,
      sourceSha: review.packet.sourceSha,
      packetDigest: review.packet.packetDigest,
      mode: review.mode,
    }),
  );
export const supervisedReviewDigest = (review: SupervisedReview): string =>
  previewDigest(JSON.stringify(review));
export interface SupervisedObservation {
  operationStatus: 'unknown' | 'confirmed';
  contentStatus: 'matches' | 'unavailable';
  deploymentId: string | null;
  verifiedUrl: string | null;
  publicationAllowed: false;
}
const metadata = (value: unknown) =>
  deliveryRecord(deliveryRecord(deliveryRecord(value)['deployment_trigger'])['metadata']);
export const assertSupervisedBefore = (
  review: SupervisedReview,
  snapshot: DeploymentSnapshot,
): void => {
  snapshotBeforeUpload(snapshot);
  if (
    snapshot.deployments.some(
      (value) => metadata(value)['commit_message'] === supervisedMarker(review),
    )
  )
    throw new Error('supervised-marker-already-used');
  const owners = snapshot.deployments.filter((value) => {
    const aliases = deliveryRecord(value)['aliases'];
    return (
      Array.isArray(aliases) &&
      aliases.some((v: unknown) => v === PREVIEW_TARGET.origin || v === PREVIEW_TARGET.origin + '/')
    );
  });
  if (owners.some((v) => metadata(v)['branch'] !== PREVIEW_TARGET.branch))
    throw new Error('supervised-foreign-alias');
  if (
    owners.length !== (review.previousAliasId === null ? 0 : 1) ||
    (review.previousAliasId !== null && deliveryRecord(owners[0])['id'] !== review.previousAliasId)
  )
    throw new Error('supervised-alias-owner-changed');
};
export const reconcileSupervisedPreview = async (
  review: SupervisedReview,
  snapshot: DeploymentSnapshot,
  before: ReturnType<typeof snapshotBeforeUpload> | null,
  receiptId: string | null,
  verifyHttp: (deployment: { id: string; url: string }) => Promise<void>,
): Promise<SupervisedObservation> => {
  const after = snapshotBeforeUpload(snapshot);
  const correlated = snapshot.deployments.filter(
    (v) => metadata(v)['commit_message'] === supervisedMarker(review),
  );
  if (correlated.length > 1) throw new Error('supervised-duplicate-creation');
  const row = correlated[0];
  if (!row)
    return {
      operationStatus: 'unknown',
      contentStatus: 'unavailable',
      deploymentId: null,
      verifiedUrl: null,
      publicationAllowed: false,
    };
  let deployment: { id: string; url: string };
  try {
    deployment = verifyPreviewDeployment(row, review.packet.sourceSha);
  } catch {
    return {
      operationStatus: 'unknown',
      contentStatus: 'unavailable',
      deploymentId: null,
      verifiedUrl: null,
      publicationAllowed: false,
    };
  }
  const created = Date.parse(previewTimestamp(deliveryRecord(row)['created_on']));
  const confirmed =
    before !== null &&
    !before.ids.includes(deployment.id) &&
    Date.parse(after.observedAt) >= Date.parse(before.observedAt) &&
    created >= Date.parse(before.observedAt) &&
    created <= Date.parse(after.observedAt) + 999 &&
    (receiptId === null || receiptId === deployment.id);
  let contentStatus: 'matches' | 'unavailable' = 'unavailable';
  try {
    await verifyHttp(deployment);
    contentStatus = 'matches';
  } catch {
    /* HTTP失敗は操作未実行の証明ではない。 */
  }
  return {
    operationStatus: confirmed ? 'confirmed' : 'unknown',
    contentStatus,
    deploymentId: deployment.id,
    verifiedUrl: confirmed && contentStatus === 'matches' ? deployment.url : null,
    publicationAllowed: false,
  };
};

export interface SupervisedPorts {
  verifyPacketAndCI: () => Promise<void>;
  project: () => Promise<void>;
  snapshot: () => Promise<DeploymentSnapshot>;
  confirm: (summary: {
    review: SupervisedReview;
    before: ReturnType<typeof snapshotBeforeUpload>;
    challenge: string;
    signal: AbortSignal;
  }) => Promise<string>;
  uploadAssets: () => Promise<PreviewUploadedAssets>;
  create: (assets: PreviewUploadedAssets, marker: string) => Promise<{ deploymentId: string }>;
  wait: (id: string) => Promise<void>;
  verifyHttp: (deployment: { id: string; url: string }) => Promise<void>;
  now?: () => string;
  confirmationTimeoutMs?: number;
}

// 呼出し全体が一つの生存中session。保存recordからこの関数のpermitを復元する入口は作らない。
export const supervisePreviewOnce = async (
  input: unknown,
  recordFile: string,
  ports: SupervisedPorts,
): Promise<
  SupervisedObservation & {
    sessionStatus: 'completed' | 'interrupted';
    recordStatus: 'retained' | 'unavailable';
    creationPostInvocations: 0 | 1;
    failureReason: string | null;
  }
> => {
  const now = ports.now ?? (() => new Date().toISOString());
  const review = parseSupervisedReview(input, now());
  await ports.verifyPacketAndCI();
  const record = await SupervisedRecord.create(recordFile, supervisedReviewDigest(review));
  let before: ReturnType<typeof snapshotBeforeUpload> | null = null,
    receiptId: string | null = null;
  let began = false,
    creationPostInvocations: 0 | 1 = 0;
  try {
    await ports.project();
    const initial = await ports.snapshot();
    assertSupervisedBefore(review, initial);
    before = snapshotBeforeUpload(initial);
    Object.freeze(before.ids);
    Object.freeze(before);
    await record.append({ state: 'prepared', deploymentId: null, before });
    const challenge = randomUUID(),
      controller = new AbortController();
    const limit = ports.confirmationTimeoutMs ?? 300000;
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 300000)
      throw new Error('supervised-confirmation-window');
    const timeout = setTimeout(
      () => {
        controller.abort();
      },
      Math.min(limit, Math.max(1, Date.parse(review.expiresAt) - Date.parse(now()))),
    );
    try {
      const aborted = new Promise<string>((_resolve, reject) => {
        controller.signal.addEventListener(
          'abort',
          () => {
            reject(new Error('supervised-confirmation-timeout'));
          },
          { once: true },
        );
      });
      if (
        (await Promise.race([
          ports.confirm({ review, before, challenge, signal: controller.signal }),
          aborted,
        ])) !== challenge
      )
        throw new Error('supervised-confirmation-required');
    } finally {
      clearTimeout(timeout);
    }
    parseSupervisedReview(review, now());
    record.claim();
    await record.append({ state: 'confirmed', deploymentId: null });
    await ports.verifyPacketAndCI();
    await ports.project();
    const current = await ports.snapshot();
    assertSupervisedBefore(review, current);
    if (
      Date.parse(current.observedAt) < Date.parse(before.observedAt) ||
      JSON.stringify(snapshotBeforeUpload(current).ids) !== JSON.stringify(before.ids)
    )
      throw new Error('supervised-snapshot-changed');
    await record.append({ state: 'upload-started', deploymentId: null });
    began = true;
    const assets = await ports.uploadAssets();
    await record.assertCurrent();
    parseSupervisedReview(review, now());
    await ports.verifyPacketAndCI();
    // asset upload中の別操作も確認する。creationはこの一箇所だけで再送しない。
    await ports.project();
    const final = await ports.snapshot();
    assertSupervisedBefore(review, final);
    if (
      Date.parse(final.observedAt) < Date.parse(before.observedAt) ||
      JSON.stringify(snapshotBeforeUpload(final).ids) !== JSON.stringify(before.ids)
    )
      throw new Error('supervised-snapshot-changed');
    await record.assertCurrent();
    parseSupervisedReview(review, now());
    await record.append({ state: 'creation-started', deploymentId: null });
    creationPostInvocations = 1;
    receiptId = (await ports.create(assets, supervisedMarker(review))).deploymentId;
    await record.append({ state: 'posted', deploymentId: receiptId });
    await ports.wait(receiptId);
    const result = await reconcileSupervisedPreview(
      review,
      await ports.snapshot(),
      before,
      receiptId,
      ports.verifyHttp,
    );
    await record.append({
      state: result.verifiedUrl ? 'verified' : 'uncertain',
      deploymentId: receiptId,
    });
    return {
      ...result,
      sessionStatus: 'completed',
      recordStatus: 'retained',
      creationPostInvocations,
      failureReason: null,
    };
  } catch (error) {
    let recordStatus: 'retained' | 'unavailable' = 'retained';
    const known = new Set([
      'supervised-confirmation-required',
      'supervised-confirmation-timeout',
      'supervised-review-scope-or-expiry',
      'supervised-record-lost-or-restored',
      'supervised-snapshot-changed',
      'supervised-marker-already-used',
      'supervised-alias-owner-changed',
      'supervised-foreign-alias',
      'supervised-duplicate-creation',
    ]);
    const failureReason =
      error instanceof Error && known.has(error.message)
        ? error.message
        : began
          ? 'service-or-transport-uncertain'
          : 'preflight-failed';
    // 失敗後はGET/HTTP照合だけ。空一覧・古い一致・記録消失から再送を決めない。
    let result: SupervisedObservation = {
      operationStatus: 'unknown',
      contentStatus: 'unavailable',
      deploymentId: receiptId,
      verifiedUrl: null,
      publicationAllowed: false,
    };
    if (began)
      try {
        result = await reconcileSupervisedPreview(
          review,
          await ports.snapshot(),
          before,
          receiptId,
          ports.verifyHttp,
        );
      } catch {
        /* 不明を保持する。 */
      }
    try {
      await record.append({
        state: result.verifiedUrl ? 'verified' : began ? 'uncertain' : 'closed',
        deploymentId: result.deploymentId,
      });
    } catch {
      recordStatus = 'unavailable';
      /* 記録故障もpermitを復活させない。 */
    }
    return {
      ...result,
      sessionStatus: 'interrupted',
      recordStatus,
      creationPostInvocations,
      failureReason,
    };
  } finally {
    await record.close();
  }
};
