import { LitElement, css, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';

/**
 * ui-toggle - アクセシブルなトグルスイッチコンポーネント
 *
 * @slot - ラベルテキスト
 *
 * @cssprop --toggle-width - トグルスイッチの幅
 * @cssprop --toggle-height - トグルスイッチの高さ
 * @cssprop --toggle-track-color - トラック（背景）の色
 * @cssprop --toggle-thumb-color - つまみの色
 */
@customElement('ui-toggle')
export class UiToggle extends LitElement {
  static override styles = css`
    /* -------------------------------------------------------------
     * ホスト要素
     * ------------------------------------------------------------- */
    :host {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2, 0.5rem);
      cursor: pointer;
      user-select: none;
      font-family: var(--font-sans, system-ui, sans-serif);
      font-size: var(--text-base, 0.875rem);
      line-height: var(--line-height-normal, 1.5);
      color: var(--color-foreground, #111827);

      /* デザインシステムのトークン */
      --toggle-border-width: 1.5px;
      --toggle-transition: var(--motion-duration, 200ms) var(--ease-out, ease-out);
    }

    :host([disabled]) {
      cursor: not-allowed;
      opacity: 0.5;
    }

    /* -------------------------------------------------------------
     * Hidden Native Input（アクセシビリティ用）
     * ------------------------------------------------------------- */
    .native-input {
      position: absolute;
      opacity: 0;
      width: 0;
      height: 0;
      pointer-events: none;
    }

    /* -------------------------------------------------------------
     * トグルコンテナ
     * ------------------------------------------------------------- */
    .toggle-wrapper {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2, 0.5rem);
      cursor: inherit;
    }

    /* -------------------------------------------------------------
     * トグルトラック（背景）
     * ------------------------------------------------------------- */
    .toggle-track {
      position: relative;
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
      
      width: var(--toggle-width, 44px);
      height: var(--toggle-height, 24px);
      
      background-color: var(--toggle-track-color, var(--color-border, #e5e7eb));
      border: var(--toggle-border-width) solid transparent;
      border-radius: 9999px; /* 完全な角丸（ピル型） */
      
      transition:
        background-color var(--toggle-transition),
        border-color var(--toggle-transition),
        box-shadow var(--toggle-transition);
    }

    /* Hover */
    :host(:not([disabled])) .toggle-wrapper:hover .toggle-track {
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary, #3b82f6) 15%, transparent);
    }

    /* Focus */
    .native-input:focus-visible ~ .toggle-wrapper .toggle-track {
      outline: 2px solid var(--color-primary, #3b82f6);
      outline-offset: 2px;
      box-shadow: none; /* ホバーのリングを消す */
    }

    /* Checked (On) */
    :host([checked]) .toggle-track {
      background-color: var(--color-primary, #3b82f6);
      border-color: var(--color-primary, #3b82f6);
    }

    /* Invalid */
    :host([invalid]) .toggle-track {
      border-color: var(--color-error, #ef4444);
      background-color: var(--color-border, #e5e7eb);
    }

    :host([invalid]) .toggle-wrapper:hover .toggle-track {
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-error, #ef4444) 15%, transparent);
    }

    :host([invalid][checked]) .toggle-track {
      background-color: var(--color-error, #ef4444);
      border-color: var(--color-error, #ef4444);
    }

    /* Disabled */
    :host([disabled]) .toggle-track {
      background-color: var(--color-background-subtle, #f9fafb);
      border-color: var(--color-border, #e5e7eb);
      cursor: not-allowed;
    }

    :host([disabled][checked]) .toggle-track {
      background-color: var(--color-background-subtle, #f9fafb);
      opacity: 0.5;
    }

    /* Disabled + Invalid: disabled が優先 */
    :host([disabled][invalid]) .toggle-track {
      background-color: var(--color-background-subtle, #f9fafb);
      border-color: var(--color-border, #e5e7eb);
    }

    /* -------------------------------------------------------------
     * トグルつまみ（Thumb）
     * ------------------------------------------------------------- */
    .toggle-thumb {
      position: absolute;
      left: 2px;
      width: calc(var(--toggle-height, 24px) - 4px);
      height: calc(var(--toggle-height, 24px) - 4px);
      background-color: var(--toggle-thumb-color, white);
      border-radius: 50%;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
      transition:
        transform var(--toggle-transition),
        box-shadow var(--toggle-transition);
    }

    /* On状態: つまみを右に移動 */
    :host([checked]) .toggle-thumb {
      transform: translateX(calc(var(--toggle-width, 44px) - var(--toggle-height, 24px)));
    }

    /* Hover時のつまみのシャドウ強調 */
    :host(:not([disabled])) .toggle-wrapper:hover .toggle-thumb {
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }

    /* -------------------------------------------------------------
     * ラベル
     * ------------------------------------------------------------- */
    .label {
      flex: 1;
      cursor: inherit;
    }

    /* -------------------------------------------------------------
     * サイズバリエーション
     * ------------------------------------------------------------- */
    :host([size='sm']) {
      --toggle-width: 36px;
      --toggle-height: 20px;
      font-size: var(--text-sm, 0.8125rem);
    }

    :host([size='md']) {
      --toggle-width: 44px;
      --toggle-height: 24px;
      font-size: var(--text-base, 0.875rem);
    }

    :host([size='lg']) {
      --toggle-width: 52px;
      --toggle-height: 28px;
      font-size: var(--text-lg, 1rem);
    }

    /* -------------------------------------------------------------
     * ダークモード対応
     * ------------------------------------------------------------- */
    @media (prefers-color-scheme: dark) {
      :host {
        color: var(--color-foreground, #ededed);
        --toggle-track-color: var(--color-border-hover, #3f3f46);
      }

      :host([checked]) .toggle-track {
        background-color: var(--color-primary, #60a5fa);
        border-color: var(--color-primary, #60a5fa);
      }

      :host([disabled]) .toggle-track {
        background-color: var(--bg-surface-1, #171717);
        border-color: var(--color-border, #27272a);
      }

      :host([disabled][checked]) .toggle-track {
        background-color: var(--bg-surface-2, #262626);
        border-color: var(--color-border, #27272a);
      }

      :host([invalid]) .toggle-track {
        border-color: var(--color-error, #ef4444);
        background-color: var(--color-border-hover, #3f3f46);
      }

      :host([invalid][checked]) .toggle-track {
        background-color: var(--color-error, #ef4444);
        border-color: var(--color-error, #ef4444);
      }

      :host([disabled][invalid]) .toggle-track {
        background-color: var(--bg-surface-1, #171717);
        border-color: var(--color-border, #27272a);
      }
    }

    /* data-theme="dark" 対応 */
    :host-context([data-theme='dark']) {
      color: var(--color-foreground, #ededed);
      --toggle-track-color: var(--color-border-hover, #3f3f46);
    }

    :host-context([data-theme='dark']):host([checked]) .toggle-track {
      background-color: var(--color-primary, #60a5fa);
      border-color: var(--color-primary, #60a5fa);
    }

    :host-context([data-theme='dark']):host([disabled]) .toggle-track {
      background-color: var(--bg-surface-1, #171717);
      border-color: var(--color-border, #27272a);
    }

    :host-context([data-theme='dark']):host([disabled][checked]) .toggle-track {
      background-color: var(--bg-surface-2, #262626);
      border-color: var(--color-border, #27272a);
    }

    :host-context([data-theme='dark']):host([invalid]) .toggle-track {
      border-color: var(--color-error, #ef4444);
      background-color: var(--color-border-hover, #3f3f46);
    }

    :host-context([data-theme='dark']):host([invalid][checked]) .toggle-track {
      background-color: var(--color-error, #ef4444);
      border-color: var(--color-error, #ef4444);
    }

    :host-context([data-theme='dark']):host([disabled][invalid]) .toggle-track {
      background-color: var(--bg-surface-1, #171717);
      border-color: var(--color-border, #27272a);
    }

    /* -------------------------------------------------------------
     * prefers-reduced-motion 対応
     * ------------------------------------------------------------- */
    @media (prefers-reduced-motion: reduce) {
      :host {
        --toggle-transition: 0ms;
      }

      .toggle-track,
      .toggle-thumb {
        transition: none;
      }
    }
  `;

  @property({ type: Boolean, reflect: true })
  checked = false;

  @property({ type: Boolean, reflect: true })
  disabled = false;

  @property({ type: Boolean, reflect: true })
  invalid = false;

  @property({ type: String, reflect: true })
  size: 'sm' | 'md' | 'lg' = 'md';

  @property({ type: String })
  value = '';

  @property({ type: String })
  name = '';

  @query('.native-input')
  private _nativeInput!: HTMLInputElement;

  override connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', this._handleHostClick);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener('click', this._handleHostClick);
  }

  private _handleHostClick(e: MouseEvent) {
    if (this.disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // イベントの発生元がネイティブinputなら、処理済みなので無視（無限ループ防止）
    const path = e.composedPath();
    if (path.includes(this._nativeInput)) {
      return;
    }

    // ネイティブ input をクリック
    this._nativeInput.click();
  }

  private _handleChange(e: Event) {
    if (this.disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const target = e.target as HTMLInputElement;
    this.checked = target.checked;

    // カスタムイベントを発火
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { checked: this.checked, value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleKeyDown(e: KeyboardEvent) {
    if (this.disabled) {
      return;
    }

    // Space キーでトグル
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      this._nativeInput.click();
    }
  }

  override render() {
    return html`
      <input
        type="checkbox"
        class="native-input"
        role="switch"
        .checked=${live(this.checked)}
        ?disabled=${this.disabled}
        .value=${this.value}
        name=${this.name}
        aria-checked="${this.checked}"
        @change=${this._handleChange}
      />
      <div
        class="toggle-wrapper"
        @keydown=${this._handleKeyDown}
      >
        <div class="toggle-track" role="presentation">
          <!-- つまみ -->
          <span class="toggle-thumb" aria-hidden="true"></span>
        </div>
        <span class="label">
          <slot></slot>
        </span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-toggle': UiToggle;
  }
}
