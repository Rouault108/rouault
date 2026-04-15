import { normalizeNoteDate } from './normalize-note-date.js';
import {
  filterNotesBySurface,
  type IntrinsicNote,
  type IntrinsicNotesCollection,
} from '../../build/data/notes.js';

export type HomeSourceNote = IntrinsicNote;

export interface HomeNoteItem {
  title: string;
  permalink: string;
  summary: string;
  date: string | null;
  pathLabel: string;
  genres: string[];
}

export interface HomePageData {
  publicNoteCount: number;
  latestUpdatedDate: string | null;
  notes: HomeNoteItem[];
}

interface IndexedHomeNote extends HomeNoteItem {
  sortDate: string | null;
  sourceIndex: number;
}

const normalizeText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Map<string, string>();

  for (const item of value) {
    if (typeof item !== 'string') {
      continue;
    }

    const normalized = item.trim();
    if (normalized.length === 0) {
      continue;
    }

    const key = normalized.toLocaleLowerCase('ja');
    if (!unique.has(key)) {
      unique.set(key, normalized);
    }
  }

  return [...unique.values()];
};

const getCorpusKeyFromSlug = (slug: string): string => {
  const normalized = normalizeText(slug).replace(/^\/+|\/+$/gu, '');
  if (normalized.length === 0) {
    return '';
  }

  const [firstSegment] = normalized.split('/');
  return firstSegment?.trim() ?? '';
};

const buildQuietPathLabel = (slug: string): string => {
  const segments = slug
    .split('/')
    .map((segment) => segment.normalize('NFKC').trim())
    .filter((segment) => segment.length > 0);

  return segments.length > 0 ? segments.join(' / ') : '—';
};

const compareDateDescending = (left: string | null, right: string | null): number => {
  if (left === right) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return right.localeCompare(left, 'ja');
};

const normalizePermalinkForSort = (value: string): string => value.replace(/\/+$/u, '');

const compareHomeNotes = (left: IndexedHomeNote, right: IndexedHomeNote): number => {
  const dateOrder = compareDateDescending(left.sortDate, right.sortDate);
  if (dateOrder !== 0) {
    return dateOrder;
  }

  const titleOrder = left.title.localeCompare(right.title, 'ja');
  if (titleOrder !== 0) {
    return titleOrder;
  }

  const permalinkOrder = normalizePermalinkForSort(left.permalink).localeCompare(
    normalizePermalinkForSort(right.permalink),
    'ja',
  );
  if (permalinkOrder !== 0) {
    return permalinkOrder;
  }

  return left.sourceIndex - right.sourceIndex;
};

export const buildHomePageProjection = (
  notes: IntrinsicNotesCollection | readonly HomeSourceNote[],
): HomePageData => {
  const visibleNotes = filterNotesBySurface(notes, 'home').filter((note) => {
    return getCorpusKeyFromSlug(normalizeText(note.slug)) !== 'testing';
  });

  const indexedNotes = visibleNotes.flatMap((note: HomeSourceNote, sourceIndex: number) => {
    const title = normalizeText(note.title);
    const permalink = normalizeText(note.permalink);
    const slug = normalizeText(note.slug);

    if (title.length === 0 || permalink.length === 0 || slug.length === 0) {
      return [];
    }

    const effectiveDate = normalizeNoteDate(normalizeText(note.updated) || normalizeText(note.date));

    return [
      {
        title,
        permalink,
        summary: normalizeText(note.description),
        date: effectiveDate,
        pathLabel: buildQuietPathLabel(slug),
        genres: normalizeStringArray(note.genre),
        sortDate: effectiveDate,
        sourceIndex,
      } satisfies IndexedHomeNote,
    ];
  });

  const sortedNotes = [...indexedNotes].sort(compareHomeNotes);

  return {
    publicNoteCount: sortedNotes.length,
    latestUpdatedDate: sortedNotes.at(0)?.date ?? null,
    notes: sortedNotes.slice(0, 12).map((note) => ({
      title: note.title,
      permalink: note.permalink,
      summary: note.summary,
      date: note.date,
      pathLabel: note.pathLabel,
      genres: note.genres,
    })),
  };
};
