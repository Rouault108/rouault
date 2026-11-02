import { PREVIEW_TARGET } from '../../build/security/csp-preview-artifact.js';
import {
  authorizePreviewDelivery,
  deliveryRecord,
  parsePreviewApproval,
  verifyPreviewServiceEvidence,
  type PreviewApproval,
  type PreviewDeliveryPolicy,
  type PreviewServiceEvidence,
  type PreviewTrustedExecution,
} from './csp-preview-authority.js';
import { inspectPreviewPacket, verifyApprovedPreviewPacket } from './csp-preview-packet.js';
import path from 'node:path';

export interface PreviewAttempt {
  approvalId: string;
  mode: PreviewApproval['mode'];
  sourceSha: string;
  payloadDigest: string;
  status: 'reserved' | 'upload-started' | 'deployed-unverified' | 'verified' | 'uncertain';
  deploymentId: string | null;
}

export const previewWranglerArgs = (approval: PreviewApproval): readonly string[] => {
  parsePreviewApproval(approval);
  // cwdもpayloadもtrusted側が用意する。候補のconfigや任意path/commandを入力にしない。
  return [
    'pages',
    'deploy',
    'payload',
    '--project-name=rouault',
    '--branch=csp-verify',
    `--commit-hash=${approval.sourceSha}`,
    '--commit-dirty=false',
  ];
};

export const assertUnusedPreviewApproval = (
  approval: PreviewApproval,
  history: { complete: boolean; attemptedApprovalIds: readonly string[] },
): void => {
  if (!history.complete || history.attemptedApprovalIds.includes(approval.id))
    throw new Error(
      '[preview-delivery] incomplete history or prior attempt requires reconciliation and fresh approval',
    );
};

export const verifyPreviewDeployment = (
  value: unknown,
  sourceSha: string,
): { id: string; url: string } => {
  const row = deliveryRecord(value),
    trigger = deliveryRecord(row['deployment_trigger']);
  const metadata = deliveryRecord(trigger['metadata']),
    stage = deliveryRecord(row['latest_stage']);
  if (
    typeof row['id'] !== 'string' ||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/u.test(row['id']) ||
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
    row['aliases'].length !== 1 ||
    !row['aliases'].every(
      (alias: unknown) => alias === PREVIEW_TARGET.origin || alias === PREVIEW_TARGET.origin + '/',
    )
  )
    throw new Error('[preview-delivery] deployment/alias/source identity is not verified');
  return { id: row['id'], url: row['url'] };
};

export interface PreviewDeliveryPorts {
  reserve: (attempt: PreviewAttempt) => Promise<void>;
  persist: (attempt: PreviewAttempt) => Promise<void>;
  upload: (
    args: readonly string[],
    payload: { directory: string; digest: string; accountId: string },
  ) => Promise<void>;
  observe: () => Promise<unknown>;
  verifyHttp: (
    deployment: { id: string; url: string },
    attempt: PreviewAttempt,
  ) => Promise<boolean>;
}

// 永続reservation・API照合・HTTP照合のadapterは資格情報scope確認後に接続する。
// 模擬adapterの成功をCloudflare配信成功と扱わない。
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
  let attempt: PreviewAttempt = {
    approvalId: approval.id,
    mode: approval.mode,
    sourceSha: approval.sourceSha,
    payloadDigest: approval.mode === 'baseline' ? approval.baselineDigest : approval.artifactDigest,
    status: 'reserved',
    deploymentId: null,
  };
  await ports.reserve(attempt);
  try {
    attempt = { ...attempt, status: 'upload-started' };
    await ports.persist(attempt);
    const accountId = request.policy.accountId;
    if (!accountId) throw new Error('[preview-delivery] account identity unavailable');
    await ports.upload(previewWranglerArgs(approval), {
      directory: path.join(
        request.packetRoot,
        approval.mode === 'baseline' ? 'baseline' : 'report-only',
      ),
      digest: attempt.payloadDigest,
      accountId,
    });
    const deployment = verifyPreviewDeployment(await ports.observe(), approval.sourceSha);
    attempt = { ...attempt, status: 'deployed-unverified', deploymentId: deployment.id };
    await ports.persist(attempt);
    if (!(await ports.verifyHttp(deployment, attempt)))
      throw new Error('[preview-delivery] HTTP verification incomplete');
    attempt = { ...attempt, status: 'verified' };
    await ports.persist(attempt);
    return attempt;
  } catch {
    attempt = { ...attempt, status: 'uncertain' };
    await ports.persist(attempt);
    return attempt;
  }
};

export const reconcilePreviewAttempt = async (
  attempt: PreviewAttempt,
  deployments: readonly unknown[],
  verifyHttp: PreviewDeliveryPorts['verifyHttp'],
): Promise<PreviewAttempt> => {
  const matches = deployments.flatMap((value) => {
    try {
      const deployment = verifyPreviewDeployment(value, attempt.sourceSha);
      return attempt.deploymentId === null || attempt.deploymentId === deployment.id
        ? [deployment]
        : [];
    } catch {
      return [];
    }
  });
  const match = matches.length === 1 ? matches[0] : undefined;
  if (!match || !(await verifyHttp(match, attempt))) return { ...attempt, status: 'uncertain' };
  return { ...attempt, status: 'verified', deploymentId: match.id };
};
