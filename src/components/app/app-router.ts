import { LitElement, nothing } from 'lit';
import { RouterNotStartedError, type NavigationResult } from '../../router/router.js';
import { RouterController } from '../../controllers/router-controller.js';
import {
  type RouterContentHtml,
  unwrapRouterContentHtml,
} from '../../router/router-content-html.js';
import {
  promoteDeclarativeShadowRoots,
  replaceElementChildrenFromHtml,
} from '../../router/declarative-shadow-dom.js';
import { registerTabsUrlSyncStrategy } from '../ui/tabs/tabs-url-sync-strategy.js';
import { AppRouterContentController } from './controllers/app-router-content-controller.js';
import { AppRouterPostRenderController } from './controllers/app-router-post-render-controller.js';
import { PrimaryTabNavigationPolicy } from './navigation/primary-tab-navigation-policy.js';
import { primaryTabTabsUrlSyncStrategy } from './navigation/primary-tab-url-state.js';
import { createLayoutHeaderShellAdapter } from './shell/layout-header-shell-adapter.js';

const CONTENT_ROOT_ID = 'main-content';
const CONTENT_ROOT_SELECTOR = `#${CONTENT_ROOT_ID}`;
const ANNOUNCEMENT_SELECTOR = '[data-app-router-announcement]';

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

export class AppRouter extends LitElement {
  private _serverContent: RouterContentHtml | null = null;
  private readonly _routerController: RouterController;
  private readonly _contentController: AppRouterContentController;
  private readonly _postRenderController: AppRouterPostRenderController;

  constructor() {
    super();
    this._routerController = new RouterController(this);
    this._contentController = new AppRouterContentController(this);
    this._postRenderController = new AppRouterPostRenderController(this, (text) => {
      this._syncAnnouncement(text);
    });
  }

  get serverContent(): RouterContentHtml | null {
    return this._serverContent;
  }

  set serverContent(value: RouterContentHtml | null) {
    this._serverContent = value;
    if (value === null) {
      return;
    }

    this._contentController.initialize(value);
    if (this.isConnected) {
      this._replaceContentRoot(value, true);
    }
  }

  getContentRoot(): HTMLElement | null {
    return this.querySelector<HTMLElement>(CONTENT_ROOT_SELECTOR);
  }

  override connectedCallback(): void {
    super.connectedCallback();

    const existingContentRoot = this._findExistingContentRoot();

    // 先に content root を正規化して id を付ける。
    // これより前に captureInitialContent() を呼ぶと、
    // SSR 済み <main> が存在していても '#main-content' に一致せず空本文になる。
    const contentRoot = this._ensureContentRoot(existingContentRoot);

    const initialContent =
      this._serverContent ??
      this._contentController.captureInitialContent(this, CONTENT_ROOT_SELECTOR);
    this._contentController.initialize(initialContent);

    this._ensureAnnouncementRegion();
    this._syncBusyState(this._routerController.isNavigating);

    if (this._serverContent !== null) {
      this._replaceContentRoot(this._serverContent, false);
    } else {
      promoteDeclarativeShadowRoots(contentRoot);
    }

    const router = this._routerController.initRouter(this, {
      skipInitialNavigation: true,
      contentAdapter: this._contentController.createContentAdapter((html) => {
        this._replaceContentRoot(html, true);
      }),
      postCommitController: this._postRenderController.createPostCommitController(this),
      shellAdapter: createLayoutHeaderShellAdapter(),
      urlStateNavigationPolicy: new PrimaryTabNavigationPolicy(),
    });

    router.on('navigation:busy-change', ({ isNavigating }) => {
      this._syncBusyState(isNavigating);
    });

    void router.start();
    void this._postRenderController.restoreInitialHashScroll();
  }

  override render() {
    return nothing;
  }

  async navigate(url: string): Promise<NavigationResult> {
    const router = this._routerController.router;
    if (!router) {
      return createNotStartedResult(url);
    }

    return router.navigate({
      url,
      historyMode: 'push',
    });
  }

  private _findExistingContentRoot(): HTMLElement | null {
    const contentRoot = this.getContentRoot();
    if (contentRoot instanceof HTMLElement) {
      return contentRoot;
    }

    const main = this.querySelector('main');
    return main instanceof HTMLElement ? main : null;
  }

  private _ensureContentRoot(existingRoot: HTMLElement | null): HTMLElement {
    const contentRoot = existingRoot ?? this.ownerDocument.createElement('main');

    if (!contentRoot.isConnected) {
      this.append(contentRoot);
    }

    contentRoot.id = CONTENT_ROOT_ID;
    contentRoot.tabIndex = -1;
    return contentRoot;
  }

  private _ensureAnnouncementRegion(): HTMLElement {
    const existingRegion = this.querySelector<HTMLElement>(ANNOUNCEMENT_SELECTOR);
    if (existingRegion instanceof HTMLElement) {
      existingRegion.setAttribute('aria-live', 'polite');
      existingRegion.setAttribute('aria-atomic', 'true');
      existingRegion.classList.add('sr-only');
      return existingRegion;
    }

    const legacyRegion = this.querySelector<HTMLElement>('[aria-live="polite"]');
    if (legacyRegion instanceof HTMLElement) {
      legacyRegion.setAttribute('data-app-router-announcement', '');
      legacyRegion.setAttribute('aria-atomic', 'true');
      legacyRegion.classList.add('sr-only');
      return legacyRegion;
    }

    const region = this.ownerDocument.createElement('div');
    region.setAttribute('data-app-router-announcement', '');
    region.setAttribute('aria-live', 'polite');
    region.setAttribute('aria-atomic', 'true');
    region.className = 'sr-only';
    this.prepend(region);
    return region;
  }

  private _replaceContentRoot(content: RouterContentHtml, dispatchRenderedEvent: boolean): void {
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
    const main = this._findExistingContentRoot();
    if (!(main instanceof HTMLElement)) {
      return;
    }

    if (isNavigating) {
      main.setAttribute('aria-busy', 'true');
      return;
    }

    main.removeAttribute('aria-busy');
  }

  private _dispatchContentRendered(contentRoot: HTMLElement): void {
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