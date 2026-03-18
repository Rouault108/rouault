export type EventCallback = (...args: unknown[]) => unknown;
export type RouteHandler = () => unknown;

export type HistoryMode = 'none' | 'push' | 'replace';

export interface NavigationRequest {
  url: string;
  historyMode: HistoryMode;
  state?: Record<string, unknown>;
}

export interface RouteDefinition {
  pattern: string | RegExp;
  handler: RouteHandler;
}

export interface PendingNavigation {
  request: NavigationRequest;
  resolve: () => void;
  reject: (reason?: unknown) => void;
}

export interface RouterOptions {
  /** コンテンツ更新コールバック（設定時は outlet.innerHTML を直接変更しない） */
  onContentUpdate?: (html: string) => void | Promise<void>;
  /** 初期ナビゲーションをスキップする（AppRouter が SSG コンテンツを保持するため） */
  skipInitialNavigation?: boolean;
  /** 外部で aria-live リージョンを管理する場合は true にする */
  skipAriaLiveRegion?: boolean;
}