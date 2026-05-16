import { detectUnsafeHref } from '../../shared/link/unsafe-href-detector.js';
import type { SiteUrlContext } from '../../shared/site/site-url-context.js';
import type { InternalDocumentRouteManifestState } from './internal-document-route-manifest-loader.js';
import type {
  HistoryMode,
  NavigationResult,
  NavigationValidationFailureReason,
} from './router-types.js';
import { RouterNotStartedError } from './router-types.js';
import { validateInternalDocumentNavigationRequest } from './validate-internal-document-navigation-request.js';

export interface AppRouterNavigationHost {
  readonly navigate: (
    url: string,
    options?: { readonly historyMode?: HistoryMode },
  ) => Promise<NavigationResult>;
}

export interface NavigateInternalDocumentOptions {
  readonly historyMode?: HistoryMode;
  readonly resolveRouter?: () => AppRouterNavigationHost | null;
  readonly siteUrlContext?: SiteUrlContext;
  readonly routeManifestState?: InternalDocumentRouteManifestState;
  readonly currentUrl?: string;
}

const createValidationFailureResult = (
  reason: NavigationValidationFailureReason,
  historyMode: HistoryMode,
): NavigationResult => ({
  kind: 'validation-failure',
  outcome: 'failed',
  reason,
  errorReason: reason,
  historyMode,
  stateOnly: false,
  committed: false,
  degraded: false,
  issues: [],
  source: 'none',
  renderedKind: null,
});

const createNotStartedResult = (historyMode: HistoryMode): NavigationResult => ({
  kind: 'lifecycle-failure',
  outcome: 'failed',
  reason: 'not-started',
  errorReason: 'not-started',
  historyMode,
  stateOnly: false,
  committed: false,
  degraded: false,
  issues: [],
  source: 'none',
  renderedKind: null,
  error: new RouterNotStartedError('app-router が見つかりません。'),
});

const defaultResolveRouter = (): AppRouterNavigationHost | null =>
  document.querySelector<HTMLElement & AppRouterNavigationHost>('app-router');

const defaultCurrentUrl = (siteUrlContext: SiteUrlContext): string => {
  if (typeof document !== 'undefined' && document.location !== undefined) {
    return document.location.href;
  }

  return `${siteUrlContext.siteOrigin}${siteUrlContext.basePath || '/'}`;
};

export const navigateInternalDocument = async (
  url: string,
  options: NavigateInternalDocumentOptions = {},
): Promise<NavigationResult> => {
  const historyMode = options.historyMode ?? 'push';
  const router = (options.resolveRouter ?? defaultResolveRouter)();

  if (router !== null) {
    return router.navigate(url, { historyMode });
  }

  const unsafe = detectUnsafeHref(url);
  if (!unsafe.ok) {
    return createValidationFailureResult('disallowed-url', historyMode);
  }

  if (options.siteUrlContext !== undefined && options.routeManifestState !== undefined) {
    const validation = validateInternalDocumentNavigationRequest({
      requestedUrl: url,
      currentUrl: options.currentUrl ?? defaultCurrentUrl(options.siteUrlContext),
      siteUrlContext: options.siteUrlContext,
      routeManifestState: options.routeManifestState,
    });

    if (!validation.ok) {
      return createValidationFailureResult(validation.reason, historyMode);
    }
  }

  return createNotStartedResult(historyMode);
};
