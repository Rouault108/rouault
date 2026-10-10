import { describe, expect, it, vi } from 'vitest';
import {
  buildImportPlan,
  plannedSourceSnapshot,
} from '../../scripts/memos-import/build-import-plan.js';
import { registerExistingPublication } from '../../scripts/memos-import/register-existing-publication.js';
import {
  PublicationLedgerStore,
  type PrivateLedgerRepository,
} from '../../scripts/memos-import/ledger-store.js';
import {
  aggregateLedger,
  ledgerStorage,
  validateOperation,
} from '../../scripts/memos-import/publication-ledger.js';
import { parseVaultNote } from '../../scripts/memos-import/source-snapshot.js';
import { createMemoDeploymentVerifier } from '../../scripts/memos-import/verify-memo-deployment.js';
import type { PublicationOperation, Snapshot } from '../../scripts/memos-import/model.js';

const guards = {
  maxBlobBytes: 2_000_000,
  maxPushBytes: 10_000_000,
  maxPixels: 100_000,
  memoryBytes: 8_000_000,
  timeoutMs: 5000,
  hostingEvidence: 'synthetic-test-transport',
  environmentEvidence: 'synthetic-test-budget',
};
class Repository implements PrivateLedgerRepository {
  sha = 'd'.repeat(40);
  complete = true;
  files = new Map<string, Uint8Array>();
  commits: ReadonlyMap<string, Uint8Array>[] = [];
  async identity() {
    return {
      repository: 'Rouault108/metis-workspace',
      repositoryId: 1402900612,
      owner: 'Rouault108',
      private: true,
      branch: 'main',
    };
  }
  async head() {
    return this.sha;
  }
  async readFolder() {
    return { complete: this.complete, files: this.files };
  }
  async commitFiles(expected: string, files: ReadonlyMap<string, Uint8Array>) {
    if (expected !== this.sha) throw new Error('synthetic CAS conflict');
    this.commits.push(files);
    for (const [name, bytes] of files)
      this.files.set(name.slice(ledgerStorage.ledgerRoot.length + 1), bytes);
    this.sha = 'e'.repeat(40);
    return this.sha;
  }
}
const fixture = async () => {
  const repository = new Repository();
  const store = new PublicationLedgerStore(repository);
  const sourceFiles = new Map<string, { mode: '100644'; bytes: Buffer }>();
  const source: Snapshot = { sha: 'a'.repeat(40), complete: true, files: sourceFiles };
  for (const name of ['A', 'B', 'C'])
    sourceFiles.set(`02_notes/${name}.md`, {
      mode: '100644',
      bytes: Buffer.from(`# ${name}\nBody\n`),
    });
  const operation: PublicationOperation & { action: 'register-existing' } = {
    action: 'register-existing',
    operationId: 'register-synthetic',
    targets: [...source.files.keys()],
    userRequestRef: 'private:approved-registration',
    expectedLedgerRevision: 0,
  };
  const selection = { ...operation, action: 'publish' as const };
  const publicParent: Snapshot = { sha: 'b'.repeat(40), complete: true, files: new Map() };
  const initial = await buildImportPlan({
    operation: selection,
    source: plannedSourceSnapshot(source, selection),
    rouault: publicParent,
    ledger: aggregateLedger({ schemaVersion: 1, revision: 0, entries: {} }, []),
    initializeEmpty: true,
    guards,
  });
  const publicSnapshot: Snapshot = {
    sha: 'c'.repeat(40),
    complete: true,
    files: new Map([...initial.writes].map(([name, bytes]) => [name, { mode: '100644', bytes }])),
  };
  const approvedContentHashes = new Map(
    [...source.files].map(([name, file]) => [name, parseVaultNote(name, file.bytes).versionHash]),
  );
  const verifyDeployment = vi.fn(async () => ({
    deploymentId: 'synthetic-deployment',
    status: 'verified' as const,
  }));
  const recheckSnapshots = vi.fn(async () => undefined);
  return {
    repository,
    input: {
      operation,
      approvedContentHashes,
      source,
      publicSnapshot,
      publicParent,
      config: { guards, manifest: initial.manifest },
      store,
      expectedLedgerHead: repository.sha,
      verifyDeployment,
      recheckSnapshots,
    },
  };
};
describe('registration of an existing publication', () => {
  it('preserves the real deployment verifier failure when authenticated archives are unavailable', async () => {
    const { repository, input } = await fixture();
    const verifyDeployment = createMemoDeploymentVerifier({
      readVerifiedProof: async () => {
        throw new Error('synthetic authenticated archive Forbidden');
      },
      siteOrigin: 'https://rouault.invalid',
      basePath: '',
      allowedMediaOrigins: [],
      timeoutMs: 1000,
      maxResponseBytes: 1024 * 1024,
    });
    await expect(registerExistingPublication({ ...input, verifyDeployment })).rejects.toThrow(
      'deployment unknown; no ledger write',
    );
    expect(repository.commits).toHaveLength(0);
  });
  it('preserves source flags and atomically records the real registration without historical publication stages', async () => {
    const { repository, input } = await fixture();
    const sourceBefore = [...input.source.files].map(([name, file]) => [
      name,
      Buffer.from(file.bytes).toString(),
    ]);
    await expect(input.store.read(true, false)).rejects.toThrow('recovery required');
    const result = await registerExistingPublication(input);
    expect(input.verifyDeployment).toHaveBeenCalledWith(
      input.publicSnapshot.sha,
      expect.anything(),
    );
    expect(input.recheckSnapshots).toHaveBeenCalledOnce();
    expect(repository.commits).toHaveLength(1);
    expect([...(repository.commits[0]?.keys() ?? [])]).toEqual([
      `${ledgerStorage.ledgerRoot}/state.json`,
      `${ledgerStorage.ledgerRoot}/operations/register-synthetic.json`,
    ]);
    const loaded = await input.store.read();
    expect(loaded.ledger.revision).toBe(1);
    expect(Object.keys(loaded.ledger.entries)).toEqual(input.operation.targets);
    expect(loaded.ledger.operations['register-synthetic']).toEqual(result.receipt);
    expect(result.receipt.operation.action).toBe('register-existing');
    expect(result.receipt.sourceBeforeSha).toBe(result.receipt.sourceFinalSha);
    expect(result.receipt.noOps).toEqual([]);
    expect(result.receipt.flagState).toBe('unchanged');
    expect(
      [...input.source.files].map(([name, file]) => [name, Buffer.from(file.bytes).toString()]),
    ).toEqual(sourceBefore);
    expect(() => plannedSourceSnapshot(input.source, input.operation)).toThrow(
      'cannot change source flags',
    );
    expect(() => validateOperation(input.operation, loaded.ledger)).toThrow('explicit operation');
  });
  it.each(['unknown', 'failed'] as const)(
    'does not write when production evidence is %s',
    async (status) => {
      const { repository, input } = await fixture();
      await expect(
        registerExistingPublication({
          ...input,
          verifyDeployment: async () => ({ deploymentId: '', status }),
        }),
      ).rejects.toThrow('no ledger write');
      expect(repository.commits).toHaveLength(0);
      expect(input.recheckSnapshots).not.toHaveBeenCalled();
    },
  );
  it('rejects changed approval versions, public bytes, and partial approval scope before deployment verification', async () => {
    for (const kind of ['version', 'output', 'scope'] as const) {
      const { repository, input } = await fixture();
      const target = input.operation.targets[0] ?? '';
      if (kind === 'version') input.approvedContentHashes.set(target, '0'.repeat(64));
      if (kind === 'output')
        input.publicSnapshot.files = new Map([
          ...input.publicSnapshot.files,
          ['content/memos/A.md', { mode: '100644', bytes: Buffer.from('Changed') }],
        ]);
      if (kind === 'scope') {
        input.operation.targets = [target];
        input.approvedContentHashes = new Map([
          [target, input.approvedContentHashes.get(target) ?? ''],
        ]);
      }
      await expect(registerExistingPublication(input)).rejects.toThrow(
        /differs|differ|exceed|changed/u,
      );
      expect(repository.commits).toHaveLength(0);
      expect(input.verifyDeployment).not.toHaveBeenCalled();
    }
  });
  it('rejects incomplete or existing private ledgers, stale bases, and changed source/public snapshots', async () => {
    for (const kind of ['incomplete', 'existing', 'head', 'snapshot'] as const) {
      const { repository, input } = await fixture();
      if (kind === 'incomplete') repository.complete = false;
      if (kind === 'existing') repository.files.set('operations/unknown.json', Buffer.from('{}'));
      if (kind === 'head') repository.sha = 'f'.repeat(40);
      if (kind === 'snapshot')
        input.recheckSnapshots.mockRejectedValue(new Error('snapshot changed'));
      await expect(registerExistingPublication(input)).rejects.toThrow(
        /absent ledger|base conflict|snapshot changed/u,
      );
      expect(repository.commits).toHaveLength(0);
    }
  });
  it('rejects a registration receipt that falsely claims source flags were changed', async () => {
    const { input } = await fixture();
    await registerExistingPublication(input);
    const loaded = await input.store.read();
    const receipt = loaded.ledger.operations['register-synthetic'];
    if (!receipt) throw new Error('test receipt missing');
    receipt.flagState = 'updated';
    await expect(input.store.saveReceipt(receipt, loaded.commitSha)).rejects.toThrow(
      'corrupt existing registration',
    );
  });
});
