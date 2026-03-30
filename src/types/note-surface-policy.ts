import { normalizeNoteContentKind } from './note-kind.js';

export interface NoteSurfacePolicy {
  readonly sidebar: boolean;
  readonly breadcrumb: boolean;
  readonly search: boolean;
  readonly home: boolean;
  readonly tags: boolean;
  readonly corpora: boolean;
  readonly pagefind: boolean;
}

const READER_POLICY: NoteSurfacePolicy = {
  sidebar: true,
  breadcrumb: true,
  search: true,
  home: true,
  tags: true,
  corpora: true,
  pagefind: true,
};

const TESTING_POLICY: NoteSurfacePolicy = {
  sidebar: false,
  breadcrumb: true,
  search: false,
  home: false,
  tags: false,
  corpora: false,
  pagefind: false,
};

const DEMO_POLICY: NoteSurfacePolicy = {
  sidebar: false,
  breadcrumb: false,
  search: false,
  home: false,
  tags: false,
  corpora: false,
  pagefind: false,
};

export const resolveNoteSurfacePolicy = (kind: unknown): NoteSurfacePolicy => {
  switch (normalizeNoteContentKind(kind)) {
    case 'reader':
      return READER_POLICY;
    case 'testing':
      return TESTING_POLICY;
    case 'demo':
      return DEMO_POLICY;
  }
};

export const isSurfaceEnabledForNoteKind = (
  kind: unknown,
  surface: keyof NoteSurfacePolicy,
): boolean => resolveNoteSurfacePolicy(kind)[surface];
