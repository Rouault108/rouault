import { readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const BUILD_ID_KEY_RE = /(?:buildId|ROUAULT_BUILD_ID|rouault-build-id)/u;
const INVALID_WHITESPACE_BUILD_ID_RE =
  /(?:buildId\s*[:=]\s*['"][^'"]*\s+[^'"]*['"]|ROUAULT_BUILD_ID\s*[:=]\s*['"][^'"]*\s+[^'"]*['"]|name=["']rouault-build-id["'][^>]*content=["'][^"']*\s+[^"']*["'])/u;

const SOURCE_ROOTS = ['src', 'build', 'shared', 'scripts'] as const;

const collectSourceFiles = async (root: string): Promise<string[]> => {
  const entries = await readdir(root, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(root, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') {
        continue;
      }
      files.push(...(await collectSourceFiles(absolutePath)));
      continue;
    }

    if (entry.isFile() && /\.(?:ts|tsx|js|mjs|cjs|html)$/u.test(entry.name)) {
      files.push(absolutePath);
    }
  }

  return files;
};

describe('buildId fixture contract', () => {
  it('production buildId 文脈では空白入り literal を使わないこと', async () => {
    const files = (await Promise.all(SOURCE_ROOTS.map((root) => collectSourceFiles(root)))).flat();
    const violations: string[] = [];

    for (const filePath of files) {
      const source = readFileSync(filePath, 'utf8');
      if (BUILD_ID_KEY_RE.test(source) && INVALID_WHITESPACE_BUILD_ID_RE.test(source)) {
        violations.push(filePath.split(path.sep).join('/'));
      }
    }

    expect(violations).toEqual([]);
  });
});
