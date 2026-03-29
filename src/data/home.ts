import { loadNotesData, type IntrinsicNote } from './notes.js';
import {
  buildHomePageProjection,
  type HomeNoteItem,
  type HomePageData,
} from './projections/home-page-projection.js';

export type { HomeNoteItem, HomePageData };

export type HomeSourceNote = IntrinsicNote;

export const buildHomeData = (notes: readonly HomeSourceNote[]): HomePageData =>
  buildHomePageProjection(notes);

export const loadHomeData = (): HomePageData => buildHomePageProjection(loadNotesData());
