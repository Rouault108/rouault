import { css, html, LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * 検索トリガー (Search Trigger) コンポーネント
 *
 * ヘッダー等に配置され、検索ダイアログ (`<ui-search-dialog>`) を起動するためだけのボタンです。
 *
 * ## デザイン哲学
 *
 * - **Dummy Input (Mental Model)**: 外見は検索ボックス（Input）そのものですが、
 *   実際には文字入力を行わず、アクティブ化（クリック・Enter・Space）によって
 *   即座にモーダルを展開します。
 * - **Cursor: default**: 文字入力カーソル（I-beam）による偽の期待を与えず、
 *   かつ通常のボタン（Pointer）ほど主張しない「ツール」としての感触を提供します
 *   （Linear/Spotlight 準拠）。
 *
 * ## レスポンシブ挙動
 *
 * - **デスクトップ**: 検索アイコン + プレースホルダーテキスト + ショートカットバッジ
 * - **モバイル (`≤640px`)**: 検索アイコンのみ（正方形 32×32px）
 *   - `::after` 擬似要素で 44×44px のタッチターゲットを確保
 *
 * ## イベント
 *
 * アクティベーション時に `open-search-dialog` カスタムイベントを発火します。
 * 親コンポーネントまたはアプリケーションレベルでこのイベントをリスンし、
 * `<ui-search-dialog>` の表示処理を実装してください。
 *
 * @property {string} placeholder - プレースホルダーテキスト（デフォルト: "検索..."）
 * @property {boolean} disabled   - 無効状態
 *
 * @fires open-search-dialog - クリック・Enter・Space でアクティベートされた時に発火
 *
 * @cssprop --bg-fill-muted        - デフォルト・ホバー時の背景色
 * @cssprop --bg-default           - フォーカス・アクティブ時の背景色
 * @cssprop --border-width         - ボーダー幅
 * @cssprop --border-default       - ホバー・フォーカス・アクティブ時のボーダー色
 * @cssprop --control-height-md    - 高さ (32px)
 * @cssprop --radius-md            - 角丸 (6px)
 * @cssprop --space-2              - モバイルパディング (8px)
 * @cssprop --space-3              - デスクトップパディング (12px)
 * @cssprop --icon-base            - アイコンサイズ (16px)
 * @cssprop --fg-muted             - アイコン色
 * @cssprop --fg-subtle            - プレースホルダー色
 * @cssprop --text-base            - プレースホルダーフォントサイズ (14px)
 * @cssprop --font-normal          - プレースホルダーフォントウェイト (400)
 * @cssprop --scale-pressed        - 押下時のスケール (0.96)
 * @cssprop --duration-fast        - トランジション時間 (70ms)
 * @cssprop --ease-out             - イージング関数
 * @cssprop --focus-ring-width     - フォーカスリング幅
 * @cssprop --focus-ring-color     - フォーカスリング色
 * @cssprop --focus-ring-offset    - フォーカスリングオフセット
 * @cssprop --animation-focus      - Adaptive Focus アニメーション
 * @cssprop --opacity-disabled     - 無効時の不透明度 (0.5)
 * @cssprop --control-min-touch    - 最低タッチターゲットサイズ (44px)
 *
 * @csspart button      - 内部の button 要素
 * @csspart icon        - 検索アイコンのラッパー
 * @csspart placeholder - プレースホルダーテキスト
 * @csspart badge       - ショートカットバッジのラッパー
 *
 * @example
 * ```html
 * <!-- 基本的な使用 -->
 * <ui-search-trigger></ui-search-trigger>
 *
 * <!-- カスタムプレースホルダー -->
 * <ui-search-trigger placeholder="ドキュメントを検索..."></ui-search-trigger>
 *
 * <!-- 無効状態 -->
 * <ui-search-trigger disabled></ui-search-trigger>
 *
 * <!-- イベントリスン -->
 * <ui-search-trigger id="trigger"></ui-search-trigger>
 * <script>
 *   document.getElementById('trigger').addEventListener('open-search-dialog', () => {
 *     // 検索ダイアログを開く処理
 *   });
 * </script>
 * ```
 */
@customElement('ui-search-trigger')
export class SearchTrigger extends LitElement {
    static override styles = css`
    /* ── ホスト: インラインブロック ── */
    :host {
      display: inline-flex;
    }

    /* ── ボタン本体 ── */
    button {
      /* Layout */
      display: inline-flex;
      align-items: center;
      gap: var(--space-2, 8px);
      position: relative;

      /* Size */
      height: var(--control-height-md, 32px);
      min-width: 280px;
      max-width: 400px;
      padding: 0 var(--space-3, 12px);

      /* Border & Radius */
      border: var(--border-width, 1px) solid transparent;
      border-radius: var(--radius-md, 6px);

      /* Background */
      background: var(--bg-fill-muted, oklch(95% 0 0));

      /* Typography */
      font-family: inherit;
      font-size: var(--text-base, 14px);
      font-weight: var(--font-normal, 400);
      line-height: 1;

      /* Interaction */
      /*
       * cursor: default — 文字入力カーソル（I-beam）による偽の期待を与えず、
       * かつ通常のボタン（Pointer）ほど主張しない「ツール」としての感触を提供します。
       * Linear/Spotlight 準拠。
       */
      cursor: default;
      user-select: none;

      /* Transition: 明示的なプロパティリストを使用（transition: all 禁止） */
      transition:
        background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        border-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        transform var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        outline-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    /* Hover: 明確なボーダーでインタラクティブ要素のエッジをフィードバック */
    button:hover:not(:disabled) {
      border-color: var(--border-default, oklch(85% 0.01 250));
    }

    /* Focus: 入力準備状態として白地（デフォルト背景）に切り替え */
    button:focus-visible {
      border-color: var(--border-default, oklch(85% 0.01 250));
      background: var(--bg-default, oklch(100% 0 0));
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus, none);
    }

    /* Active (Pressed): タクタイルシグナル */
    button:active:not(:disabled) {
      border-color: var(--border-default, oklch(85% 0.01 250));
      background: var(--bg-default, oklch(100% 0 0));
      transform: scale(var(--scale-pressed, 0.96));
    }

    /* Disabled */
    button:disabled {
      opacity: var(--opacity-disabled, 0.5);
      cursor: not-allowed;
      pointer-events: none;
    }

    /* ── 検索アイコン ── */
    .icon {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: var(--icon-base, 16px);
      height: var(--icon-base, 16px);
      color: var(--fg-muted, oklch(48% 0.01 250));
    }

    .icon svg {
      width: 100%;
      height: 100%;
    }

    /* ── プレースホルダーテキスト ── */
    .placeholder {
      flex: 1;
      text-align: left;
      color: var(--fg-subtle, oklch(65% 0.01 250));
      font-size: var(--text-base, 14px);
      font-weight: var(--font-normal, 400);
      user-select: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* ── ショートカットバッジ ── */
    .badge {
      display: flex;
      align-items: center;
      flex-shrink: 0;
      margin-left: auto;
    }

    /* ── モバイル: アイコンのみ表示 (@media --bp-sm = 640px) ── */
    @media (max-width: 640px) {
      button {
        /* 正方形に縮小 */
        min-width: unset;
        max-width: unset;
        width: var(--control-height-md, 32px);
        padding: 0 var(--space-2, 8px);
        justify-content: center;
      }

      /* プレースホルダーとバッジを非表示 */
      .placeholder,
      .badge {
        display: none;
      }

      /*
       * タッチターゲット: 視覚的サイズは 32px だが、
       * ::after 擬似要素で --control-min-touch (44px) のヒットエリアを確保
       */
      button::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        min-width: var(--control-min-touch, 44px);
        min-height: var(--control-min-touch, 44px);
        pointer-events: none;
      }
    }

    /* ── Forced Colors Mode ── */
    /*
     * このコンポーネントは「Input に見せかけた Button」という視覚的欺瞞を行うため、
     * forced-colors モードで背景色が消失すると、ボタンなのか入力欄なのか判別不能になります。
     * 境界線強制は必須実装です。
     */
    @media (forced-colors: active) {
      :host {
        /* 境界線を強制し、ボタン領域の輪郭を明確化 */
        border: var(--border-width, 1px) solid CanvasText !important;
        background: Canvas !important;
      }

      button {
        border: var(--border-width, 1px) solid CanvasText;
        background: Canvas;
      }

      button:hover:not(:disabled) {
        border-color: CanvasText;
      }

      button:focus-visible {
        /* box-shadow は消失するため、実線のアウトラインを強制 */
        outline: 3px solid CanvasText;
        box-shadow: none;
      }

      button:active:not(:disabled) {
        /* アクティブ状態もボーダーで明示（scale は維持） */
        border-color: CanvasText;
        background: ButtonFace;
      }

      /* 内部アイコン・テキストの色もシステムカラーに追従 */
      .icon,
      .placeholder {
        color: CanvasText;
      }
    }
  `;

    /**
     * プレースホルダーテキスト
     * @default "検索..."
     */
    @property({ type: String, reflect: true })
    placeholder = '検索...';

    /**
     * 無効状態
     * @default false
     */
    @property({ type: Boolean, reflect: true })
    disabled = false;

    // ──────────────────────────────────────────────
    // Event Handlers
    // ──────────────────────────────────────────────

    /**
     * アクティベーション時のハンドラ。
     * クリック・Enter・Space によって検索ダイアログを起動します。
     *
     * **Explicit Activation Only**: フォーカス取得（:focus）だけではモーダルを開きません。
     */
    private _handleActivate = (): void => {
        if (this.disabled) return;

        this.dispatchEvent(
            new CustomEvent('open-search-dialog', {
                bubbles: true,
                composed: true,
            }),
        );
    };

    // ──────────────────────────────────────────────
    // Public API
    // ──────────────────────────────────────────────

    /**
     * 内部 button 要素にフォーカスを当てます。
     */
    override focus(options?: FocusOptions): void {
        this.shadowRoot?.querySelector<HTMLButtonElement>('button')?.focus(options);
    }

    /**
     * 内部 button 要素からフォーカスを外します。
     */
    override blur(): void {
        this.shadowRoot?.querySelector<HTMLButtonElement>('button')?.blur();
    }

    /**
     * プログラム的にアクティベートします（検索ダイアログを開く）。
     */
    override click(): void {
        this.shadowRoot?.querySelector<HTMLButtonElement>('button')?.click();
    }

    // ──────────────────────────────────────────────
    // Render
    // ──────────────────────────────────────────────

    override render() {
        return html`
      <button
        part="button"
        type="button"
        ?disabled="${this.disabled}"
        aria-label="検索ダイアログを開く"
        aria-haspopup="dialog"
        aria-keyshortcuts="Control+K Meta+K"
        aria-disabled="${this.disabled ? 'true' : 'false'}"
        @click="${this._handleActivate}"
      >
        <!-- 検索アイコン -->
        <span class="icon" part="icon" aria-hidden="true">
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <circle cx="6.5" cy="6.5" r="4" />
            <line x1="10" y1="10" x2="14" y2="14" />
          </svg>
        </span>

        <!-- プレースホルダーテキスト（デスクトップのみ表示） -->
        <span class="placeholder" part="placeholder" aria-hidden="true">
          ${this.placeholder}
        </span>

        <!-- ショートカットバッジ（デスクトップのみ表示） -->
        <span class="badge" part="badge" aria-hidden="true">
          <slot name="badge">
            <kbd
              style="
                display: inline-flex;
                align-items: center;
                gap: 2px;
                padding: 2px 5px;
                font-size: 11px;
                font-family: inherit;
                line-height: 1.4;
                color: var(--fg-subtle, oklch(65% 0.01 250));
                background: var(--bg-fill-muted, oklch(95% 0 0));
                border: var(--border-width, 1px) solid var(--border-default, oklch(85% 0.01 250));
                border-radius: 4px;
                white-space: nowrap;
              "
            >⌘K</kbd>
          </slot>
        </span>
      </button>
    `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'ui-search-trigger': SearchTrigger;
    }
}
