import { describe, expect, it } from 'vitest';
import { collectStorySourceRecords } from './story-source.js';

describe('story discovery', () => {
  const stories = collectStorySourceRecords();

  it('Storybook metadata gate の入力が空でなく、docs/smoke/manual-only に収束していること', () => {
    const filePaths = new Set(stories.map((story) => story.filePath));
    const smokeCount = stories.filter((story) => story.resolvedRole === 'smoke').length;
    const docsCount = stories.filter((story) => story.resolvedRole === 'docs').length;

    const noteContractFiles = [
      ...new Set(
        stories
          .filter((story) => story.filePath.startsWith('src/stories/note-contracts/'))
          .map((story) => story.filePath),
      ),
    ];

    const boundaryFiles = [
      ...new Set(
        stories
          .filter(
            (story) =>
              story.filePath.endsWith('-boundary.stories.ts') ||
              story.metaTitle?.endsWith('/Boundary') === true,
          )
          .map((story) => story.filePath),
      ),
    ];

    expect(filePaths.size).toBeGreaterThan(0);
    expect(stories.length).toBeGreaterThan(0);
    expect(smokeCount).toBeGreaterThan(0);
    expect(docsCount).toBeGreaterThan(0);
    expect(noteContractFiles).toEqual([]);
    expect(boundaryFiles).toEqual([]);
  });

});
