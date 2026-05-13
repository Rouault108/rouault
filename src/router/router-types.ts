import type { DocumentRenderSnapshot } from '../../shared/navigation/document-render-snapshot.js';
import type { HydrationPlan } from '../../shared/navigation/hydration-plan.js';
import type { NavigationEnvelope } from '../../shared/navigation/navigation-envelope.js';
import type {
  AbsentRuntimeSidebarShellProjection,
  HeaderShellProjection,
  PresentSidebarShellProjection,
  RuntimeSidebarShellSnapshot as SharedRuntimeSidebarShellSnapshot,
  ShellProjectionSnapshot,
} from '../../shared/navigation/shell-projection.js';
import type { RouterDiagnosticPayload } from './router-diagnostics.js';

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
  diagnostic?: RouterDiagnosticPayload | undefined;
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
  source: 'document-route' | 'fetch' | 'error-fallback' | 'state-only' | 'none';
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

export type HeaderShellSnapshot = HeaderShellProjection;

export type PayloadDocumentShellSnapshot = ShellProjectionSnapshot;
export type StrictLoadedNavigationEnvelope = NavigationEnvelope & {
  buildId: string;
  generatedAt: string;
};
export type RuntimeSidebarShellSnapshot = SharedRuntimeSidebarShellSnapshot;
export interface RuntimeDocumentShellSnapshot {
  header: HeaderShellProjection;
  sidebar: RuntimeSidebarShellSnapshot | null;
}

/** @deprecated Payload shell snapshot. Use PayloadDocumentShellSnapshot. */
export type DocumentShellSnapshot = PayloadDocumentShellSnapshot;
/** @deprecated Runtime sidebar snapshot. Use RuntimeSidebarShellSnapshot. */
export type SidebarShellSnapshot = RuntimeSidebarShellSnapshot;

export type { PresentSidebarShellProjection, AbsentRuntimeSidebarShellProjection };

export interface ShellUpdatePayload {
  shell: PayloadDocumentShellSnapshot | null;
  navigationUrl: string;
}

export interface PreparedShellUpdate {
  commit(): void | Promise<void>;
  rollback(): void | Promise<void>;
}

export interface ShellAdapter {
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

export type LoadDocumentSource = 'document-route' | 'fetch' | 'error-fallback';

export type LoadDocumentResult =
  | {
      envelope: StrictLoadedNavigationEnvelope;
      source: 'document-route' | 'fetch';
    }
  | {
      envelope: NavigationEnvelope;
      source: 'error-fallback';
      error?: Error | undefined;
      errorReason?: Exclude<NavigationErrorReason, 'destroyed' | 'not-started'> | undefined;
    };

export interface DocumentRouteContext {
  url: string;
  normalizedUrl: string;
  pathname: string;
  searchParams: URLSearchParams;
  hash: string;
  signal: AbortSignal;
  currentBuildId: string;
  currentGeneratedAt: string;
}

export type RouterDocumentRenderSnapshot = DocumentRenderSnapshot;

export type RouterHydrationPlan = HydrationPlan;

export type RoutePattern = string | RegExp;

export type DocumentRouteHandler = (
  context: DocumentRouteContext,
) => NavigationEnvelope | Promise<NavigationEnvelope>;

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
    diagnostic?: RouterDiagnosticPayload | undefined;
  };
  diagnostic: RouterDiagnosticPayload;
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
