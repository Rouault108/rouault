import { syncAcceptedTocPosition } from './toc-source-session.js';
export type TocPositionSyncResult =
  | 'accepted'
  | 'skipped'
  | 'rejected-before'
  | 'rejected-after'
  | 'superseded';
export const syncTocAtReadingPosition = syncAcceptedTocPosition;
