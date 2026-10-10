export interface PublicationOperation {
  operationId: string;
  action: 'publish' | 'update' | 'withdraw' | 'register-existing';
  targets: readonly string[];
  userRequestRef: string;
  expectedLedgerRevision: number;
}
export interface PublicationEntry {
  sourcePath: string;
  publicPath: string;
  status: 'published' | 'withdrawn';
  approvedRequestRef: string;
  approvedSourceSha: string;
  approvedContentHash: string;
  dependencyHashes: Record<string, string>;
  publicOutputHashes: Record<string, string>;
  rouaultCommitSha: string;
  deploymentId: string;
  headingMap: Record<string, string>;
}
export interface PublicationLedgerState {
  schemaVersion: number;
  revision: number;
  entries: Record<string, PublicationEntry>;
}
export const OPERATION_STAGES = [
  'requested',
  'authorized',
  'locked',
  'preflight-pinned',
  'preflight-validated',
  'source-flag-committed',
  'source-final-pinned',
  'candidate-validated',
  'rouault-committed',
  'pushed',
  'deployment-verified',
  'ledger-finalized',
] as const;
export type OperationStage = (typeof OPERATION_STAGES)[number];
export interface OperationReceipt {
  operation: PublicationOperation;
  stage: OperationStage;
  sourceBeforeSha: string | null;
  sourceFinalSha: string | null;
  rouaultBaseSha: string | null;
  rouaultCommitSha: string | null;
  approvedInputHash: string | null;
  flagState: 'unchanged' | 'updated' | 'unknown' | null;
  candidateHash: string | null;
  deploymentId: string | null;
  deploymentStatus: 'verified' | 'failed' | 'unknown' | null;
  failureStage: OperationStage | null;
  noOps: OperationStage[];
  results: Record<string, string>;
}
export type PublicationLedger = PublicationLedgerState & {
  operations: Record<string, OperationReceipt>;
};
export interface OwnedFiles {
  schemaVersion: number;
  files: Record<string, string>;
}
export interface Snapshot {
  sha: string;
  complete: boolean;
  files: ReadonlyMap<string, { mode: '100644' | '100755' | '120000'; bytes: Uint8Array }>;
}
export interface ImportPlan {
  writes: ReadonlyMap<string, Uint8Array>;
  deletes: readonly string[];
  manifest: OwnedFiles;
  entries: Record<string, Omit<PublicationEntry, 'rouaultCommitSha' | 'deploymentId'>>;
  inputHash: string;
  candidateHash: string;
  confirmations: readonly {
    sourcePath: string;
    change: 'unknown-true' | 'known-disabled';
    fingerprint: string;
  }[];
}
