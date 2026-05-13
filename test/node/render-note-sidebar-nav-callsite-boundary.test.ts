import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const excludedDirectories = new Set(['.git', 'node_modules', 'dist', '_site']);

const collectTypeScriptFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (excludedDirectories.has(entry.name)) {
      continue;
    }

    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectTypeScriptFiles(absolutePath));
      continue;
    }

    if (entry.isFile() && /\.tsx?$/u.test(entry.name)) {
      files.push(absolutePath);
    }
  }

  return files;
};

const findRenderNoteSidebarNavCalls = (source: string): string[] => {
  const calls: string[] = [];
  const marker = 'renderNoteSidebarNav(';
  let offset = 0;

  while (true) {
    const start = source.indexOf(marker, offset);
    if (start === -1) {
      break;
    }

    let depth = 0;
    let end = start;
    for (; end < source.length; end += 1) {
      const character = source[end];
      if (character === '(') {
        depth += 1;
      } else if (character === ')') {
        depth -= 1;
        if (depth === 0) {
          end += 1;
          break;
        }
      }
    }

    calls.push(source.slice(start, end));
    offset = end;
  }

  return calls;
};

describe('renderNoteSidebarNav call-site boundary', () => {
  it('repo-wide の全 call site が groupIdPrefix を明示して group id identity を固定すること', async () => {
    const files = await collectTypeScriptFiles(repoRoot);
    const violations: string[] = [];
    let callCount = 0;

    for (const file of files) {
      const relativePath = path.relative(repoRoot, file);
      if (relativePath === 'test/node/render-note-sidebar-nav-callsite-boundary.test.ts') {
        continue;
      }

      const source = await readFile(file, 'utf8');
      const calls = findRenderNoteSidebarNavCalls(source);
      callCount += calls.length;

      for (const call of calls) {
        if (!call.includes('groupIdPrefix')) {
          violations.push(relativePath);
        }
      }
    }

    expect(callCount).toBeGreaterThan(0);
    expect(violations).to.deep.equal([]);
  });
});
