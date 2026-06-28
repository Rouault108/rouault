import type { DocumentRenderSnapshot } from '../../shared/navigation/document-render-snapshot.js';
import type { HydrationPlan } from '../../shared/navigation/hydration-plan.js';
import type { NavigationEnvelope } from '../../shared/navigation/navigation-envelope.js';
import type {
  AbsentRuntimeSidebarShellProjection,
  NavigationShellSnapshot,
  PresentSidebarShellProjection,
  RuntimeSidebarShellSnapshot as SharedRuntimeSidebarShellSnapshot,
} from '../../shared/navigation/navigation-shell-snapshot.js';
import type { SiteUrlContext } from '../../shared/site/site-url-context.js';
import type { LoadedInternalDocumentRouteManifestState } from './internal-document-route-manifest-loader.js';
import type { RouterDiagnosticPayload } from './router-diagnostics.js';
import type { InternalDocumentNormalizedUrl } from './internal-document-normalized-url.js';

export type NavigationValidationFailureReason =
  | 'disallowed-url'
  | 'route-manifest-unavailable'
  | 'route-manifest-invalid'
  | 'route-manifest-stale';

export type NavigationLifecycleFailureReason = 'destroyed' | 'not-started';

export type NavigationLoadFailureReason =
  | 'auth'
  | 'forbidden'
  | 'timeout'
  | 'network'
  | 'server'
  | 'service-unavailable'
  | 'unexpected';

export type DocumentNavigationFallbackReason =
  | 'fetch-build-id-mismatch'
  | 'fetch-schema-version-mismatch'
  | 'fetch-navigation-envelope-invalid'
  | 'fetch-navigation-envelope-http-status'
  | 'current-build-id-invalid';

export interface RouterRuntimeUrlDependencies {
  readonly siteUrlContext: SiteUrlContext;
  readonly isInternalDocumentPathname: (pathname: string) => boolean;
  readonly isInternalResourcePathname?: (pathname: string) => boolean;
  readonly routeManifestState: LoadedInternalDocumentRouteManifestState;
}

export type HistoryMode = 'none' | 'push' | 'replace';

export type InternalDocumentRoutePresence = 'known-route' | 'missing-route-candidate';

export type NavigationOutcome = 'completed' | 'cancelled' | 'superseded' | 'failed';

export type NavigationErrorReason =
  | NavigationValidationFailureReason
  | NavigationLifecycleFailureReason
  | NavigationLoadFailureReason;

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

export interface NavigationResultMetadata {
  readonly stateOnly: boolean;
  readonly committed: boolean;
  degraded: boolean;
  readonly issues: NavigationIssue[];
  readonly source:
    | 'document-route'
    | 'fetch'
    | 'error-fallback'
    | 'document-navigation-fallback'
    | 'state-only'
    | 'none';
  readonly renderedKind: 'page' | 'not-found' | 'error' | null;
}

export interface NavigationCompletedResult extends NavigationResultMetadata {
  readonly kind: 'completed';
  readonly outcome: 'completed';
  readonly historyMode: HistoryMode;
  readonly requestedUrl?: never;
  readonly normalizedUrl: InternalDocumentNormalizedUrl;
  readonly error?: Error | undefined;
  readonly errorReason?: NavigationLoadFailureReason | undefined;
}

export interface NavigationCancelledResult extends NavigationResultMetadata {
  readonly kind: 'cancelled';
  readonly outcome: 'cancelled';
  readonly reason: 'cancelled';
  readonly historyMode: HistoryMode;
  readonly requestedUrl?: never;
  readonly normalizedUrl: InternalDocumentNormalizedUrl;
  readonly error?: undefined;
  readonly errorReason?: undefined;
}

export interface NavigationSupersededResult extends NavigationResultMetadata {
  readonly kind: 'superseded';
  readonly outcome: 'superseded';
  readonly reason: 'superseded';
  readonly historyMode: HistoryMode;
  readonly requestedUrl?: never;
  readonly normalizedUrl: InternalDocumentNormalizedUrl;
  readonly error?: undefined;
  readonly errorReason?: undefined;
}

