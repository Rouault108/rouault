import type { NoteContentKind } from '../../src/types/note-kind.js';
import type { TestingArea } from '../../src/types/testing-area.js';

export const validateNoteMetadataContracts = (
  kind: NoteContentKind,
  testingArea: TestingArea | undefined,
  sourceLabel = 'unknown',
): void => {
  if (kind === 'testing' && testingArea === undefined) {
    throw new Error(`[note-metadata:${sourceLabel}] testing note には testingArea が必須です`);
  }

  if (kind !== 'testing' && testingArea !== undefined) {
    throw new Error(
      `[note-metadata:${sourceLabel}] testingArea を指定できるのは testing note のみです`,
    );
  }
};
