export const NOTE_CONTENT_KINDS = ['reader', 'testing', 'demo'] as const;

export type NoteContentKind = (typeof NOTE_CONTENT_KINDS)[number];

export const normalizeNoteContentKind = (value: unknown): NoteContentKind => {
  return NOTE_CONTENT_KINDS.includes(value as NoteContentKind)
    ? (value as NoteContentKind)
    : 'reader';
};

export const isReaderFacingNoteContentKind = (value: unknown): boolean =>
  normalizeNoteContentKind(value) === 'reader';
