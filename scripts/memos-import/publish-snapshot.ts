import {
  OPERATION_STAGES,
  type ImportPlan,
  type OperationReceipt,
  type OwnedFiles,
  type PublicationLedger,
  type PublicationOperation,
  type Snapshot,
} from './model.js';
import { createReceipt, validateOperation } from './publication-ledger.js';
import { buildImportPlan, plannedSourceSnapshot } from './build-import-plan.js';
import { hashBytes } from './source-snapshot.js';
import { fingerprintCommittedChanges } from './candidate-fingerprint.js';
import type { ImageInputGuards } from '../../build/media/validate-image-inputs.js';
export interface PublicationPorts {
  withLock<T>(operationId: string, work: () => Promise<T>): Promise<T>;
  readLedger(): Promise<{ ledger: PublicationLedger; commitSha: string }>;
  readSource(sha?: string): Promise<Snapshot>;
  readRouault(): Promise<{ snapshot: Snapshot; manifest?: OwnedFiles }>;
  saveReceipt(receipt: OperationReceipt, expectedLedgerSha: string): Promise<string>;
  commitSourceFlags(
    source: Snapshot,
    planned: Snapshot,
    targets: readonly string[],
  ): Promise<string>;
  validateCandidate(plan: ImportPlan, base: Snapshot): Promise<void>;
  commitRouault(plan: ImportPlan, expectedBaseSha: string, operationId: string): Promise<string>;
  pushRouault(commitSha: string, expectedBaseSha: string): Promise<void>;
  findRouaultOperation(
    operationId: string,
    candidateHash: string,
    expectedBaseSha?: string,
  ): Promise<string | null>;
  inspectRouaultCommit(
    commitSha: string,
    headSha: string,
  ): Promise<{ published: boolean; snapshot?: Snapshot; parent?: Snapshot }>;
  verifyDeployment(
    commitSha: string,
    plan: ImportPlan,
  ): Promise<{ deploymentId: string; status: 'verified' | 'failed' | 'unknown' }>;
  finalizeLedger(
    ledger: PublicationLedger,
    receipt: OperationReceipt,
    plan: ImportPlan,
    expectedLedgerSha: string,
  ): Promise<string>;
}
export interface PublicationRunResult {
  receipt: OperationReceipt;
  status: 'complete' | 'partial' | 'failed';
  errorCode?: string;
}
export const executePublicationOperation = async (
  operation: PublicationOperation,
  ports: PublicationPorts,
  config: {
    guards: ImageInputGuards;
    initializeEmpty?: boolean;
    rightsConfirmedFor?: ReadonlySet<string>;
    archiveReferencesVerified?: boolean;
  },
): Promise<PublicationRunResult> =>
  ports.withLock(operation.operationId, async () => {
    const loaded = await ports.readLedger();
    const ledger = loaded.ledger;
    const existing = ledger.operations[operation.operationId];
    if (existing && JSON.stringify(existing.operation) !== JSON.stringify(operation))
      throw new Error('[publication] operation ID scope conflict');
    if (existing?.stage === 'ledger-finalized') {
      const current = await ports.readRouault();
      for (const target of operation.targets) {
        const entry = ledger.entries[target];
        if (entry?.approvedRequestRef !== operation.userRequestRef)
          throw new Error('[publication] completed ledger mismatch');
        for (const [name, hash] of Object.entries(entry.publicOutputHashes)) {
          const file = current.snapshot.files.get(name);
          if (!file || hashBytes(file.bytes) !== hash)
            throw new Error('[publication] completed output mismatch');
        }
        if (entry.status === 'withdrawn' && current.snapshot.files.has(entry.publicPath))
          throw new Error('[publication] withdrawn output remains');
      }
      return { receipt: existing, status: 'complete' };
    }
    validateOperation(operation, ledger);
    for (const receipt of Object.values(ledger.operations)) {
      if (
        receipt.operation.operationId !== operation.operationId &&
        receipt.stage !== 'ledger-finalized' &&
        receipt.sourceBeforeSha !== null &&
        receipt.failureStage !== 'preflight-pinned' &&
        receipt.failureStage !== 'preflight-validated'
      )
        throw new Error('[publication] previous operation requires reconciliation');
    }
    let ledgerSha = loaded.commitSha;
    const receipt = existing ? structuredClone(existing) : createReceipt(operation);
    const persist = async (): Promise<void> => {
      ledgerSha = await ports.saveReceipt(receipt, ledgerSha);
    };
    const advance = async (stage: OperationReceipt['stage']): Promise<void> => {
      if (OPERATION_STAGES.indexOf(stage) > OPERATION_STAGES.indexOf(receipt.stage))
        receipt.stage = stage;
      receipt.failureStage = null;
      await persist();
    };
    let activeStage: OperationReceipt['stage'] = receipt.stage;
    let observedPublicCommit = false;
    try {
      await advance('locked');
      activeStage = 'preflight-pinned';
      const source = await ports.readSource(receipt.sourceFinalSha ?? undefined);
      const rouault = await ports.readRouault();
      if (!receipt.rouaultCommitSha && receipt.candidateHash) {
        receipt.rouaultCommitSha = await ports.findRouaultOperation(
          operation.operationId,
          receipt.candidateHash,
        );
      }
      if (receipt.rouaultCommitSha) {
        const recovery = await ports.inspectRouaultCommit(
          receipt.rouaultCommitSha,
          rouault.snapshot.sha,
        );
        if (
          !receipt.noOps.includes('rouault-committed') &&
          recovery.snapshot &&
          recovery.parent &&
          fingerprintCommittedChanges(recovery.snapshot, recovery.parent) !== receipt.candidateHash
        )
          throw new Error('[publication] recovery commit differs from approved candidate');
        observedPublicCommit = recovery.published;
        if (recovery.published && !recovery.snapshot)
          throw new Error('[publication] published commit unavailable');
        if (
          !recovery.published &&
          (receipt.stage === 'pushed' || receipt.stage === 'deployment-verified')
        )
          throw new Error('[publication] previously published commit requires reconciliation');
        if (
          !recovery.published &&
          (!recovery.snapshot || recovery.parent?.sha !== rouault.snapshot.sha)
        ) {
          receipt.results['previousUnpublishedRouaultCommitSha'] = receipt.rouaultCommitSha;
          receipt.rouaultCommitSha = null;
          receipt.candidateHash = null;
          receipt.rouaultBaseSha = rouault.snapshot.sha;
          receipt.stage = 'source-final-pinned';
          await persist();
        }
      }
      receipt.sourceBeforeSha ??= source.sha;
      receipt.rouaultBaseSha ??= rouault.snapshot.sha;
      await advance('preflight-pinned');
      const planned = receipt.sourceFinalSha ? source : plannedSourceSnapshot(source, operation);
      activeStage = 'preflight-validated';
      const plan = await buildImportPlan({
        ...config,
        operation,
        source: planned,
        rouault: rouault.snapshot,
        ledger,
        recoveringCommittedOperation: receipt.rouaultCommitSha !== null,
        ...(rouault.manifest ? { manifest: rouault.manifest } : {}),
      });
      if (receipt.approvedInputHash && receipt.approvedInputHash !== plan.inputHash)
        throw new Error('[publication] approved content changed; new approval required');
      receipt.approvedInputHash = plan.inputHash;
      for (const confirmation of plan.confirmations) {
        const key = `confirmation-${confirmation.fingerprint}`;
        if (!Object.hasOwn(receipt.results, key)) receipt.results[key] = 'pending';
      }
      if (
        receipt.candidateHash &&
        !receipt.rouaultCommitSha &&
        receipt.candidateHash !== plan.candidateHash
      )
        throw new Error('[publication] candidate conflict requires reconciliation');
      await ports.validateCandidate(plan, rouault.snapshot);
      await advance('preflight-validated');
      activeStage = 'source-flag-committed';
      if (!receipt.sourceFinalSha) {
        const changed = operation.targets.some((name) => {
          const before = source.files.get(name);
          const after = planned.files.get(name);
          return before && after && hashBytes(before.bytes) !== hashBytes(after.bytes);
        });
        // 外部更新前に「結果未確認」を永続化し、応答消失を成功と誤認しない。
        receipt.flagState = changed ? 'unknown' : 'unchanged';
        await persist();
        receipt.sourceFinalSha = changed
          ? await ports.commitSourceFlags(source, planned, operation.targets)
          : source.sha;
        receipt.flagState = changed ? 'updated' : 'unchanged';
        if (!changed) receipt.noOps.push('source-flag-committed');
        await advance('source-flag-committed');
      }
      activeStage = 'source-final-pinned';
      const finalSource = await ports.readSource(receipt.sourceFinalSha);
      if (finalSource.sha !== receipt.sourceFinalSha)
        throw new Error('[publication] final source revision mismatch');
      await advance('source-final-pinned');
      activeStage = 'candidate-validated';
      const currentRouault = await ports.readRouault();
      const finalPlan = await buildImportPlan({
        ...config,
        operation,
        source: finalSource,
        rouault: currentRouault.snapshot,
        ledger,
        recoveringCommittedOperation: receipt.rouaultCommitSha !== null,
        ...(currentRouault.manifest ? { manifest: currentRouault.manifest } : {}),
      });
      if (finalPlan.inputHash !== receipt.approvedInputHash)
        throw new Error('[publication] final source differs from approved content');
      if (observedPublicCommit && (finalPlan.writes.size || finalPlan.deletes.length))
        throw new Error('[publication] published output differs; reconciliation required');
      await ports.validateCandidate(finalPlan, currentRouault.snapshot);
      if (!receipt.rouaultCommitSha) {
        if (receipt.rouaultBaseSha !== currentRouault.snapshot.sha) {
          receipt.results['rouaultPreflightBaseSha'] = receipt.rouaultBaseSha;
          receipt.rouaultBaseSha = currentRouault.snapshot.sha;
        }
        receipt.candidateHash = finalPlan.candidateHash;
        await advance('candidate-validated');
        activeStage = 'rouault-committed';
        const recovered = await ports.findRouaultOperation(
          operation.operationId,
          finalPlan.candidateHash,
          currentRouault.snapshot.sha,
        );
        if (recovered) receipt.rouaultCommitSha = recovered;
        else if (finalPlan.writes.size || finalPlan.deletes.length)
          receipt.rouaultCommitSha = await ports.commitRouault(
            finalPlan,
            currentRouault.snapshot.sha,
            operation.operationId,
          );
        else {
          receipt.rouaultCommitSha = currentRouault.snapshot.sha;
          receipt.noOps.push('rouault-committed');
        }
        await advance('rouault-committed');
      }
      if (OPERATION_STAGES.indexOf(receipt.stage) < OPERATION_STAGES.indexOf('pushed')) {
        activeStage = 'pushed';
        if (observedPublicCommit) receipt.results['publicPushObserved'] = receipt.rouaultCommitSha;
        else await ports.pushRouault(receipt.rouaultCommitSha, receipt.rouaultBaseSha);
        await advance('pushed');
      }
      activeStage = 'deployment-verified';
      const deployment = await ports.verifyDeployment(receipt.rouaultCommitSha, finalPlan);
      receipt.deploymentStatus = deployment.status;
      receipt.deploymentId = deployment.deploymentId || null;
      if (deployment.status !== 'verified' || !receipt.deploymentId)
        throw new Error('[publication] deployment not verified');
      await advance('deployment-verified');
      activeStage = 'ledger-finalized';
      receipt.stage = 'ledger-finalized';
      receipt.failureStage = null;
      // 確定entryと完了receiptはprivate台帳repositoryの同一commitへ渡す。
      await ports.finalizeLedger(ledger, receipt, finalPlan, ledgerSha);
      return { receipt, status: 'complete' };
    } catch {
      receipt.failureStage = activeStage;
      if (receipt.stage === 'ledger-finalized') receipt.stage = 'deployment-verified';
      try {
        await persist();
      } catch {
        receipt.results['receiptPersistence'] = 'unconfirmed';
      }
      return {
        receipt,
        status:
          receipt.sourceFinalSha || receipt.flagState === 'unknown' || receipt.rouaultCommitSha
            ? 'partial'
            : 'failed',
        errorCode: `failed-at-${activeStage}`,
      };
    }
  });
