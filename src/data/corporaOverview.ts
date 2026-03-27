import { buildCorpusPagesData, type CorpusPageSourceNote } from './corpusPages.js';
import { buildHomeData, type HomeNoteItem, type HomeSourceNote } from './home.js';
import { loadNotesData } from './notes.js';

export type CorporaOverviewSourceNote = CorpusPageSourceNote & HomeSourceNote;

export interface CorporaOverviewCorpusItem {
  key: string;
  label: string;
  href: string;
  noteCount: number;
  latestUpdatedDate: string | null;
}

export interface CorporaOverviewData {
  corpusCount: number;
  noteCount: number;
  latestUpdatedDate: string | null;
  corpora: CorporaOverviewCorpusItem[];
  recentNotes: HomeNoteItem[];
}

export function buildCorporaOverviewData(
  notes: readonly CorporaOverviewSourceNote[],
): CorporaOverviewData {
  const corpusPages = buildCorpusPagesData(notes);
  const home = buildHomeData(notes);

  return {
    corpusCount: corpusPages.length,
    noteCount: home.publicNoteCount,
    latestUpdatedDate: home.latestUpdatedDate,
    corpora: corpusPages.map((entry) => ({
      key: entry.key,
      label: entry.label,
      href: entry.href,
      noteCount: entry.noteCount,
      latestUpdatedDate: entry.latestUpdatedDate,
    })),
    recentNotes: home.notes,
  };
}

export const loadCorporaOverviewData = (): CorporaOverviewData =>
  buildCorporaOverviewData(loadNotesData());