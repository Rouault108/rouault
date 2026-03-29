import type { UrlHistoryMode } from '../../../lib/tabs/url-state.js';

export type { UrlHistoryMode };

export type TabsOrientation = 'horizontal' | 'vertical';
export type TabsUrlSource = 'hash' | 'query' | null;

export type TabsResolvedSource =
  | 'hash'
  | 'query'
  | 'selected-value'
  | 'default-selected-value'
  | 'current'
  | 'fallback';

export type DevImportMeta = ImportMeta & {
  env?: {
    DEV?: boolean;
  };
};

export interface TabsSnapshot {
  tabs: HTMLElement[];
  panels: HTMLElement[];
  interactiveCount: number;
}

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

export interface ResolveAndCommitOptions {
  emitEvent?: boolean;
  historyMode?: UrlHistoryMode;
  normalizeUrl?: boolean;
}

export interface CommitActiveIndexOptions {
  emitEvent?: boolean;
  historyMode?: UrlHistoryMode;
}

let uidCounter = 0;

export function nextTabsUid(): number {
  uidCounter += 1;
  return uidCounter;
}
