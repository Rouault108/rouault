/**
 * シンプルなView Transition APIを利用したルーター
 */

export class Router {
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
            console.error('Transition failed', e);
        }
    }

    /**
     * コンテンツの更新を行う非同期関数
     * @param url 遷移先のURL
     */
    private async updateContent(url: string) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const text = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(text, 'text/html');

            const newContent = doc.querySelector('main')?.innerHTML;
            if (!newContent) throw new Error('No main content found in response');

            // タイトルを更新先のタイトルに変更
            document.title = doc.title;

            // メインコンテンツを更新先のコンテンツに変更
            if (this.outlet) {
                this.outlet.innerHTML = newContent;
            }

            // コンテンツ差し替え後の再初期化処理
            this.reinitializeScripts();

        } catch (err) {
            console.error('Navigation failed:', err);
            if (this.outlet) {
                // 404ページ仮実装
                this.outlet.innerHTML = '<h1>404 - Not Found</h1><p>Failed to load content.</p>';
            }
        }
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
