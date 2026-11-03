import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { PREVIEW_TARGET, previewDigest } from '../../build/security/csp-preview-artifact.js';
import {
  authorizePreviewDelivery,
  parsePreviewRecovery,
  type PreviewRecoveryReference,
  deliveryRecord,
  exactDeliveryFields,
  verifyPreviewServiceEvidence,
  type PreviewApproval,
  type PreviewDeliveryPolicy,
  type PreviewServiceEvidence,
  type PreviewTrustedExecution,
} from './csp-preview-authority.js';
import { inspectPreviewPacket, verifyApprovedPreviewPacket } from './csp-preview-packet.js';

export const PREVIEW_UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/u;
export interface DeploymentSnapshot {
  complete: boolean;
  observedAt: string;
  deployments: readonly unknown[];
}
export interface PreviewAttempt {
  schema: 3;
  approvalId: string;
  recoveryFrom: PreviewRecoveryReference | null;
  mode: PreviewApproval['mode'];
  sourceSha: string;
  payloadDigest: string;
  packetDigest: string;
  accountId: string;
  runId: string;
  runAttempt: number;
  workflowSha: string;
  attemptId: string;
  before: { observedAt: string; ids: string[]; digest: string };
  uploadStartedAt: string | null;
  status:
    | 'reserved'
    | 'upload-started'
    | 'deployed-unverified'
    | 'verified'
    | 'uncertain'
    | 'failed-confirmed';
  deploymentId: string | null;
  confirmation: { createdAt: string; observedAt: string } | null;
  verificationFailure: 'http-differs' | 'http-unavailable' | 'alias-mismatch' | null;
  contentStatus: 'not-checked' | 'matches' | 'differs' | 'unavailable';
  operationStatus: 'not-started' | 'unknown' | 'confirmed';
}

export const previewTimestamp = (value: unknown): string => {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/u.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    throw new Error('[preview-delivery] missing service timestamp');
  return new Date(value).toISOString();
};
export const snapshotBeforeUpload = (snapshot: DeploymentSnapshot): PreviewAttempt['before'] => {
  const observedAt = previewTimestamp(snapshot.observedAt);
  if (!snapshot.complete || snapshot.deployments.length > 10000)
    throw new Error('[preview-delivery] incomplete deployment snapshot');
  const ids = snapshot.deployments
    .map((value) => {
      const row = deliveryRecord(value),
        created = previewTimestamp(row['created_on']);
      if (
        typeof row['id'] !== 'string' ||
        !PREVIEW_UUID.test(row['id']) ||
        Date.parse(created) > Date.parse(observedAt) + 999
      )
        throw new Error('[preview-delivery] invalid snapshot identity/time');
      return row['id'];
    })
    .sort();
  if (new Set(ids).size !== ids.length)
    throw new Error('[preview-delivery] duplicate snapshot identity');
  return { observedAt, ids, digest: previewDigest(JSON.stringify({ observedAt, ids })) };
};

