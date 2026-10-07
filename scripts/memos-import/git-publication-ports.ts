import path from 'node:path';
import { realpath, stat } from 'node:fs/promises';
import { GitTreeRepository } from './git-repository.js';
import { GitLedgerRepository } from './git-ledger-repository.js';
import { PublicationLedgerStore } from './ledger-store.js';
import { PublicationOperationQueue } from './operation-lock.js';
import {
  hashBytes,
  readVaultNotes,
  resolveVaultAssetReference,
  updateSourceFlag,
} from './source-snapshot.js';
import {
  buildImportPlan,
  plannedSourceSnapshot,
  verifyOwnership,
  OWNERSHIP_PATH,
} from './build-import-plan.js';
import type { ImageInputGuards } from '../../build/media/validate-image-inputs.js';
import { transformRequestedMemos } from './transform-memos.js';
import { validateIsolatedCandidate } from './validate-candidate.js';
import type { PublicationPorts } from './publish-snapshot.js';
import type { ImportPlan, OwnedFiles, PublicationOperation, Snapshot } from './model.js';
const publicWritePath = (name: string): boolean =>
  (name.startsWith('content/memos/') && name.endsWith('.md')) ||
  /^content\/_assets\/memos-import\/[a-f0-9]{64}\.(png|jpg|webp|avif)$/u.test(name) ||
  name === OWNERSHIP_PATH;
const fingerprint = (writes: ReadonlyMap<string, Uint8Array>, deletes: readonly string[]): string =>
  hashBytes(
    JSON.stringify([
      [...writes]
        .map(([name, bytes]) => [name, hashBytes(bytes)])
        .sort(([a], [b]) => (a ?? '').localeCompare(b ?? '', 'en')),
      [...deletes].sort(),
    ]),
  );
