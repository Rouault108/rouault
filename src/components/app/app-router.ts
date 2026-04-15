import {
  Router,
  RouterNotStartedError,
  type ContentUpdateAdapter,
  type NavigationResult,
} from '../../router/router.js';
import {
  createRouterContentHtml,
  type RouterContentHtml,
  unwrapRouterContentHtml,
} from '../../router/router-content-html.js';
import { replaceElementChildrenFromHtml } from '../../router/declarative-shadow-dom.js';
import {
  APP_ROUTER_ANNOUNCEMENT_ARIA_ATOMIC,
  APP_ROUTER_ANNOUNCEMENT_ARIA_LIVE,
  APP_ROUTER_ANNOUNCEMENT_ATTRIBUTE,
  APP_ROUTER_ANNOUNCEMENT_CLASS_NAME,
  APP_ROUTER_ANNOUNCEMENT_SELECTOR,
} from '../../../shared/app-router/app-router-announcement-contract.js';
import { MAIN_CONTENT_ID, MAIN_CONTENT_SELECTOR } from '../../../shared/navigation/main-landmark-contract.js';
import { registerTabsUrlSyncStrategy } from '../ui/tabs/tabs-url-sync-strategy.js';
import { AppRouterPostRenderController } from './controllers/app-router-post-render-controller.js';
import { PrimaryTabNavigationPolicy } from './navigation/primary-tab-navigation-policy.js';
import { primaryTabTabsUrlSyncStrategy } from './navigation/primary-tab-url-state.js';
import { createAppShellAdapter } from './shell/app-shell-adapter.js';

export interface AppRouterContentRenderedDetail {
  contentRoot: HTMLElement;
}

const createNotStartedResult = (url: string): NavigationResult => ({
  outcome: 'failed',
  requestedUrl: url,
  normalizedUrl: url,
  historyMode: 'push',
  stateOnly: false,
  committed: false,
  degraded: false,
  issues: [],
  source: 'none',
  renderedKind: null,
  error: new RouterNotStartedError('app-router が未初期化です。'),
  errorReason: 'not-started',
});

registerTabsUrlSyncStrategy(primaryTabTabsUrlSyncStrategy);

/**
 * `app-router` は Rouault の document-first 契約を保持する light DOM host です。
 * SSR 初期本文と遷移後本文の双方を `main#main-content` に集約し、本文境界を増やしません。
 */
export class AppRouter extends HTMLElement {
  private _serverContent: RouterContentHtml | null = null;
  private _pendingInitialContent: RouterContentHtml | null = null;
  private _currentContent: RouterContentHtml = createRouterContentHtml('');
  private _router: Router | null = null;
  private _bootstrapped = false;
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

    if (!this._bootstrapped) {
      this._pendingInitialContent = value;
      return;
    }

    if (value === null) {
      return;
    }

    this._pendingInitialContent = null;
    this._currentContent = value;
    this._applyContent(value, false);
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
    if (this._router) {
      this._markReady();
      return;
    }

    const existingContentRoot = this._findExistingContentRoot();
    const contentRoot = this._ensureContentRoot(existingContentRoot);
    const isInitialBoot = !this._bootstrapped;

    if (isInitialBoot) {
      this._bootstrapped = true;

      const initialContent =
        this._pendingInitialContent ??
        this._serverContent ??
        createRouterContentHtml(contentRoot.innerHTML);

      this._currentContent = initialContent;
      this._pendingInitialContent = null;

      this._ensureAnnouncementRegion();
      this._syncBusyState(false);
      this._applyContent(initialContent, false);
    } else {
      this._ensureAnnouncementRegion();
      this._syncBusyState(this._isNavigating);
    }

    const router = new Router(this, {
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

    this._router = router;

    void router.start();

    if (isInitialBoot) {
      void this._postRenderController.restoreInitialHashScroll();
    }

    this._markReady();
  }

  disconnectedCallback(): void {
    this._router?.destroy();
    this._router = null;
    this._isNavigating = false;
    this._postRenderController.dispose();
  }

  async navigate(url: string): Promise<NavigationResult> {
    const router = this._router;
    if (!router) {
      return createNotStartedResult(url);
    }

    return router.navigate({
      url,
      historyMode: 'push',
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
            this._applyContent(nextContent, true);
          },
          rollback: () => {
            this._currentContent = previousContent;
            this._applyContent(previousContent, true);
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

  private _applyContent(content: RouterContentHtml, dispatchRenderedEvent: boolean): void {
    const contentRoot = this._ensureContentRoot(this._findExistingContentRoot());
    replaceElementChildrenFromHtml(
      contentRoot,
      unwrapRouterContentHtml(content),
      contentRoot.ownerDocument,
    );

    if (dispatchRenderedEvent) {
      this._dispatchContentRendered(contentRoot);
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

  private _dispatchContentRendered(contentRoot: HTMLElement): void {
    // 描画後連携は event detail 経由で現在の本文 root を受け取れることを契約にします。
    this.dispatchEvent(
      new CustomEvent<AppRouterContentRenderedDetail>('app-router:content-rendered', {
        detail: { contentRoot },
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