export const parsePreviewAttempt = (value: unknown): PreviewAttempt => {
  const row = deliveryRecord(value);
  exactDeliveryFields(row, [
    'schema',
    'approvalId',
    'recoveryFrom',
    'verificationFailure',
    'mode',
    'sourceSha',
    'payloadDigest',
    'packetDigest',
    'accountId',
    'runId',
    'runAttempt',
    'workflowSha',
    'attemptId',
    'before',
    'uploadStartedAt',
    'status',
    'deploymentId',
    'confirmation',
    'contentStatus',
    'operationStatus',
  ]);
  const recovery = parsePreviewRecovery(row['recoveryFrom']);
  if (recovery && row['mode'] !== 'baseline')
    throw new Error('[preview-delivery] non-baseline recovery');
  const before = deliveryRecord(row['before']);
  exactDeliveryFields(before, ['observedAt', 'ids', 'digest']);
  const runId = row['runId'],
    runAttempt = row['runAttempt'],
    attemptId = row['attemptId'];
  if (
    row['schema'] !== 3 ||
    typeof row['approvalId'] !== 'string' ||
    !/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/u.test(row['approvalId']) ||
    typeof row['mode'] !== 'string' ||
    !['report-only', 'baseline'].includes(row['mode']) ||
    typeof runId !== 'string' ||
    !/^[1-9][0-9]{0,19}$/u.test(runId) ||
    typeof runAttempt !== 'number' ||
    !Number.isSafeInteger(runAttempt) ||
    runAttempt < 1 ||
    typeof attemptId !== 'string' ||
    !attemptId.startsWith(`${runId}.${String(runAttempt)}.`) ||
    !PREVIEW_UUID.test(attemptId.slice(`${runId}.${String(runAttempt)}.`.length)) ||
    typeof row['sourceSha'] !== 'string' ||
    !/^[a-f0-9]{40}$/u.test(row['sourceSha']) ||
    typeof row['workflowSha'] !== 'string' ||
    !/^[a-f0-9]{40}$/u.test(row['workflowSha']) ||
    typeof row['accountId'] !== 'string' ||
    !/^[a-f0-9]{32}$/u.test(row['accountId']) ||
    typeof row['payloadDigest'] !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(row['payloadDigest']) ||
    typeof row['packetDigest'] !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(row['packetDigest']) ||
    !Array.isArray(before['ids']) ||
    before['ids'].some((id: unknown) => typeof id !== 'string' || !PREVIEW_UUID.test(id)) ||
    new Set(before['ids']).size !== before['ids'].length ||
    before['ids'].length > 10000 ||
    typeof row['status'] !== 'string' ||
    ![
      'reserved',
      'upload-started',
      'deployed-unverified',
      'verified',
      'uncertain',
      'failed-confirmed',
    ].includes(row['status']) ||
    typeof row['contentStatus'] !== 'string' ||
    !['not-checked', 'matches', 'differs', 'unavailable'].includes(row['contentStatus']) ||
    typeof row['operationStatus'] !== 'string' ||
    !['not-started', 'unknown', 'confirmed'].includes(row['operationStatus']) ||
    (row['deploymentId'] !== null &&
      (typeof row['deploymentId'] !== 'string' || !PREVIEW_UUID.test(row['deploymentId'])))
  )
    throw new Error('[preview-delivery] invalid attempt identity');
  const observedAt = previewTimestamp(before['observedAt']),
    ids = before['ids'] as string[];
  if (
    JSON.stringify(ids) !== JSON.stringify([...ids].sort()) ||
    before['digest'] !== previewDigest(JSON.stringify({ observedAt, ids }))
  )
    throw new Error('[preview-delivery] corrupted before snapshot');
  if (row['uploadStartedAt'] !== null) previewTimestamp(row['uploadStartedAt']);
  if (row['confirmation'] !== null) {
    const confirmation = deliveryRecord(row['confirmation']);
    exactDeliveryFields(confirmation, ['createdAt', 'observedAt']);
    const created = Date.parse(previewTimestamp(confirmation['createdAt'])),
      observed = Date.parse(previewTimestamp(confirmation['observedAt']));
    if (
      created < Date.parse(observedAt) ||
      created > observed + 999 ||
      observed < Date.parse(observedAt) ||
      row['operationStatus'] !== 'confirmed'
    )
      throw new Error('[preview-delivery] invalid service confirmation');
  }
  if (
    (row['verificationFailure'] !== null &&
      (typeof row['verificationFailure'] !== 'string' ||
        !['http-differs', 'http-unavailable', 'alias-mismatch'].includes(
          row['verificationFailure'],
        ))) ||
    (row['status'] === 'failed-confirmed' &&
      (row['verificationFailure'] === null || row['operationStatus'] !== 'confirmed')) ||
    (row['status'] !== 'failed-confirmed' && row['verificationFailure'] !== null) ||
    (row['status'] === 'verified' &&
      (row['operationStatus'] !== 'confirmed' || row['contentStatus'] !== 'matches')) ||
    (row['operationStatus'] === 'confirmed' &&
      (row['deploymentId'] === null ||
        row['confirmation'] === null ||
        row['uploadStartedAt'] === null)) ||
    (row['status'] === 'reserved' &&
      (row['uploadStartedAt'] !== null ||
        row['deploymentId'] !== null ||
        row['operationStatus'] !== 'not-started' ||
        row['contentStatus'] !== 'not-checked'))
  )
    throw new Error('[preview-delivery] inconsistent attempt result');
  return row as unknown as PreviewAttempt;
};

