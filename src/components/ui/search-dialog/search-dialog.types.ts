export interface SearchWorkerRequest {
  token: number;
  query: string;
  items: readonly UiSearchDialogItem[];
  matchFields: readonly UiSearchDialogMatchField[];
}

export interface SearchWorkerResponse {
  token: number;
  results: readonly UiSearchDialogItem[];
}

export interface HighlightPart {
  text: string;
  matched: boolean;
}

export type UiSearchDialogMatchField = 'title' | 'path' | 'keywords' | 'url';

export type UiSearchDialogCloseReason =
  | 'selection'
  | 'escape'
  | 'backdrop'
  | 'close-button'
  | 'programmatic';

export interface VisibleRange {
  start: number;
  end: number;
  topSpacer: number;
  bottomSpacer: number;
}

export interface UiSearchDialogItem {
  id: string;
  title: string;
  url: string;
  canonicalUrl?: string;
  path?: string;
  keywords?: readonly string[];
}

export interface UiSearchDialogOpenedDetail {
  trigger: HTMLElement | null;
}

export interface UiSearchDialogClosedDetail {
  reason: UiSearchDialogCloseReason;
}

export interface UiSearchDialogOpenRequestedDetail {
  trigger: HTMLElement | null;
}

export interface UiSearchDialogCloseRequestedDetail {
  reason: UiSearchDialogCloseReason;
}

export interface UiSearchDialogQueryChangedDetail {
  query: string;
}

export interface UiSearchDialogSelectedDetail {
  id: string;
  url: string;
  title: string;
  query: string;
  index: number;
  item: UiSearchDialogItem;
  selectionMethod: 'keyboard' | 'pointer';
}

export interface UiSearchDialogSearchContext {
  query: string;
  signal: AbortSignal;
  limit?: number;
  locale?: string;
}

export interface UiSearchDialogSearchError {
  code: string;
  message?: string;
  retryable?: boolean;
}

export interface UiSearchDialogSearchResult {
  items: readonly UiSearchDialogItem[];
  total?: number;
  isPartial?: boolean;
  error?: UiSearchDialogSearchError;
}

export type UiSearchDialogSearcher = (
  context: UiSearchDialogSearchContext,
) => Promise<UiSearchDialogSearchResult> | UiSearchDialogSearchResult;

export interface UiSearchDialogMessages {
  dialogLabel: string;
  closeLabel: string;
  clearLabel: string;
  loadingHeading: string;
  loadingDescription: string;
  emptyHeading: string;
  emptyDescription: string;
  errorHeading: string;
  errorDescription: string;
  keyboardHint: string;
}
