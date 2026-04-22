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

export const fallbackDirectoryLabel = (directoryPath: string): string =>
  normalizeSegmentLabel(getLastSegment(directoryPath));

export const buildDirectoryLabelMap = (
  notes: readonly Pick<
    NoteNavigationEntry,
    'slug' | 'noteKind' | 'directoryPath' | 'navigationDirectoryPresentation'
  >[],
): Map<string, string> => {
  const map = new Map<string, string>();

  for (const note of notes) {
    const presentation = note.navigationDirectoryPresentation;
    if (presentation === undefined) {
      continue;
    }

    for (const [directoryPath, value] of Object.entries(presentation)) {
      if (map.has(directoryPath)) {
        continue;
      }

      const label = toTrimmedString(value.label);
      if (label.length > 0) {
        map.set(directoryPath, label);
      }
    }
  }

  return map;
};

export const resolveDirectoryLabel = (
  directoryPath: string,
  directoryLabelMap: ReadonlyMap<string, string>,
): string => directoryLabelMap.get(directoryPath) ?? fallbackDirectoryLabel(directoryPath);

export const resolvePageLabel = (
  note: Pick<NoteNavigationEntry, 'slug' | 'title'>,
): string => {
  const title = toTrimmedString(note.title);
  if (title.length > 0) {
    return title;
  }

  const slug = toTrimmedString(note.slug);
  return normalizeSegmentLabel(getLastSegment(slug));
};
