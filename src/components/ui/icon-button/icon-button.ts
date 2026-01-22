import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('ui-icon-button')
export class UiIconButton extends LitElement {
  static override styles = css`
    :host {
      /* -------------------------------------------------------------
       * 基本カラー設定 & 変数定義
       * ------------------------------------------------------------- */
      --btn-h: var(--color-primary-hue, 220);
      --btn-s: var(--color-primary-sat, 90%);
      --btn-l: var(--color-primary-lightness, 55%);
      
      /* 状態ごとの色 (デフォルト) - Primary */
      --bg-default: hsl(var(--btn-h), var(--btn-s), var(--btn-l));
      --bg-hover:   hsl(var(--btn-h), var(--btn-s), calc(var(--btn-l) - 5%));
      --bg-active:  hsl(var(--btn-h), var(--btn-s), calc(var(--btn-l) - 10%));
      
      --text-default: var(--color-background);
      --text-disabled: hsl(220, 10%, 60%);
      
      --border-color: transparent;
      --outline-color: hsl(var(--btn-h), var(--btn-s), calc(var(--btn-l) + 10%));

      /* 現在適用されている変数 */
      --btn-bg: var(--bg-default);
      --btn-text: var(--text-default);
      --btn-border: var(--border-color);

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
      
      background-color: var(--btn-bg);
      color: var(--btn-text);
      border: 1px solid var(--btn-border);
      border-radius: var(--radius-md, 6px);
      
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
      --bg-default: var(--color-background);
      --bg-hover: var(--color-background-subtle);
      --bg-active: hsl(220, 15%, 90%);
      --text-default: var(--color-foreground);
      --border-color: var(--color-border);
      --outline-color: var(--color-primary);
    }

    /* Ghost */
    :host([variant="ghost"]) {
      --bg-default: transparent;
      --bg-hover: var(--color-background-subtle);
      --bg-active: hsl(220, 15%, 90%);
      --text-default: var(--color-foreground);
      --border-color: transparent;
      --outline-color: var(--color-primary);
    }

    :host([variant="ghost"]) .icon-button:hover {
      box-shadow: none;
    }

    /* Outlined */
    :host([variant="outlined"]) {
      --bg-default: transparent;
      --bg-hover: rgba(var(--primary-rgb), 0.1);
      --bg-active: rgba(var(--primary-rgb), 0.2);
      --text-default: var(--color-primary);
      --border-color: var(--color-primary);
      --outline-color: var(--color-primary);
    }

    :host([variant="outlined"]) .icon-button:hover {
      box-shadow: none;
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
