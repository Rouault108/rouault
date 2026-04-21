import { normalizeNoteContentKind, type NoteContentKind } from './note-kind.js';

export const NOTE_CHROME_PROFILES = ['reader', 'plain'] as const;

export type NoteChromeProfile = (typeof NOTE_CHROME_PROFILES)[number];

export const normalizeNoteChromeProfile = (value: unknown): NoteChromeProfile | undefined => {
  return NOTE_CHROME_PROFILES.includes(value as NoteChromeProfile)
    ? (value as NoteChromeProfile)
    : undefined;
};

export const resolveDefaultNoteChromeProfile = (kind: unknown): NoteChromeProfile => {
  switch (normalizeNoteContentKind(kind)) {
    case 'reader':
      return 'reader';
    case 'testing':
    case 'demo':
      return 'plain';
  }
};

export const resolveEffectiveNoteChromeProfile = (
  kind: NoteContentKind | unknown,
  chromeProfile: unknown,
): NoteChromeProfile => {
  return normalizeNoteChromeProfile(chromeProfile) ?? resolveDefaultNoteChromeProfile(kind);
};
