import type {
  SearchDialogEventName,
  SearchReturnToReadingEventDetail,
  SearchReturnToReadingEventName,
} from '../../shared/search/search-types.js';

export const searchReturnToReadingEventName =
  'rouault-search:return-to-reading' satisfies SearchReturnToReadingEventName;

export const searchDialogEventNames = [
  'rouault-search:open',
  'rouault-search:close',
  searchReturnToReadingEventName,
] as const satisfies readonly SearchDialogEventName[];

export type { SearchDialogEventName, SearchReturnToReadingEventName };

export const createSearchReturnToReadingEvent = (
  detail: SearchReturnToReadingEventDetail,
): CustomEvent<SearchReturnToReadingEventDetail> =>
  new CustomEvent<SearchReturnToReadingEventDetail>(searchReturnToReadingEventName, {
    detail,
    bubbles: true,
    composed: true,
    cancelable: true,
  });
