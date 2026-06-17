import {
  Router,
  type RouterDiagnosticPayload,
  RouterNotStartedError,
  type ContentUpdateAdapter,
  type NavigationResult,
  type RouterRuntimeUrlDependencies,
  type HistoryMode,
} from '../../router/router.js';
import type { InternalDocumentRouteManifestState } from '../../router/internal-document-route-manifest-loader.js';
import { detectUnsafeHref } from '../../../shared/link/unsafe-href-detector.js';
import { isPathnameInsideBasePath } from '../../../shared/site/site-url-context.js';
import {
  createRouterContentHtml,
  type RouterContentHtml,
  unwrapRouterContentHtml,
} from '../../router/router-content-html.js';
import {
  promoteDeclarativeShadowRoots,
  replaceElementChildrenFromHtml,
} from '../../router/declarative-shadow-dom.js';
import {
  APP_ROUTER_ANNOUNCEMENT_ARIA_ATOMIC,
  APP_ROUTER_ANNOUNCEMENT_ARIA_LIVE,
  APP_ROUTER_ANNOUNCEMENT_ATTRIBUTE,
  APP_ROUTER_ANNOUNCEMENT_CLASS_NAME,
  APP_ROUTER_ANNOUNCEMENT_SELECTOR,
} from '../../../shared/app-router/app-router-announcement-contract.js';
import {
  MAIN_CONTENT_ID,
  MAIN_CONTENT_SELECTOR,
} from '../../../shared/navigation/main-landmark-contract.js';
import { registerTabsUrlSyncStrategy } from '../ui/tabs/tabs-url-sync-strategy.js';
import { AppRouterPostRenderController } from './controllers/app-router-post-render-controller.js';
import { PrimaryTabNavigationPolicy } from './navigation/primary-tab-navigation-policy.js';
import { primaryTabTabsUrlSyncStrategy } from './navigation/primary-tab-url-state.js';
import { createAppShellAdapter } from './shell/app-shell-adapter.js';

export interface AppRouterContentDomReplacedDetail {
  contentRoot: HTMLElement;
}

export interface AppRouterNavigationCommittedDetail {
  contentRoot: HTMLElement;
  result: NavigationResult;
}

export interface AppRouterRouterDiagnosticDetail {
  diagnostic: RouterDiagnosticPayload;
}

export type AppRouterRuntimeInitializationState = 'not-initialized' | 'initialized' | 'failed';

export class AppRouterRuntimeInitializationError extends Error {
  override readonly name = 'AppRouterRuntimeInitializationError';

  constructor(message = 'AppRouter runtime は二重初期化できません。') {
    super(message);
  }
}

type AppRouterRuntimeFailureBootstrap =
  | {
      readonly reason: 'route-manifest-invalid';
      readonly siteUrlContext?: RouterRuntimeUrlDependencies['siteUrlContext'];
      readonly routeManifestState?: Extract<
        InternalDocumentRouteManifestState,
        { readonly status: 'invalid' }
      >;
    }
  | {
      readonly siteUrlContext: RouterRuntimeUrlDependencies['siteUrlContext'];
      readonly routeManifestState: Extract<
        InternalDocumentRouteManifestState,
        { readonly status: 'unavailable' | 'stale' }
      >;
    };

const createNavigationFailureResult = (
  reason:
    | 'not-started'
    | 'disallowed-url'
    | 'route-manifest-unavailable'
    | 'route-manifest-invalid'
    | 'route-manifest-stale',
  historyMode: HistoryMode,
): NavigationResult => {
  if (reason === 'not-started') {
    return {
      kind: 'lifecycle-failure',
      outcome: 'failed',
      reason: 'not-started',
      historyMode,
      stateOnly: false,
      committed: false,
      degraded: false,
      issues: [],
      source: 'none',
      renderedKind: null,
      error: new RouterNotStartedError('app-router が未初期化です。'),
      errorReason: 'not-started',
    };
  }

  return {
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
  };
};

registerTabsUrlSyncStrategy(primaryTabTabsUrlSyncStrategy);

/**
 * `app-router` は Rouault の document-first 契約を保持する light DOM host です。
 * SSR 初期本文と遷移後本文の双方を `main#main-content` に集約し、本文境界を増やしません。
 */
export class AppRouter extends HTMLElement {
  private _serverContent: RouterContentHtml | null = null;
  private _currentContent: RouterContentHtml = createRouterContentHtml('');
  private _router: Router | null = null;
  private _runtimeFailureReason:
    | 'route-manifest-unavailable'
    | 'route-manifest-invalid'
    | 'route-manifest-stale'
    | null = null;
  private _runtimeFailureSiteUrlContext: RouterRuntimeUrlDependencies['siteUrlContext'] | null =
    null;
  private _bootstrapped = false;
  private _runtimeInitializationState: AppRouterRuntimeInitializationState = 'not-initialized';
  private _isNavigating = false;
  private readonly _postRenderController: AppRouterPostRenderController;
  private _resolveReady: (() => void) | null = null;
  private _readyResolved = false;

