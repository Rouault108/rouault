import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import type { Nodes } from 'mdast';
import {
  ContentRouteRegistry,
  resolveContentRoute,
} from '../../build/content/content-route-registry.js';
import {
  validateImageGuards,
  validatePushInput,
  type ImageInputGuards,
} from '../../build/media/validate-image-inputs.js';
import { assertSafeContentPath } from '../../build/content/content-record.js';
import {
  hashBytes,
  assertSnapshot,
  readSourceFile,
  resolveVaultAssetReference,
  readVaultNotes,
  isNotePath,
  updateSourceFlag,
  type VaultNote,
} from './source-snapshot.js';
import { validateOperation } from './publication-ledger.js';
import { preparePublicAsset } from './prepare-public-assets.js';
import { transformRequestedMemos } from './transform-memos.js';
import { fingerprintPublicChanges } from './candidate-fingerprint.js';
import type {
  ImportPlan,
  OwnedFiles,
  PublicationLedger,
  PublicationOperation,
  Snapshot,
} from './model.js';
export const OWNERSHIP_PATH = 'scripts/import-state/memos-owned-files.json';
const isOwnedPath = (name: string): boolean =>
  (name.startsWith('content/memos/') && name.endsWith('.md')) ||
  (name.startsWith('content/_assets/memos-import/') && /\.(?:png|jpg|webp|avif)$/u.test(name));
