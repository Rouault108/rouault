import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('ui-icon-button')
export class UiIconButton extends LitElement {
  static override styles = css`
    :host {
      /* -------------------------------------------------------------
       * 基本カラー設定 & 変数定義
       * ------------------------------------------------------------- */
      --btn-h: var(--color-primary-hue, 217);
      --btn-s: var(--color-primary-sat, 75%);
      --btn-l: var(--color-primary-lightness, 50%);
      
      /* 状態ごとの色 (デフォルト) - Primary */
      --bg-default: hsl(var(--btn-h), var(--btn-s), var(--btn-l));
      --bg-hover:   hsl(var(--btn-h), var(--btn-s), calc(var(--btn-l) - 5%));
      --bg-active:  hsl(var(--btn-h), var(--btn-s), calc(var(--btn-l) - 10%));
      
      --text-default: var(--color-background);
      --text-disabled: hsl(220, 10%, 60%);
      
      --border-color: transparent;
      --outline-color: hsl(var(--btn-h), var(--btn-s), calc(var(--btn-l) + 10%));

      /* -------------------------------------------------------------
       * スタイル適用（デザインシステムトークン使用）
       * ------------------------------------------------------------- */
      display: inline-flex;
      align-items: center;
      justify-content: center;
      
      font-family: var(--font-sans, system-ui, sans-serif);
    }

    :host([disabled]) {
      cursor: not-allowed;
      pointer-events: none;
    }

    /* -------------------------------------------------------------
     * ボタン本体
     * ------------------------------------------------------------- */
    .icon-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      
      background-color: var(--bg-default);
      color: var(--text-default);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-lg, 8px);
      
      cursor: pointer;
      text-decoration: none;
      
      /* モーション（デザインシステムトークン使用） */
      transition: 
        background-color var(--motion-duration, 200ms) var(--ease-out, ease-out),
        color var(--motion-duration, 200ms) var(--ease-out, ease-out),
        border-color var(--motion-duration, 200ms) var(--ease-out, ease-out),
        transform var(--duration-fast, 100ms) var(--ease-out, ease-out),
        box-shadow var(--motion-duration, 200ms) var(--ease-out, ease-out),
        opacity var(--motion-duration, 200ms) var(--ease-out, ease-out);
    }

    /* -------------------------------------------------------------
     * サイズバリエーション
     * ------------------------------------------------------------- */
    :host([size="sm"]) .icon-button {
      width: 28px;
      height: 28px;
      padding: 4px;
    }

    :host([size="md"]) .icon-button {
      width: 36px;
      height: 36px;
      padding: 8px;
    }

    :host([size="lg"]) .icon-button {
      width: 44px;
      height: 44px;
      padding: 10px;
    }

    /* -------------------------------------------------------------
     * 状態 (States)
     * ------------------------------------------------------------- */

    /* Hover */
    :host(:not([disabled]):not([loading])) .icon-button:hover {
      background-color: var(--bg-hover);
      transform: translateY(-1px);
      box-shadow: var(--shadow-md, 0 4px 6px -1px rgba(0, 0, 0, 0.1));
    }

    /* Focus */
    .icon-button:focus-visible {
      outline: 2px solid var(--outline-color);
      outline-offset: 2px;
    }

    /* Active / Pressed */
    :host(:not([disabled]):not([loading])) .icon-button:active {
      background-color: var(--bg-active);
      transform: translateY(0);
      box-shadow: none;
    }

    /* Disabled */
    :host([disabled]) .icon-button {
      --btn-bg: var(--color-background-subtle);
      --btn-text: var(--color-foreground-muted);
      --btn-border: transparent;
      
      background-color: var(--btn-bg);
      color: var(--btn-text);
      border-color: var(--btn-border);
      cursor: not-allowed;
      opacity: 0.5;
    }

    /* Loading */
    :host([loading]) .icon-button {
      cursor: wait;
      opacity: 0.7;
    }

    /* -------------------------------------------------------------
     * バリアント (Variants)
     * ------------------------------------------------------------- */

    /* Secondary */
    :host([variant="secondary"]) {
      /* ダークモードでは --bg-surface-1 が定義されるため、それを優先的に使用 */
      --bg-default: var(--bg-surface-1, var(--color-background, #ffffff));
      --bg-hover: var(--bg-surface-2, var(--color-background-subtle, #f9fafb));
      --bg-active: var(--bg-surface-3, hsl(220, 15%, 88%));
      --text-default: var(--color-foreground, #111827);
      --border-color: var(--color-border, #e5e7eb);
      --outline-color: var(--color-primary, #3b82f6);
    }

    :host([variant="secondary"]) .icon-button:hover {
      box-shadow: none;
      transform: translateY(0);
    }

    /* Ghost */
    :host([variant="ghost"]) {
      --bg-default: transparent;
      --bg-hover: var(--bg-surface-1, var(--color-background-subtle, #f9fafb));
      --bg-active: var(--bg-surface-2, hsl(220, 15%, 90%));
      --text-default: var(--color-foreground, #111827);
      --border-color: transparent;
      --outline-color: var(--color-primary, #3b82f6);
    }

    :host([variant="ghost"]) .icon-button:hover {
      box-shadow: none;
    }

    /* Outlined */
    :host([variant="outlined"]) {
      --bg-default: transparent;
      --bg-hover: hsl(var(--btn-h), 100%, 97%);
      --bg-active: hsl(var(--btn-h), 100%, 94%);
      --text-default: var(--color-primary, #3b82f6);
      --border-color: var(--color-primary, #3b82f6);
      --outline-color: var(--color-primary, #3b82f6);
    }

    :host([variant="outlined"]) .icon-button:hover {
      box-shadow: none;
      transform: translateY(0);
    }

    /* Danger */
    :host([variant="danger"]) {
      --btn-h: 0;
      --btn-s: 84%;
      --btn-l: 60%;
      --bg-default: hsl(var(--btn-h), var(--btn-s), var(--btn-l));
      --bg-hover: hsl(var(--btn-h), var(--btn-s), calc(var(--btn-l) - 5%));
      --bg-active: hsl(var(--btn-h), var(--btn-s), calc(var(--btn-l) - 10%));
      --text-default: white;
      --outline-color: hsl(var(--btn-h), var(--btn-s), calc(var(--btn-l) + 10%));
    }

    /* -------------------------------------------------------------
     * ダークモード対応
     * Elevation Tones に基づく背景色とコントラスト改善
     * ------------------------------------------------------------- */
    @media (prefers-color-scheme: dark) {
      :host([variant="secondary"]) {
        --bg-default: var(--bg-surface-1, #171717);
        --bg-hover: var(--bg-surface-2, #262626);
        --bg-active: var(--bg-surface-3, #404040);
        --border-color: var(--color-border, #27272a);
      }

      :host([variant="ghost"]) {
        --bg-hover: var(--bg-surface-1, #171717);
        --bg-active: var(--bg-surface-2, #262626);
      }

      :host([variant="outlined"]) {
        --bg-hover: hsl(var(--btn-h), 50%, 15%);
        --bg-active: hsl(var(--btn-h), 50%, 20%);
        --text-default: var(--color-primary, #60a5fa);
        --border-color: var(--color-primary, #60a5fa);
      }
    }

    /* data-theme="dark" 属性によるダークモード対応 */
    :host-context([data-theme="dark"]):host([variant="secondary"]) {
      --bg-default: var(--bg-surface-1, #171717);
      --bg-hover: var(--bg-surface-2, #262626);
      --bg-active: var(--bg-surface-3, #404040);
      --text-default: var(--color-foreground, #ededed);
      --border-color: var(--color-border, #27272a);
    }

    :host-context([data-theme="dark"]):host([variant="ghost"]) {
      --bg-hover: var(--bg-surface-1, #171717);
      --bg-active: var(--bg-surface-2, #262626);
      --text-default: var(--color-foreground, #ededed);
    }

    :host-context([data-theme="dark"]):host([variant="outlined"]) {
      --bg-hover: hsl(var(--btn-h), 50%, 15%);
      --bg-active: hsl(var(--btn-h), 50%, 20%);
      --text-default: var(--color-primary, #60a5fa);
      --border-color: var(--color-primary, #60a5fa);
    }

    /* -------------------------------------------------------------
     * アイコンスロット
     * ------------------------------------------------------------- */
    .icon-slot {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    :host([loading]) .icon-slot {
      visibility: hidden;
    }

    /* -------------------------------------------------------------
     * スピナー
     * ------------------------------------------------------------- */
    .spinner {
      position: absolute;
      width: 16px;
      height: 16px;
      border: 2px solid currentColor;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .spinner {
        animation: none;
        border-top-color: currentColor;
        opacity: 0.3;
      }
    }
  `;

  @property({ type: String, reflect: true })
  variant: 'primary' | 'secondary' | 'ghost' | 'outlined' | 'danger' = 'primary';

  @property({ type: String, reflect: true })
  size: 'sm' | 'md' | 'lg' = 'md';

  @property({ type: Boolean, reflect: true })
  disabled = false;

  @property({ type: Boolean, reflect: true })
  loading = false;

  @property({ type: String })
  override ariaLabel = '';

  @property({ type: String })
  loadingLabel = '読み込み中';

  private _onClick(e: Event) {
    if (this.disabled || this.loading) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  override render() {
    return html`
      <button
        class="icon-button"
        ?disabled="${this.disabled || this.loading}"
        aria-label="${this.ariaLabel}"
        @click="${this._onClick}"
      >
        <div class="icon-slot">
          <slot></slot>
        </div>
        ${this.loading
          ? html`<span class="spinner" role="status" aria-label="${this.loadingLabel}"></span>`
          : ''}
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-icon-button': UiIconButton;
  }
}