  readonly ready: Promise<void>;

  constructor() {
    super();

    this._postRenderController = new AppRouterPostRenderController((text) => {
      this._syncAnnouncement(text);
    });

    this.ready = new Promise<void>((resolve) => {
      this._resolveReady = resolve;
    });
  }

  get serverContent(): RouterContentHtml | null {
    return this._serverContent;
  }

  set serverContent(value: RouterContentHtml | null) {
    this._serverContent = value;
  }

  /**
   * hydration 後に router の公開 API を安全に利用できる時点まで待機します。
   */
  whenReady(): Promise<void> {
    return this.ready;
  }

  /**
   * 現在の本文 root を返します。
   * Rouault では SSR 初期表示と遷移後更新の双方で `main#main-content` を唯一の更新先に固定します。
   */
  getContentRoot(): HTMLElement | null {
    return this.querySelector<HTMLElement>(MAIN_CONTENT_SELECTOR);
  }

  connectedCallback(): void {
    const existingContentRoot = this._findExistingContentRoot();
    const contentRoot = this._ensureContentRoot(existingContentRoot);
    const isInitialBoot = !this._bootstrapped;

    if (isInitialBoot) {
      this._bootstrapped = true;
      this._adoptInitialContent(contentRoot);
    } else {
      this._ensureAnnouncementRegion();
      this._syncBusyState(this._isNavigating);
    }
  }

  initializeRuntime(urlDependencies: RouterRuntimeUrlDependencies): void {
    if (
      this._runtimeInitializationState !== 'not-initialized' ||
      this._router ||
      this._runtimeFailureReason !== null
    ) {
      throw new AppRouterRuntimeInitializationError();
    }

    const router = new Router(this, urlDependencies, {
      skipInitialNavigation: true,
      contentAdapter: this._createContentAdapter(),
      postCommitController: this._postRenderController.createPostCommitController(this),
      shellAdapter: createAppShellAdapter(),
      urlStateNavigationPolicy: new PrimaryTabNavigationPolicy(),
    });

    router.on('navigation:busy-change', ({ isNavigating }) => {
      this._isNavigating = isNavigating;
      this._syncBusyState(isNavigating);
    });

    router.on('after:navigate', (result) => {
      this._dispatchNavigationCommitted(result);
    });

    router.on('diagnostic', (diagnostic) => {
      this._dispatchRouterDiagnostic(diagnostic);
    });

    this._runtimeInitializationState = 'initialized';
    this._runtimeFailureReason = null;
    this._router = router;
    void router.start();
    this._postRenderController.restoreInitialScrollImmediately(window.location.href);
    void this._postRenderController.restoreInitialScroll();
    this._markReady();
  }

  initializeRuntimeFailure(bootstrap: AppRouterRuntimeFailureBootstrap): void {
    if (
      this._runtimeInitializationState !== 'not-initialized' ||
      this._router ||
      this._runtimeFailureReason !== null
    ) {
      throw new AppRouterRuntimeInitializationError();
    }
    this._runtimeInitializationState = 'failed';
    this._router = null;
    this._runtimeFailureReason =
      'reason' in bootstrap ? bootstrap.reason : bootstrap.routeManifestState.reason;
    this._runtimeFailureSiteUrlContext = bootstrap.siteUrlContext ?? null;
    this._markReady();
  }

  disconnectedCallback(): void {
    this._router?.destroy();
    this._router = null;
    this._isNavigating = false;
    this._postRenderController.dispose();
  }

