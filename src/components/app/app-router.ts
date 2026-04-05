import { html, LitElement, nothing, type PropertyValues } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
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
  static override properties = {
    _pageContent: { state: true },
    _ariaAnnouncement: { state: true },
  };

  declare private _pageContent: RouterContentHtml | null;
  declare private _ariaAnnouncement: string;
  declare private _serverContent: RouterContentHtml | null;
  private _manualDomMode = false;
  private _allowClientRender = false;
  private readonly _routerController: RouterController;
  private readonly _contentController: AppRouterContentController;
  private readonly _postRenderController: AppRouterPostRenderController;

  override createRenderRoot(): this {
    return this;
  }

  constructor() {
    super();
    this._pageContent = null;
    this._ariaAnnouncement = '';
    this._serverContent = null;
    this._routerController = new RouterController(this);
    this._contentController = new AppRouterContentController(this, (html) => {
      if (this._manualDomMode) {
        this._syncMainContent(html);
        return;
      }

      this._pageContent = html;
    });
    this._postRenderController = new AppRouterPostRenderController(this, (text) => {
      if (this._manualDomMode) {
        this._syncAnnouncement(text);
        return;
      }

      this._ariaAnnouncement = text;
    });
  }

  get serverContent(): RouterContentHtml | null {
    return this._serverContent;
  }

  set serverContent(value: RouterContentHtml | null) {
    const previousValue = this._serverContent;
    this._serverContent = value;
    this.requestUpdate('serverContent', previousValue);
  }

  override connectedCallback(): void {
    const initialContent = this._contentController.captureInitialContent(this);
    this._manualDomMode = this.querySelector('#main-content') instanceof HTMLElement;
    this._allowClientRender = !this._manualDomMode;

    if (!this._manualDomMode) {
      this._serverContent = initialContent;
      // SSR 由来の light DOM を残すと、Lit の描画結果と重複して main が二重化する。
      this.replaceChildren();
    } else {
      const main = this.querySelector('#main-content');
      if (main instanceof HTMLElement) {
        promoteDeclarativeShadowRoots(main);
      }
    }

    super.connectedCallback();

    const router = this._routerController.initRouter(this, {
      skipInitialNavigation: true,
      contentAdapter: this._contentController.createContentAdapter(async () => {
        await this.updateComplete;
      }),
      postCommitController: this._postRenderController.createPostCommitController(this),
      shellAdapter: createLayoutHeaderShellAdapter(),
      urlStateNavigationPolicy: new PrimaryTabNavigationPolicy(),
    });

    router.on('navigation:busy-change', ({ isNavigating }) => {
      if (this._manualDomMode) {
        this._syncBusyState(isNavigating);
      }
    });

    void router.start();

    if (this._manualDomMode) {
      void this._postRenderController.restoreInitialHashScroll();
    }
  }

  protected override performUpdate(): void {
    if (!this._allowClientRender) {
      return;
    }

    super.performUpdate();
  }

  protected override updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (!changedProperties.has('_pageContent')) {
      return;
    }

    const main = this.querySelector('#main-content');
    if (main instanceof HTMLElement) {
      promoteDeclarativeShadowRoots(main);
    }

    this._dispatchContentRendered();
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

  override render() {
    const pageContent = this._pageContent ?? this._serverContent;

    return html`
      <div aria-live="polite" aria-atomic="true" class="sr-only">${this._ariaAnnouncement}</div>

      <main
        id="main-content"
        tabindex="-1"
        aria-busy=${this._routerController.isNavigating ? 'true' : nothing}
      >
        ${pageContent ? unsafeHTML(unwrapRouterContentHtml(pageContent)) : nothing}
      </main>
    `;
  }

  private _syncMainContent(content: RouterContentHtml): void {
    const main = this.querySelector('#main-content');
    if (!(main instanceof HTMLElement)) {
      return;
    }

    replaceElementChildrenFromHtml(main, unwrapRouterContentHtml(content), main.ownerDocument);
    this._dispatchContentRendered();
  }

  private _syncAnnouncement(text: string): void {
    const region = this.querySelector('[aria-live="polite"]');
    if (!(region instanceof HTMLElement)) {
      return;
    }

    region.textContent = text;
  }

  private _syncBusyState(isNavigating: boolean): void {
    const main = this.querySelector('#main-content');
    if (!(main instanceof HTMLElement)) {
      return;
    }

    if (isNavigating) {
      main.setAttribute('aria-busy', 'true');
      return;
    }

    main.removeAttribute('aria-busy');
  }

  private _dispatchContentRendered(): void {
    this.dispatchEvent(
      new CustomEvent('app-router:content-rendered', {
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
