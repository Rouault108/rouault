/**
 * AppRouter - SPA ルーターの Lit ラッパーコンポーネント
 */

import { html, LitElement, nothing, type PropertyValues } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { RouterController } from '../../lib/controllers/router-controller.js';
import { AppRouterAnnouncementController } from './controllers/app-router-announcement-controller.js';
import { AppRouterContentController } from './controllers/app-router-content-controller.js';
import { AppRouterPostRenderController } from './controllers/app-router-post-render-controller.js';

export class AppRouter extends LitElement {
  static override properties = {
    _pageContent: { state: true },
    _ariaAnnouncement: { state: true },
  };

  declare private _pageContent: string;
  declare private _ariaAnnouncement: string;

  /** シャドウDOMを無効化してライトDOMを使用する */
  override createRenderRoot(): this {
    return this;
  }

  private _routerController = new RouterController(this);

  private _contentController = new AppRouterContentController(this, (html) => {
    this._pageContent = html;
  });

  private _announcementController = new AppRouterAnnouncementController(this, (text) => {
    this._ariaAnnouncement = text;
  });

  private _postRenderController = new AppRouterPostRenderController(this);

  constructor() {
    super();
    this._pageContent = '';
    this._ariaAnnouncement = '';
  }

  /** SSR で注入する初期本文。 */
  serverContent = '';

  override connectedCallback(): void {
    this._contentController.captureInitialContent(this);
    super.connectedCallback();

    const router = this._routerController.initRouter(
      this,
      async (newContent) => {
        await this._contentController.handleContentUpdate(newContent, async () => {
          await this.updateComplete;
        });
      },
      {
        skipInitialNavigation: true,
        skipAriaLiveRegion: true,
      },
    );

    this._announcementController.connect(router);
  }

  protected override updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    if (!changedProperties.has('_pageContent')) {
      return;
    }

    this._postRenderController.handleContentRendered(
      this._contentController.shouldRunPostRenderHooks(),
      this._routerController.router,
      this.querySelector('#main-content'),
    );
    this._contentController.consumePostRenderHooksFlag();

    this.dispatchEvent(
      new CustomEvent('app-router:content-rendered', {
        bubbles: true,
        composed: true,
      }),
    );
  }

  async navigate(url: string): Promise<void> {
    await this._routerController.router?.navigate(url);
  }

  override render() {
    const pageContent = this._pageContent || this.serverContent;

    return html`
      <div aria-live="polite" aria-atomic="true" class="sr-only">${this._ariaAnnouncement}</div>

      <main
        id="main-content"
        tabindex="-1"
        aria-busy=${this._routerController.isNavigating ? 'true' : nothing}
      >
        ${unsafeHTML(pageContent)}
      </main>
    `;
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
