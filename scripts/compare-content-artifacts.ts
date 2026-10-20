import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';

// baselineは移行前SHAで別途生成し、比較対象と同じsite URL/build labelを使う。
const [baseline, current = process.cwd()] = process.argv.slice(2);
if (!baseline)
  throw new Error('Usage: tsx scripts/compare-content-artifacts.ts <baseline-root> [current-root]');
const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const json = (file: string): unknown => JSON.parse(readFileSync(file, 'utf8'));
const stable = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b, 'en'))
        .map(([key, item]) => [key, stable(item)]),
    );
  return value;
};
const collections = ['notes', 'memos'].map((name) => {
  const before = json(path.join(baseline, 'velite', `${name}.json`)) as Record<string, unknown>[];
  const after = json(path.join(current, '.velite', `${name}.json`)) as Record<string, unknown>[];
  const key = (item: Record<string, unknown>) => {
    if (typeof item['sourcePath'] === 'string') return item['sourcePath'];
    if (typeof item['sourceRoot'] !== 'string' || typeof item['slug'] !== 'string')
      throw new Error('missing source identity');
    return `${item['sourceRoot']}/${item['slug']}`;
  };
  const sort = (items: Record<string, unknown>[]) =>
    [...items].sort((a, b) => key(a).localeCompare(key(b), 'en'));
  const canonical = (items: Record<string, unknown>[]) => JSON.stringify(stable(sort(items)));
  return {
    name,
    before: before.length,
    after: after.length,
    equal: isDeepStrictEqual(sort(before), sort(after)),
    arrayOrderEqual: isDeepStrictEqual(before.map(key), after.map(key)),
    beforeSha256: hash(canonical(before)),
    afterSha256: hash(canonical(after)),
  };
});
const files = (directory: string, prefix = ''): string[] =>
  readdirSync(directory).flatMap((name) => {
    const relative = `${prefix}${name}`;
    return statSync(path.join(directory, name)).isDirectory()
      ? files(path.join(directory, name), `${relative}/`)
      : [relative];
  });
const beforeFiles = files(path.join(baseline, 'dist'));
const afterFiles = files(path.join(current, 'dist'));
const compare = (paths: string[]) =>
  paths.map((file) => {
    const before = readFileSync(path.join(baseline, 'dist', file));
    const present = afterFiles.includes(file);
    const after = present ? readFileSync(path.join(current, 'dist', file)) : Buffer.alloc(0);
    return {
      file,
      equal: present && before.equals(after),
      beforeSha256: hash(before),
      afterSha256: hash(after),
    };
  });
const html = compare(beforeFiles.filter((file) => file.endsWith('.html')));
const search = compare(
  beforeFiles.filter((file) => file.startsWith('search/') || file === 'search-catalog.json'),
);
const report = {
  collections,
  html,
  search,
  added: afterFiles.filter((file) => !beforeFiles.includes(file)),
  removed: beforeFiles.filter((file) => !afterFiles.includes(file)),
};
console.log(JSON.stringify(report, null, 2));
if (collections.some((item) => !item.equal) || [...html, ...search].some((item) => !item.equal))
  process.exitCode = 1;
