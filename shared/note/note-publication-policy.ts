import { normalizeNoteContentKind } from './note-kind.js';

export interface NotePublicationPolicy {
  readonly search: boolean;
  readonly home: boolean;
  readonly tags: boolean;
  readonly corpora: boolean;
  readonly pagefind: boolean;
}

export interface NotePublicationPolicyInput {
  readonly kind?: unknown;
  readonly excludeFromPublicationSurfaces?: unknown;
}

const READER_POLICY: NotePublicationPolicy = {
  search: true,
  home: true,
  tags: true,
  corpora: true,
  pagefind: true,
};

export const NON_PUBLIC_NOTE_PUBLICATION_POLICY: NotePublicationPolicy = {
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
      return NON_PUBLIC_NOTE_PUBLICATION_POLICY;
  }
};

export const shouldExcludeFromPublicationSurfaces = (note: NotePublicationPolicyInput): boolean =>
  note.excludeFromPublicationSurfaces === true;

export const resolveEffectiveNotePublicationPolicy = (
  note: NotePublicationPolicyInput,
): NotePublicationPolicy =>
  shouldExcludeFromPublicationSurfaces(note)
    ? NON_PUBLIC_NOTE_PUBLICATION_POLICY
    : resolveNotePublicationPolicy(note.kind);

export const shouldRenderArticleHeaderTags = (note: NotePublicationPolicyInput): boolean =>
  normalizeNoteContentKind(note.kind) === 'reader';

export const isPublicationSurfaceEnabledForNoteKind = (
  kind: unknown,
  surface: keyof NotePublicationPolicy,
): boolean => resolveNotePublicationPolicy(kind)[surface];
