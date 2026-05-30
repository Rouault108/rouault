export interface SearchWorkerRequest {
  token: number;
  query: string;
  items: readonly SearchDialogItem[];
  matchFields: readonly SearchDialogMatchField[];
}

export interface SearchWorkerResponse {
  token: number;
  results: readonly SearchDialogItem[];
}

export interface HighlightPart {
  text: string;
  matched: boolean;
}

export type SearchDialogMatchField = 'title' | 'path' | 'keywords' | 'renderHref';

export type SearchDialogCloseReason =
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

export interface SearchDialogItem {
  id: string;
  title: string;
  renderHref: string;
  canonicalPathname: string;
  path?: string;
  keywords?: readonly string[];
}

export interface SearchDialogSearchContext {
  query: string;
  signal: AbortSignal;
  limit?: number;
  locale?: string;
}

export interface SearchDialogSearchError {
  code: string;
  message?: string;
  retryable?: boolean;
}

export interface SearchDialogSearchResult {
  items: readonly SearchDialogItem[];
  total?: number;
  isPartial?: boolean;
  error?: SearchDialogSearchError;
}

export type SearchDialogSearcher = (
  context: SearchDialogSearchContext,
) => Promise<SearchDialogSearchResult> | SearchDialogSearchResult;

export interface SearchDialogMessages {
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
