import { describe, expect, it } from 'vitest';
import {
  ROUAULT_STORYBOOK_MANUAL_ONLY_TAG,
  ROUAULT_STORYBOOK_SMOKE_TAG,
} from '../../src/testing/story-taxonomy.js';
import { collectStorySourceRecords } from './story-source.js';

describe('story taxonomy', () => {
  const stories = collectStorySourceRecords();

  it('Storybook runtime 用の smoke allowlist が空にならないこと', () => {
    const smokeStories = stories
      .filter((story) => story.resolvedRole === 'smoke')
      .map((story) => `${story.filePath}#${story.exportName}`);

    expect(smokeStories.length).toBeGreaterThan(0);
  });

  it('smoke と manual-only を同じ story に同居させないこと', () => {
    const conflicts = stories
      .filter(
        (story) =>
          story.resolvedTags.includes(ROUAULT_STORYBOOK_SMOKE_TAG) &&
          story.resolvedTags.includes(ROUAULT_STORYBOOK_MANUAL_ONLY_TAG),
      )
      .map((story) => `${story.filePath}#${story.exportName}`);

    expect(conflicts).toEqual([]);
  });

  it('smoke story は Storybook runtime の対象として manual-only に混在しないこと', () => {
    const invalidSmokeStories = stories
      .filter(
        (story) =>
          story.resolvedRole === 'smoke' &&
          story.resolvedTags.includes(ROUAULT_STORYBOOK_MANUAL_ONLY_TAG),
      )
      .map((story) => `${story.filePath}#${story.exportName}`);

    expect(invalidSmokeStories).toEqual([]);
  });

  it('1 つの story file に複数の smoke story を置かないこと', () => {
    const smokeCountByFile = new Map<string, number>();

    for (const story of stories) {
      if (story.resolvedRole !== 'smoke') {
        continue;
      }

      smokeCountByFile.set(story.filePath, (smokeCountByFile.get(story.filePath) ?? 0) + 1);
    }

    const offenders = [...smokeCountByFile.entries()]
      .filter(([, count]) => count > 1)
      .map(([filePath, count]) => `${filePath} (${count})`);

    expect(offenders).toEqual([]);
  });
});
