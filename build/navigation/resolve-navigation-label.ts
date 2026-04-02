import type { NoteNavigationEntry } from '../../shared/navigation/navigation-types.js';

const toTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

export const normalizeSegmentLabel = (segment: string): string =>
  segment
    .replace(/[-_]+/gu, ' ')
    .trim()
    .replace(/\b\p{Letter}/gu, (value) => value.toUpperCase());

const getLastSegment = (path: string): string => {
  const segments = path.split('/').filter((segment) => segment.length > 0);
  return segments[segments.length - 1] ?? path;
};

const resolveDirectoryPath = (
  note: Pick<NoteNavigationEntry, 'slug' | 'directoryPath'>,
): string => {
  const directoryPath = toTrimmedString(note.directoryPath);
  if (directoryPath.length > 0) {
    return directoryPath;
  }

  return toTrimmedString(note.slug);
};

export const fallbackDirectoryLabel = (directoryPath: string): string =>
  normalizeSegmentLabel(getLastSegment(directoryPath));

export const buildDirectoryLabelMap = (
  notes: readonly Pick<NoteNavigationEntry, 'slug' | 'title' | 'noteKind' | 'directoryPath'>[],
): Map<string, string> => {
  const map = new Map<string, string>();

  for (const note of notes) {
    if (note.noteKind !== 'directory-index') {
      continue;
    }

    const directoryPath = resolveDirectoryPath(note);
    if (directoryPath.length === 0) {
      continue;
    }

    const title = toTrimmedString(note.title);
    map.set(directoryPath, title.length > 0 ? title : fallbackDirectoryLabel(directoryPath));
  }

  return map;
};

export const resolveDirectoryLabel = (
  directoryPath: string,
  directoryLabelMap: ReadonlyMap<string, string>,
): string => directoryLabelMap.get(directoryPath) ?? fallbackDirectoryLabel(directoryPath);

export const resolveNoteLabel = (
  note: Pick<NoteNavigationEntry, 'slug' | 'title' | 'noteKind' | 'directoryPath'>,
  directoryLabelMap: ReadonlyMap<string, string>,
): string => {
  if (note.noteKind === 'directory-index') {
    return resolveDirectoryLabel(resolveDirectoryPath(note), directoryLabelMap);
  }

  const title = toTrimmedString(note.title);
  if (title.length > 0) {
    return title;
  }

  const slug = toTrimmedString(note.slug);
  return normalizeSegmentLabel(getLastSegment(slug));
};
