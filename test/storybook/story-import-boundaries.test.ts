import { describe, expect, it } from 'vitest';
import { isStorybookExecutionHelperPath } from '../../src/testing/story-taxonomy.js';
import { collectStorySourceRecords, resolveImportPath } from './story-source.js';

function isForbiddenSpecifier(specifier: string): boolean {
  return /(?:^|\/)(internals?|facades?)(?:\/|$)/.test(specifier);
}

describe('story import boundaries', () => {
  const stories = collectStorySourceRecords();

  it('forbids story files from depending on internal or server-side layers directly', () => {
    const violations: string[] = [];

    for (const story of stories) {
      for (const importSpecifier of story.importSpecifiers) {
        if (isForbiddenSpecifier(importSpecifier)) {
          violations.push(`${story.filePath} -> ${importSpecifier}`);
          continue;
        }

        const resolvedPath = resolveImportPath(story.filePath, importSpecifier);
        if (!resolvedPath) {
          continue;
        }

        if (isStorybookExecutionHelperPath(resolvedPath)) {
          continue;
        }

        if (
          resolvedPath.startsWith('lib/') ||
          resolvedPath.startsWith('src/data/') ||
          resolvedPath.startsWith('scripts/') ||
          resolvedPath.startsWith('test/') ||
          isForbiddenSpecifier(resolvedPath)
        ) {
          violations.push(`${story.filePath} -> ${importSpecifier}`);
        }
      }
    }

    expect(violations).toEqual([]);
  });
});