export class GitMemoRepository {
  constructor(readonly repository: GitTreeRepository) {}
  async read(): Promise<{ snapshot: Snapshot; manifest?: OwnedFiles }> {
    const identity = await this.repository.identity();
    if (
      identity.repository !== 'Rouault108/rouault' ||
      identity.private ||
      identity.branch !== 'main'
    )
      throw new Error('[publication] public repository identity mismatch');
    const snapshot = await this.repository.snapshot(await this.repository.head());
    const stored = snapshot.files.get(OWNERSHIP_PATH);
    if (!stored) return { snapshot };
    const value: unknown = JSON.parse(Buffer.from(stored.bytes).toString('utf8'));
    if (
      typeof value !== 'object' ||
      value === null ||
      Object.keys(value).some((key) => !['schemaVersion', 'files'].includes(key)) ||
      !('schemaVersion' in value) ||
      value.schemaVersion !== 1 ||
      !('files' in value) ||
      typeof value.files !== 'object' ||
      value.files === null ||
      Array.isArray(value.files) ||
      Object.values(value.files).some(
        (hash) => typeof hash !== 'string' || !/^[a-f0-9]{64}$/u.test(hash),
      )
    )
      throw new Error('[publication] ownership schema invalid');
    const manifest = value as OwnedFiles;
    verifyOwnership(snapshot, manifest, false);
    return { snapshot, manifest };
  }
  async commitPlan(
    plan: ImportPlan,
    base: string,
    operation: PublicationOperation,
  ): Promise<string> {
    if (fingerprint(plan.writes, plan.deletes) !== plan.candidateHash)
      throw new Error('[publication] candidate fingerprint mismatch');
    const existing = await this.findOperation(operation.operationId, plan.candidateHash);
    if (existing) return existing;
    const sha = await this.repository.commit(
      base,
      plan.writes,
      plan.deletes,
      publicWritePath,
      `memos: ${operation.action} ${operation.targets.length.toString()} selected documents`,
    );
    await this.repository.git(['update-ref', this.operationRef(operation.operationId), sha]);
    return sha;
  }
  private operationRef(id: string): string {
    if (!/^[a-zA-Z0-9_-]+$/u.test(id)) throw new Error('[publication] operation identity required');
    return `refs/memos-import/operations/${id}`;
  }
  async findOperation(id: string, candidateHash: string): Promise<string | null> {
    const reference = this.operationRef(id);
    const result = (
      await this.repository.git(['for-each-ref', '--format=%(refname) %(objectname)', reference])
    )
      .toString('utf8')
      .trim();
    const lines = result
      .split('\n')
      .filter(Boolean)
      .map((line) => line.split(' '));
    const matches = lines.filter(([name]) => name === reference);
    if (matches.length === 0) return null;
    if (matches.length !== 1 || !matches[0]?.[1])
      throw new Error('[publication] recovery identity ambiguous');
    const sha = matches[0][1];
    const current = await this.repository.snapshot(sha);
    const base = await this.repository.snapshot(
      (await this.repository.git(['rev-parse', `${sha}^`])).toString('utf8').trim(),
    );
    const writes = new Map<string, Uint8Array>();
    const deletes: string[] = [];
    for (const [name, file] of current.files)
      if (
        !base.files.has(name) ||
        hashBytes(base.files.get(name)?.bytes ?? new Uint8Array()) !== hashBytes(file.bytes)
      )
        writes.set(name, file.bytes);
    for (const name of base.files.keys()) if (!current.files.has(name)) deletes.push(name);
    if (
      [...writes.keys(), ...deletes].some((name) => !publicWritePath(name)) ||
      fingerprint(writes, deletes) !== candidateHash
    )
      throw new Error('[publication] recovery commit differs from approved candidate');
    return sha;
  }
}
export const commitOnlySourceFlags = async (
  repository: GitTreeRepository,
  operation: PublicationOperation,
  source: Snapshot,
  planned: Snapshot,
): Promise<string> => {
  const identity = await repository.identity();
  if (!identity.private || identity.branch !== 'main')
    throw new Error('[publication] private source identity required');
  if (operation.action === 'update')
    throw new Error('[publication] update cannot change source flags');
  if (source.files.size !== planned.files.size)
    throw new Error('[publication] source file set changed');
  const writes = new Map<string, Uint8Array>();
  const notes = readVaultNotes(source);
  for (const [name, file] of source.files) {
    const next = planned.files.get(name);
    if (next?.mode !== file.mode) throw new Error('[publication] source tree changed');
    if (hashBytes(file.bytes) === hashBytes(next.bytes)) continue;
    const note = notes.get(name);
    if (
      !operation.targets.includes(name) ||
      !note ||
      hashBytes(next.bytes) !== hashBytes(updateSourceFlag(note, operation.action === 'publish'))
    )
      throw new Error('[publication] source write exceeds flag approval');
    writes.set(name, next.bytes);
  }
  const sha = await repository.commit(
    source.sha,
    writes,
    [],
    (name) =>
      operation.targets.includes(name) && name.startsWith('02_notes/') && name.endsWith('.md'),
    'memos: update selected publication flags',
  );
  await repository.push(sha, source.sha);
  return sha;
};
export interface GitPublicationOptions {
  execution: 'dry-run' | 'publication';
  operation: PublicationOperation;
  source: GitTreeRepository;
  rouault: GitTreeRepository;
  ledger: GitTreeRepository;
  privateWorkDirectory: string;
  publicCheckoutDirectory: string;
  nodeModulesDirectory: string;
  environment: NodeJS.ProcessEnv;
  initializeEmpty?: boolean;
  verifyDeployment: PublicationPorts['verifyDeployment'];
}
export const createGitPublicationPorts = async (
  options: GitPublicationOptions,
): Promise<PublicationPorts> => {
  const privateDirectory = await realpath(options.privateWorkDirectory);
  const publicDirectory = await realpath(options.publicCheckoutDirectory);
  if (
    !path.isAbsolute(privateDirectory) ||
    privateDirectory === publicDirectory ||
    privateDirectory.startsWith(publicDirectory + path.sep) ||
    !(await stat(privateDirectory)).isDirectory() ||
    ((await stat(privateDirectory)).mode & 0o077) !== 0
  )
    throw new Error('[publication] private work root outside public checkout required');
  const queue = new PublicationOperationQueue(path.join(privateDirectory, 'rouault-memos.lock'));
  for (const repository of [options.source, options.rouault, options.ledger])
    await repository.assertPrivateRoot(privateDirectory, publicDirectory);
  const ledger = new PublicationLedgerStore(new GitLedgerRepository(options.ledger));
  const rouault = new GitMemoRepository(options.rouault);
  const assertScope = (operation: PublicationOperation): void => {
    if (JSON.stringify(operation) !== JSON.stringify(options.operation))
      throw new Error('[publication] operation approval scope mismatch');
  };
  const assertWrite = (): void => {
    if (options.execution !== 'publication')
      throw new Error('[publication] dry-run write forbidden');
  };
  const readLedger = async () => {
    const current = await rouault.read();
    verifyOwnership(current.snapshot, current.manifest, options.initializeEmpty === true);
    return options.execution === 'dry-run'
      ? ledger.readForDryRun(
          options.initializeEmpty,
          !current.manifest && options.initializeEmpty === true,
        )
      : ledger.read(options.initializeEmpty, !current.manifest && options.initializeEmpty === true);
  };
  const readSource = async (sha?: string): Promise<Snapshot> => {
    const identity = await options.source.identity();
    if (!identity.private) throw new Error('[publication] private source required');
    const pinned = sha ?? (await options.source.head());
    const tree = await options.source.tree(pinned);
    const files = new Map<string, { mode: '100644' | '100755'; bytes: Uint8Array }>();
    for (const entry of tree)
      if (entry.path.endsWith('.md'))
        files.set(entry.path, { mode: entry.mode, bytes: await options.source.readBlob(entry) });
    const snapshot = { sha: pinned, complete: true, files };
    const loaded = await readLedger();
    await transformRequestedMemos({
      operation: options.operation,
      ledger: loaded.ledger,
      notes: readVaultNotes(plannedSourceSnapshot(snapshot, options.operation)),
      image: async (reference, origin, dependencies) => {
        const name = resolveVaultAssetReference(
          reference,
          origin,
          new Set(tree.map((entry) => entry.path)),
        );
        const entry = tree.find((item) => item.path === name);
        if (!entry) throw new Error('[publication] required asset missing');
        const bytes = files.get(name)?.bytes ?? (await options.source.readBlob(entry));
        files.set(name, { mode: entry.mode, bytes });
        dependencies[name] = hashBytes(bytes);
        return `content/_assets/memos-import/${hashBytes(bytes)}.${path.posix.extname(name).slice(1)}`;
      },
    });
    return snapshot;
  };
  return {
    withLock: (id, work) => {
      if (id !== options.operation.operationId)
        throw new Error('[publication] operation scope mismatch');
      return queue.withLock(id, work);
    },
    readLedger,
    readSource,
    readRouault: () => rouault.read(),
    saveReceipt: (receipt, sha) => {
      assertWrite();
      assertScope(receipt.operation);
      return ledger.saveReceipt(receipt, sha);
    },
    commitSourceFlags: (source, planned, targets) => {
      assertWrite();
      if (JSON.stringify(targets) !== JSON.stringify(options.operation.targets))
        throw new Error('[publication] source target scope mismatch');
      return commitOnlySourceFlags(options.source, options.operation, source, planned);
    },
    validateCandidate: (plan, base) =>
      validateIsolatedCandidate(plan, base, {
        privateWorkDirectory: privateDirectory,
        nodeModulesDirectory: options.nodeModulesDirectory,
        environment: options.environment,
      }),
    commitRouault: (plan, base, id) => {
      assertWrite();
      if (id !== options.operation.operationId)
        throw new Error('[publication] operation scope mismatch');
      return rouault.commitPlan(plan, base, options.operation);
    },
    pushRouault: (sha, base) => {
      assertWrite();
      return options.rouault.push(sha, base);
    },
    findRouaultOperation: (id, hash) => rouault.findOperation(id, hash),
    verifyDeployment: options.verifyDeployment,
    finalizeLedger: (state, receipt, plan, sha) => {
      assertWrite();
      assertScope(receipt.operation);
      return ledger.finalize(state, receipt, plan, sha);
    },
  };
};
export const dryRunGitPublication = async (
  options: Omit<GitPublicationOptions, 'execution'>,
  config: {
    guards: ImageInputGuards;
    rightsConfirmedFor?: ReadonlySet<string>;
    archiveReferencesVerified?: boolean;
  },
): Promise<ImportPlan> => {
  const ports = await createGitPublicationPorts({ ...options, execution: 'dry-run' });
  return ports.withLock(options.operation.operationId, async () => {
    const state = await ports.readLedger();
    const source = await ports.readSource();
    const publicInput = await ports.readRouault();
    const plan = await buildImportPlan({
      ...config,
      operation: options.operation,
      source: plannedSourceSnapshot(source, options.operation),
      ledger: state.ledger,
      rouault: publicInput.snapshot,
      ...(publicInput.manifest ? { manifest: publicInput.manifest } : {}),
      ...(options.initializeEmpty ? { initializeEmpty: true } : {}),
    });
    await ports.validateCandidate(plan, publicInput.snapshot);
    return plan;
  });
};