export const previewAttemptMarker = (attempt: Pick<PreviewAttempt, 'attemptId'>): string =>
  `rouault-preview:${attempt.attemptId}`;
export const assertUnusedPreviewApproval = (
  approval: PreviewApproval,
  history: { complete: boolean; attemptedApprovalIds: readonly string[] },
): void => {
  if (
    !history.complete ||
    !Array.isArray(history.attemptedApprovalIds) ||
    history.attemptedApprovalIds.includes(approval.id)
  )
    throw new Error(
      '[preview-delivery] incomplete history or prior attempt requires reconciliation and fresh approval',
    );
};

export const verifyPreviewDeployment = (
  value: unknown,
  sourceSha: string,
  requireAlias = true,
): { id: string; url: string } => {
  const row = deliveryRecord(value),
    metadata = deliveryRecord(deliveryRecord(row['deployment_trigger'])['metadata']),
    stage = deliveryRecord(row['latest_stage']);
  if (
    typeof row['id'] !== 'string' ||
    !PREVIEW_UUID.test(row['id']) ||
    typeof row['url'] !== 'string' ||
    !/^https:\/\/[a-f0-9]{8,32}\.rouault\.pages\.dev\/?$/u.test(row['url']) ||
    row['project_name'] !== PREVIEW_TARGET.project ||
    row['environment'] !== 'preview' ||
    !/^[a-f0-9]{40}$/u.test(sourceSha) ||
    metadata['branch'] !== PREVIEW_TARGET.branch ||
    metadata['commit_hash'] !== sourceSha ||
    metadata['commit_dirty'] !== false ||
    stage['name'] !== 'deploy' ||
    stage['status'] !== 'success' ||
    !Array.isArray(row['aliases']) ||
    row['aliases'].length > 1 ||
    row['aliases'].some(
      (alias: unknown) => alias !== PREVIEW_TARGET.origin && alias !== PREVIEW_TARGET.origin + '/',
    ) ||
    (requireAlias && row['aliases'].length !== 1)
  )
    throw new Error('[preview-delivery] deployment/alias/source identity is not verified');
  return { id: row['id'], url: row['url'] };
};

export interface PreviewDeliveryPorts {
  snapshot: () => Promise<DeploymentSnapshot>;
  nonce?: () => string;
  now?: () => string;
  reserve: (attempt: PreviewAttempt) => Promise<void>;
  persist: (attempt: PreviewAttempt) => Promise<void>;
  upload: (
    attempt: PreviewAttempt,
    payload: { directory: string; digest: string; accountId: string },
  ) => Promise<{ deploymentId: string } | null>;
  observe: () => Promise<DeploymentSnapshot>;
  verifyHttp: (
    deployment: { id: string; url: string },
    attempt: PreviewAttempt,
  ) => Promise<boolean>;
}

