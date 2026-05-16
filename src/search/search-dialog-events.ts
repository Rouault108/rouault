import type { SearchReturnToReadingEventName } from '../../shared/search/search-types.js';
import type { SearchCanonicalPathname, SearchRenderHref } from '../../shared/search/document-url.js';

export const searchReturnToReadingEventName =
  'rouault-search:return-to-reading' satisfies SearchReturnToReadingEventName;

export const searchDialogEventNames = [
  'rouault-search:open',
  'rouault-search:close',
  searchReturnToReadingEventName,
] as const;

export type SearchDialogEventName = (typeof searchDialogEventNames)[number];
export type { SearchReturnToReadingEventName };

export interface SearchDialogEventContract {
  readonly schemaVersion: 1;
}

export interface SearchReturnToReadingEventDetail extends SearchDialogEventContract {
  readonly eventName: SearchReturnToReadingEventName;
  readonly renderHref: string;
  readonly canonicalPathname: string;
  readonly title: string;
  readonly query: string;
  readonly selectionMethod: 'keyboard' | 'pointer';
}

export interface ValidatedSearchReturnToReadingEventDetail extends SearchDialogEventContract {
  readonly eventName: SearchReturnToReadingEventName;
  readonly renderHref: SearchRenderHref;
  readonly canonicalPathname: SearchCanonicalPathname;
  readonly title: string;
  readonly query: string;
  readonly selectionMethod: 'keyboard' | 'pointer';
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

export const readSearchReturnToReadingEventDetail = (
  value: unknown,
): SearchReturnToReadingEventDetail | null => {
  if (!isRecord(value)) {
    return null;
  }
  if (value['schemaVersion'] !== 1 || value['eventName'] !== searchReturnToReadingEventName) {
    return null;
  }
  const renderHref = value['renderHref'];
  const canonicalPathname = value['canonicalPathname'];
  const title = value['title'];
  const query = value['query'];
  const selectionMethod = value['selectionMethod'];
  if (
    typeof renderHref !== 'string' ||
    typeof canonicalPathname !== 'string' ||
    typeof title !== 'string' ||
    typeof query !== 'string' ||
    (selectionMethod !== 'keyboard' && selectionMethod !== 'pointer')
  ) {
    return null;
  }
  return {
    schemaVersion: 1,
    eventName: searchReturnToReadingEventName,
    renderHref,
    canonicalPathname,
    title,
    query,
    selectionMethod,
  };
};

export const createSearchReturnToReadingEvent = (
  detail: SearchReturnToReadingEventDetail,
): CustomEvent<SearchReturnToReadingEventDetail> =>
  new CustomEvent<SearchReturnToReadingEventDetail>(searchReturnToReadingEventName, {
    detail,
    bubbles: true,
    composed: true,
    cancelable: true,
  });
