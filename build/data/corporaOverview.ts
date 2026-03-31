import { loadNotesData, type IntrinsicNote } from './notes.js';
import {
  buildCorporaOverviewProjection,
  type CorporaOverviewCorpusItem,
  type CorporaOverviewData,
} from '../projections/corpora-overview-projection.js';
import type { HomeNoteItem } from '../projections/home-page-projection.js';

export type { CorporaOverviewCorpusItem, CorporaOverviewData, HomeNoteItem };

export type CorporaOverviewSourceNote = IntrinsicNote;

export function buildCorporaOverviewData(
  notes: readonly CorporaOverviewSourceNote[],
): CorporaOverviewData {
  return buildCorporaOverviewProjection(notes);
}

export const loadCorporaOverviewData = (): CorporaOverviewData =>
  buildCorporaOverviewProjection(loadNotesData());