  async navigate(
    url: string,
    options: { readonly historyMode?: HistoryMode } = {},
  ): Promise<NavigationResult> {
    const historyMode = options.historyMode ?? 'push';
    const router = this._router;
    if (!router) {
      const unsafe = detectUnsafeHref(url);
      if (!unsafe.ok) {
        return createNavigationFailureResult('disallowed-url', historyMode);
      }

      const failureContext = this._runtimeFailureSiteUrlContext;
      if (failureContext !== null) {
        try {
          const parsed = new URL(url, `${failureContext.siteOrigin}/`);
          if (
            (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') ||
            parsed.origin !== failureContext.siteOrigin ||
            !isPathnameInsideBasePath(parsed.pathname, failureContext.basePath)
          ) {
            return createNavigationFailureResult('disallowed-url', historyMode);
          }
        } catch {
          return createNavigationFailureResult('disallowed-url', historyMode);
        }
      }

      return createNavigationFailureResult(
        this._runtimeFailureReason ?? 'not-started',
        historyMode,
      );
    }

    return router.navigate({
      url,
      historyMode,
    });
  }

  private _markReady(): void {
    if (this._readyResolved) {
      return;
    }

    this._readyResolved = true;
    this._resolveReady?.();
    this._resolveReady = null;
  }

  private _createContentAdapter(): ContentUpdateAdapter {
    if (!this._bootstrapped) {
      throw new Error('SSR 初期化前に content adapter が生成されました。');
    }

    return {
      prepare: ({ html }) => {
        const previousContent = this._currentContent;
        const nextContent = createRouterContentHtml(html);

        return {
          commit: () => {
            this._currentContent = nextContent;
            this._replaceContent(nextContent, { dispatchContentDomReplacedEvent: true });
          },
          rollback: () => {
            this._currentContent = previousContent;
            this._replaceContent(previousContent, { dispatchContentDomReplacedEvent: true });
          },
        };
      },
    };
  }

  private _findExistingContentRoot(): HTMLElement | null {
    return this.getContentRoot();
  }

  private _ensureContentRoot(existingRoot: HTMLElement | null): HTMLElement {
    const contentRoot = existingRoot ?? this.ownerDocument.createElement('main');

    if (!contentRoot.isConnected) {
      this.append(contentRoot);
    }

    contentRoot.id = MAIN_CONTENT_ID;
    contentRoot.tabIndex = -1;
    return contentRoot;
  }

  private _adoptInitialContent(contentRoot: HTMLElement): void {
    promoteDeclarativeShadowRoots(contentRoot);

    this._currentContent = createRouterContentHtml(contentRoot.innerHTML);

    this._ensureAnnouncementRegion();
    this._syncBusyState(false);
  }

  private _ensureAnnouncementRegion(): HTMLElement {
    const existingRegion = this.querySelector<HTMLElement>(APP_ROUTER_ANNOUNCEMENT_SELECTOR);
    if (existingRegion instanceof HTMLElement) {
      existingRegion.setAttribute('aria-live', APP_ROUTER_ANNOUNCEMENT_ARIA_LIVE);
      existingRegion.setAttribute('aria-atomic', APP_ROUTER_ANNOUNCEMENT_ARIA_ATOMIC);
      existingRegion.classList.add(APP_ROUTER_ANNOUNCEMENT_CLASS_NAME);
      return existingRegion;
    }

    const region = this.ownerDocument.createElement('div');
    region.setAttribute(APP_ROUTER_ANNOUNCEMENT_ATTRIBUTE, '');
    region.setAttribute('aria-live', APP_ROUTER_ANNOUNCEMENT_ARIA_LIVE);
    region.setAttribute('aria-atomic', APP_ROUTER_ANNOUNCEMENT_ARIA_ATOMIC);
    region.className = APP_ROUTER_ANNOUNCEMENT_CLASS_NAME;
    this.prepend(region);
    return region;
  }

  private _replaceContent(
    content: RouterContentHtml,
    options: { dispatchContentDomReplacedEvent: boolean },
  ): void {
    const contentRoot = this._ensureContentRoot(this._findExistingContentRoot());
    replaceElementChildrenFromHtml(
      contentRoot,
      unwrapRouterContentHtml(content),
      contentRoot.ownerDocument,
    );

    if (options.dispatchContentDomReplacedEvent) {
      this._dispatchContentDomReplaced(contentRoot);
    }
  }

  private _syncAnnouncement(text: string): void {
    const region = this._ensureAnnouncementRegion();
    region.textContent = text;
  }

  private _syncBusyState(isNavigating: boolean): void {
    const main = this._ensureContentRoot(this._findExistingContentRoot());

    if (isNavigating) {
      main.setAttribute('aria-busy', 'true');
      return;
    }

    main.removeAttribute('aria-busy');
  }

  private _dispatchContentDomReplaced(contentRoot: HTMLElement): void {
    this.dispatchEvent(
      new CustomEvent<AppRouterContentDomReplacedDetail>('app-router:content-dom-replaced', {
        detail: { contentRoot },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _dispatchNavigationCommitted(result: NavigationResult): void {
    if (
      result.outcome !== 'completed' ||
      !result.committed ||
      result.stateOnly ||
      result.renderedKind === null
    ) {
      return;
    }

    const contentRoot = this.getContentRoot();
    if (!(contentRoot instanceof HTMLElement)) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent<AppRouterNavigationCommittedDetail>('app-router:navigation-committed', {
        detail: {
          contentRoot,
          result,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _dispatchRouterDiagnostic(diagnostic: RouterDiagnosticPayload): void {
    this.dispatchEvent(
      new CustomEvent<AppRouterRouterDiagnosticDetail>('app-router:router-diagnostic', {
        detail: { diagnostic },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'app-router': AppRouter;
  }
}

if (!customElements.get('app-router')) {
  customElements.define('app-router', AppRouter);
}
