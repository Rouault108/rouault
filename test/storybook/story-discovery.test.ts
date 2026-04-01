import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { collectStorySourceRecords } from './story-source.js';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const legacyStaticFirstStoryFiles = [
  'src/components/ui/blockquote/blockquote.stories.ts',
  'src/components/ui/callout/callout.stories.ts',
  'src/components/ui/divider/divider.stories.ts',
  'src/components/ui/footnote/footnote.stories.ts',
  'src/components/ui/highlight/highlight.stories.ts',
  'src/components/ui/image/image.stories.ts',
  'src/components/ui/info-box/info-box.stories.ts',
  'src/components/ui/table/table.stories.ts',
] as const;

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

  it('note contracts を Storybook 先頭に並べ、legacy component stories を補助階層へ退避すること', () => {
    const previewSource = fs.readFileSync(path.join(repositoryRoot, '.storybook/preview.ts'), 'utf8');
    expect(previewSource).toContain(
      "order: ['Note Contracts', 'Foundations', 'Layouts', 'Components', 'Legacy Components']",
    );

    const noteContractTitles = new Set(
      stories
        .filter((story) => story.filePath.startsWith('src/stories/note-contracts/'))
        .map((story) => story.metaTitle),
    );
    expect(noteContractTitles).toEqual(
      new Set(['Note Contracts/Static Primitives', 'Note Contracts/Enhancers']),
    );

    const legacyTitles = stories
      .filter((story) =>
        legacyStaticFirstStoryFiles.includes(
          story.filePath as (typeof legacyStaticFirstStoryFiles)[number],
        ),
      )
      .map((story) => `${story.filePath}:${story.metaTitle ?? ''}`);

    expect(legacyTitles).toEqual([
      'src/components/ui/blockquote/blockquote.stories.ts:Legacy Components/Blockquote',
      'src/components/ui/callout/callout.stories.ts:Legacy Components/Callout',
      'src/components/ui/divider/divider.stories.ts:Legacy Components/Divider',
      'src/components/ui/footnote/footnote.stories.ts:Legacy Components/Footnote',
      'src/components/ui/highlight/highlight.stories.ts:Legacy Components/Highlight',
      'src/components/ui/image/image.stories.ts:Legacy Components/Image',
      'src/components/ui/info-box/info-box.stories.ts:Legacy Components/InfoBox',
      'src/components/ui/table/table.stories.ts:Legacy Components/Table',
    ]);
  });
});