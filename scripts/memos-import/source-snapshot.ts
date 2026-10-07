import { createHash } from 'node:crypto';
import path from 'node:path';
import { JSON_SCHEMA, load } from 'js-yaml';
import { assertSafeContentPath } from '../../build/content/content-record.js';
import type { Snapshot } from './model.js';
export const hashBytes = (bytes: Uint8Array | string): string =>
  createHash('sha256').update(bytes).digest('hex');
export const assertSnapshot = (snapshot: Snapshot): void => {
  if (!snapshot.complete || !/^[a-f0-9]{40}$/u.test(snapshot.sha))
    throw new Error('[import] incomplete or unpinned snapshot');
  const compatible = new Set<string>();
  for (const [name, file] of snapshot.files) {
    assertSafeContentPath(name);
    const key = name.normalize('NFC').toLowerCase();
    if (compatible.has(key) || file.mode === '120000')
      throw new Error('[import] ambiguous path or symlink');
    compatible.add(key);
  }
};
export const readSourceFile = (snapshot: Snapshot, name: string): Uint8Array => {
  assertSafeContentPath(name);
  const file = snapshot.files.get(name);
  if (!file || file.mode === '120000') throw new Error('[import] required regular file missing');
  return file.bytes;
};
export const resolveVaultAssetReference = (
  reference: string,
  origin: string,
  availablePaths: ReadonlySet<string>,
): string => {
  if (
    /^[a-z][a-z0-9+.-]*:/iu.test(reference) ||
    /[?#]/u.test(reference) ||
    reference.startsWith('/')
  )
    throw new Error('[import] remote or unsafe image');
  const relative = path.posix.normalize(path.posix.join(path.posix.dirname(origin), reference));
  const matches = [...new Set([relative, path.posix.normalize(reference)])].filter((name) =>
    availablePaths.has(name),
  );
  if (matches.length !== 1 || !matches[0]) throw new Error('[import] missing or ambiguous image');
  assertSafeContentPath(matches[0]);
  return matches[0];
};
export const isNotePath = (name: string): boolean =>
  name.startsWith('02_notes/') && name.endsWith('.md');
export interface VaultNote {
  path: string;
  metadata: Record<string, unknown>;
  body: string;
  source: string;
  versionHash: string;
}
export const parseVaultNote = (name: string, bytes: Uint8Array): VaultNote => {
  const source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const block = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(source);
  if (source.startsWith('---') && !block) throw new Error('[import] malformed frontmatter');
  const parsed = block ? load(block[1] ?? '', { schema: JSON_SCHEMA, json: false }) : {};
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed))
    throw new Error('[import] frontmatter must be an object');
  const metadata = parsed as Record<string, unknown>;
  const body = source.slice(block?.[0].length ?? 0);
  const versionMetadata = { ...metadata };
  delete versionMetadata['publish'];
  return {
    path: name,
    source,
    body,
    metadata,
    versionHash: hashBytes(
      JSON.stringify([
        body,
        Object.entries(versionMetadata).sort(([a], [b]) => a.localeCompare(b, 'en')),
        'memos-import-v1',
      ]),
    ),
  };
};
export const readVaultNotes = (snapshot: Snapshot): Map<string, VaultNote> => {
  assertSnapshot(snapshot);
  const notes = new Map<string, VaultNote>();
  for (const [name, file] of snapshot.files) {
    if (name.endsWith('.md')) notes.set(name, parseVaultNote(name, file.bytes));
  }
  return notes;
};
export const updateSourceFlag = (note: VaultNote, enabled: boolean): Uint8Array => {
  // YAMLの意味を先に検証し、変更対象propertyだけを差し替える。
  const newline = note.source.includes('\r\n') ? '\r\n' : '\n';
  const block = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(note.source);
  if (!block) {
    if (!enabled) return Buffer.from(note.source);
    return Buffer.from(`---${newline}publish: true${newline}---${newline}${note.source}`);
  }
  const lines = (block[1] ?? '').split(/\r?\n/u);
  const index = lines.findIndex((line) => /^publish\s*:/u.test(line));
  if (Object.hasOwn(note.metadata, 'publish') && index < 0)
    throw new Error('[import] publish property formatting requires explicit editing');
  if (index >= 0) {
    const line = lines[index] ?? '';
    if (
      !/^publish\s*:\s*(?:true|false|[0-9]+|"[^"]*"|'[^']*'|yes|no|null|~)?\s*(?:#.*)?$/u.test(line)
    )
      throw new Error('[import] non-scalar publish property');
    if (enabled) lines[index] = 'publish: true';
    else lines.splice(index, 1);
  } else if (enabled) lines.push('publish: true');
  return Buffer.from(`---${newline}${lines.join(newline)}${newline}---${newline}${note.body}`);
};
export const resolveVaultReference = (
  reference: string,
  origin: string,
  notes: ReadonlyMap<string, VaultNote>,
  wiki: boolean,
): string => {
  if (
    /^[a-z][a-z0-9+.-]*:/iu.test(reference) ||
    reference.startsWith('/') ||
    reference.includes('\\')
  )
    throw new Error('[import] unsafe vault reference');
  const withExtension = reference.endsWith('.md') ? reference : `${reference}.md`;
  if (!wiki || reference.includes('/')) {
    const relative = path.posix.normalize(
      path.posix.join(path.posix.dirname(origin), withExtension),
    );
    const root = path.posix.normalize(withExtension);
    const matches = [...new Set([relative, ...(wiki ? [root] : [])])].filter((name) =>
      notes.has(name),
    );
    if (matches.length !== 1) throw new Error('[import] missing or ambiguous reference');
    const result = matches[0];
    if (!result) throw new Error('[import] missing reference');
    assertSafeContentPath(result);
    return result;
  }
  const stems = [...notes.values()].filter(
    (note) => path.posix.basename(note.path, '.md') === reference,
  );
  const matches = stems.length
    ? stems
    : [...notes.values()].filter(
        (note) =>
          Array.isArray(note.metadata['aliases']) && note.metadata['aliases'].includes(reference),
      );
  if (matches.length !== 1 || !matches[0])
    throw new Error('[import] missing or ambiguous wikilink');
  return matches[0].path;
};
