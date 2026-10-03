export type UrlHistoryMode = 'none' | 'push' | 'replace';

export type TabsOrientation = 'horizontal' | 'vertical';
export type TabsUrlSource = 'hash' | 'query' | null;

export type TabsResolvedSource =
  | 'hash'
  | 'query'
  | 'selected-value'
  | 'default-selected-value'
  | 'current'
  | 'fallback';

export interface ResolveSelectionInput {
  selectedValue: string | null;
  defaultSelectedValue: string | null;
  currentActiveIndex: number;
  initialized: boolean;
  count: number;
  urlValue: string | null;
  urlSource: TabsUrlSource;
}

export interface ResolveSelectionResult {
  index: number;
  source: TabsResolvedSource;
  warning: string | null;
}

export interface TabsKeyNavigationInput {
  key: string;
  currentIndex: number;
  count: number;
  orientation: TabsOrientation;
}

export interface TabsKeyNavigationResult {
  kind: 'move-focus' | 'activate-focused' | 'none';
  nextIndex: number | null;
}

export interface UiTabChangeDetail {
  index: number;
  value: string | null;
  prevIndex: number;
  scopeId: string | null;
}
