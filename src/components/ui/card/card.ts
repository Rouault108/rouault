import { LitElement, css, html, type CSSResult, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ClickableController } from '../../../lib/controllers/clickable-controller.js';

@customElement('ui-card')
export class UiCard extends LitElement {
  static override get styles(): CSSResult[] {
    return [
      css`
        :host {
          /* -------------------------------------------------------------
           * 基本スタイル
           * ------------------------------------------------------------- */
          display: block;
          border-radius: var(--radius-lg, 8px);
          background-color: var(--color-background);
          color: var(--color-foreground);
          font-family: var(--font-sans, system-ui, sans-serif);
          
          /* モーション */
          transition: 
            transform var(--motion-duration, 200ms) var(--motion-easing, ease-out),
            box-shadow var(--motion-duration, 200ms) var(--motion-easing, ease-out),
            background-color var(--motion-duration, 200ms) var(--motion-easing, ease-out),
            border-color var(--motion-duration, 200ms) var(--motion-easing, ease-out);
        }

        /* コンテナ（内部構造） */
        .card-container {
          display: flex;
          flex-direction: column;
          height: 100%;
        }
        
        /* コンテンツラッパー（Header + Body + Footer） */
        .card-content {
          display: flex;
          flex-direction: column;
          flex: 1; /* Bodyが伸びるように */
        }

        /* -------------------------------------------------------------
         * パディング制御 (Padding Logic)
         * - X方向(左右): 一貫性を保つためサイズに関わらず固定（あるいは微調整のみ）
         * - Y方向(上下): Density（密度）を制御するために大きく変動させる
         * ------------------------------------------------------------- */
        
        :host {
          --card-padding-x: var(--space-6, 1.5rem); /* 24px - デフォルト左右 */
          --card-padding-y: var(--space-6, 1.5rem); /* 24px - デフォルト上下 */
          
          --card-header-gap: var(--space-4, 1rem); /* HeaderとBodyの間 */
          --card-footer-gap: var(--space-4, 1rem); /* FooterとBodyの間 */
        }

        .card-header {
          padding-top: var(--card-padding-y);
          padding-left: var(--card-padding-x);
          padding-right: var(--card-padding-x);
          padding-bottom: var(--card-header-gap);
        }

        .card-body {
          padding-top: 0; /* Headerとの兼ね合いで調整 */
          padding-bottom: 0;
          padding-left: var(--card-padding-x);
          padding-right: var(--card-padding-x);
          flex: 1; /* Bodyが伸びるように */
        }
        
        /* Headerがない場合のBody上部余白 */
        .card-header[hidden] + .card-body {
          padding-top: var(--card-padding-y);
        }

        /* Footerがない（または隠れている）場合のBody下部余白 */
        .card-body:last-child,
        .card-body:has(+ .card-footer[hidden]) {
          padding-bottom: var(--card-padding-y);
        }

        .card-footer {
          padding-top: var(--card-footer-gap);
          padding-left: var(--card-padding-x);
          padding-right: var(--card-padding-x);
          padding-bottom: var(--card-padding-y);
          
          /* デフォルトレイアウト */
          display: flex;
          align-items: center;
          gap: var(--space-2, 0.5rem);
        }

        /* -------------------------------------------------------------
         * スロット要素の基本挙動
         * ------------------------------------------------------------- */

        .card-header[hidden],
        .card-footer[hidden] {
          display: none;
        }

        .card-media {
          overflow: hidden;
          /* デフォルト(Vertical)の角丸 */
          border-radius: var(--radius-lg, 8px) var(--radius-lg, 8px) 0 0;
          
          /* Flexアイテムとしての挙動（Horizontal時などに重要） */
          display: flex; 
          flex-direction: column;
        }

        .card-media ::slotted(img),
        .card-media ::slotted(video) {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        /* ダミー画像用の div には flex レイアウトを提供 */
        .card-media ::slotted(div) {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .card-media:empty {
          display: none;
        }

        /* 最初の要素がメディアなら角丸を上部のみに (Vertical) */
        :host(:not([orientation="horizontal"])) .card-media:first-child {
          border-radius: var(--radius-lg, 8px) var(--radius-lg, 8px) 0 0;
        }

        /* メディアがあるときは、他のセクションの上部角丸を削除 (Vertical) */
        :host(:not([orientation="horizontal"])) .card-media:first-child + .card-content {
          border-top-left-radius: 0;
          border-top-right-radius: 0;
        }
        
        /* -------------------------------------------------------------
         * 水平レイアウト (Horizontal Orientation)
         * ------------------------------------------------------------- */
         
        :host([orientation="horizontal"]) .card-container {
          flex-direction: row;
        }

        :host([orientation="horizontal"]) .card-media {
          width: 33%; /* デフォルトで1/3幅 */
          min-width: 150px; /* 最小幅確保 */
          height: auto; /* Flexboxのstretchにより親の高さに追従 */
          min-height: 200px; /* 最小高さ確保 */
          flex-shrink: 0;
          border-radius: var(--radius-lg, 8px) 0 0 var(--radius-lg, 8px); /* 左側のみ角丸 */
        }
        
        :host([orientation="horizontal"]) .card-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0; /* Flexbox内でのテキスト折り返し用 */
        }

        /* -------------------------------------------------------------
         * バリアント (Variants)
         * ------------------------------------------------------------- */

        /* Elevated (デフォルト) - 影付き */
        :host([variant="elevated"]) {
          box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1));
          border: none;
        }

        /* ダークモード時は影ではなく Elevation Tones で高さを表現 */
        @media (prefers-color-scheme: dark) {
          :host([variant="elevated"]:not([data-theme="light"])) {
            background-color: var(--bg-surface-1, var(--color-background-subtle));
            box-shadow: none;
          }
        }

        :root[data-theme="dark"] :host([variant="elevated"]) {
          background-color: var(--bg-surface-1, var(--color-background-subtle));
          box-shadow: none;
        }

        /* Outlined - 枠線 */
        :host([variant="outlined"]) {
          border: 1px solid var(--color-border);
          box-shadow: none;
        }

        /* Filled - 背景色 */
        :host([variant="filled"]) {
          background-color: var(--color-background-subtle);
          border: none;
          box-shadow: none;
        }
        
        /* -------------------------------------------------------------
         * パディングバリアント (Padding Variants)
         * 左右(X)は固定し、上下(Y)のみを変動させて密度を変える
         * ------------------------------------------------------------- */

        :host([padding="none"]) {
          --card-padding-x: 0;
          --card-padding-y: 0;
          --card-header-gap: 0;
          --card-footer-gap: 0;
        }

        :host([padding="sm"]) {
          --card-padding-y: var(--space-3, 0.75rem); /* 12px */
          --card-header-gap: var(--space-2, 0.5rem);
          --card-footer-gap: var(--space-3, 0.75rem); /* 広げる: 0.5rem -> 0.75rem */
        }

        :host([padding="md"]) {
          --card-padding-y: var(--space-5, 1.25rem); /* 20px */
          --card-header-gap: var(--space-3, 0.75rem);
          --card-footer-gap: var(--space-5, 1.25rem); /* 広げる: 0.75rem -> 1.25rem */
        }

        :host([padding="lg"]) {
          --card-padding-y: var(--space-8, 2rem); /* 32px */
          --card-header-gap: var(--space-4, 1rem);
          --card-footer-gap: var(--space-8, 2rem); /* 広げる: 1rem -> 2rem */
        }

        /* -------------------------------------------------------------
         * インタラクティブ (Interactive)
         * ------------------------------------------------------------- */

        :host([interactive]) {
          cursor: pointer;
          user-select: none;
        }

        :host([interactive]:hover) {
          transform: translateY(-2px);
        }

        :host([interactive][variant="elevated"]:hover) {
          box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
        }

        :host([interactive][variant="outlined"]:hover) {
          border-color: var(--color-border-hover);
        }

        :host([interactive][variant="filled"]:hover) {
          background-color: var(--color-background);
        }

        :host([interactive]:active) {
          transform: translateY(0);
        }

        /* フォーカス（キーボードナビゲーション対応） */
        :host([interactive]:focus-visible) {
          outline: 2px solid var(--color-primary);
          outline-offset: 2px;
        }
      `
    ];
  }

