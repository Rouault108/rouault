import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { resolveContentRoute } from '../build/content/content-route-registry.js';
const baselineSha = 'd77e02ed798e09c96feeca7e51d66614cc30c087';
const files = execFileSync(
  'git',
  ['ls-tree', '-r', '--name-only', '-z', baselineSha, '--', 'content', 'test/fixtures/content'],
  { encoding: 'utf8' },
)
  .split('\0')
  .filter(Boolean);
let notes = 0;
let configurations = 0;
for (const sourcePath of files) {
  if (!sourcePath.endsWith('.md') && !sourcePath.endsWith('/_config.json')) continue;
  if (sourcePath.startsWith('content/_assets/') || sourcePath.startsWith('content/_generated/'))
    continue;
  const root = sourcePath.startsWith('test/fixtures/content/')
    ? 'test/fixtures/content'
    : 'content';
  const relative = sourcePath.slice(root.length + 1);
  const migrated = path.join(root, 'notes', relative);
  if (!existsSync(migrated)) throw new Error('[migration] existing input missing');
  const before = execFileSync('git', ['show', `${baselineSha}:${sourcePath}`]);
  if (!before.equals(readFileSync(migrated)))
    throw new Error('[migration] existing content or config was changed');
  if (sourcePath.endsWith('.md')) {
    const oldCanonical = new URL(
      `/notes/${relative.slice(0, -3).replace(/\/index$/u, '')}`,
      'https://rouault.invalid',
    ).pathname;
    const nextCanonical = resolveContentRoute({
      collectionId: 'notes',
      sourceRelativePath: relative,
    }).canonicalPathname;
    if (oldCanonical !== nextCanonical)
      throw new Error('[migration] unapproved canonical route change');
    notes += 1;
  } else configurations += 1;
}
console.log(
  `[migration] ${notes.toString()} existing note URLs and ${configurations.toString()} configurations preserved; allowedRouteChanges=0`,
);
