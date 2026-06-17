import { normalizeNoteDate } from './normalize-note-date.js';
import {
  filterNotesBySurface,
  type IntrinsicNote,
  type IntrinsicNotesCollection,
} from '../../build/data/notes.js';
import {
  resolveDevelopmentSiteUrlContext,
  resolveProductionSiteUrlContext,
} from '../site/site-url-context.js';
import { applyBasePathToRenderHref } from '../../shared/url/normalize-rouault-url.js';

export type CorpusPageSourceNote = IntrinsicNote;

export interface CorpusPageNoteSummary {
  title: string;
  permalink: string;
  renderHref: string;
  description: string;
  date: string;
  slug: string;
  genres: string[];
}

export interface CorpusPageEntry {
  key: string;
  label: string;
  href: string;
  noteCount: number;
  latestUpdatedDate: string | null;
  notes: CorpusPageNoteSummary[];
}

export interface CorpusNavigationItem {
  key: string;
  label: string;
  href: string;
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeGenres(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    if (typeof item !== 'string') {
      continue;
    }

    const genre = item.trim();
    if (genre.length === 0 || seen.has(genre)) {
      continue;
    }

    seen.add(genre);
    normalized.push(genre);
  }

  return normalized;
}

const resolveBuildRenderHref = (pathname: string): string => {
  const siteUrlContext = process.env['ROUAULT_SITE_ORIGIN']
    ? resolveProductionSiteUrlContext()
    : resolveDevelopmentSiteUrlContext();
  return applyBasePathToRenderHref({ pathname, search: '', hash: '', siteUrlContext });
};

function normalizeSegmentLabel(segment: string): string {
  return segment
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\p{Letter}/gu, (value) => value.toUpperCase());
}

function getCorpusKeyFromSlug(slug: string): string {
  const normalized = slug.trim().replace(/^\/+|\/+$/g, '');
  if (normalized.length === 0) {
    return '';
  }

  const [firstSegment] = normalized.split('/');
  return firstSegment?.trim() ?? '';
}

function toCorpusPageNoteSummary(note: CorpusPageSourceNote): CorpusPageNoteSummary | null {
  const title = normalizeString(note.title);
  const permalink = normalizeString(note.permalink);
  const slug = normalizeString(note.slug);

  if (title.length === 0 || permalink.length === 0 || slug.length === 0) {
    return null;
  }

  return {
    title,
    permalink,
    renderHref: resolveBuildRenderHref(permalink),
    description: normalizeString(note.description),
    date: normalizeNoteDate(normalizeString(note.updated) || normalizeString(note.date)) ?? '',
    slug,
    genres: normalizeGenres(note.genre),
  };
}

function compareNoteSummaries(left: CorpusPageNoteSummary, right: CorpusPageNoteSummary): number {
  if (left.date !== right.date) {
    if (left.date.length === 0) return 1;
    if (right.date.length === 0) return -1;
    return right.date.localeCompare(left.date, 'ja');
  }

  const titleOrder = left.title.localeCompare(right.title, 'ja');
  if (titleOrder !== 0) {
    return titleOrder;
  }

  return left.permalink.localeCompare(right.permalink, 'ja');
}

function resolveCorpusLabels(notes: readonly CorpusPageSourceNote[]): Map<string, string> {
  const labels = new Map<string, string>();

  for (const note of notes) {
    const presentation = note.navigationDirectoryPresentation;
    if (presentation === undefined) {
      continue;
    }

    for (const [directoryPath, value] of Object.entries(presentation)) {
      const corpusKey = getCorpusKeyFromSlug(directoryPath);
      const label = normalizeString(value.label);

      if (corpusKey.length === 0 || corpusKey !== directoryPath || label.length === 0) {
        continue;
      }

      if (!labels.has(corpusKey)) {
        labels.set(corpusKey, label);
      }
    }
  }

  return labels;
}

export function buildCorpusPageProjection(
  notes: IntrinsicNotesCollection | readonly CorpusPageSourceNote[],
): CorpusPageEntry[] {
  const visibleNotes = filterNotesBySurface(notes, 'corpora');
  const corpusLabels = resolveCorpusLabels(visibleNotes);
  const corpusMap = new Map<string, CorpusPageNoteSummary[]>();

  for (const note of visibleNotes) {
    const summary = toCorpusPageNoteSummary(note);
    if (summary === null) {
      continue;
    }

    const corpusKey = getCorpusKeyFromSlug(summary.slug);
    if (corpusKey.length === 0) {
      continue;
    }

    const entries = corpusMap.get(corpusKey) ?? [];
    entries.push(summary);
    corpusMap.set(corpusKey, entries);
  }

  return [...corpusMap.entries()]
    .map(([key, summaries]) => {
      const notesForCorpus = [...summaries].sort(compareNoteSummaries);
      const latestUpdatedDate = notesForCorpus[0]?.date ?? null;

      return {
        key,
        label: corpusLabels.get(key) ?? normalizeSegmentLabel(key),
        href: `/corpora/${encodeURIComponent(key)}/`,
        noteCount: notesForCorpus.length,
        latestUpdatedDate,
        notes: notesForCorpus,
      } satisfies CorpusPageEntry;
    })
    .sort((left, right) => left.label.localeCompare(right.label, 'ja'));
}

export function buildCorpusNavigation(
  corpusPages: readonly CorpusPageEntry[],
): CorpusNavigationItem[] {
  return [
    {
      key: 'all',
      label: 'すべてのノート',
      href: '/corpora/',
    },
    ...corpusPages.map((entry) => ({
      key: entry.key,
      label: entry.label,
      href: entry.href,
    })),
  ];
}

export function resolveCurrentCorpusKey(
  value: { currentCorpusKey?: string; note?: { slug?: string } } = {},
): string {
  const explicitKey = normalizeString(value.currentCorpusKey);
  if (explicitKey.length > 0) {
    return explicitKey;
  }

  const noteSlug = normalizeString(value.note?.slug);
  const derivedKey = getCorpusKeyFromSlug(noteSlug);
  return derivedKey.length > 0 ? derivedKey : 'all';
}
