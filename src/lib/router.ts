/**
 * View Transition API を利用した SPA ルーター
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type EventCallback = (...args: any[]) => void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = () => any;

interface RouteDefinition {
  pattern: string | RegExp;
  handler: RouteHandler;
}

export interface RouterOptions {
  /** コンテンツ更新コールバック（設定時は outlet.innerHTML を直接変更しない） */
  onContentUpdate?: (html: string) => void;
  /** 初期ナビゲーションをスキップする（AppRouter が SSG コンテンツを保持するため） */
  skipInitialNavigation?: boolean;
  /** 外部で aria-live リージョンを管理する場合は true にする */
  skipAriaLiveRegion?: boolean;
}

export class Router {
  private clickHandler: (e: MouseEvent) => void;
  private popstateHandler: () => void;
  private eventListeners: Map<string, Set<EventCallback>> = new Map();
  private reinitializeHooks: Set<() => void> = new Set();
  private routes: RouteDefinition[] = [];
  private navigating = false;
  private timeoutDuration = 0;
  private navigationHistory: string[] = [];
  private ariaLiveRegion: HTMLDivElement | null = null;
  private isInitialLoad = true;

  constructor(
    private outlet: HTMLElement,
    private options: RouterOptions = {},
  ) {
    // イベントハンドラをバインド（destroy時に解除するため参照を保持）
    this.clickHandler = (e: MouseEvent) => this.handleAnchorClick(e);
    this.popstateHandler = () => {
      void this.handleNavigation(window.location.pathname);
    };

    this.init();
  }

  /**
   * タイムアウト時間を設定（ミリ秒）
   * @param ms タイムアウト時間（0で無効）
   */
  setTimeout(ms: number) {
    this.timeoutDuration = ms;
  }

  /**
   * イベントリスナー設定
   */
  private init() {
    window.addEventListener('popstate', this.popstateHandler);
    document.addEventListener('click', this.clickHandler);

    // aria-live リージョンの作成（アクセシビリティ）
    this.createAriaLiveRegion();

    if (this.options.skipInitialNavigation) {
      // SSG コンテンツを既に保持しているため初期ナビゲーションをスキップ
      this.navigationHistory.push(window.location.pathname);
      this.isInitialLoad = false;
    } else {
      // 初期ロード
      void this.handleNavigation(window.location.pathname);
    }
  }

  /**
   * aria-live リージョンを作成
   */
  private createAriaLiveRegion() {
    // 外部（AppRouter）で管理する場合はスキップ
    if (this.options.skipAriaLiveRegion) return;

    this.ariaLiveRegion = document.createElement('div');
    this.ariaLiveRegion.setAttribute('aria-live', 'polite');
    this.ariaLiveRegion.setAttribute('aria-atomic', 'true');
    this.ariaLiveRegion.className = 'sr-only';
    this.ariaLiveRegion.style.cssText =
      'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0;';
    document.body.appendChild(this.ariaLiveRegion);
  }

  /**
   * ルーターの破棄
   * イベントリスナーを解除してクリーンアップする
   */
  destroy() {
    window.removeEventListener('popstate', this.popstateHandler);
    document.removeEventListener('click', this.clickHandler);
    this.eventListeners.clear();
    this.reinitializeHooks.clear();

    // aria-live リージョンの削除
    if (this.ariaLiveRegion) {
      this.ariaLiveRegion.remove();
      this.ariaLiveRegion = null;
    }
  }

