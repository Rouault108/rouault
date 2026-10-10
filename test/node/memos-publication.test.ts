import { describe, expect, it } from 'vitest';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import {
  executePublicationOperation,
  type PublicationPorts,
} from '../../scripts/memos-import/publish-snapshot.js';
import { aggregateLedger } from '../../scripts/memos-import/publication-ledger.js';
import { PublicationOperationQueue } from '../../scripts/memos-import/operation-lock.js';
import { hashBytes } from '../../scripts/memos-import/source-snapshot.js';
import { OWNERSHIP_PATH } from '../../scripts/memos-import/build-import-plan.js';
import type {
  PublicationLedger,
  PublicationOperation,
  Snapshot,
  OwnedFiles,
  OperationReceipt,
  ImportPlan,
} from '../../scripts/memos-import/model.js';
const guards = {
  maxBlobBytes: 2_000_000,
  maxPushBytes: 10_000_000,
  maxPixels: 100_000,
  memoryBytes: 8_000_000,
  timeoutMs: 5000,
  hostingEvidence: 'test-transport',
  environmentEvidence: 'test-budget',
};
const operation: PublicationOperation = {
  operationId: 'synthetic-1',
  action: 'publish',
  targets: ['02_notes/A.md'],
  userRequestRef: 'private:test-approval',
  expectedLedgerRevision: 0,
};
const snapshot = (sha: string, files: Record<string, string>): Snapshot => ({
  sha,
  complete: true,
  files: new Map(
    Object.entries(files).map(([name, text]) => [
      name,
      { mode: '100644', bytes: Buffer.from(text) },
    ]),
  ),
});
class Harness implements PublicationPorts {
  ledger: PublicationLedger = aggregateLedger({ schemaVersion: 1, revision: 0, entries: {} }, []);
  ledgerSha = '1'.repeat(40);
  source = snapshot('a'.repeat(40), {
    '02_notes/A.md':
      '---\npublish: false\nprivate: SYNTHETIC_SECRET\n---\n## Heading\nPublic body\n',
  });
  rouault = snapshot('b'.repeat(40), {});
  manifest: OwnedFiles | undefined;
  sourceCommits = 0;
  publicCommits = 0;
  receipts: OperationReceipt[] = [];
  finalizations = 0;
  failAt:
    | 'source'
    | 'source-response'
    | 'final-read'
    | 'candidate'
    | 'push'
    | 'push-response'
    | 'deployment'
    | 'finalize'
    | undefined;
  marker: { operationId: string; hash: string; sha: string } | undefined;
  committed: { snapshot: Snapshot; manifest: OwnedFiles } | undefined;
  advanceRouaultAfterSource = false;
  commits = new Map<string, { snapshot: Snapshot; parent: Snapshot }>();
  pushCalls = 0;
  async withLock<T>(_id: string, work: () => Promise<T>): Promise<T> {
    return work();
  }
  async readLedger() {
    return { ledger: this.ledger, commitSha: this.ledgerSha };
  }
  async readSource(sha?: string) {
    if (sha && this.failAt === 'final-read') throw new Error('synthetic read failed');
    if (sha && sha !== this.source.sha) throw new Error('revision not available');
    return this.source;
  }
  async readRouault() {
    return { snapshot: this.rouault, ...(this.manifest ? { manifest: this.manifest } : {}) };
  }
  async saveReceipt(receipt: OperationReceipt, expectedSha: string) {
    expect(expectedSha).toBe(this.ledgerSha);
    this.ledger.operations[receipt.operation.operationId] = structuredClone(receipt);
    this.receipts.push(structuredClone(receipt));
    return this.ledgerSha;
  }
  async commitSourceFlags(source: Snapshot, planned: Snapshot) {
    expect(
      this.receipts.some(
        (receipt) => receipt.sourceBeforeSha === source.sha && receipt.flagState === 'unknown',
      ),
    ).toBe(true);
    if (this.failAt === 'source') throw new Error('synthetic source conflict');
    this.sourceCommits += 1;
    this.source = {
      ...planned,
      sha: hashBytes(
        JSON.stringify([...planned.files].map(([name, file]) => [name, hashBytes(file.bytes)])),
      ).slice(0, 40),
    };
    if (this.advanceRouaultAfterSource)
      this.rouault = {
        ...this.rouault,
        sha: 'e'.repeat(40),
        files: new Map([
          ...this.rouault.files,
          ['README.md', { mode: '100644', bytes: Buffer.from('Unrelated public change') }],
        ]),
      };
    if (this.failAt === 'source-response') throw new Error('Synthetic source response lost');
    return this.source.sha;
  }
  async validateCandidate(_plan: ImportPlan, _base: Snapshot) {
    if (this.failAt === 'candidate' && this.sourceCommits)
      throw new Error('synthetic candidate failed');
  }
  async commitRouault(plan: ImportPlan, expectedBase: string, id: string) {
    expect(expectedBase).toBe(this.rouault.sha);
    const files = new Map(this.rouault.files);
    for (const name of plan.deletes) files.delete(name);
    for (const [name, bytes] of plan.writes) files.set(name, { mode: '100644', bytes });
    this.publicCommits += 1;
    this.committed = {
      snapshot: {
        ...this.rouault,
        files,
        sha: hashBytes(expectedBase + plan.candidateHash).slice(0, 40),
      },
      manifest: plan.manifest,
    };
    this.marker = { operationId: id, hash: plan.candidateHash, sha: this.committed.snapshot.sha };
    this.commits.set(this.committed.snapshot.sha, {
      snapshot: this.committed.snapshot,
      parent: this.rouault,
    });
    return this.committed.snapshot.sha;
  }
  async pushRouault(sha: string, _base: string) {
    this.pushCalls += 1;
    expect(this.receipts.some((receipt) => receipt.rouaultCommitSha === sha)).toBe(true);
    if (sha === this.rouault.sha) return;
    expect(_base).toBe(this.rouault.sha);
    if (this.failAt === 'push') throw new Error('synthetic push rejected');
    if (!this.committed) throw new Error('missing committed candidate');
    this.rouault = this.committed.snapshot;
    this.manifest = this.committed.manifest;
    if (this.failAt === 'push-response') throw new Error('synthetic response lost');
  }
  async findRouaultOperation(id: string, hash: string, base?: string) {
    const matched =
      this.marker?.operationId === id && this.marker.hash === hash ? this.marker.sha : null;
    return matched && (!base || this.commits.get(matched)?.parent.sha === base) ? matched : null;
  }
  async inspectRouaultCommit(sha: string, head: string) {
    let current: string | undefined = head;
    let published = false;
    while (current) {
      if (current === sha) {
        published = true;
        break;
      }
      current = this.commits.get(current)?.parent.sha;
    }
    return { published, ...this.commits.get(sha) };
  }
  async verifyDeployment(sha: string, _plan: ImportPlan) {
    expect(sha).toBe(this.rouault.sha);
    return {
      deploymentId: 'synthetic-deployment',
      status: this.failAt === 'deployment' ? ('unknown' as const) : ('verified' as const),
    };
  }
  async finalizeLedger(
    ledger: PublicationLedger,
    receipt: OperationReceipt,
    plan: ImportPlan,
    expectedSha: string,
  ) {
    if (this.failAt === 'finalize') throw new Error('synthetic ledger conflict');
    expect(expectedSha).toBe(this.ledgerSha);
    expect(receipt.stage).toBe('ledger-finalized');
    this.finalizations += 1;
    for (const [name, entry] of Object.entries(plan.entries))
      this.ledger.entries[name] = {
        ...entry,
        rouaultCommitSha: receipt.rouaultCommitSha ?? '',
        deploymentId: receipt.deploymentId ?? '',
      };
    this.ledger.revision = ledger.revision + 1;
    this.ledger.operations[receipt.operation.operationId] = structuredClone(receipt);
    return this.ledgerSha;
  }
}
describe('manual publication transaction and recovery', () => {
  it('does not execute registration through the publication write flow', async () => {
    const ports = new Harness();
    await expect(
      executePublicationOperation({ ...operation, action: 'register-existing' }, ports, { guards }),
    ).rejects.toThrow('dedicated entrypoint');
    expect(ports.receipts).toHaveLength(0);
    expect(ports.sourceCommits).toBe(0);
    expect(ports.publicCommits).toBe(0);
  });
  it('stops if an already-pushed target changed instead of finalizing a stale successful deployment', async () => {
    const ports = new Harness();
    ports.failAt = 'deployment';
    await executePublicationOperation(operation, ports, { guards, initializeEmpty: true });
    const before = ports.rouault;
    const changed = Buffer.from('---\ntitle: Changed public input\n---\nChanged body');
    if (!ports.manifest) throw new Error('Synthetic manifest missing');
    ports.manifest = {
      ...ports.manifest,
      files: { ...ports.manifest.files, 'content/memos/A.md': hashBytes(changed) },
    };
    ports.rouault = {
      ...before,
      sha: 'e'.repeat(40),
      files: new Map([
        ...before.files,
        ['content/memos/A.md', { mode: '100644', bytes: changed }],
        [
          OWNERSHIP_PATH,
          { mode: '100644', bytes: Buffer.from(JSON.stringify(ports.manifest, null, 2) + '\n') },
        ],
      ]),
    };
    ports.commits.set(ports.rouault.sha, { snapshot: ports.rouault, parent: before });
    ports.failAt = undefined;
    const resumed = await executePublicationOperation(operation, ports, { guards });
    expect(resumed.status).toBe('partial');
    expect(resumed.receipt.failureStage).toBe('candidate-validated');
    expect(ports.publicCommits).toBe(1);
    expect(ports.pushCalls).toBe(1);
    expect(ports.finalizations).toBe(0);
  });
  it('rebuilds an unpublished commit on a new base after push failure and preserves unrelated changes', async () => {
    const ports = new Harness();
    ports.failAt = 'push';
    const first = await executePublicationOperation(operation, ports, {
      guards,
      initializeEmpty: true,
    });
    expect(first.status).toBe('partial');
    const before = ports.rouault;
    ports.rouault = {
      ...before,
      sha: 'e'.repeat(40),
      files: new Map([
        ...before.files,
        ['README.md', { mode: '100644', bytes: Buffer.from('Concurrent public change') }],
      ]),
    };
    ports.commits.set(ports.rouault.sha, { snapshot: ports.rouault, parent: before });
    ports.failAt = undefined;
    const resumed = await executePublicationOperation(operation, ports, {
      guards,
      initializeEmpty: true,
    });
    expect(resumed.status).toBe('complete');
    expect(resumed.receipt.rouaultBaseSha).toBe('e'.repeat(40));
    expect(resumed.receipt.results['previousUnpublishedRouaultCommitSha']).toBe(
      first.receipt.rouaultCommitSha,
    );
    expect(ports.sourceCommits).toBe(1);
    expect(ports.publicCommits).toBe(2);
    expect(Buffer.from(ports.rouault.files.get('README.md')?.bytes ?? []).toString()).toBe(
      'Concurrent public change',
    );
  });
  it('reconstructs a lost private unpushed candidate from persisted approval and fixed source without changing the source again', async () => {
    const ports = new Harness();
    ports.failAt = 'push';
    const first = await executePublicationOperation(operation, ports, {
      guards,
      initializeEmpty: true,
    });
    ports.marker = undefined;
    ports.committed = undefined;
    ports.commits.clear();
    ports.failAt = undefined;
    const resumed = await executePublicationOperation(operation, ports, {
      guards,
      initializeEmpty: true,
    });
    expect(resumed.status).toBe('complete');
    expect(resumed.receipt.results['previousUnpublishedRouaultCommitSha']).toBe(
      first.receipt.rouaultCommitSha,
    );
    expect(ports.sourceCommits).toBe(1);
    expect(ports.publicCommits).toBe(2);
  });
  it('stops if a persisted pushed commit disappeared rather than publishing it again', async () => {
    const ports = new Harness();
    ports.failAt = 'deployment';
    const before = ports.rouault;
    expect(
      (await executePublicationOperation(operation, ports, { guards, initializeEmpty: true }))
        .status,
    ).toBe('partial');
    ports.rouault = before;
    ports.commits.clear();
    ports.marker = undefined;
    ports.failAt = undefined;
    const resumed = await executePublicationOperation(operation, ports, {
      guards,
      initializeEmpty: true,
    });
    expect(resumed.status).toBe('partial');
    expect(ports.publicCommits).toBe(1);
    expect(ports.pushCalls).toBe(1);
  });
  it('revalidates an unrelated Rouault head advance and records the actual commit/push base', async () => {
    const ports = new Harness();
    ports.advanceRouaultAfterSource = true;
    const result = await executePublicationOperation(operation, ports, {
      guards,
      initializeEmpty: true,
    });
    expect(result.status).toBe('complete');
    expect(result.receipt.rouaultBaseSha).toBe('e'.repeat(40));
    expect(result.receipt.results['rouaultPreflightBaseSha']).toBe('b'.repeat(40));
    expect(Buffer.from(ports.rouault.files.get('README.md')?.bytes ?? []).toString()).toBe(
      'Unrelated public change',
    );
  });
  it.each(['update', 'withdraw'] as const)(
    'resumes %s after deployment or ledger failure without repeating the public commit',
    async (action) => {
      for (const failure of ['deployment', 'finalize'] as const) {
        const ports = new Harness();
        expect(
          (await executePublicationOperation(operation, ports, { guards, initializeEmpty: true }))
            .status,
        ).toBe('complete');
        const next: PublicationOperation = {
          ...operation,
          action,
          operationId: `synthetic-${action}`,
          userRequestRef: `private:synthetic-${action}`,
          expectedLedgerRevision: 1,
        };
        ports.failAt = failure;
        const first = await executePublicationOperation(next, ports, { guards });
        expect(first.status).toBe('partial');
        ports.failAt = undefined;
        const commits = ports.publicCommits;
        const resumed = await executePublicationOperation(next, ports, { guards });
        expect(resumed.status).toBe('complete');
        expect(ports.publicCommits).toBe(commits);
        expect(ports.ledger.entries['02_notes/A.md']?.status).toBe(
          action === 'withdraw' ? 'withdrawn' : 'published',
        );
        expect(ports.rouault.files.has('content/memos/A.md')).toBe(action !== 'withdraw');
      }
    },
  );
  it('persists approval before side effects and finalizes state with the completed receipt', async () => {
    const ports = new Harness();
    const result = await executePublicationOperation(operation, ports, {
      guards,
      initializeEmpty: true,
    });
    expect(result.status).toBe('complete');
    expect(ports.sourceCommits).toBe(1);
    expect(ports.publicCommits).toBe(1);
    expect(ports.ledger.revision).toBe(1);
    expect(ports.ledger.entries['02_notes/A.md']?.status).toBe('published');
    expect(ports.receipts.every((receipt) => receipt.stage !== 'ledger-finalized')).toBe(true);
    const repeat = await executePublicationOperation(operation, ports, { guards });
    expect(repeat.status).toBe('complete');
    expect(ports.publicCommits).toBe(1);
  });
  it.each([
    'source',
    'source-response',
    'final-read',
    'candidate',
    'push',
    'push-response',
    'deployment',
    'finalize',
  ] as const)(
    'records %s separately and safely resumes the same operation without duplicate commits',
    async (failure) => {
      const ports = new Harness();
      ports.failAt = failure;
      const first = await executePublicationOperation(operation, ports, {
        guards,
        initializeEmpty: true,
      });
      expect(first.status).not.toBe('complete');
      expect(first.receipt.failureStage).not.toBeNull();
      expect(ports.ledger.revision).toBe(0);
      expect(ports.ledger.entries).toEqual({});
      ports.failAt = undefined;
      const second = await executePublicationOperation(operation, ports, {
        guards,
        initializeEmpty: true,
      });
      expect(second.status).toBe('complete');
      expect(ports.sourceCommits).toBe(1);
      expect(ports.publicCommits).toBe(1);
    },
  );
  it('does not reuse an operation ID for changed approval scope or source content', async () => {
    const ports = new Harness();
    ports.failAt = 'push';
    await executePublicationOperation(operation, ports, { guards, initializeEmpty: true });
    await expect(
      executePublicationOperation({ ...operation, targets: ['02_notes/B.md'] }, ports, { guards }),
    ).rejects.toThrow('scope conflict');
    ports.failAt = undefined;
    ports.source = {
      ...ports.source,
      files: new Map([
        [
          '02_notes/A.md',
          { mode: '100644', bytes: Buffer.from('---\npublish: true\n---\nChanged content') },
        ],
      ]),
    };
    const result = await executePublicationOperation(operation, ports, {
      guards,
      initializeEmpty: true,
    });
    expect(result.status).toBe('partial');
    expect(ports.publicCommits).toBe(1);
  });
  it('serializes simultaneous requests and releases the lock after a failed operation', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'memos-queue-'));
    try {
      const queue = new PublicationOperationQueue(path.join(root, 'lock'));
      const events: string[] = [];
      const first = queue.withLock('first', async () => {
        events.push('first-start');
        await Promise.resolve();
        events.push('first-end');
        throw new Error('synthetic failure');
      });
      const second = queue.withLock('second', async () => {
        events.push('second');
      });
      await Promise.allSettled([first, second]);
      expect(events).toEqual(['first-start', 'first-end', 'second']);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
