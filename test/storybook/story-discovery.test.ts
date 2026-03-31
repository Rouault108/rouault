import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { collectStorySourceRecords } from './story-source.js';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

describe('story discovery', () => {
  const stories = collectStorySourceRecords();

  it('ストーリーブックの分類体系のカバレッジが空にならないようにする', () => {
    const filePaths = new Set(stories.map((story) => story.filePath));
    const interactionCount = stories.filter(
      (story) => story.resolvedContractKind === 'interaction-contract',
    ).length;
    const boundaryCount = stories.filter(
      (story) => story.resolvedContractKind === 'boundary-contract',
    ).length;
    const visualCount = stories.filter((story) => story.resolvedContractKind === 'visual').length;

    expect(filePaths.size).toBeGreaterThan(0);
    expect(stories.length).toBeGreaterThan(0);
    expect(interactionCount).toBeGreaterThan(0);
    expect(boundaryCount).toBeGreaterThan(0);
    expect(visualCount).toBeGreaterThan(0);
  });

  it('test:storybook が runtime と metadata validation に接続されていることを確認する', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(repositoryRoot, 'package.json'), 'utf8'),
    ) as {
      scripts?: Record<string, string>;
    };
    const testStorybook = packageJson.scripts?.['test:storybook'] ?? '';
    const vitestConfig = fs.readFileSync(path.join(repositoryRoot, 'vitest.config.ts'), 'utf8');

    expect(testStorybook).toContain('--project storybook-meta');
    expect(testStorybook).toContain('--project storybook-runtime');
    expect(vitestConfig).toContain("name: 'storybook-runtime'");
    expect(vitestConfig).not.toContain('passWithNoTests');
  });

  it('note contract stories が責任に基づいて分割されていることを確認する', () => {
    const filePaths = new Set(stories.map((story) => story.filePath));

    expect(filePaths.has('src/stories/note-contracts/static-primitives.stories.ts')).toBe(true);
    expect(filePaths.has('src/stories/note-contracts/enhancers.stories.ts')).toBe(true);

    expect(filePaths.has('src/components/ui/tabs/tabs.stories.ts')).toBe(true);
    expect(filePaths.has('src/components/ui/details/details.stories.ts')).toBe(true);
  });
});
