export interface SearchWorkerRequest {
  token: number;
  query: string;
  items: readonly UiSearchDialogItem[];
}

export interface SearchWorkerResponse {
  token: number;
  results: readonly UiSearchDialogItem[];
}

export interface HighlightPart {
  text: string;
  matched: boolean;
}

export interface VisibleRange {
  start: number;
  end: number;
  topSpacer: number;
  bottomSpacer: number;
}

export interface UiSearchDialogItem {
  title: string;
  url: string;
  path?: string;
  keywords?: readonly string[];
}

export interface UiSearchDialogOpenedDetail {
  trigger: HTMLElement | null;
}

export interface UiSearchDialogSelectedDetail {
  url: string;
  title: string;
}

export type UiSearchDialogSearcher = (
  query: string,
) => Promise<readonly UiSearchDialogItem[]> | readonly UiSearchDialogItem[];
