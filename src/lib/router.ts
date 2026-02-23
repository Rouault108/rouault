/**
 * View Transition API を利用した SPA ルーター
 */

type EventCallback = (...args: unknown[]) => unknown;
type RouteHandler = () => unknown;

type HistoryMode = 'none' | 'push' | 'replace';

interface NavigationRequest {
  url: string;
  historyMode: HistoryMode;
  state?: Record<string, unknown>;
}

interface RouteDefinition {
  pattern: string | RegExp;
  handler: RouteHandler;
}

interface PendingNavigation {
  request: NavigationRequest;
  resolve: () => void;
  reject: (reason?: unknown) => void;
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
  private eventListeners = new Map<string, Set<EventCallback>>();
  private reinitializeHooks = new Set<() => void>();
  private routes: RouteDefinition[] = [];
  private navigating = false;
  private timeoutDuration = 0;
  private navigationHistory: string[] = [];
  private ariaLiveRegion: HTMLDivElement | null = null;
  private isInitialLoad = true;
  private navigationInProgress = false;
  private pendingNavigation: PendingNavigation | null = null;
  private isDestroyed = false;

  constructor(
    private outlet: HTMLElement,
    private options: RouterOptions = {},
  ) {
    // イベントハンドラをバインド（destroy時に解除するため参照を保持）
    this.clickHandler = (e: MouseEvent) => {
      this.handleAnchorClick(e);
    };
    this.popstateHandler = () => {
      void this.requestNavigation({
        url: this.getCurrentUrl(),
        historyMode: 'none',
      });
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
      this.navigationHistory.push(this.getCurrentUrl());
      this.isInitialLoad = false;
    } else {
      // 初期ロード
      void this.requestNavigation({
        url: this.getCurrentUrl(),
        historyMode: 'none',
      });
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
    this.isDestroyed = true;
    window.removeEventListener('popstate', this.popstateHandler);
    document.removeEventListener('click', this.clickHandler);
    this.eventListeners.clear();
    this.reinitializeHooks.clear();
    if (this.pendingNavigation) {
      this.pendingNavigation.resolve();
      this.pendingNavigation = null;
    }

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
    this.eventListeners.get(event)?.add(callback);
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
   * キャンセル可能なイベントを発火
   * いずれかのリスナーが false を返した場合は処理を中断する
   */
  private emitCancelable(event: string, ...args: unknown[]): boolean {
    const listeners = this.eventListeners.get(event);
    if (!listeners) {
      return true;
    }

    for (const callback of listeners) {
      try {
        const result = callback(...args);
        if (result === false) {
          return false;
        }
      } catch (e) {
        console.error(`Error in ${event} event handler:`, e);
        if (event !== 'error') {
          this.emit('error', e instanceof Error ? e : new Error(String(e)));
        }
        return false;
      }
    }

    return true;
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
    await this.requestNavigation({
      url: path,
      historyMode: 'push',
      state,
    });
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
    if (e.defaultPrevented) return;

    // 左クリック以外は無視（button: 0 が左クリック）
    if (e.button !== 0) return;

    // 修飾キーが押されている場合は無視（新規タブで開くなどのブラウザ標準動作を許可）
    if (e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) return;

    const anchor = (e.target as HTMLElement).closest('a');
    if (!anchor) return;

    const relValue = anchor.getAttribute('rel');
    const isExternalRel =
      anchor.relList.contains('external') ||
      (typeof relValue === 'string' && relValue.split(/\s+/).includes('external'));

    // 特定の属性がある場合は無視
    if (
      anchor.target ||
      anchor.hasAttribute('download') ||
      isExternalRel ||
      anchor.hasAttribute('data-no-router')
    ) {
      return;
    }

    const href = anchor.getAttribute('href');
    if (!href) return;

    let targetUrl: URL;
    try {
      targetUrl = new URL(href, window.location.href);
    } catch {
      return;
    }

    // http/https 以外のスキームはブラウザ標準の遷移を優先
    if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
      return;
    }

    // クロスオリジンは通常リンクとして処理
    if (targetUrl.origin !== window.location.origin) {
      return;
    }

    // ハッシュのみの移動（同一ページ内リンク）は通常動作を優先
    if (
      targetUrl.pathname === window.location.pathname &&
      targetUrl.search === window.location.search &&
      targetUrl.hash
    ) {
      return;
    }

    e.preventDefault();
    void this.requestNavigation({
      url: `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`,
      historyMode: 'push',
    });
  }

  /**
   * View Transitions APIを利用したページ遷移を行う非同期関数
   * @param url 遷移先のURL
   */
  private async handleNavigation(request: NavigationRequest) {
    const normalizedUrl = this.normalizeUrl(request.url);

    // before:navigate のいずれかのリスナーが false を返した場合は中断
    if (!this.emitCancelable('before:navigate', normalizedUrl)) {
      return;
    }

    this.navigating = true;
    this.emit('loading:start');

    try {
      if (request.historyMode === 'push') {
        window.history.pushState(request.state ?? {}, '', normalizedUrl);
      } else if (request.historyMode === 'replace') {
        window.history.replaceState(request.state ?? {}, '', normalizedUrl);
      }

      // View Transition APIをサポートしていないブラウザはフォールバック
      const startViewTransition = (document.startViewTransition as typeof document.startViewTransition | undefined)?.bind(document);
      if (!startViewTransition) {
        await this.updateContent(normalizedUrl);
        return;
      }

      const transition = startViewTransition(async () => {
        await this.updateContent(normalizedUrl);
      });

      await transition.finished;
    } catch (e) {
      console.error('Transition failed', e);
      this.emit('error', new Error('Transition failed'));
    } finally {
      this.navigating = false;
      this.emit('loading:end');
      this.emit('after:navigate', normalizedUrl);
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
        timeoutId = window.setTimeout(() => {
          controller.abort();
        }, this.timeoutDuration);
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
          this.manageFocus();
        }
        this.announcePageChange(document.title);
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
        this.manageFocus();
      }

      // アクセシビリティ: aria-live通知
      this.announcePageChange(newTitle);
    } catch (err) {
      console.error('Navigation failed:', err);

      // AbortError（タイムアウト）のハンドリング
      if (err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
        this.showError('タイムアウト', 'ページの読み込みがタイムアウトしました。');
        this.emit('error', err);
        return;
      }

      this.emit('error', err instanceof Error ? err : new Error(String(err)));

      if (err instanceof TypeError && err.message.includes('fetch')) {
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
    const currentMetaTag = document.querySelector('meta[name="description"]');

    if (newDescription !== null && newDescription !== undefined) {
      let metaTag = currentMetaTag;
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute('name', 'description');
        document.head.appendChild(metaTag);
      }
      metaTag.setAttribute('content', newDescription);
      return;
    }

    // 遷移先に description が存在しない場合は古い値を残さない
    if (currentMetaTag) {
      currentMetaTag.remove();
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

  /**
   * 現在URLを取得（pathname + search + hash）
   */
  private getCurrentUrl(): string {
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
  }

  /**
   * URL文字列を正規化する
   * @param url 相対URLまたは絶対URL
   */
  private normalizeUrl(url: string): string {
    const normalized = new URL(url, window.location.href);
    return `${normalized.pathname}${normalized.search}${normalized.hash}`;
  }

  /**
   * ナビゲーション要求を処理する
   * 処理中に新しい要求が来た場合は、最後の要求のみを保持する（後勝ち）。
   * @param request ナビゲーション要求
   */
  private requestNavigation(request: NavigationRequest): Promise<void> {
    const normalizedRequest: NavigationRequest = {
      ...request,
      url: this.normalizeUrl(request.url),
    };

    return new Promise<void>((resolve, reject) => {
      if (this.isDestroyed) {
        resolve();
        return;
      }

      if (this.navigationInProgress) {
        // ローディング中は最後に要求された遷移のみ保持する（後勝ち）
        if (this.pendingNavigation) {
          this.pendingNavigation.resolve();
        }
        this.pendingNavigation = {
          request: normalizedRequest,
          resolve,
          reject,
        };
        return;
      }

      this.navigationInProgress = true;
      void this.processNavigationLoop(normalizedRequest, resolve, reject);
    });
  }

  /**
   * ナビゲーション要求を順次処理する
   * 処理中に新しい要求が来た場合は pendingNavigation に保持され、現在の処理後に実行される。
   */
  private async processNavigationLoop(
    initialRequest: NavigationRequest,
    initialResolve: () => void,
    initialReject: (reason?: unknown) => void,
  ) {
    let currentRequest: NavigationRequest = initialRequest;
    let currentResolve = initialResolve;
    let currentReject = initialReject;

    for (;;) {
      try {
        await this.handleNavigation(currentRequest);
        currentResolve();
      } catch (error) {
        currentReject(error);
      }

      if (!this.pendingNavigation) {
        break;
      }

      const next = this.pendingNavigation;
      this.pendingNavigation = null;
      currentRequest = next.request;
      currentResolve = next.resolve;
      currentReject = next.reject;
    }

    this.navigationInProgress = false;
  }
}
