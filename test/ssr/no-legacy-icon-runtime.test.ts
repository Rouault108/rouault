import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

const SRC_ROOT = join(process.cwd(), 'src');

const walk = (dirPath: string): string[] => {
  const results: string[] = [];

  for (const entry of readdirSync(dirPath)) {
    const fullPath = join(dirPath, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      results.push(...walk(fullPath));
      continue;
    }

    if (stats.isFile() && fullPath.endsWith('.ts')) {
      results.push(fullPath);
    }
  }

  return results;
};

describe('legacy icon runtime usage', () => {
  it('src/lib/icons.ts を完全に撤去していること', () => {
    const files = walk(SRC_ROOT).map((filePath) => relative(process.cwd(), filePath));
    expect(files).not.toContain('src/lib/icons.ts');
  });

  it('register 層以外で ui-icon を直接 import しないこと', () => {
    const files = walk(SRC_ROOT);

    for (const filePath of files) {
      const relativePath = relative(process.cwd(), filePath);
      if (relativePath === 'src/icons/register.ts') {
        continue;
      }

      const source = readFileSync(filePath, 'utf8');
      expect(source).not.toMatch(/import\s+['"]ui-icon['"]/);
      expect(source).not.toMatch(/from\s+['"]ui-icon['"]/);
    }
  });

  it('ui-icon 以外で ui-icon 要素を動的生成しないこと', () => {
    const files = walk(SRC_ROOT);

    for (const filePath of files) {
      const relativePath = relative(process.cwd(), filePath);
      if (relativePath === 'src/components/ui/icon/ui-icon.ts') {
        continue;
      }

      const source = readFileSync(filePath, 'utf8');
      expect(source).not.toMatch(/createElement\(\s*['"]ui-icon['"]\s*\)/);
    }
  });

  it('旧 icons runtime を import しないこと', () => {
    const files = walk(SRC_ROOT);

    for (const filePath of files) {
      const source = readFileSync(filePath, 'utf8');
      expect(source).not.toMatch(/lib\/icons(?:\.js)?['"]/);
    }
  });
});