export const verifyOwnership = (
  snapshot: Snapshot,
  manifest: OwnedFiles | undefined,
  initializeEmpty: boolean,
): OwnedFiles => {
  assertSnapshot(snapshot);
  const managed = [...snapshot.files.keys()]
    .filter(
      (name) =>
        name.startsWith('content/memos/') || name.startsWith('content/_assets/memos-import/'),
    )
    .filter((name) => {
      const file = snapshot.files.get(name);
      return !(
        ['content/memos/.gitkeep', 'content/_assets/memos-import/.gitkeep'].includes(name) &&
        file?.mode === '100644' &&
        file.bytes.length === 0
      );
    });
  if (!manifest) {
    if (!initializeEmpty || managed.length) throw new Error('[import] ownership manifest missing');
    return { schemaVersion: 1, files: {} };
  }
  if (manifest.schemaVersion !== 1 || typeof manifest.files !== 'object')
    throw new Error('[import] ownership manifest corrupt');
  const stored = snapshot.files.get(OWNERSHIP_PATH);
  if (stored?.mode !== '100644') throw new Error('[import] stored ownership manifest missing');
  const actual: unknown = JSON.parse(Buffer.from(stored.bytes).toString('utf8'));
  if (
    typeof actual !== 'object' ||
    actual === null ||
    JSON.stringify(actual) !== JSON.stringify(manifest)
  )
    throw new Error('[import] ownership manifest snapshot mismatch');
  for (const [name, hash] of Object.entries(manifest.files)) {
    assertSafeContentPath(name);
    if (
      !isOwnedPath(name) ||
      !/^[a-f0-9]{64}$/u.test(hash) ||
      hashBytes(readSourceFile(snapshot, name)) !== hash
    )
      throw new Error('[import] owned file was changed or removed');
  }
  if (managed.some((name) => !Object.hasOwn(manifest.files, name)))
    throw new Error('[import] unowned file in managed region');
  return manifest;
};
export const plannedSourceSnapshot = (
  source: Snapshot,
  operation: PublicationOperation,
): Snapshot => {
  if (operation.action === 'register-existing')
    throw new Error('[import] existing registration cannot change source flags');
  const files = new Map(source.files);
  for (const target of operation.targets) {
    const file = files.get(target);
    if (!file && operation.action === 'withdraw') continue;
    if (!file) throw new Error('[import] target missing');
    const notes = readVaultNotes({ ...source, files: new Map([[target, file]]) });
    const note = notes.get(target);
    if (!note) throw new Error('[import] target missing');
    if (operation.action === 'update' && note.metadata['publish'] !== true)
      throw new Error('[import] update flag conflict requires confirmation');
    if (operation.action !== 'update')
      files.set(target, { ...file, bytes: updateSourceFlag(note, operation.action === 'publish') });
  }
  return { ...source, files };
};
export const reconcileNoteFlags = (
  notes: ReadonlyMap<string, VaultNote>,
  ledger: PublicationLedger,
  operation: PublicationOperation,
) => {
  const result: ImportPlan['confirmations'][number][] = [];
  for (const [name, note] of notes) {
    if (!isNotePath(name) || operation.targets.includes(name)) continue;
    const entry = ledger.entries[name];
    const change =
      note.metadata['publish'] === true && entry?.status !== 'published'
        ? 'unknown-true'
        : note.metadata['publish'] !== true && entry?.status === 'published'
          ? 'known-disabled'
          : null;
    if (change)
      result.push({
        sourcePath: name,
        change,
        fingerprint: hashBytes(JSON.stringify([name, change, note.metadata['publish']])),
      });
  }
  for (const [name, entry] of Object.entries(ledger.entries)) {
    if (entry.status === 'published' && !notes.has(name) && !operation.targets.includes(name))
      result.push({
        sourcePath: name,
        change: 'known-disabled',
        fingerprint: hashBytes(JSON.stringify([name, 'missing'])),
      });
  }
  return result;
};
const publicMetadata = (note: VaultNote): string => {
  const title = note.metadata['title'] ?? path.posix.basename(note.path, '.md');
  if (typeof title !== 'string' || !title.trim()) throw new Error('[import] valid title required');
  const lines = [`title: ${JSON.stringify(title)}`, 'license: CC BY 4.0'];
  for (const key of ['date', 'updated']) {
    const value = note.metadata[key];
    if (value === undefined) continue;
    if (
      typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}(?:T[0-9:.+-]+Z?)?$/u.test(value) ||
      Number.isNaN(Date.parse(value))
    )
      throw new Error('[import] invalid ISO date');
    lines.push(`${key}: ${JSON.stringify(value)}`);
  }
  return `---\n${lines.join('\n')}\n---\n\n`;
};
export const buildImportPlan = async (input: {
  operation: PublicationOperation;
  source: Snapshot;
  rouault: Snapshot;
  ledger: PublicationLedger;
  manifest?: OwnedFiles;
  initializeEmpty?: boolean;
  guards: ImageInputGuards;
  rightsConfirmedFor?: ReadonlySet<string>;
  archiveReferencesVerified?: boolean;
  recoveringCommittedOperation?: boolean;
}): Promise<ImportPlan> => {
  validateOperation(input.operation, input.ledger);
  validateImageGuards(input.guards);
  const manifest = verifyOwnership(input.rouault, input.manifest, input.initializeEmpty === true);
  const notes = readVaultNotes(input.source);
  const confirmations = reconcileNoteFlags(notes, input.ledger, input.operation);
  const writes = new Map<string, Uint8Array>();
  const deletes: string[] = [];
  let owned = { ...manifest.files };
  const entries: ImportPlan['entries'] = {};
  const publicAssets = new Map<string, { publicPath: string; outputHash: string }>();
  const image = async (
    reference: string,
    origin: string,
    dependencies: Record<string, string>,
  ): Promise<string> => {
    const assetPath = resolveVaultAssetReference(
      reference,
      origin,
      new Set(input.source.files.keys()),
    );
    const asset = await preparePublicAsset(
      input.source,
      assetPath,
      input.guards,
      input.rightsConfirmedFor?.has(assetPath) === true,
    );
    const entry = input.ledger.entries[origin];
    if (
      !input.operation.targets.includes(origin) &&
      entry?.dependencyHashes[asset.sourcePath] !== asset.sourceHash
    )
      throw new Error('[import] image dependency version requires approval');
    const existing = input.rouault.files.get(asset.publicPath);
    if (
      existing &&
      (!Object.hasOwn(manifest.files, asset.publicPath) ||
        hashBytes(existing.bytes) !== asset.outputHash)
    )
      throw new Error('[import] asset ownership collision');
    const staged = writes.get(asset.publicPath);
    if (staged && hashBytes(staged) !== asset.outputHash)
      throw new Error('[import] asset hash collision');
    writes.set(asset.publicPath, asset.bytes);
    owned[asset.publicPath] = asset.outputHash;
    dependencies[asset.sourcePath] = asset.sourceHash;
    publicAssets.set(asset.sourcePath, asset);
    return asset.publicPath;
  };
  const transformed = await transformRequestedMemos({
    operation: input.operation,
    ledger: input.ledger,
    notes,
    image,
  });
  for (const target of input.operation.targets) {
    const old = input.ledger.entries[target];
    const route = resolveContentRoute({
      collectionId: 'memos',
      sourceRelativePath: target.slice('02_notes/'.length),
    });
    const publicPath = `content/memos/${route.identity.sourceRelativePath}`;
    if (input.operation.action === 'withdraw') {
      for (const [parent, entry] of Object.entries(input.ledger.entries)) {
        if (
          !input.operation.targets.includes(parent) &&
          entry.status === 'published' &&
          Object.hasOwn(entry.dependencyHashes, target)
        )
          throw new Error('[import] withdrawal has an unapproved embed dependent');
      }
      const alreadyRemoved =
        input.recoveringCommittedOperation === true &&
        !input.rouault.files.has(publicPath) &&
        !owned[publicPath];
      if (old?.publicPath !== publicPath || (!owned[publicPath] && !alreadyRemoved))
        throw new Error('[import] withdrawal ownership mismatch');
      if (!alreadyRemoved) deletes.push(publicPath);
      owned = Object.fromEntries(Object.entries(owned).filter(([name]) => name !== publicPath));
      entries[target] = {
        ...old,
        status: 'withdrawn',
        approvedRequestRef: input.operation.userRequestRef,
        approvedSourceSha: input.source.sha,
        publicOutputHashes: {},
      };
      continue;
    }
    const note = notes.get(target);
    const output = transformed.get(target);
    if (!note || !output) throw new Error('[import] target unavailable');
    const bytes = Buffer.from(publicMetadata(note) + output.markdown);
    if (input.rouault.files.has(publicPath) && !Object.hasOwn(manifest.files, publicPath))
      throw new Error('[import] memo ownership collision');
    writes.set(publicPath, bytes);
    owned[publicPath] = hashBytes(bytes);
    entries[target] = {
      sourcePath: target,
      publicPath,
      status: 'published',
      approvedRequestRef: input.operation.userRequestRef,
      approvedSourceSha: input.source.sha,
      approvedContentHash: note.versionHash,
      dependencyHashes: output.dependencies,
      publicOutputHashes: {
        [publicPath]: hashBytes(bytes),
        ...Object.fromEntries(
          Object.keys(output.dependencies).flatMap((name) => {
            const asset = publicAssets.get(name);
            return asset ? [[asset.publicPath, asset.outputHash]] : [];
          }),
        ),
      },
      headingMap: output.headingMap,
    };
  }
  const candidate = new Map(input.rouault.files);
  for (const name of deletes) candidate.delete(name);
  for (const [name, bytes] of writes) candidate.set(name, { mode: '100644', bytes });
  const paths = [...candidate.keys()].filter(
    (name) => name.startsWith('content/memos/') && name.endsWith('.md'),
  );
  new ContentRouteRegistry(
    paths.map((name) => ({
      collectionId: 'memos',
      sourceRelativePath: name.slice('content/memos/'.length),
    })),
    ['/memos/'],
  );
  const parser = unified().use(remarkParse).use(remarkGfm);
  const references = new Set<string>();
  const publicMaps = new Map<string, Record<string, string>>();
  for (const entry of Object.values({ ...input.ledger.entries, ...entries }))
    if (entry.status === 'published')
      publicMaps.set(
        resolveContentRoute({
          collectionId: 'memos',
          sourceRelativePath: entry.publicPath.slice('content/memos/'.length),
        }).canonicalPathname,
        entry.headingMap,
      );
  for (const [name, file] of candidate) {
    if (!name.startsWith('content/') || !name.endsWith('.md')) continue;
    const body = Buffer.from(file.bytes)
      .toString('utf8')
      .replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/u, '');
    const inspect = (node: Nodes): void => {
      if (node.type === 'image' && node.url.startsWith('content/_assets/memos-import/'))
        references.add(node.url);
      if (node.type === 'link' && node.url.startsWith('/memos/') && node.url !== '/memos/') {
        const url = new URL(node.url, 'https://rouault.invalid');
        const headingMap = publicMaps.get(url.pathname);
        if (
          !headingMap ||
          (url.hash && !Object.hasOwn(headingMap, decodeURIComponent(url.hash.slice(1))))
        )
          throw new Error('[import] existing public reference would break');
      }
      if ('children' in node) node.children.forEach(inspect);
    };
    inspect(parser.parse(body));
  }
  if (input.archiveReferencesVerified === true) {
    for (const name of Object.keys(manifest.files)) {
      if (!name.startsWith('content/_assets/memos-import/') || references.has(name)) continue;
      // Keep uncertain references (definitions, frontmatter, configs and examples) conservatively.
      // The ownership manifest itself names every asset and is not a consumer.
      const token = Buffer.from(path.posix.basename(name));
      const sourceReference = [...candidate].some(
        ([consumer, file]) =>
          consumer !== OWNERSHIP_PATH &&
          !consumer.startsWith('content/_assets/') &&
          Buffer.from(file.bytes).includes(token),
      );
      if (!sourceReference) {
        deletes.push(name);
        writes.delete(name);
        owned = Object.fromEntries(Object.entries(owned).filter(([key]) => key !== name));
      }
    }
  }
  for (const [name, bytes] of [...writes])
    if (
      input.rouault.files.has(name) &&
      hashBytes(input.rouault.files.get(name)?.bytes ?? new Uint8Array()) === hashBytes(bytes)
    )
      writes.delete(name);
  const nextManifest: OwnedFiles = {
    schemaVersion: 1,
    files: Object.fromEntries(Object.entries(owned).sort(([a], [b]) => a.localeCompare(b, 'en'))),
  };
  const manifestBytes = Buffer.from(JSON.stringify(nextManifest, null, 2) + '\n');
  if (
    !input.rouault.files.has(OWNERSHIP_PATH) ||
    hashBytes(readSourceFile(input.rouault, OWNERSHIP_PATH)) !== hashBytes(manifestBytes)
  )
    writes.set(OWNERSHIP_PATH, manifestBytes);
  validatePushInput(
    [...writes.values()],
    Buffer.byteLength(
      JSON.stringify(
        [...writes].map(([name, bytes]) => [name, Buffer.from(bytes).toString('base64')]),
      ),
    ),
    input.guards,
  );
  const dependencyVersion = Object.fromEntries(
    [...transformed].map(([name, output]) => [name, output.dependencies]),
  );
  const inputHash = hashBytes(
    JSON.stringify([
      input.operation.targets.map((name) => [name, notes.get(name)?.versionHash ?? null]),
      dependencyVersion,
    ]),
  );
  const candidateHash = fingerprintPublicChanges(writes, deletes);
  return {
    writes,
    deletes,
    manifest: nextManifest,
    entries,
    inputHash,
    candidateHash,
    confirmations,
  };
};
