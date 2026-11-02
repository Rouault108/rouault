import { PREVIEW_TARGET } from '../../build/security/csp-preview-artifact.js';

export const PREVIEW_REPOSITORY = 'Rouault108/rouault';
export const PREVIEW_WORKFLOW = '.github/workflows/csp-preview-delivery.yml';
const SHA = /^[a-f0-9]{40}$/u;
const DIGEST = /^[a-f0-9]{64}$/u;
const ID = /^[1-9][0-9]{0,19}$/u;
const LABEL = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/u;

export const deliveryRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('[preview-delivery] expected object');
  return value as Record<string, unknown>;
};
export const exactDeliveryFields = (value: Record<string, unknown>, keys: readonly string[]) => {
  if (Object.keys(value).sort().join(',') !== [...keys].sort().join(','))
    throw new Error('[preview-delivery] unexpected or missing fields');
};
const text = (value: unknown, pattern: RegExp): string => {
  if (typeof value !== 'string' || !pattern.test(value))
    throw new Error('[preview-delivery] invalid identity');
  return value;
};

export interface PreviewApproval {
  id: string;
  mode: 'report-only' | 'baseline';
  sourceSha: string;
  producerRunId: string;
  producerAttempt: number;
  producerWorkflowSha: string;
  artifactId: string;
  artifactZipDigest: string;
  packetDigest: string;
  receiptDigest: string;
  artifactDigest: string;
  baselineDigest: string;
  ciRunId: string;
  ciWorkflowDigest: string;
  approvalRef: string;
}
export interface PreviewDeliveryPolicy {
  schema: 1;
  repository: typeof PREVIEW_REPOSITORY;
  target: typeof PREVIEW_TARGET;
  deliveryEnabled: boolean;
  accountId: string | null;
  existingCredentialBinding: string | null;
  credentialScopeConfirmed: boolean;
  actionsReadApproved: boolean;
  destinationReviewed: boolean;
  stage0Reviewed: boolean;
  rollbackRetentionConfirmed: boolean;
  approvals: PreviewApproval[];
}

export const parsePreviewApproval = (value: unknown): PreviewApproval => {
  const row = deliveryRecord(value);
  exactDeliveryFields(row, [
    'id',
    'mode',
    'sourceSha',
    'producerRunId',
    'producerAttempt',
    'producerWorkflowSha',
    'artifactId',
    'artifactZipDigest',
    'packetDigest',
    'receiptDigest',
    'artifactDigest',
    'baselineDigest',
    'ciRunId',
    'ciWorkflowDigest',
    'approvalRef',
  ]);
  if (row['mode'] !== 'report-only' && row['mode'] !== 'baseline')
    throw new Error('[preview-delivery] unsupported delivery mode');
  if (!Number.isSafeInteger(row['producerAttempt']) || Number(row['producerAttempt']) < 1)
    throw new Error('[preview-delivery] invalid producer attempt');
  return {
    id: text(row['id'], LABEL),
    mode: row['mode'],
    sourceSha: text(row['sourceSha'], SHA),
    producerRunId: text(row['producerRunId'], ID),
    producerAttempt: Number(row['producerAttempt']),
    producerWorkflowSha: text(row['producerWorkflowSha'], SHA),
    artifactId: text(row['artifactId'], ID),
    artifactZipDigest: text(row['artifactZipDigest'], /^sha256:[a-f0-9]{64}$/u),
    packetDigest: text(row['packetDigest'], DIGEST),
    receiptDigest: text(row['receiptDigest'], DIGEST),
    artifactDigest: text(row['artifactDigest'], DIGEST),
    baselineDigest: text(row['baselineDigest'], DIGEST),
    ciRunId: text(row['ciRunId'], ID),
    ciWorkflowDigest: text(row['ciWorkflowDigest'], DIGEST),
    approvalRef: text(row['approvalRef'], LABEL),
  };
};

export const parsePreviewDeliveryPolicy = (value: unknown): PreviewDeliveryPolicy => {
  const row = deliveryRecord(value);
  exactDeliveryFields(row, [
    'schema',
    'repository',
    'target',
    'deliveryEnabled',
    'accountId',
    'existingCredentialBinding',
    'credentialScopeConfirmed',
    'actionsReadApproved',
    'destinationReviewed',
    'stage0Reviewed',
    'rollbackRetentionConfirmed',
    'approvals',
  ]);
  if (
    row['schema'] !== 1 ||
    row['repository'] !== PREVIEW_REPOSITORY ||
    JSON.stringify(row['target']) !== JSON.stringify(PREVIEW_TARGET) ||
    !Array.isArray(row['approvals'])
  )
    throw new Error('[preview-delivery] fixed target mismatch');
  for (const key of [
    'deliveryEnabled',
    'credentialScopeConfirmed',
    'actionsReadApproved',
    'destinationReviewed',
    'stage0Reviewed',
    'rollbackRetentionConfirmed',
  ])
    if (typeof row[key] !== 'boolean') throw new Error('[preview-delivery] invalid gate');
  const approvals = row['approvals'].map(parsePreviewApproval);
  if (new Set(approvals.map(({ id }) => id)).size !== approvals.length)
    throw new Error('[preview-delivery] duplicate approval');
  return {
    schema: 1,
    repository: PREVIEW_REPOSITORY,
    target: PREVIEW_TARGET,
    deliveryEnabled: row['deliveryEnabled'] === true,
    accountId: row['accountId'] === null ? null : text(row['accountId'], /^[a-f0-9]{32}$/u),
    existingCredentialBinding:
      row['existingCredentialBinding'] === null
        ? null
        : text(row['existingCredentialBinding'], LABEL),
    credentialScopeConfirmed: row['credentialScopeConfirmed'] === true,
    actionsReadApproved: row['actionsReadApproved'] === true,
    destinationReviewed: row['destinationReviewed'] === true,
    stage0Reviewed: row['stage0Reviewed'] === true,
    rollbackRetentionConfirmed: row['rollbackRetentionConfirmed'] === true,
    approvals,
  };
};

