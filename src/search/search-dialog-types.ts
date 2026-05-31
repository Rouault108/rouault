export interface HighlightPart {
  text: string;
  matched: boolean;
}

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
