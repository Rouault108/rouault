/**
 * シンプルなView Transition APIを利用したルーター
 */

import { ErrorHandler, classifyHttpError } from './error-handler.js';
import { ErrorType, RouaultError } from '../types/errors.js';

export class Router {
    /** ローディング状態を管理 */
    private isLoading = false;

    constructor(private outlet: HTMLElement) {
        this.init();
    }

    /**
     * イベントリスナー設定
     */
    private init() {
        window.addEventListener('popstate', (e) => this.handleNavigation(window.location.pathname));
        document.addEventListener('click', (e) => this.handleAnchorClick(e));

        // 初期ロード
        this.handleNavigation(window.location.pathname);
    }

    /**
     * リンククリックイベントハンドラー
     * 以下の場合はSPA遷移を行わない
     * - target属性がある場合（新規タブで開く場合など）
     * - download属性がある場合（ファイルダウンロードの場合）
     * - rel属性がexternalの場合（外部リンクや、明示的にページ全体をリロードしたいリンク）
     * - href属性がhttpから始まる場合（スキームを明示してある絶対外部リンク）
     * - href属性が#から始まる場合（ページ内リンク）
     * @param e マウスイベント
     */
    private handleAnchorClick(e: MouseEvent) {
        const anchor = (e.target as HTMLElement).closest('a');
        if (!anchor) return;
        if (anchor.target || anchor.hasAttribute('download') || anchor.getAttribute('rel') === 'external') return;

        const href = anchor.getAttribute('href');
        if (!href || href.startsWith('http') || href.startsWith('#')) return;

        e.preventDefault();
        window.history.pushState({}, '', href);
        this.handleNavigation(href);
    }

    /**
     * View Transitions APIを利用したページ遷移を行う非同期関数
     * @param url 遷移先のURL
     */
    private async handleNavigation(url: string) {
        // 既にローディング中の場合はスキップ
        if (this.isLoading) {
            console.warn('Navigation already in progress');
            return;
        }

        // View Transition APIをサポートしていないブラウザはフォールバック
        if (!document.startViewTransition) {
            await this.updateContent(url);
            return;
        }

        const transition = document.startViewTransition(async () => {
            await this.updateContent(url);
        });

        try {
            await transition.finished;
        } catch (e) {
            // View Transition 自体のエラー（通常は発生しない）
            ErrorHandler.handle(e, 'ViewTransition');
        }
    }

    /**
     * コンテンツの更新を行う非同期関数
     * @param url 遷移先のURL
     */
    private async updateContent(url: string) {
        this.isLoading = true;
        this.showLoadingState();

        try {
            // フェッチ実行
            const response = await fetch(url);

            // HTTPエラーのチェック
            if (!response.ok) {
                const error = classifyHttpError(response);
                throw error;
            }

            // HTMLテキストの取得
            const text = await response.text();

            // HTMLのパース
            let doc: Document;
            try {
                const parser = new DOMParser();
                doc = parser.parseFromString(text, 'text/html');
            } catch (parseError) {
                throw new RouaultError(
                    ErrorType.PARSE,
                    'コンテンツの解析に失敗しました',
                    undefined,
                    parseError instanceof Error ? parseError : undefined
                );
            }

            // メインコンテンツの抽出
            const newContent = doc.querySelector('main')?.innerHTML;
            if (!newContent) {
                throw new RouaultError(
                    ErrorType.PARSE,
                    'ページのコンテンツが見つかりません',
                    response.status
                );
            }

            // タイトルの更新
            const newTitle = doc.title;
            if (newTitle) {
                document.title = newTitle;
            }

            // コンテンツの差し替え
            if (this.outlet) {
                this.outlet.innerHTML = newContent;
            }

            // 再初期化処理
            this.reinitializeScripts();

        } catch (err) {
            // エラーハンドリング
            this.showErrorState(err);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * ローディング状態を表示
     */
    private showLoadingState() {
        if (!this.outlet) return;

        // 既存のコンテンツの上に半透明のローディング表示を追加
        const loadingOverlay = document.createElement('div');
        loadingOverlay.className = 'loading-overlay';
        loadingOverlay.setAttribute('aria-live', 'polite');
        loadingOverlay.setAttribute('aria-busy', 'true');
        loadingOverlay.innerHTML = `
            <div class="loading-spinner" role="status">
                <span class="visually-hidden">読み込み中...</span>
            </div>
        `;

        // アニメーション用にわずかに遅延
        requestAnimationFrame(() => {
            loadingOverlay.classList.add('visible');
        });

        this.outlet.appendChild(loadingOverlay);
    }

    /**
     * エラー状態を表示
     */
    private showErrorState(error: unknown) {
        if (!this.outlet) return;

        // エラーをHTML形式で表示
        const errorHTML = ErrorHandler.toHTML(error);
        this.outlet.innerHTML = errorHTML;

        // エラーログ出力
        ErrorHandler.handle(error, 'Router.updateContent');
    }

    /**
     * SPA遷移後の再初期化処理
     * コンテンツを差し替えた後、以下の処理を行う：
     * - PrismJS のシンタックスハイライト
     * - Pagefind の検索 UI 初期化
     * - スクロール位置のリセット
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

        // スクロール位置をトップにリセット
        window.scrollTo(0, 0);

        // 今後、他のライブラリやコンポーネントの初期化が必要になったらここに追加
    }
}
