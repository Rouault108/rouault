import { loadNotesData, type IntrinsicNote } from './notes.js';
import {
  buildTagPageProjection,
  type TagPageEntry,
  type TagPageNoteSummary,
} from './projections/tag-page-projection.js';

export type { TagPageEntry, TagPageNoteSummary };

export type TagPageSourceNote = IntrinsicNote;

export function buildTagPagesData(notes: readonly TagPageSourceNote[]): TagPageEntry[] {
  return buildTagPageProjection(notes);
}

export const loadTagPagesData = (): TagPageEntry[] => buildTagPageProjection(loadNotesData());