  /**
   * イベントリスナーを登録
   * @param event イベント名
   * @param callback コールバック関数
   */
  on(event: string, callback: EventCallback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * イベントリスナーを解除
   * @param event イベント名
   * @param callback コールバック関数
   */
  off(event: string, callback: EventCallback) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * イベントを発火
   * @param event イベント名
   * @param args イベント引数
   */
  private emit(event: string, ...args: unknown[]) {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(...args);
        } catch (e) {
          console.error(`Error in ${event} event handler:`, e);
        }
      });
    }
  }

  /**
   * ナビゲーション中かどうかを返す
   */
  isNavigating(): boolean {
    return this.navigating;
  }

  /**
   * プログラマティックナビゲーション
   * @param path 遷移先のパス
   * @param state 履歴に保存する状態データ（オプション）
   */
  async navigate(path: string, state: Record<string, unknown> = {}) {
    window.history.pushState(state, '', path);
    await this.handleNavigation(path);
  }

  /**
   * 再初期化フックを追加
   * @param hook フック関数
   */
  addReinitializeHook(hook: () => void) {
    this.reinitializeHooks.add(hook);
  }

  /**
   * 再初期化フックを削除
   * @param hook フック関数
   */
  removeReinitializeHook(hook: () => void) {
    this.reinitializeHooks.delete(hook);
  }

  /**
   * カスタム再初期化フックを実行する
   * AppRouter の updated() ライフサイクルから呼ばれる
   */
  runReinitializeHooks(): void {
    this.reinitializeHooks.forEach((hook) => {
      try {
        hook();
      } catch (e) {
        console.error('Error in reinitialize hook:', e);
      }
    });
  }

  /**
   * ルート定義を追加
   * @param pattern パスパターン（文字列または正規表現）
   * @param handler ハンドラ関数
   */
  addRoute(pattern: string | RegExp, handler: RouteHandler) {
    this.routes.push({ pattern, handler });
  }

  /**
   * ルートパラメータを取得
   * @returns パラメータのオブジェクト
   */
  getParams(): Record<string, string> {
    const path = window.location.pathname;
    const params: Record<string, string> = {};

    // 動的パラメータの抽出 (/posts/:id など)
    const segments = path.split('/').filter(Boolean);

    // 簡易的な実装：/posts/:id, /posts/:category/:id のようなパターンを想定
    if (segments.length >= 2 && segments[0] === 'posts') {
      if (segments.length === 2 && segments[1]) {
        params['id'] = segments[1];
      } else if (segments.length === 3 && segments[1] && segments[2]) {
        params['category'] = segments[1];
        params['id'] = segments[2];
      }
    }

    return params;
  }

  /**
   * クエリパラメータを取得
   * @returns クエリパラメータのオブジェクト
   */
  getQuery(): Record<string, string> {
    const params: Record<string, string> = {};
    const searchParams = new URLSearchParams(window.location.search);

    searchParams.forEach((value, key) => {
      // テストランナーの内部パラメータを除外
      if (key !== 'wtr-session-id') {
        params[key] = value;
      }
    });

    return params;
  }

  /**
   * 現在のパスを取得
   * @returns 現在のパス
   */
  getCurrentPath(): string {
    return window.location.pathname;
  }

  /**
   * ナビゲーション履歴を取得
   * @returns パスの配列
   */
  getHistory(): string[] {
    return [...this.navigationHistory];
  }

  /**
   * リンククリックイベントハンドラー
   * 以下の場合はSPA遷移を行わない:
   * - target属性がある場合（新規タブで開く場合など）
   * - download属性がある場合（ファイルダウンロードの場合）
   * - rel属性がexternalの場合（外部リンク）
   * - data-no-router属性がある場合（明示的にルーターを無効化）
   * - href属性がhttpから始まる場合（絶対外部リンク）
   * - href属性が#から始まる場合（ページ内リンク）
   * - 修飾キー（Ctrl, Shift, Alt, Meta）が押されている場合
   * - 中ボタン/右クリックの場合
   * @param e マウスイベント
   */
  private handleAnchorClick(e: MouseEvent) {
    // 左クリック以外は無視（button: 0 が左クリック）
    if (e.button !== 0) return;

    // 修飾キーが押されている場合は無視（新規タブで開くなどのブラウザ標準動作を許可）
    if (e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) return;

    const anchor = (e.target as HTMLElement).closest('a');
    if (!anchor) return;

    // 特定の属性がある場合は無視
    if (
      anchor.target ||
      anchor.hasAttribute('download') ||
      anchor.getAttribute('rel') === 'external' ||
      anchor.hasAttribute('data-no-router')
    ) {
      return;
    }

    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('http') || href.startsWith('#')) return;

    e.preventDefault();
    window.history.pushState({}, '', href);
    void this.handleNavigation(href);
  }

  /**
   * View Transitions APIを利用したページ遷移を行う非同期関数
   * @param url 遷移先のURL
   */
  private async handleNavigation(url: string) {
    // 二重ロード防止
    if (this.navigating) {
      console.warn('Navigation already in progress');
      return;
    }

    this.navigating = true;
    this.emit('loading:start');
    this.emit('before:navigate', url);

    // View Transition APIをサポートしていないブラウザはフォールバック
    if (!document.startViewTransition) {
      await this.updateContent(url);
      this.navigating = false;
      this.emit('loading:end');
      this.emit('after:navigate', url);
      return;
    }

    const transition = document.startViewTransition(async () => {
      await this.updateContent(url);
    });

    try {
      await transition.finished;
    } catch (e) {
      console.error('Transition failed', e);
      this.emit('error', new Error('Transition failed'));
    } finally {
      this.navigating = false;
      this.emit('loading:end');
      this.emit('after:navigate', url);
    }
  }

  /**
   * コンテンツの更新を行う非同期関数
   * @param url 遷移先のURL
   */
  private async updateContent(url: string) {
    let timeoutId: number | undefined;
    const controller = new AbortController();
    const signal = controller.signal;

    try {
      // タイムアウトが設定されている場合、タイマーを開始
      if (this.timeoutDuration > 0) {
        timeoutId = window.setTimeout(() => controller.abort(), this.timeoutDuration);
      }

      // ルートハンドラの実行
      // ハンドラが HTML 文字列を返した場合は fetch をスキップ
      const handlerResult = await this.executeRouteHandler(url);
      if (handlerResult !== null) {
        this.setContent(handlerResult);
        this.navigationHistory.push(url);
        if (!this.isInitialLoad) {
          this.emit('route:change', url);
        }
        this.isInitialLoad = false;
        this.emit('content:load', url);
        // onContentUpdate 未設定時のみ reinitializeScripts を実行
        // （AppRouter 統合時は updated() ライフサイクルで処理するため）
        if (!this.options.onContentUpdate) {
          this.reinitializeScripts();
        }
        this.announcePageChange(document.title);
        this.manageFocus();
        return;
      }

      const response = await fetch(url, { signal });

      if (!response.ok) {
        this.handleHttpError(response.status);
        return;
      }

      const text = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'text/html');

      const newContent = doc.querySelector('main')?.innerHTML;
      if (!newContent) {
        this.handleHttpError(404);
        return;
      }

      // タイトルを更新先のタイトルに変更
      const newTitle = doc.title;
      document.title = newTitle;

      // メタディスクリプションを更新
      this.updateMetaDescription(doc);

      // メインコンテンツを更新先のコンテンツに変更
      this.setContent(newContent);

      // 履歴に追加（初期ロードでも追加）
      this.navigationHistory.push(url);

      // イベント発火（初期ロード以外）
      if (!this.isInitialLoad) {
        this.emit('route:change', url);
      }
      this.isInitialLoad = false;

      // コンテンツロードイベント
      this.emit('content:load', url);

      // onContentUpdate 未設定時のみ reinitializeScripts を実行
      // （AppRouter 統合時は updated() ライフサイクルで処理するため）
      if (!this.options.onContentUpdate) {
        this.reinitializeScripts();
      }

      // アクセシビリティ: aria-live通知
      this.announcePageChange(newTitle);

      // アクセシビリティ: フォーカス管理
      this.manageFocus();
    } catch (err) {
      console.error('Navigation failed:', err);

      // AbortError（タイムアウト）のハンドリング
      if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
        this.showError('タイムアウト', 'ページの読み込みがタイムアウトしました。');
        this.emit('error', err);
        return;
      }

      this.emit('error', err instanceof Error ? err : new Error(String(err)));

      if (err instanceof TypeError && String(err.message).includes('fetch')) {
        this.showError('ネットワークエラー', 'ネットワーク接続を確認してください。');
      } else {
        this.showError('エラー', 'ページの読み込みに失敗しました。');
      }
    } finally {
      // 処理完了後にタイマーをクリア
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * コンテンツを設定する
   * onContentUpdate コールバックが設定されている場合はそちらを呼び出し、
   * そうでなければ outlet.innerHTML を直接変更する（後方互換）
   */
  private setContent(html: string) {
    if (this.options.onContentUpdate) {
      this.options.onContentUpdate(html);
    } else {
      this.outlet.innerHTML = html;
    }
  }

  /**
   * ルートハンドラを実行
   * @param url URL
   * @returns ハンドラが返した HTML 文字列、またはマッチなし・void 返却時は null
   */
  private async executeRouteHandler(url: string): Promise<string | null> {
    for (const route of this.routes) {
      let matched = false;

      if (typeof route.pattern === 'string') {
        // ワイルドカード対応
        if (route.pattern.includes('*')) {
          const regexPattern = route.pattern.replace(/\*/g, '.*');
          matched = new RegExp(`^${regexPattern}$`).test(url);
        } else {
          matched = route.pattern === url;
        }
      } else {
        matched = route.pattern.test(url);
      }

      if (matched) {
        const result: unknown = await route.handler();
        // ハンドラが HTML 文字列を返した場合のみ使用する
        return typeof result === 'string' ? result : null;
      }
    }
    return null;
  }

  /**
   * ページ変更をスクリーンリーダーに通知
   * @param _title ページタイトル（将来の拡張のため引数は保持）
   */
  private announcePageChange(_title: string) {
    if (this.ariaLiveRegion) {
      // 少し遅延させてDOMの更新が完了してから通知
      setTimeout(() => {
        if (this.ariaLiveRegion) {
          this.ariaLiveRegion.textContent = 'ページが読み込まれました';

          // 通知後、少し待ってからクリア
          setTimeout(() => {
            if (this.ariaLiveRegion) {
              this.ariaLiveRegion.textContent = '';
            }
          }, 1000);
        }
      }, 100);
    }
  }

  /**
   * フォーカス管理
   * ナビゲーション後にメインコンテンツにフォーカスを移動
   */
  private manageFocus() {
    // メインコンテンツの最初の見出しまたはフォーカス可能な要素を探す
    const mainHeading = this.outlet.querySelector('h1, h2');

    if (mainHeading instanceof HTMLElement) {
      // 見出しにtabindex="-1"を付けてフォーカス可能にする
      if (!mainHeading.hasAttribute('tabindex')) {
        mainHeading.setAttribute('tabindex', '-1');
      }
      mainHeading.focus();
    } else {
      // 見出しがない場合はメインコンテンツ自体にフォーカス
      if (!this.outlet.hasAttribute('tabindex')) {
        this.outlet.setAttribute('tabindex', '-1');
      }
      this.outlet.focus();
    }
  }

  /**
   * HTTPエラーのハンドリング
   * @param status HTTPステータスコード
   */
  private handleHttpError(status: number) {
    switch (status) {
      case 401:
        this.showError('401 - 認証エラー', 'ログインが必要です。');
        break;
      case 403:
        this.showError('403 - 権限エラー', 'このページにアクセスする権限がありません。');
        break;
      case 404:
        this.showError('404 - ページが見つかりません', 'お探しのページは存在しません。');
        break;
      case 500:
        this.showError('500 - サーバーエラー', 'サーバーで問題が発生しました。');
        break;
      case 503:
        this.showError('503 - サービス利用不可', '現在サービスを利用できません。しばらくしてからお試しください。');
        break;
      default:
        this.showError(`${String(status)} - エラー`, 'ページの読み込みに失敗しました。');
    }
  }

  /**
   * エラーメッセージを表示
   * @param title エラータイトル
   * @param message エラーメッセージ
   */
  private showError(title: string, message: string) {
    const errorHTML = `
      <div class="error-page">
        <h1>${title}</h1>
        <p>${message}</p>
      </div>
    `;
    this.setContent(errorHTML);
  }

  /**
   * メタディスクリプションを更新
   * @param doc パース済みのドキュメント
   */
  private updateMetaDescription(doc: Document) {
    const newDescription = doc.querySelector('meta[name="description"]')?.getAttribute('content');
    if (newDescription) {
      let metaTag = document.querySelector('meta[name="description"]');
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute('name', 'description');
        document.head.appendChild(metaTag);
      }
      metaTag.setAttribute('content', newDescription);
    }
  }

  /**
   * SPA遷移後の再初期化処理
   * onContentUpdate 未設定時（スタンドアロン使用）にのみ呼ばれる。
   * AppRouter 統合時は AppRouter.updated() ライフサイクルで処理する。
   */
  private reinitializeScripts() {
    // シンタックスハイライトの再適用
    if (typeof window.Prism !== 'undefined') {
      window.Prism.highlightAll();
    }

    // Pagefind 検索 UI の初期化（検索ページの場合）
    const searchContainer = this.outlet.querySelector('#search');
    if (searchContainer && typeof window.PagefindUI !== 'undefined') {
      new window.PagefindUI({ element: searchContainer });
    }

    // カスタム再初期化フックの実行
    this.runReinitializeHooks();

    // スクロール位置をトップにリセット
    window.scrollTo(0, 0);
  }
}