  @property({ type: String, reflect: true })
  variant: 'elevated' | 'outlined' | 'filled' = 'elevated';

  @property({ type: String, reflect: true })
  padding: 'none' | 'sm' | 'md' | 'lg' = 'md';

  @property({ type: Boolean, reflect: true })
  interactive = false;

  @property({ type: String, reflect: true })
  orientation: 'vertical' | 'horizontal' = 'vertical';

  // スロット内容の監視用
  @state()
  private _hasHeaderContent = false;

  @state()
  private _hasFooterContent = false;

  // インタラクティブ機能の提供（Reactive Controller）
  private _clickable = new ClickableController(this, () => this.interactive);

  override updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    // ClickableController が自動的に interactive の変更を監視
  }

  private _onHeaderSlotChange(e: Event) {
    const slot = e.target as HTMLSlotElement;
    this._hasHeaderContent = slot.assignedNodes({ flatten: true }).length > 0;
  }

  private _onFooterSlotChange(e: Event) {
    const slot = e.target as HTMLSlotElement;
    this._hasFooterContent = slot.assignedNodes({ flatten: true }).length > 0;
  }

  override render() {
    return html`
      <div class="card-container" part="container">
        <div class="card-media" part="media">
          <slot name="media"></slot>
        </div>
        
        <div class="card-content">
          <div class="card-header" part="header" ?hidden="${!this._hasHeaderContent}">
            <slot name="header" @slotchange="${this._onHeaderSlotChange}"></slot>
          </div>
          <div class="card-body" part="body">
            <slot></slot>
          </div>
          <div class="card-footer" part="footer" ?hidden="${!this._hasFooterContent}">
            <slot name="footer" @slotchange="${this._onFooterSlotChange}"></slot>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-card': UiCard;
  }
}
