import type { PrivateLedgerRepository } from './ledger-store.js';
import { ledgerStorage } from './publication-ledger.js';
import { GitTreeRepository } from './git-repository.js';
export class GitLedgerRepository implements PrivateLedgerRepository {
  constructor(private readonly repository: GitTreeRepository) {}
  async identity() {
    const identity = await this.repository.identity();
    if (
      identity.repository !== ledgerStorage.ledgerRepository ||
      !identity.private ||
      identity.branch !== 'main'
    )
      throw new Error('[ledger] private repository identity mismatch');
    return identity;
  }
  head(): Promise<string> {
    return this.repository.head();
  }
  async readFolder(commitSha: string, root: string) {
    if (root !== ledgerStorage.ledgerRoot) throw new Error('[ledger] folder scope mismatch');
    const snapshot = await this.repository.snapshot(commitSha, (entry) =>
      entry.path.startsWith(`${root}/`),
    );
    return {
      complete: snapshot.complete,
      files: new Map(
        [...snapshot.files].map(([name, file]) => [name.slice(root.length + 1), file.bytes]),
      ),
    };
  }
  async commitFiles(expectedHead: string, files: ReadonlyMap<string, Uint8Array>): Promise<string> {
    await this.identity();
    const root = ledgerStorage.ledgerRoot;
    const sha = await this.repository.commit(
      expectedHead,
      files,
      [],
      (name) =>
        name === `${root}/state.json` ||
        (name.startsWith(`${root}/operations/`) &&
          /^[a-zA-Z0-9_-]+\.json$/u.test(name.slice(`${root}/operations/`.length))),
      'memos ledger: record manual operation',
    );
    await this.repository.push(sha, expectedHead);
    return sha;
  }
}
