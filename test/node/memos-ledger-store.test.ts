import { describe, expect, it } from 'vitest';
import {
  PublicationLedgerStore,
  type PrivateLedgerRepository,
} from '../../scripts/memos-import/ledger-store.js';
import { createReceipt, ledgerStorage } from '../../scripts/memos-import/publication-ledger.js';
import { hashBytes } from '../../scripts/memos-import/source-snapshot.js';
class Repository implements PrivateLedgerRepository {
  repository = 'Rouault108/metis-handbook';
  private = true;
  branch = 'main';
  sha = 'a'.repeat(40);
  complete = true;
  files = new Map<string, Uint8Array>();
  commits: ReadonlyMap<string, Uint8Array>[] = [];
  async identity() {
    return { repository: this.repository, private: this.private, branch: this.branch };
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
    for (const [name, bytes] of files) {
      expect(name.startsWith(ledgerStorage.ledgerRoot + '/')).toBe(true);
      this.files.set(name.slice(ledgerStorage.ledgerRoot.length + 1), bytes);
    }
    this.sha = 'b'.repeat(40);
    return this.sha;
  }
}
describe('private ledger persistence and recovery', () => {
  it('previews explicit empty initialization without any ledger commit', async () => {
    const repository = new Repository();
    const result = await new PublicationLedgerStore(repository).readForDryRun(true, true);
    expect(result.ledger.revision).toBe(0);
    expect(result.commitSha).toBe(repository.sha);
    expect(repository.commits).toHaveLength(0);
    expect(repository.files.size).toBe(0);
  });
  it('requires explicit empty initialization, complete reads and the fixed private identity', async () => {
    const repository = new Repository();
    const store = new PublicationLedgerStore(repository);
    await expect(store.read()).rejects.toThrow('missing');
    await expect(store.read(true, false)).rejects.toThrow('missing');
    repository.complete = false;
    await expect(store.read(true, true)).rejects.toThrow('incomplete');
    repository.complete = true;
    repository.private = false;
    await expect(store.read(true, true)).rejects.toThrow('identity');
    repository.private = true;
    const loaded = await store.read(true, true);
    expect(loaded.ledger.revision).toBe(0);
    expect(repository.commits).toHaveLength(1);
  });
  it('aggregates receipts without persisting the operations view in state and protects CAS', async () => {
    const repository = new Repository();
    const store = new PublicationLedgerStore(repository);
    await store.read(true, true);
    const receipt = createReceipt({
      operationId: 'synthetic',
      action: 'publish',
      targets: ['02_notes/A.md'],
      userRequestRef: 'private:request',
      expectedLedgerRevision: 0,
    });
    await expect(store.saveReceipt(receipt, 'a'.repeat(40))).rejects.toThrow('CAS');
    await store.saveReceipt(receipt, repository.sha);
    const loaded = await store.read();
    expect(loaded.ledger.operations['synthetic']).toEqual(receipt);
    expect(Buffer.from(repository.files.get('state.json') ?? []).toString()).not.toContain(
      'operations',
    );
  });
  it('rejects corrupt state/receipt and verifies a backup before reconciled recovery', async () => {
    const repository = new Repository();
    const store = new PublicationLedgerStore(repository);
    await store.read(true, true);
    const backup = await store.backup();
    const tampered = {
      stateHash: backup.stateHash,
      files: new Map([['state.json', Buffer.from('{}')]]),
    };
    expect(() => store.verifyBackup(tampered)).toThrow('integrity');
    await expect(
      store.restoreBackup(backup, repository.sha, async () => {
        throw new Error('public reconciliation failed');
      }),
    ).rejects.toThrow('reconciliation');
    expect(repository.commits).toHaveLength(1);
    let reconciled = false;
    await store.restoreBackup(backup, repository.sha, async () => {
      reconciled = true;
    });
    expect(reconciled).toBe(true);
    expect(repository.commits).toHaveLength(2);
    repository.files.set('operations/corrupt.json', Buffer.from('{}'));
    await expect(store.read()).rejects.toThrow('receipt');
    repository.files.delete('operations/corrupt.json');
    repository.files.set(
      'state.json',
      Buffer.from('{"schemaVersion":1,"revision":-1,"entries":{}}'),
    );
    const corrupt = {
      files: repository.files,
      stateHash: hashBytes(repository.files.get('state.json') ?? new Uint8Array()),
    };
    expect(() => store.verifyBackup(corrupt)).toThrow('schema');
  });
});
