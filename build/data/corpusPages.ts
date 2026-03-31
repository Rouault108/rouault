import { loadNotesData, type IntrinsicNote } from './notes.js';
import {
  buildCorpusNavigation,
  buildCorpusPageProjection,
  resolveCurrentCorpusKey,
  type CorpusNavigationItem,
  type CorpusPageEntry,
  type CorpusPageNoteSummary,
} from '../../build/projections/corpus-page-projection.js';

export {
  buildCorpusNavigation,
  resolveCurrentCorpusKey,
  type CorpusNavigationItem,
  type CorpusPageEntry,
  type CorpusPageNoteSummary,
};

export type CorpusPageSourceNote = IntrinsicNote;

export function buildCorpusPagesData(notes: readonly CorpusPageSourceNote[]): CorpusPageEntry[] {
  return buildCorpusPageProjection(notes);
}

export const loadCorpusPagesData = (): CorpusPageEntry[] =>
  buildCorpusPageProjection(loadNotesData());
