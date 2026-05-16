import { normalizeNotePath } from '../navigation/normalize-note-path.js';
import type { NormalizeNotePathInput, NormalizedNotePath } from '../navigation/navigation-types.js';

export type ResolveNotePermalinkInput = NormalizeNotePathInput;

export interface ResolvedNotePermalink extends NormalizedNotePath {
  readonly canonicalPathname: string;
}

export const resolveNotePermalink = (
  input: ResolveNotePermalinkInput,
): ResolvedNotePermalink => {
  const normalized = normalizeNotePath(input);
  return {
    ...normalized,
    canonicalPathname: normalized.permalink,
  };
};
