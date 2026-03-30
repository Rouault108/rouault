import type { NoteContentKind } from '../../../../src/types/note-kind.js';
import {
  isReaderFacingNoteContentKind,
  normalizeNoteContentKind,
} from '../../../../src/types/note-kind.js';
import type { TestingArea } from '../../../../src/types/testing-area.js';
import { normalizeTestingArea } from '../../../../src/types/testing-area.js';

export interface NotePolicyContext {
  readonly kind: NoteContentKind;
  readonly testingArea?: TestingArea;
  readonly isReaderFacing: boolean;
  readonly allowsPreviewSandbox: boolean;
  readonly allowsSandboxJavaScript: boolean;
  readonly allowsCodePreviewControls: boolean;
  readonly allowsCodePreviewToolbar: boolean;
}

export const createNotePolicyContext = (
  kind: NoteContentKind | string | undefined,
  testingArea?: TestingArea | string,
): NotePolicyContext => {
  const normalizedKind = normalizeNoteContentKind(kind);
  const normalizedTestingArea = normalizeTestingArea(testingArea);
  const isReaderFacing = isReaderFacingNoteContentKind(normalizedKind);
  const allowsPreviewSandbox =
    normalizedKind === 'testing' && normalizedTestingArea === 'sandbox';

  return {
    kind: normalizedKind,
    ...(normalizedTestingArea ? { testingArea: normalizedTestingArea } : {}),
    isReaderFacing,
    allowsPreviewSandbox,
    allowsSandboxJavaScript: allowsPreviewSandbox,
    allowsCodePreviewControls: !isReaderFacing,
    allowsCodePreviewToolbar: !isReaderFacing,
  };
};
