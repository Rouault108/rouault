export type HistoryMode = 'none' | 'push' | 'replace';

export type NavigationOutcome = 'completed' | 'cancelled' | 'superseded' | 'failed';

export type NavigationErrorReason =
  | 'auth'
  | 'forbidden'
  | 'timeout'
  | 'network'
  | 'server'
  | 'service-unavailable'
  | 'unexpected'
  | 'destroyed'
  | 'not-started';

export interface NavigationIssue {
  code: 'post-commit-failed';
  error?: Error | undefined;
}

export interface NavigateRequest {
  url: string;
  historyMode?: HistoryMode;
  state?: Record<string, unknown> | undefined;
}

export interface NavigationResult {
  outcome: NavigationOutcome;
  requestedUrl: string;
  normalizedUrl: string;
  historyMode: HistoryMode;
  stateOnly: boolean;
  committed: boolean;
  degraded: boolean;
  issues: NavigationIssue[];
  source: 'document-route' | 'fetch' | 'state-only' | 'none';
  renderedKind: 'page' | 'not-found' | 'error' | null;
  error?: Error | undefined;
  errorReason?: NavigationErrorReason | undefined;
}

export interface ContentUpdatePayload {
  html: string;
  renderedKind: 'page' | 'not-found' | 'error';
  navigationUrl: string;
}

export interface PreparedContentUpdate {
  commit(): void | Promise<void>;
  rollback(): void | Promise<void>;
}

export interface ContentUpdateAdapter {
  prepare(update: ContentUpdatePayload): PreparedContentUpdate | Promise<PreparedContentUpdate>;
}

export interface HeaderShellSnapshot {
  breadcrumbs: {
    label: string;
    href?: string;
  }[];
  corpora: {
    key: string;
    label: string;
    href: string;
  }[];
  currentCorpusKey: string;
  noteLayout: boolean;
  sidebarEnabled: boolean;
}

export interface SidebarShellSnapshot {
  present: boolean;
  sidebarId: string;
  stateScopeId: string;
  selectedId: string | null;
  heading: string;
  fixedBreakpoint: number;
  itemsJson: string;
  presentation: 'auto' | 'fixed' | 'overlay';
}

export interface DocumentShellSnapshot {
  header: HeaderShellSnapshot;
  sidebar: SidebarShellSnapshot | null;
}

export interface ShellUpdatePayload {
  shell: DocumentShellSnapshot | null;
  navigationUrl: string;
}

export interface PreparedShellUpdate {
  commit(): void | Promise<void>;
  rollback(): void | Promise<void>;
}

export interface ShellAdapter {
  extract?(
    document: Document,
  ): DocumentShellSnapshot | null | Promise<DocumentShellSnapshot | null>;
  prepare?(update: ShellUpdatePayload): PreparedShellUpdate | Promise<PreparedShellUpdate>;
}

export type UrlStateNavigationDecision =
  | { kind: 'full' }
  | {
      kind: 'state-only';
      scrollToHash?: boolean;
    };

export interface UrlStateNavigationPolicy {
  evaluate(context: {
    currentUrl: string;
    requestedUrl: string;
    normalizedUrl: string;
    historyMode: HistoryMode;
    outlet: HTMLElement;
  }): UrlStateNavigationDecision | Promise<UrlStateNavigationDecision>;
}

export interface PostCommitController {
  run(context: {
    outlet: HTMLElement;
    previousUrl: string;
    url: string;
    isInitial: boolean;
    stateOnly: boolean;
    renderedKind: 'page' | 'not-found' | 'error' | null;
  }): void | Promise<void>;
}

export interface RouterOptions {
  contentAdapter?: ContentUpdateAdapter | undefined;
  shellAdapter?: ShellAdapter | undefined;
  urlStateNavigationPolicy?: UrlStateNavigationPolicy | undefined;
  postCommitController?: PostCommitController | undefined;
  skipInitialNavigation?: boolean | undefined;
  navigationTimeoutMs?: number | null | undefined;
}

export type LoadDocumentSource = 'document-route' | 'fetch';

export interface LoadDocumentResult {
  snapshot: DocumentSnapshot;
  source: LoadDocumentSource;
  error?: Error | undefined;
  errorReason?: Exclude<NavigationErrorReason, 'destroyed' | 'not-started'> | undefined;
}

export interface DocumentRouteContext {
  url: string;
  normalizedUrl: string;
  pathname: string;
  searchParams: URLSearchParams;
  hash: string;
  signal: AbortSignal;
}

export type ErrorSnapshotReason =
  | 'auth'
  | 'forbidden'
  | 'timeout'
  | 'network'
  | 'server'
  | 'service-unavailable'
  | 'unexpected';

export type DocumentSnapshot =
  | {
      kind: 'page';
      html: string;
      title: string;
      metaDescription: string | null;
      shell?: DocumentShellSnapshot | null | undefined;
      announcedTitle?: string | null | undefined;
    }
  | {
      kind: 'not-found';
      html: string;
      title: string;
      metaDescription: string;
      shell?: DocumentShellSnapshot | null | undefined;
      announcedTitle?: string | null | undefined;
    }
  | {
      kind: 'error';
      reason: ErrorSnapshotReason;
      statusCode?: number | undefined;
      html: string;
      title: string;
      metaDescription: string;
      shell?: DocumentShellSnapshot | null | undefined;
      announcedTitle?: string | null | undefined;
    };

export type RoutePattern = string | RegExp;

export type DocumentRouteHandler = (
  context: DocumentRouteContext,
) => DocumentSnapshot | Promise<DocumentSnapshot>;

export interface BeforeNavigateContext {
  currentUrl: string;
  requestedUrl: string;
  normalizedUrl: string;
  historyMode: HistoryMode;
}

export type BeforeNavigateHook = (
  context: BeforeNavigateContext,
) => true | false | undefined | Promise<true | false | undefined>;

export interface RouterEventMap {
  'navigation:busy-change': {
    isNavigating: boolean;
  };
  'content:load': {
    previousUrl: string | null;
    url: string;
    isInitial: boolean;
  };
  'after:navigate': NavigationResult;
  'ui-url-state-change': {
    previousUrl: string;
    url: string;
  };
  error: {
    error: Error;
    stage: 'before-navigate' | 'load' | 'commit' | 'post-commit';
  };
}

export class RouterOwnershipError extends Error {
  override name = 'RouterOwnershipError' as const;
}

export class RouterDestroyedError extends Error {
  override name = 'RouterDestroyedError' as const;
}

export class RouterNotStartedError extends Error {
  override name = 'RouterNotStartedError' as const;
}