// 現在の内容一致と今回の操作結果は別の事実。既存の同一SHAだけでuncertainを解消しない。
export const reconcilePreviewAttempt = async (
  input: PreviewAttempt,
  snapshot: DeploymentSnapshot,
  verifyHttp: PreviewDeliveryPorts['verifyHttp'],
): Promise<PreviewAttempt> => {
  const attempt = parsePreviewAttempt(input),
    after = snapshotBeforeUpload(snapshot);
  if (Date.parse(after.observedAt) < Date.parse(attempt.before.observedAt))
    throw new Error('[preview-delivery] stale observation');
  const correlated = snapshot.deployments.filter((value) => {
    const row = deliveryRecord(value);
    return (
      deliveryRecord(deliveryRecord(row['deployment_trigger'])['metadata'])['commit_message'] ===
      previewAttemptMarker(attempt)
    );
  });
  // receipt・stage・aliasで絞る前に全marker候補を数える。失敗/進行中の重複も隠さない。
  if (correlated.length > 1)
    throw new Error('[preview-delivery] multiple deployments for one attempt');
  const matching = snapshot.deployments.flatMap((value) => {
    try {
      return [{ value, deployment: verifyPreviewDeployment(value, attempt.sourceSha, false) }];
    } catch {
      return [];
    }
  });
  const current = matching.filter(
    ({ value }) => (deliveryRecord(value)['aliases'] as unknown[]).length === 1,
  );
  let contentStatus: PreviewAttempt['contentStatus'] = 'unavailable';
  if (current.length === 1 && current[0]) {
    try {
      contentStatus = (await verifyHttp(current[0].deployment, attempt)) ? 'matches' : 'differs';
    } catch {
      contentStatus = 'unavailable';
    }
  }
  const operation = matching.filter(({ value, deployment }) => {
    const row = deliveryRecord(value),
      metadata = deliveryRecord(deliveryRecord(row['deployment_trigger'])['metadata']);
    try {
      const created = Date.parse(previewTimestamp(row['created_on']));
      return (
        attempt.uploadStartedAt !== null &&
        !attempt.before.ids.includes(deployment.id) &&
        metadata['commit_message'] === previewAttemptMarker(attempt) &&
        created >= Date.parse(attempt.before.observedAt) &&
        created <= Date.parse(after.observedAt) + 999
      );
    } catch {
      return false;
    }
  });
  const confirmed = operation.length === 1 ? operation[0] : undefined;
  if (
    confirmed &&
    attempt.deploymentId !== null &&
    attempt.deploymentId !== confirmed.deployment.id
  )
    throw new Error('[preview-delivery] receipt and unique attempt deployment differ');
  const confirmation =
    attempt.confirmation ??
    (confirmed
      ? {
          createdAt: previewTimestamp(deliveryRecord(confirmed.value)['created_on']),
          observedAt: after.observedAt,
        }
      : null);
  const deploymentId = confirmed?.deployment.id ?? attempt.deploymentId;
  const verified =
    !!confirmed && contentStatus === 'matches' && current[0]?.deployment.id === deploymentId;
  const verificationFailure =
    confirmed && !verified
      ? contentStatus === 'differs'
        ? 'http-differs'
        : contentStatus === 'unavailable'
          ? 'http-unavailable'
          : 'alias-mismatch'
      : null;
  return parsePreviewAttempt({
    ...attempt,
    contentStatus,
    operationStatus: confirmation ? 'confirmed' : 'unknown',
    confirmation,
    deploymentId,
    verificationFailure,
    status: verified ? 'verified' : verificationFailure ? 'failed-confirmed' : 'uncertain',
  });
};

export const assertRecoverablePreviewSnapshot = (
  attempt: PreviewAttempt,
  snapshot: DeploymentSnapshot,
): void => {
  if (
    attempt.status !== 'failed-confirmed' ||
    attempt.operationStatus !== 'confirmed' ||
    !attempt.confirmation ||
    !attempt.deploymentId
  )
    throw new Error('[preview-delivery] unresolved operation cannot recover');
  const after = snapshotBeforeUpload(snapshot);
  if (Date.parse(after.observedAt) < Date.parse(attempt.confirmation.observedAt))
    throw new Error('[preview-delivery] stale recovery snapshot');
  const candidates = snapshot.deployments.filter(
    (value) =>
      deliveryRecord(deliveryRecord(deliveryRecord(value)['deployment_trigger'])['metadata'])[
        'commit_message'
      ] === previewAttemptMarker(attempt),
  );
  if (candidates.length !== 1)
    throw new Error('[preview-delivery] ambiguous/missing recovery operation');
  const value = candidates[0],
    identity = verifyPreviewDeployment(value, attempt.sourceSha);
  const owners = snapshot.deployments.filter((value) => {
    const aliases = deliveryRecord(value)['aliases'];
    return (
      Array.isArray(aliases) &&
      aliases.some(
        (alias) => alias === PREVIEW_TARGET.origin || alias === PREVIEW_TARGET.origin + '/',
      )
    );
  });
  if (
    owners.length !== 1 ||
    !['http-differs', 'http-unavailable'].includes(attempt.verificationFailure ?? '') ||
    identity.id !== attempt.deploymentId ||
    attempt.before.ids.includes(identity.id) ||
    previewTimestamp(deliveryRecord(value)['created_on']) !== attempt.confirmation.createdAt
  )
    throw new Error('[preview-delivery] recovery service identity mismatch');
};

