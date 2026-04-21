import { normalizeNoteContentKind } from './note-kind.js';

export interface NotePublicationPolicy {
  readonly search: boolean;
  readonly home: boolean;
  readonly tags: boolean;
  readonly corpora: boolean;
  readonly pagefind: boolean;
}

const READER_POLICY: NotePublicationPolicy = {
  search: true,
  home: true,
  tags: true,
  corpora: true,
  pagefind: true,
};

const NON_PUBLIC_POLICY: NotePublicationPolicy = {
  search: false,
  home: false,
  tags: false,
  corpora: false,
  pagefind: false,
};

export const resolveNotePublicationPolicy = (kind: unknown): NotePublicationPolicy => {
  switch (normalizeNoteContentKind(kind)) {
    case 'reader':
      return READER_POLICY;
    case 'testing':
    case 'demo':
      return NON_PUBLIC_POLICY;
  }
};

export const isPublicationSurfaceEnabledForNoteKind = (
  kind: unknown,
  surface: keyof NotePublicationPolicy,
): boolean => resolveNotePublicationPolicy(kind)[surface];
