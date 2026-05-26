import type { UiSearchDialogCloseReason, UiSearchDialogItem } from './search-dialog-types.js';

export const searchDialogEventNames = [
  'search-dialog:open-request',
  'search-dialog:close-request',
  'search-dialog:query-change',
  'search-dialog:loading-change',
  'search-dialog:results-change',
  'search-dialog:selected',
  'search-dialog:unavailable',
  'search-dialog:error',
  'search-dialog:focus-return',
] as const;

export type SearchDialogEventName = (typeof searchDialogEventNames)[number];

export interface SearchDialogOpenRequestDetail {
  readonly trigger: HTMLElement | null;
  readonly modality?: 'keyboard' | 'pointer' | undefined;
}

export interface SearchDialogCloseRequestDetail {
  readonly reason: UiSearchDialogCloseReason;
}

export interface SearchDialogQueryChangeDetail {
  readonly query: string;
}

export interface SearchDialogLoadingChangeDetail {
  readonly loading: boolean;
}

export interface SearchDialogResultsChangeDetail {
  readonly query: string;
  readonly items: readonly UiSearchDialogItem[];
}

export interface SearchDialogSelectedDetail {
  readonly id: string;
  readonly renderHref: string;
  readonly canonicalPathname: string;
  readonly title: string;
  readonly query: string;
  readonly index: number;
  readonly item: UiSearchDialogItem;
  readonly selectionMethod: 'keyboard' | 'pointer';
}

export interface SearchDialogUnavailableDetail {
  readonly message: string;
}

export interface SearchDialogErrorDetail {
  readonly message: string;
}

export interface SearchDialogFocusReturnDetail {
  readonly reason: UiSearchDialogCloseReason;
}

export interface SearchDialogEventDetailMap {
  readonly 'search-dialog:open-request': SearchDialogOpenRequestDetail;
  readonly 'search-dialog:close-request': SearchDialogCloseRequestDetail;
  readonly 'search-dialog:query-change': SearchDialogQueryChangeDetail;
  readonly 'search-dialog:loading-change': SearchDialogLoadingChangeDetail;
  readonly 'search-dialog:results-change': SearchDialogResultsChangeDetail;
  readonly 'search-dialog:selected': SearchDialogSelectedDetail;
  readonly 'search-dialog:unavailable': SearchDialogUnavailableDetail;
  readonly 'search-dialog:error': SearchDialogErrorDetail;
  readonly 'search-dialog:focus-return': SearchDialogFocusReturnDetail;
}

export const createSearchDialogEvent = <Name extends SearchDialogEventName>(
  name: Name,
  detail: SearchDialogEventDetailMap[Name],
): CustomEvent<SearchDialogEventDetailMap[Name]> =>
  new CustomEvent<SearchDialogEventDetailMap[Name]>(name, {
    detail,
    bubbles: false,
    composed: false,
    cancelable: false,
  });

export const dispatchSearchDialogEvent = <Name extends SearchDialogEventName>(
  target: EventTarget,
  name: Name,
  detail: SearchDialogEventDetailMap[Name],
): boolean => target.dispatchEvent(createSearchDialogEvent(name, detail));
