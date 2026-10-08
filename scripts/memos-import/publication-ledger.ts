import { assertSafeContentPath } from '../../build/content/content-record.js';
import type {
  OperationReceipt,
  PublicationLedger,
  PublicationLedgerState,
  PublicationOperation,
} from './model.js';
export const ledgerStorage = {
  // 先に旧名で互換コードを配備し、rename後のredirectを同一IDで検証してから参照名を切り替える。
  ledgerRepository: 'Rouault108/metis-handbook',
  ledgerRepositories: ['Rouault108/metis-handbook', 'Rouault108/metis-workspace'],
  ledgerRepositoryId: 1402900612,
  ledgerRepositoryOwner: 'Rouault108',
  ledgerBranch: 'main',
  ledgerRoot: 'publication-ledger/rouault-memos',
} as const;
export interface LedgerRepositoryIdentity {
  readonly repository: string;
  readonly repositoryId: number;
  readonly owner: string;
  readonly private: boolean;
  readonly branch: string;
}
export const isLedgerRepositoryIdentity = (identity: LedgerRepositoryIdentity): boolean =>
  ledgerStorage.ledgerRepositories.includes(
    identity.repository as (typeof ledgerStorage.ledgerRepositories)[number],
  ) &&
  identity.repositoryId === ledgerStorage.ledgerRepositoryId &&
  identity.owner === ledgerStorage.ledgerRepositoryOwner &&
  identity.private &&
  identity.branch === ledgerStorage.ledgerBranch;
export const validateOperation = (
  operation: PublicationOperation,
  ledger: PublicationLedger,
): void => {
  if (
    !/^[a-zA-Z0-9_-]+$/u.test(operation.operationId) ||
    !operation.userRequestRef.trim() ||
    !['publish', 'update', 'withdraw'].includes(operation.action) ||
    !operation.targets.length ||
    new Set(operation.targets).size !== operation.targets.length
  )
    throw new Error('[ledger] explicit operation required');
  if (operation.expectedLedgerRevision !== ledger.revision)
    throw new Error('[ledger] revision conflict');
  for (const target of operation.targets) {
    assertSafeContentPath(target);
    if (!target.startsWith('02_notes/') || !target.endsWith('.md'))
      throw new Error('[ledger] target outside notes');
    if (operation.action !== 'publish' && ledger.entries[target]?.status !== 'published')
      throw new Error('[ledger] target is not published');
  }
};
export const createReceipt = (operation: PublicationOperation): OperationReceipt => ({
  operation,
  stage: 'authorized',
  sourceBeforeSha: null,
  sourceFinalSha: null,
  rouaultBaseSha: null,
  rouaultCommitSha: null,
  approvedInputHash: null,
  flagState: null,
  candidateHash: null,
  deploymentId: null,
  deploymentStatus: null,
  failureStage: null,
  noOps: [],
  results: {},
});
export const aggregateLedger = (
  state: PublicationLedgerState,
  receipts: readonly OperationReceipt[],
): PublicationLedger => {
  if (
    state.schemaVersion !== 1 ||
    !Number.isSafeInteger(state.revision) ||
    state.revision < 0 ||
    'operations' in state
  )
    throw new Error('[ledger] corrupt state');
  const operations: Record<string, OperationReceipt> = {};
  for (const receipt of receipts) {
    const id = receipt.operation.operationId;
    if (operations[id]) throw new Error('[ledger] duplicate receipt');
    operations[id] = receipt;
  }
  return { ...state, operations };
};
export const serializeState = (ledger: PublicationLedgerState): string =>
  JSON.stringify(
    { schemaVersion: ledger.schemaVersion, revision: ledger.revision, entries: ledger.entries },
    null,
    2,
  ) + '\n';
