import { aggregateLedger, ledgerStorage, serializeState } from './publication-ledger.js';
import { hashBytes } from './source-snapshot.js';
import type {
  ImportPlan,
  OperationReceipt,
  PublicationLedger,
  PublicationLedgerState,
} from './model.js';
import { OPERATION_STAGES } from './model.js';
import { assertSafeContentPath } from '../../build/content/content-record.js';
export interface PrivateLedgerRepository {
  identity(): Promise<{ repository: string; private: boolean; branch: string }>;
  head(): Promise<string>;
  readFolder(
    commitSha: string,
    root: string,
  ): Promise<{ complete: boolean; files: ReadonlyMap<string, Uint8Array> }>;
  commitFiles(expectedHead: string, files: ReadonlyMap<string, Uint8Array>): Promise<string>;
}
const parseJson = (bytes: Uint8Array): unknown =>
  JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const sha = (value: unknown): boolean => typeof value === 'string' && /^[a-f0-9]{40}$/u.test(value);
const hash = (value: unknown): boolean =>
  typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
const stringMap = (value: unknown, valid: (value: unknown) => boolean): boolean =>
  isRecord(value) && Object.values(value).every(valid);
const assertState = (parsed: unknown): PublicationLedgerState => {
  if (
    !isRecord(parsed) ||
    parsed['schemaVersion'] !== 1 ||
    !Number.isSafeInteger(parsed['revision']) ||
    Number(parsed['revision']) < 0 ||
    !isRecord(parsed['entries']) ||
    Object.keys(parsed).some((key) => !['schemaVersion', 'revision', 'entries'].includes(key))
  )
    throw new Error('[ledger] corrupt state schema');
  for (const [sourcePath, entry] of Object.entries(parsed['entries'])) {
    assertSafeContentPath(sourcePath);
    if (
      !sourcePath.startsWith('02_notes/') ||
      !sourcePath.endsWith('.md') ||
      !isRecord(entry) ||
      entry['sourcePath'] !== sourcePath ||
      typeof entry['publicPath'] !== 'string' ||
      !entry['publicPath'].startsWith('content/memos/') ||
      !['published', 'withdrawn'].includes(String(entry['status'])) ||
      typeof entry['approvedRequestRef'] !== 'string' ||
      !entry['approvedRequestRef'] ||
      !sha(entry['approvedSourceSha']) ||
      !sha(entry['rouaultCommitSha']) ||
      !hash(entry['approvedContentHash']) ||
      typeof entry['deploymentId'] !== 'string' ||
      !entry['deploymentId'] ||
      !stringMap(entry['publicOutputHashes'], hash) ||
      !stringMap(entry['dependencyHashes'], hash) ||
      !stringMap(entry['headingMap'], (value) => typeof value === 'string')
    )
      throw new Error('[ledger] corrupt entry');
    assertSafeContentPath(entry['publicPath']);
  }
  return parsed as unknown as PublicationLedgerState;
};
const assertReceipt = (parsed: unknown, name: string): OperationReceipt => {
  if (!isRecord(parsed) || !isRecord(parsed['operation']))
    throw new Error('[ledger] corrupt receipt');
  const op = parsed['operation'];
  if (
    typeof op['operationId'] !== 'string' ||
    !/^[a-zA-Z0-9_-]+$/u.test(op['operationId']) ||
    name !== `operations/${op['operationId']}.json` ||
    !['publish', 'update', 'withdraw'].includes(String(op['action'])) ||
    !Array.isArray(op['targets']) ||
    !op['targets'].length ||
    !op['targets'].every(
      (value) =>
        typeof value === 'string' && value.startsWith('02_notes/') && value.endsWith('.md'),
    ) ||
    typeof op['userRequestRef'] !== 'string' ||
    !op['userRequestRef'] ||
    !Number.isSafeInteger(op['expectedLedgerRevision']) ||
    !OPERATION_STAGES.includes(parsed['stage'] as OperationReceipt['stage']) ||
    !Array.isArray(parsed['noOps']) ||
    !parsed['noOps'].every((value) =>
      OPERATION_STAGES.includes(value as OperationReceipt['stage']),
    ) ||
    !stringMap(parsed['results'], (value) => typeof value === 'string')
  )
    throw new Error('[ledger] corrupt receipt');
  for (const target of op['targets']) assertSafeContentPath(String(target));
  for (const key of ['sourceBeforeSha', 'sourceFinalSha', 'rouaultBaseSha', 'rouaultCommitSha'])
    if (parsed[key] !== null && !sha(parsed[key])) throw new Error('[ledger] corrupt receipt SHA');
  for (const key of ['approvedInputHash', 'candidateHash'])
    if (parsed[key] !== null && !hash(parsed[key]))
      throw new Error('[ledger] corrupt receipt hash');
  if (
    ![null, 'unchanged', 'updated', 'unknown'].includes(parsed['flagState'] as string | null) ||
    ![null, 'verified', 'failed', 'unknown'].includes(
      parsed['deploymentStatus'] as string | null,
    ) ||
    (parsed['deploymentId'] !== null && typeof parsed['deploymentId'] !== 'string') ||
    (parsed['failureStage'] !== null &&
      !OPERATION_STAGES.includes(parsed['failureStage'] as OperationReceipt['stage']))
  )
    throw new Error('[ledger] corrupt receipt status');
  return parsed as unknown as OperationReceipt;
};
const parseFolder = (files: ReadonlyMap<string, Uint8Array>): PublicationLedger => {
  const state = files.get('state.json');
  if (!state) throw new Error('[ledger] state missing');
  const receipts: OperationReceipt[] = [];
  for (const [name, bytes] of files) {
    if (name === 'state.json') continue;
    if (!name.startsWith('operations/')) throw new Error('[ledger] unknown ledger file');
    receipts.push(assertReceipt(parseJson(bytes), name));
  }
  const ledger = aggregateLedger(assertState(parseJson(state)), receipts);
  for (const [sourcePath, entry] of Object.entries(ledger.entries)) {
    const receipt = receipts.find(
      (item) =>
        item.stage === 'ledger-finalized' &&
        item.operation.targets.includes(sourcePath) &&
        item.operation.userRequestRef === entry.approvedRequestRef &&
        item.sourceFinalSha === entry.approvedSourceSha &&
        item.rouaultCommitSha === entry.rouaultCommitSha &&
        item.deploymentId === entry.deploymentId &&
        item.deploymentStatus === 'verified',
    );
    if (!receipt || receipt.operation.expectedLedgerRevision >= ledger.revision)
      throw new Error('[ledger] entry/receipt disagreement requires recovery');
  }
  return ledger;
};
export class PublicationLedgerStore {
  constructor(private readonly repository: PrivateLedgerRepository) {}
  private async assertRepository(): Promise<void> {
    const identity = await this.repository.identity();
    if (
      identity.repository !== ledgerStorage.ledgerRepository ||
      !identity.private ||
      identity.branch !== ledgerStorage.ledgerBranch
    )
      throw new Error('[ledger] private repository identity mismatch');
  }
  async read(
    initializeEmpty = false,
    publicRegionEmpty = false,
  ): Promise<{ ledger: PublicationLedger; commitSha: string }> {
    await this.assertRepository();
    const commitSha = await this.repository.head();
    const folder = await this.repository.readFolder(commitSha, ledgerStorage.ledgerRoot);
    if (!folder.complete) throw new Error('[ledger] incomplete read');
    const stateBytes = folder.files.get('state.json');
    if (!stateBytes) {
      if (!initializeEmpty || !publicRegionEmpty || folder.files.size)
        throw new Error('[ledger] state missing; recovery required');
      const state: PublicationLedgerState = { schemaVersion: 1, revision: 0, entries: {} };
      const nextSha = await this.repository.commitFiles(
        commitSha,
        new Map([[`${ledgerStorage.ledgerRoot}/state.json`, Buffer.from(serializeState(state))]]),
      );
      return { ledger: aggregateLedger(state, []), commitSha: nextSha };
    }
    return { ledger: parseFolder(folder.files), commitSha };
  }
  async saveReceipt(receipt: OperationReceipt, expectedHead: string): Promise<string> {
    await this.assertRepository();
    if (!/^[a-zA-Z0-9_-]+$/u.test(receipt.operation.operationId))
      throw new Error('[ledger] unsafe operation ID');
    return this.repository.commitFiles(
      expectedHead,
      new Map([
        [
          `${ledgerStorage.ledgerRoot}/operations/${receipt.operation.operationId}.json`,
          Buffer.from(JSON.stringify(receipt, null, 2) + '\n'),
        ],
      ]),
    );
  }
  async finalize(
    ledger: PublicationLedger,
    receipt: OperationReceipt,
    plan: ImportPlan,
    expectedHead: string,
  ): Promise<string> {
    await this.assertRepository();
    if (
      receipt.stage !== 'ledger-finalized' ||
      receipt.deploymentStatus !== 'verified' ||
      !receipt.rouaultCommitSha ||
      !receipt.deploymentId ||
      !receipt.sourceFinalSha ||
      receipt.approvedInputHash !== plan.inputHash ||
      JSON.stringify([...receipt.operation.targets].sort()) !==
        JSON.stringify(Object.keys(plan.entries).sort()) ||
      Object.values(plan.entries).some(
        (entry) =>
          entry.approvedSourceSha !== receipt.sourceFinalSha ||
          entry.approvedRequestRef !== receipt.operation.userRequestRef,
      ) ||
      ledger.revision !== receipt.operation.expectedLedgerRevision
    )
      throw new Error('[ledger] incomplete finalization');
    const entries = { ...ledger.entries };
    for (const [sourcePath, entry] of Object.entries(plan.entries))
      entries[sourcePath] = {
        ...entry,
        rouaultCommitSha: receipt.rouaultCommitSha,
        deploymentId: receipt.deploymentId,
      };
    const state: PublicationLedgerState = {
      schemaVersion: 1,
      revision: ledger.revision + 1,
      entries,
    };
    return this.repository.commitFiles(
      expectedHead,
      new Map([
        [`${ledgerStorage.ledgerRoot}/state.json`, Buffer.from(serializeState(state))],
        [
          `${ledgerStorage.ledgerRoot}/operations/${receipt.operation.operationId}.json`,
          Buffer.from(JSON.stringify(receipt, null, 2) + '\n'),
        ],
      ]),
    );
  }
  async backup(): Promise<{
    commitSha: string;
    stateHash: string;
    files: ReadonlyMap<string, Uint8Array>;
  }> {
    await this.assertRepository();
    const commitSha = await this.repository.head();
    const folder = await this.repository.readFolder(commitSha, ledgerStorage.ledgerRoot);
    const state = folder.files.get('state.json');
    if (!state || !folder.complete) throw new Error('[ledger] backup incomplete');
    return { commitSha, stateHash: hashBytes(state), files: folder.files };
  }
  async restoreBackup(
    backup: { stateHash: string; files: ReadonlyMap<string, Uint8Array> },
    expectedHead: string,
    reconcile: () => Promise<void>,
  ): Promise<string> {
    await this.assertRepository();
    this.verifyBackup(backup);
    if ((await this.repository.head()) !== expectedHead)
      throw new Error('[ledger] recovery base conflict');
    await reconcile();
    const current = await this.repository.readFolder(expectedHead, ledgerStorage.ledgerRoot);
    if (!current.complete || [...current.files.keys()].some((name) => !backup.files.has(name)))
      throw new Error('[ledger] recovery receipt reconciliation required');
    return this.repository.commitFiles(
      expectedHead,
      new Map(
        [...backup.files].map(([name, bytes]) => [`${ledgerStorage.ledgerRoot}/${name}`, bytes]),
      ),
    );
  }
  verifyBackup(backup: { stateHash: string; files: ReadonlyMap<string, Uint8Array> }): void {
    const bytes = backup.files.get('state.json');
    if (!bytes || hashBytes(bytes) !== backup.stateHash)
      throw new Error('[ledger] backup integrity failed');
    parseFolder(backup.files);
  }
}
