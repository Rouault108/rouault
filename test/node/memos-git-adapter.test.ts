import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  GitTreeRepository,
  type RepositoryIdentity,
} from '../../scripts/memos-import/git-repository.js';
import {
  createPrivateCommand,
  type PrivateCommand,
} from '../../scripts/memos-import/private-command.js';
import { GitLedgerRepository } from '../../scripts/memos-import/git-ledger-repository.js';
import { PublicationLedgerStore } from '../../scripts/memos-import/ledger-store.js';
import {
  commitOnlySourceFlags,
  GitMemoRepository,
  createGitPublicationPorts,
} from '../../scripts/memos-import/git-publication-ports.js';
import {
  buildImportPlan,
  plannedSourceSnapshot,
} from '../../scripts/memos-import/build-import-plan.js';
import { createReceipt } from '../../scripts/memos-import/publication-ledger.js';
import type { PublicationOperation } from '../../scripts/memos-import/model.js';
const actor = { name: 'Synthetic Test', email: 'synthetic@example.invalid' };
const operation: PublicationOperation = {
  operationId: 'synthetic-git',
  action: 'publish',
  targets: ['02_notes/A.md'],
  userRequestRef: 'synthetic:private-request',
  expectedLedgerRevision: 0,
};
const git = (cwd: string, args: string[]): string =>
  execFileSync(
    'git',
    ['-c', `user.name=${actor.name}`, '-c', `user.email=${actor.email}`, ...args],
    { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  ).trim();
const fixture = async (
  identity: RepositoryIdentity,
  files: Record<string, string>,
  parent = tmpdir(),
) => {
  const root = await mkdtemp(path.join(parent, 'memos-git-test-'));
  const work = path.join(root, 'work');
  await mkdir(work);
  git(work, ['init', '-b', 'main']);
  for (const [name, body] of Object.entries(files)) {
    await mkdir(path.dirname(path.join(work, name)), { recursive: true });
    await writeFile(path.join(work, name), body);
  }
  git(work, ['add', '.']);
  git(work, ['commit', '-m', 'Synthetic initial state']);
  const remote = path.join(root, 'remote.git');
  const local = path.join(root, 'local.git');
  git(root, ['clone', '--bare', work, remote]);
  git(root, ['clone', '--bare', remote, local]);
  git(root, [
    '--git-dir',
    local,
    'remote',
    'set-url',
    'origin',
    `https://github.com/${identity.repository}.git`,
  ]);
  const execute = createPrivateCommand({
    environment: process.env,
    timeoutMs: 20_000,
    maxOutputBytes: 4 * 1024 * 1024,
  });
  const calls: string[][] = [];
  const command: PrivateCommand = async (name, args, input, env) => {
    if (name !== 'git') throw new Error('Synthetic fixture forbids external API');
    calls.push([...args]);
    const networking = args.includes('fetch') || args.includes('push');
    return execute(
      name,
      networking ? args.map((arg) => (arg === 'origin' ? remote : arg)) : args,
      input,
      env,
    );
  };
  const repository = new GitTreeRepository(
    local,
    command,
    identity,
    async () => ({ ...identity }),
    actor,
  );
  return { root, work, remote, local, repository, calls };
};
describe('concrete private Git publication adapters', () => {
  it('reads only referenced assets and blocks all operational writes in dry-run mode', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'memos-dry-run-'));
    const publicCheckout = path.join(root, 'public-checkout');
    await mkdir(publicCheckout);
    const source = await fixture(
      { repository: 'Synthetic/vault', private: true, branch: 'main' },
      {
        '02_notes/A.md':
          '---\ntitle: Synthetic\npublish: false\n---\n![image](../assets/needed.png)\n',
        'assets/needed.png': 'Synthetic referenced bytes',
        'assets/unneeded.png': 'Synthetic private unneeded bytes',
      },
      root,
    );
    const publicRepository = await fixture(
      { repository: 'Rouault108/rouault', private: false, branch: 'main' },
      { 'README.md': 'Public input' },
      root,
    );
    const ledger = await fixture(
      { repository: 'Rouault108/metis-handbook', private: true, branch: 'main' },
      { 'README.md': 'Protected policy' },
      root,
    );
    try {
      const before = await Promise.all(
        [source, publicRepository, ledger].map((item) => item.repository.head()),
      );
      const ports = await createGitPublicationPorts({
        execution: 'dry-run',
        operation,
        source: source.repository,
        rouault: publicRepository.repository,
        ledger: ledger.repository,
        privateWorkDirectory: root,
        publicCheckoutDirectory: publicCheckout,
        nodeModulesDirectory: path.resolve('node_modules'),
        environment: process.env,
        initializeEmpty: true,
        verifyDeployment: async () => ({ deploymentId: '', status: 'unknown' }),
      });
      const state = await ports.readLedger();
      const snapshot = await ports.readSource();
      expect(state.ledger.revision).toBe(0);
      expect(snapshot.files.has('assets/needed.png')).toBe(true);
      expect(snapshot.files.has('assets/unneeded.png')).toBe(false);
      expect(Buffer.from(snapshot.files.get('02_notes/A.md')?.bytes ?? []).toString()).toContain(
        'publish: false',
      );
      await expect(async () =>
        ports.saveReceipt(createReceipt(operation), state.commitSha),
      ).rejects.toThrow('dry-run');
      await expect(async () =>
        ports.commitSourceFlags(
          snapshot,
          plannedSourceSnapshot(snapshot, operation),
          operation.targets,
        ),
      ).rejects.toThrow('dry-run');
      await expect(async () => ports.pushRouault(before[1] ?? '', before[1] ?? '')).rejects.toThrow(
        'dry-run',
      );
      expect(
        await Promise.all([source, publicRepository, ledger].map((item) => item.repository.head())),
      ).toEqual(before);
      expect(
        [source, publicRepository, ledger]
          .flatMap((item) => item.calls)
          .filter((args) => args.includes('push')),
      ).toHaveLength(0);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }, 20_000);
  it('persists only ledger state and receipts with real normal Git pushes and rejects stale bases', async () => {
    const f = await fixture(
      { repository: 'Rouault108/metis-handbook', private: true, branch: 'main' },
      { 'README.md': 'Protected synthetic policy' },
    );
    try {
      const store = new PublicationLedgerStore(new GitLedgerRepository(f.repository));
      const initial = await store.read(true, true);
      const receipt = createReceipt(operation);
      const next = await store.saveReceipt(receipt, initial.commitSha);
      const loaded = await store.read();
      expect(loaded.commitSha).toBe(next);
      expect(loaded.ledger.operations['synthetic-git']).toEqual(receipt);
      expect(git(f.root, ['--git-dir', f.remote, 'show', 'main:README.md'])).toBe(
        'Protected synthetic policy',
      );
      await expect(store.saveReceipt(receipt, initial.commitSha)).rejects.toThrow('head conflict');
      await expect(
        new GitLedgerRepository(f.repository).commitFiles(
          next,
          new Map([['README.md', Buffer.from('Unapproved')]]),
        ),
      ).rejects.toThrow('scope');
      expect(
        f.calls
          .filter((args) => args.includes('push'))
          .every((args) => !args.some((arg) => arg.startsWith('--force'))),
      ).toBe(true);
    } finally {
      await rm(f.root, { recursive: true, force: true });
    }
  }, 20_000);
  it('changes exactly the requested source flag, preserves YAML/body/mode and refuses other metadata changes', async () => {
    const original =
      '---\r\ntitle: Synthetic\r\nprivate_key: synthetic-only\r\n---\r\nBody unchanged\r\n';
    const f = await fixture(
      { repository: 'Synthetic/vault', private: true, branch: 'main' },
      { '02_notes/A.md': original, '02_notes/B.md': 'Unselected body' },
    );
    try {
      await chmod(path.join(f.work, '02_notes/A.md'), 0o755);
      git(f.work, ['add', '.']);
      git(f.work, ['commit', '-m', 'Synthetic mode']);
      git(f.work, ['push', f.remote, 'main']);
      const source = await f.repository.snapshot(await f.repository.head());
      const planned = plannedSourceSnapshot(source, operation);
      const bad = new Map(planned.files);
      bad.set('02_notes/A.md', {
        mode: '100755',
        bytes: Buffer.from(original.replace('Synthetic', 'Changed')),
      });
      await expect(
        commitOnlySourceFlags(f.repository, operation, source, { ...planned, files: bad }),
      ).rejects.toThrow('approval');
      const sha = await commitOnlySourceFlags(f.repository, operation, source, planned);
      const after = await f.repository.snapshot(sha);
      expect(Buffer.from(after.files.get('02_notes/A.md')?.bytes ?? []).toString()).toBe(
        '---\r\ntitle: Synthetic\r\nprivate_key: synthetic-only\r\npublish: true\r\n---\r\nBody unchanged\r\n',
      );
      expect(after.files.get('02_notes/A.md')?.mode).toBe('100755');
      expect(Buffer.from(after.files.get('02_notes/B.md')?.bytes ?? []).toString()).toBe(
        'Unselected body',
      );
    } finally {
      await rm(f.root, { recursive: true, force: true });
    }
  }, 20_000);
  it('keeps the operation recovery ref private and verifies actual commit output hashes before reuse', async () => {
    const f = await fixture(
      { repository: 'Rouault108/rouault', private: false, branch: 'main' },
      { 'README.md': 'Unrelated public input' },
    );
    try {
      const adapter = new GitMemoRepository(f.repository);
      const base = await adapter.read();
      const plan = await buildImportPlan({
        operation,
        ledger: { schemaVersion: 1, revision: 0, entries: {}, operations: {} },
        source: {
          sha: 'a'.repeat(40),
          complete: true,
          files: new Map([
            [
              '02_notes/A.md',
              {
                mode: '100644',
                bytes: Buffer.from('---\ntitle: Synthetic\npublish: true\n---\n# Heading\n'),
              },
            ],
          ]),
        },
        rouault: base.snapshot,
        initializeEmpty: true,
        guards: {
          maxBlobBytes: 100_000,
          maxPushBytes: 1_000_000,
          maxPixels: 100_000,
          memoryBytes: 8_000_000,
          timeoutMs: 2000,
          hostingEvidence: 'synthetic',
          environmentEvidence: 'synthetic',
        },
      });
      const sha = await adapter.commitPlan(plan, base.snapshot.sha, operation);
      expect(await adapter.findOperation(operation.operationId, plan.candidateHash)).toBe(sha);
      expect(await adapter.commitPlan(plan, base.snapshot.sha, operation)).toBe(sha);
      await expect(adapter.findOperation(operation.operationId, 'b'.repeat(64))).rejects.toThrow(
        'differs',
      );
      await f.repository.push(sha, base.snapshot.sha);
      await f.repository.push(sha, base.snapshot.sha);
      expect(git(f.root, ['--git-dir', f.remote, 'for-each-ref', '--format=%(refname)'])).toBe(
        'refs/heads/main',
      );
      expect(git(f.root, ['--git-dir', f.remote, 'log', '-1', '--format=%B'])).toBe(
        'memos: publish 1 selected documents',
      );
      expect((await adapter.read()).manifest).toEqual(plan.manifest);
    } finally {
      await rm(f.root, { recursive: true, force: true });
    }
  }, 20_000);
});