export const executePreviewTransaction = async (
  request: {
    policy: PreviewDeliveryPolicy;
    approvalId: string;
    execution: PreviewTrustedExecution;
    evidence: PreviewServiceEvidence;
    packetRoot: string;
    history: { complete: boolean; attemptedApprovalIds: readonly string[] };
  },
  ports: PreviewDeliveryPorts,
): Promise<PreviewAttempt> => {
  const approval = authorizePreviewDelivery(request.policy, request.approvalId, request.execution);
  verifyPreviewServiceEvidence(approval, request.evidence);
  verifyApprovedPreviewPacket(
    approval,
    await inspectPreviewPacket(request.packetRoot, approval.sourceSha),
  );
  assertUnusedPreviewApproval(approval, request.history);
  const before = snapshotBeforeUpload(await ports.snapshot()),
    nonce = (ports.nonce ?? randomUUID)();
  if (!PREVIEW_UUID.test(nonce) || !request.policy.accountId)
    throw new Error('[preview-delivery] invalid attempt setup');
  let attempt = parsePreviewAttempt({
    schema: 3,
    approvalId: approval.id,
    recoveryFrom: approval.recoveryFrom,
    verificationFailure: null,
    mode: approval.mode,
    sourceSha: approval.sourceSha,
    payloadDigest: approval.mode === 'baseline' ? approval.baselineDigest : approval.artifactDigest,
    packetDigest: approval.packetDigest,
    accountId: request.policy.accountId,
    runId: request.execution.runId,
    runAttempt: request.execution.runAttempt,
    workflowSha: request.execution.workflowSha,
    attemptId: `${request.execution.runId}.${String(request.execution.runAttempt)}.${nonce}`,
    before,
    uploadStartedAt: null,
    status: 'reserved',
    deploymentId: null,
    confirmation: null,
    contentStatus: 'not-checked',
    operationStatus: 'not-started',
  });
  await ports.reserve(attempt);
  try {
    attempt = {
      ...attempt,
      uploadStartedAt: previewTimestamp((ports.now ?? (() => new Date().toISOString()))()),
      status: 'upload-started',
      operationStatus: 'unknown',
    };
    await ports.persist(attempt);
    const receipt = await ports.upload(attempt, {
      directory: path.join(request.packetRoot, approval.mode),
      digest: attempt.payloadDigest,
      accountId: attempt.accountId,
    });
    if (receipt && !PREVIEW_UUID.test(receipt.deploymentId))
      throw new Error('[preview-delivery] invalid upload receipt');
    attempt = {
      ...attempt,
      status: 'deployed-unverified',
      deploymentId: receipt?.deploymentId ?? null,
    };
    await ports.persist(attempt);
    attempt = await reconcilePreviewAttempt(attempt, await ports.observe(), ports.verifyHttp);
    await ports.persist(attempt);
    return attempt;
  } catch {
    attempt = {
      ...attempt,
      status: attempt.verificationFailure ? 'failed-confirmed' : 'uncertain',
    };
    await ports.persist(attempt);
    return attempt;
  }
};
