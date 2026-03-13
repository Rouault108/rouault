/**
 * AppRouter - SPA ルーターの Lit ラッパーコンポーネント
 *
 * 責務:
 * - SSG の初期コンテンツを保持してルーターに渡す（フラッシュなし）
 * - RouterController を通じてページコンテンツをリアクティブに表示する
 * - aria-live リージョンを宣言的に管理する（Router.createAriaLiveRegion() を置き換え）
 * - ナビゲーション中の aria-busy 状態を宣言的に管理する
 * - コンテンツ更新後の再初期化を updated() ライフサイクルで実行する
 *   （Router.reinitializeScripts() の Lit 統合版）
 *
 * ライトDOM（createRenderRoot() { return this; }）を使用する理由:
 * - グローバル CSS が main 要素に適用される必要があるため
 * - SSG 生成コンテンツとのスタイル互換性を維持するため
 */

import { html, LitElement, nothing, type PropertyValues } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { RouterController } from '../../lib/controllers/router-controller.js';

@customElement('app-router')
export class AppRouter extends LitElement {
  private _didInitializeFromSsr = false;
  private _shouldRunPostNavigationHooks = false;

  /** シャドウDOMを無効化してライトDOMを使用する */
  override createRenderRoot(): this {
    return this;
  }

  private _routerController = new RouterController(this);

  /**
   * SSR で注入する初期本文。
   * クライアントでは connectedCallback() で既存DOMから再取得される。
   */
  serverContent = '';

  /** fetch されたページの HTML コンテンツ */
  @state() private _pageContent = '';

  /** スクリーンリーダーへの通知テキスト */
  @state() private _ariaAnnouncement = '';

  override connectedCallback(): void {
    if (!this._didInitializeFromSsr) {
      // 初回接続時のみ SSR されたライトDOMを state に退避し、
      // Lit の初回描画前に既存ノードを除去して二重描画を防ぐ。
      const existingMain = this.querySelector('main');
      this._pageContent = existingMain?.innerHTML ?? '';
      this.replaceChildren();
      this._didInitializeFromSsr = true;
    }

    super.connectedCallback();

    // Router を SSG コンテンツを上書きしないように初期化する
    const router = this._routerController.initRouter(
      this,
      (newContent) => {
        this._shouldRunPostNavigationHooks = true;
        this._pageContent = newContent;
      },
      {
        skipInitialNavigation: true, // SSG コンテンツを既に保持しているため
        skipAriaLiveRegion: true, // AppRouter が宣言的に管理するため
      },
    );

    // aria-live 通知を Router の content:load イベントに接続する
    router.on('content:load', () => {
      this._ariaAnnouncement = 'ページが読み込まれました';
      // スクリーンリーダーが次回の通知を検知できるよう、1 秒後にクリアする
      setTimeout(() => {
        this._ariaAnnouncement = '';
      }, 1000);
    });
  }

  protected override updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);

    // _pageContent が変更された場合のみ再初期化処理を実行する
    // これが reinitializeScripts() の Lit ライフサイクル版であり、
    // Lit が DOM を確実に更新した後に実行されることが保証される
    if (changedProperties.has('_pageContent')) {
      // 初回 SSR 描画ではブラウザの自然な初期フォーカスとスクロール位置を尊重する。
      if (this._shouldRunPostNavigationHooks) {
        this._runPostRenderHooks();
        this._shouldRunPostNavigationHooks = false;
      }
      this.dispatchEvent(
        new CustomEvent('app-router:content-rendered', {
          bubbles: true,
          composed: true,
        }),
      );
    }
  }

  /**
   * コンテンツ差し替え後の再初期化処理
   * Lit の updated() から呼ばれるため、DOM 更新後に確実に実行される
   */
  private _runPostRenderHooks(): void {
    // addReinitializeHook() で登録されたカスタムフックを実行する
    this._routerController.router?.runReinitializeHooks();

    // スクロール位置をトップにリセット
    window.scrollTo(0, 0);

    // DOM更新完了後にフォーカスをメインコンテンツへ移動
    this._manageFocusAfterNavigation();
  }

  /**
   * ナビゲーション後のフォーカス管理
   * Lit の描画完了後に実行することで、更新済みDOMに確実にフォーカスを当てる
   */
  private _manageFocusAfterNavigation(): void {
    const main = this.querySelector('#main-content');
    if (!(main instanceof HTMLElement)) {
      return;
    }

    const mainHeading = main.querySelector('h1, h2');
    if (mainHeading instanceof HTMLElement) {
      if (!mainHeading.hasAttribute('tabindex')) {
        mainHeading.setAttribute('tabindex', '-1');
      }
      mainHeading.focus();
      return;
    }

    if (!main.hasAttribute('tabindex')) {
      main.setAttribute('tabindex', '-1');
    }
    main.focus();
  }

  async navigate(url: string): Promise<void> {
    await this._routerController.router?.navigate(url);
  }

  override render() {
    const pageContent = this._pageContent || this.serverContent;

    return html`
      <!-- スクリーンリーダーへのページ変更通知（宣言的管理） -->
      <div aria-live="polite" aria-atomic="true" class="sr-only">${this._ariaAnnouncement}</div>

      <!-- メインコンテンツ領域 -->
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
