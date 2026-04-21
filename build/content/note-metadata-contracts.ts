import type { NoteContentKind } from '../../shared/note/note-kind.js';
import type { NoteChromeProfile } from '../../shared/note/note-chrome-profile.js';
import type { TestingArea } from '../../shared/note/testing-area.js';

export const validateNoteMetadataContracts = (
  kind: NoteContentKind,
  chromeProfile: NoteChromeProfile | undefined,
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

  if (kind === 'demo' && chromeProfile === 'reader') {
    throw new Error(
      `[note-metadata:${sourceLabel}] demo note に chromeProfile: 'reader' は指定できません`,
    );
  }
};
