import { hashBytes } from './source-snapshot.js';
import type { Snapshot } from './model.js';
export const fingerprintPublicChanges = (
  writes: ReadonlyMap<string, Uint8Array>,
  deletes: readonly string[],
): string =>
  hashBytes(
    JSON.stringify([
      [...writes]
        .map(([name, bytes]) => [name, hashBytes(bytes)])
        .sort(([a], [b]) => (a ?? '').localeCompare(b ?? '', 'en')),
      [...deletes].sort(),
    ]),
  );
export const fingerprintCommittedChanges = (current: Snapshot, parent: Snapshot): string => {
  const writes = new Map<string, Uint8Array>();
  const deletes: string[] = [];
  for (const [name, file] of current.files) {
    const before = parent.files.get(name);
    if ((before && before.mode !== file.mode) || (!before && file.mode !== '100644'))
      throw new Error('[publication] recovery commit changed file modes');
    if (!before || hashBytes(before.bytes) !== hashBytes(file.bytes)) writes.set(name, file.bytes);
  }
  for (const name of parent.files.keys()) if (!current.files.has(name)) deletes.push(name);
  return fingerprintPublicChanges(writes, deletes);
};
