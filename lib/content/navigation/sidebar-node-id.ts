import type { NoteNavigationEntry } from './types.js';

const DIRECTORY_INDEX_SUFFIX = '/__index__';

const toTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export const createDirectoryIndexNodeId = (directoryPath: string): string =>
  `${directoryPath}${DIRECTORY_INDEX_SUFFIX}`;

export const resolveSelectedSidebarNodeId = (
  note: Pick<NoteNavigationEntry, 'slug' | 'noteKind' | 'directoryPath'> | null | undefined,
): string | null => {
  const slug = toTrimmedString(note?.slug);
  if (slug.length === 0) {
    return null;
  }

  if (note?.noteKind !== 'directory-index') {
    return slug;
  }

  const directoryPath = toTrimmedString(note.directoryPath);
  return createDirectoryIndexNodeId(directoryPath.length > 0 ? directoryPath : slug);
};