export interface NavigationValidationFailureResult {
  readonly kind: 'validation-failure';
  readonly outcome: 'failed';
  readonly reason: NavigationValidationFailureReason;
  readonly errorReason: NavigationValidationFailureReason;
  readonly historyMode: HistoryMode;
  readonly stateOnly: false;
  readonly committed: false;
  degraded: false;
  readonly issues: NavigationIssue[];
  readonly source: 'none';
  readonly renderedKind: null;
  readonly normalizedUrl?: never;
  readonly requestedUrl?: never;
  readonly sanitizedRequestRef?: string;
  readonly error?: undefined;
}

export interface NavigationLifecycleFailureResult {
  readonly kind: 'lifecycle-failure';
  readonly outcome: 'failed';
  readonly reason: NavigationLifecycleFailureReason;
  readonly errorReason: NavigationLifecycleFailureReason;
  readonly historyMode: HistoryMode;
  readonly stateOnly: false;
  readonly committed: false;
  degraded: false;
  readonly issues: NavigationIssue[];
  readonly source: 'none';
  readonly renderedKind: null;
  readonly normalizedUrl?: never;
  readonly requestedUrl?: never;
  readonly error: Error;
}

export interface NavigationLoadFailureResult extends NavigationResultMetadata {
  readonly kind: 'load-failure';
  readonly outcome: 'failed';
  readonly reason: NavigationLoadFailureReason;
  readonly historyMode: HistoryMode;
  readonly normalizedUrl: InternalDocumentNormalizedUrl;
  readonly requestedUrl?: never;
  readonly error?: Error | undefined;
  readonly errorReason: NavigationLoadFailureReason;
}

export interface DocumentNavigationFallbackResult extends NavigationResultMetadata {
  readonly kind: 'document-navigation-fallback';
  readonly outcome: 'completed';
  readonly reason: DocumentNavigationFallbackReason;
  readonly historyMode: HistoryMode;
  readonly normalizedUrl: InternalDocumentNormalizedUrl;
  readonly requestedUrl?: never;
  readonly error?: Error | undefined;
  readonly errorReason?: undefined;
  readonly source: 'document-navigation-fallback';
  readonly renderedKind: null;
  readonly stateOnly: false;
  readonly committed: false;
}

export type NavigationResult =
  | NavigationCompletedResult
  | NavigationCancelledResult
  | NavigationSupersededResult
  | NavigationValidationFailureResult
  | NavigationLifecycleFailureResult
  | NavigationLoadFailureResult
  | DocumentNavigationFallbackResult;

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

export type PayloadDocumentShellSnapshot = NavigationShellSnapshot;
export type StrictLoadedNavigationEnvelope = NavigationEnvelope & {
  buildId: string;
  generatedAt: string;
};
export type RuntimeSidebarShellSnapshot = SharedRuntimeSidebarShellSnapshot;
export interface RuntimeDocumentShellSnapshot {
  headerHtml: string;
  sidebar: RuntimeSidebarShellSnapshot | null;
}

export type { PresentSidebarShellProjection, AbsentRuntimeSidebarShellProjection };

export interface ShellUpdatePayload {
  shell: PayloadDocumentShellSnapshot;
  navigationUrl: string;
  shellCommitId: number;
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
    normalizedUrl: InternalDocumentNormalizedUrl;
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

export type LoadDocumentSource =
  | 'document-route'
  | 'fetch'
  | 'error-fallback'
  | 'document-navigation-fallback';

export interface LoadedEnvelopeDocumentResult {
  envelope: StrictLoadedNavigationEnvelope;
  source: 'document-route' | 'fetch';
}

export interface ErrorFallbackLoadDocumentResult {
  envelope: NavigationEnvelope;
  source: 'error-fallback';
  error?: Error | undefined;
  errorReason?: NavigationLoadFailureReason | undefined;
}

export interface DocumentNavigationFallbackLoadDocumentResult {
  source: 'document-navigation-fallback';
  reason: DocumentNavigationFallbackReason;
  error: Error;
}

export type LoadDocumentResult =
  | LoadedEnvelopeDocumentResult
  | ErrorFallbackLoadDocumentResult
  | DocumentNavigationFallbackLoadDocumentResult;

export interface DocumentRouteContext {
  url: string;
  normalizedUrl: InternalDocumentNormalizedUrl;
  pathname: string;
  searchParams: URLSearchParams;
  hash: string;
  signal: AbortSignal;
  currentBuildId: string;
  currentGeneratedAt: string | null;
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
  normalizedUrl: InternalDocumentNormalizedUrl;
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