export interface PreviewTrustedExecution {
  repository: string;
  event: string;
  ref: string;
  workflowRef: string;
  workflowSha: string;
  checkoutSha: string;
}
export const authorizePreviewDelivery = (
  policy: PreviewDeliveryPolicy,
  approvalId: string,
  execution: PreviewTrustedExecution,
): PreviewApproval => {
  // candidateのreceiptやdispatch入力には公開authorityを与えない。
  parsePreviewDeliveryPolicy(policy);
  if (
    execution.repository !== PREVIEW_REPOSITORY ||
    execution.event !== 'workflow_dispatch' ||
    execution.ref !== 'refs/heads/main' ||
    execution.workflowRef !== `${PREVIEW_REPOSITORY}/${PREVIEW_WORKFLOW}@refs/heads/main` ||
    !SHA.test(execution.workflowSha) ||
    execution.checkoutSha !== execution.workflowSha
  )
    throw new Error('[preview-delivery] trusted default-branch execution required');
  if (
    !policy.deliveryEnabled ||
    !policy.accountId ||
    !policy.existingCredentialBinding ||
    !policy.credentialScopeConfirmed ||
    !policy.actionsReadApproved ||
    !policy.destinationReviewed ||
    !policy.stage0Reviewed ||
    !policy.rollbackRetentionConfirmed
  )
    throw new Error(
      '[preview-delivery] confirmed account, scope, destination and read permission required',
    );
  const approval = policy.approvals.find(({ id }) => id === approvalId);
  if (!approval) throw new Error('[preview-delivery] independently reviewed approval required');
  return approval;
};

export interface PreviewServiceEvidence {
  producer: unknown;
  artifact: unknown;
  ci: unknown;
  ciWorkflowDigest: string;
}
export const verifyPreviewServiceEvidence = (
  approval: PreviewApproval,
  evidence: PreviewServiceEvidence,
): void => {
  parsePreviewApproval(approval);
  const producer = deliveryRecord(evidence.producer),
    artifact = deliveryRecord(evidence.artifact),
    ci = deliveryRecord(evidence.ci);
  const repo = (run: Record<string, unknown>) => deliveryRecord(run['repository'])['full_name'];
  if (
    String(producer['id']) !== approval.producerRunId ||
    producer['run_attempt'] !== approval.producerAttempt ||
    producer['path'] !== PREVIEW_WORKFLOW ||
    producer['head_sha'] !== approval.producerWorkflowSha ||
    producer['head_branch'] !== 'main' ||
    producer['event'] !== 'workflow_dispatch' ||
    producer['status'] !== 'completed' ||
    producer['conclusion'] !== 'success' ||
    repo(producer) !== PREVIEW_REPOSITORY
  )
    throw new Error('[preview-delivery] producer service identity mismatch');
  const artifactRun = deliveryRecord(artifact['workflow_run']);
  if (
    String(artifact['id']) !== approval.artifactId ||
    artifact['name'] !== 'rouault-csp-preview-packet' ||
    artifact['expired'] !== false ||
    artifact['digest'] !== approval.artifactZipDigest ||
    String(artifactRun['id']) !== approval.producerRunId ||
    artifactRun['head_sha'] !== approval.producerWorkflowSha
  )
    throw new Error('[preview-delivery] artifact service identity/digest mismatch');
  if (
    String(ci['id']) !== approval.ciRunId ||
    ci['path'] !== '.github/workflows/ci-cd.yml' ||
    ci['head_sha'] !== approval.sourceSha ||
    ci['status'] !== 'completed' ||
    ci['conclusion'] !== 'success' ||
    !['push', 'workflow_dispatch'].includes(String(ci['event'])) ||
    repo(ci) !== PREVIEW_REPOSITORY ||
    evidence.ciWorkflowDigest !== approval.ciWorkflowDigest
  )
    throw new Error('[preview-delivery] candidate CI identity/definition mismatch');
};
