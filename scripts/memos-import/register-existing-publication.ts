import { buildImportPlan, plannedSourceSnapshot } from './build-import-plan.js';
import { fingerprintCommittedChanges } from './candidate-fingerprint.js';
import { assertCommitSha } from './git-repository.js';
import { PublicationLedgerStore } from './ledger-store.js';
import { aggregateLedger, createReceipt } from './publication-ledger.js';
import { assertSnapshot, hashBytes, readVaultNotes } from './source-snapshot.js';
import type { ImportPlan, OperationReceipt, PublicationOperation, Snapshot } from './model.js';
import type { PublicationPorts } from './publish-snapshot.js';

interface ExistingPublicationInput {
  operation: PublicationOperation;
  approvedContentHashes: ReadonlyMap<string, string>;
  source: Snapshot;
  publicSnapshot: Snapshot;
  publicParent: Snapshot;
  config: Pick<Parameters<typeof buildImportPlan>[0], 'guards' | 'manifest' | 'rightsConfirmedFor'>;
}

export const prepareExistingPublicationRegistration = async (
  input: ExistingPublicationInput,
): Promise<ImportPlan> => {
  const { operation, source, publicSnapshot, publicParent } = input;
  assertSnapshot(source);
  assertSnapshot(publicSnapshot);
  assertSnapshot(publicParent);
  for (const sha of [source.sha, publicSnapshot.sha, publicParent.sha]) assertCommitSha(sha);
  if (
    operation.action !== 'register-existing' ||
    operation.expectedLedgerRevision !== 0 ||
    JSON.stringify([...operation.targets].sort()) !==
      JSON.stringify([...input.approvedContentHashes.keys()].sort())
  )
    throw new Error('[registration] explicit approved target versions required');
  const notes = readVaultNotes(source);
  for (const target of operation.targets) {
    const approvedHash = input.approvedContentHashes.get(target);
    if (
      !approvedHash ||
      !/^[a-f0-9]{64}$/u.test(approvedHash) ||
      notes.get(target)?.versionHash !== approvedHash
    )
      throw new Error('[registration] approved source version differs');
  }

  // 選択用publishはメモリ上だけ。実source、公開物、過去のreceiptを変更しない。
  const selection = { ...operation, action: 'publish' as const };
  const plan = await buildImportPlan({
    ...input.config,
    operation: selection,
    source: plannedSourceSnapshot(source, selection),
    rouault: publicSnapshot,
    ledger: aggregateLedger({ schemaVersion: 1, revision: 0, entries: {} }, []),
  });
  const approvedOutputs = Object.keys(plan.entries).flatMap((target) =>
    Object.keys(plan.entries[target]?.publicOutputHashes ?? {}),
  );
  if (
    plan.deletes.length ||
    JSON.stringify([...new Set(approvedOutputs)].sort()) !==
      JSON.stringify(Object.keys(plan.manifest.files).sort()) ||
    [...plan.writes].some(([name, bytes]) => {
      const existing = publicSnapshot.files.get(name);
      return existing?.mode !== '100644' || hashBytes(existing.bytes) !== hashBytes(bytes);
    })
  )
    throw new Error('[registration] existing public outputs differ or exceed approval');
  return plan;
};

export const registerExistingPublication = async (
  input: ExistingPublicationInput & {
    store: PublicationLedgerStore;
    expectedLedgerHead: string;
    verifyDeployment: PublicationPorts['verifyDeployment'];
    recheckSnapshots: () => Promise<void>;
  },
): Promise<{ ledgerCommitSha: string; receipt: OperationReceipt }> => {
  const { operation, source, publicSnapshot, publicParent } = input;
  assertCommitSha(input.expectedLedgerHead);
  const plan = await prepareExistingPublicationRegistration(input);
  const deployment = await input.verifyDeployment(publicSnapshot.sha, plan);
  if (deployment.status !== 'verified' || !deployment.deploymentId)
    throw new Error(`[registration] production deployment ${deployment.status}; no ledger write`);
  await input.recheckSnapshots();
  const receipt = createReceipt(operation);
  Object.assign(receipt, {
    stage: 'ledger-finalized',
    sourceBeforeSha: source.sha,
    sourceFinalSha: source.sha,
    rouaultBaseSha: publicParent.sha,
    rouaultCommitSha: publicSnapshot.sha,
    approvedInputHash: plan.inputHash,
    candidateHash: fingerprintCommittedChanges(publicSnapshot, publicParent),
    flagState: 'unchanged',
    deploymentId: deployment.deploymentId,
    deploymentStatus: 'verified',
    results: {
      registrationMethod: 'verified-existing-publication-v1',
      registeredAt: new Date().toISOString(),
      sourceFlagsPreserved: 'true',
      importSelectionHash: plan.candidateHash,
      publicWritesPerformed: 'false',
    },
  });
  return {
    ledgerCommitSha: await input.store.registerExistingPublication(
      receipt,
      plan,
      input.expectedLedgerHead,
    ),
    receipt,
  };
};
