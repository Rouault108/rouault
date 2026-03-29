import { describe, expect, it } from 'vitest';
import {
  ROUAULT_BOUNDARY_NAME_PATTERN,
  ROUAULT_CONTRACT_KINDS,
  ROUAULT_INTERACTION_NAME_PATTERN,
  isBoundaryStoryFile,
  isFoundationStoryFile,
} from '../../src/testing/story-taxonomy.js';
import { collectStorySourceRecords } from './story-source.js';

describe('story taxonomy', () => {
  const stories = collectStorySourceRecords();

  it('requires rouaultContractKind on every named story export', () => {
    const missing = stories
      .filter((story) => story.resolvedContractKind === undefined)
      .map((story) => `${story.filePath}#${story.exportName}`);

    expect(missing).toEqual([]);
  });

  it('limits rouaultContractKind to the normalized taxonomy', () => {
    const invalid = stories
      .filter(
        (story) =>
          story.resolvedContractKind !== undefined &&
          !(ROUAULT_CONTRACT_KINDS as readonly string[]).includes(story.resolvedContractKind),
      )
      .map(
        (story) => `${story.filePath}#${story.exportName}:${String(story.resolvedContractKind)}`,
      );

    expect(invalid).toEqual([]);
  });

  it('requires play on interaction-contract stories', () => {
    const missingPlay = stories
      .filter((story) => story.resolvedContractKind === 'interaction-contract' && !story.hasPlay)
      .map((story) => `${story.filePath}#${story.exportName}`);

    expect(missingPlay).toEqual([]);
  });

  it('keeps foundations and boundary hints aligned with taxonomy', () => {
    const mismatches = stories
      .filter((story) => {
        if (isFoundationStoryFile(story.filePath)) {
          return story.resolvedContractKind !== 'visual';
        }

        if (
          isBoundaryStoryFile(story.filePath) ||
          ROUAULT_BOUNDARY_NAME_PATTERN.test(story.exportName)
        ) {
          return story.resolvedContractKind !== 'boundary-contract';
        }

        if (ROUAULT_INTERACTION_NAME_PATTERN.test(story.exportName)) {
          return story.resolvedContractKind !== 'interaction-contract';
        }

        return false;
      })
      .map(
        (story) => `${story.filePath}#${story.exportName}:${String(story.resolvedContractKind)}`,
      );

    expect(mismatches).toEqual([]);
  });
});
