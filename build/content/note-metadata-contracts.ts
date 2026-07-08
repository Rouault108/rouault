import type { NoteContentKind } from '../../shared/note/note-kind.js';
import type { NoteChromeProfile } from '../../shared/note/note-chrome-profile.js';
import type { TestingArea } from '../../shared/note/testing-area.js';

export interface NoteMetadataContractInput {
  readonly kind: NoteContentKind;
  readonly chromeProfile: NoteChromeProfile | undefined;
  readonly testingArea: TestingArea | undefined;
  readonly date?: string | undefined;
  readonly updated?: string | undefined;
  readonly sourceLabel?: string | undefined;
}

export const validateNoteMetadataContracts = (input: NoteMetadataContractInput): void => {
  const { kind, chromeProfile, testingArea, date, updated, sourceLabel = 'unknown' } = input;

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

  if (date !== undefined && updated !== undefined && updated < date) {
    throw new Error(
      `[note-metadata:${sourceLabel}] updated は date 以降の日付である必要があります`,
    );
  }
};
