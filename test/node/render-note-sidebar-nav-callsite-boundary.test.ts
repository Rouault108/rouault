import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const callSites = [
  'build/projections/note-page-projection.ts',
  'test/ssr/sidebar-nav-contract.test.ts',
  'test/node/render-note-sidebar-nav.test.ts',
  'test/browser/layout-sidebar-group-id-contract.browser.test.ts',
] as const;

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
  it('全 call site が groupIdPrefix を明示して group id identity を固定すること', async () => {
    for (const relativePath of callSites) {
      const source = await readFile(path.join(repoRoot, relativePath), 'utf8');
      const calls = findRenderNoteSidebarNavCalls(source);

      expect(calls.length, `${relativePath} should call renderNoteSidebarNav`).toBeGreaterThan(0);
      for (const call of calls) {
        expect(call, `${relativePath} renderNoteSidebarNav call should pass groupIdPrefix`).toContain(
          'groupIdPrefix',
        );
      }
    }
  });
});
