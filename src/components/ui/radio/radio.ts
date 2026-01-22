import { LitElement, css, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';

/**
 * ui-radio - アクセシブルなラジオボタンコンポーネント
 *
 * @slot - ラベルテキスト
 *
 * @cssprop --radio-size - ラジオボタンのサイズ
 * @cssprop --radio-border-color - ボーダーカラー
 * @cssprop --radio-bg-color - 背景色
 * @cssprop --radio-dot-color - 選択時の中央ドットの色
 */
@customElement('ui-radio')
export class UiRadio extends LitElement {
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
      line-height: 1.5;
      color: var(--color-foreground, #111827);

      /* デザインシステムのトークン */
      --radio-border-width: 1.5px;
      --radio-transition: var(--motion-duration, 200ms) var(--ease-out, ease-out);
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
     * ラジオボタンコンテナ
     * ------------------------------------------------------------- */
    .radio-wrapper {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2, 0.5rem);
      cursor: inherit;
    }

    /* -------------------------------------------------------------
     * ラジオボタン本体（円形）
     * ------------------------------------------------------------- */
    .radio {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      
      width: var(--radio-size, 20px);
      height: var(--radio-size, 20px);
      
      background-color: var(--radio-bg-color, var(--color-background, #ffffff));
      border: var(--radio-border-width) solid var(--radio-border-color, var(--color-border, #e5e7eb));
      border-radius: 50%; /* 完全な円形 */
      
      transition:
        background-color var(--radio-transition),
        border-color var(--radio-transition),
        box-shadow var(--radio-transition);
    }

    /* Hover */
    :host(:not([disabled])) .radio-wrapper:hover .radio {
      border-color: var(--color-primary, #3b82f6);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary, #3b82f6) 15%, transparent);
    }

    /* Focus */
    .native-input:focus-visible ~ .radio-wrapper .radio {
      outline: 2px solid var(--color-primary, #3b82f6);
      outline-offset: 2px;
      box-shadow: none; /* ホバーのリングを消す */
    }

    /* Checked */
    :host([checked]) .radio {
      background-color: var(--color-primary, #3b82f6);
      border-color: var(--color-primary, #3b82f6);
    }

    /* Invalid */
    :host([invalid]) .radio {
      border-color: var(--color-error, #ef4444);
    }

    :host([invalid]) .radio-wrapper:hover .radio {
      border-color: var(--color-error, #ef4444);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-error, #ef4444) 15%, transparent);
    }

    /* Disabled */
    :host([disabled]) .radio {
      background-color: var(--color-background-subtle, #f9fafb);
      border-color: var(--color-border, #e5e7eb);
      cursor: not-allowed;
    }

    :host([disabled][checked]) .radio {
      background-color: var(--color-background-subtle, #f9fafb);
      opacity: 0.5;
    }

    /* -------------------------------------------------------------
     * 中央ドット（選択時）
     * ------------------------------------------------------------- */
    .dot {
      position: absolute;
      width: 50%;
      height: 50%;
      background-color: var(--radio-dot-color, white);
      border-radius: 50%;
      opacity: 0;
      transform: scale(0.8);
      transition:
        opacity var(--radio-transition),
        transform var(--radio-transition);
    }

    :host([checked]) .dot {
      opacity: 1;
      transform: scale(1);
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
      --radio-size: 16px;
      font-size: var(--text-sm, 0.8125rem);
    }

    :host([size='md']) {
      --radio-size: 20px;
      font-size: var(--text-base, 0.875rem);
    }

    :host([size='lg']) {
      --radio-size: 24px;
      font-size: var(--text-lg, 1rem);
    }

    /* -------------------------------------------------------------
     * ダークモード対応
     * ------------------------------------------------------------- */
    @media (prefers-color-scheme: dark) {
      :host {
        color: var(--color-foreground, #ededed);
        --radio-bg-color: var(--bg-surface-0, #0a0a0a);
        --radio-border-color: var(--color-border-hover, #3f3f46); /* より明るいボーダー */
      }

      :host([checked]) .radio {
        background-color: var(--color-primary, #60a5fa);
        border-color: var(--color-primary, #60a5fa);
      }

      :host([disabled]) .radio {
        background-color: var(--bg-surface-1, #171717);
        border-color: var(--color-border, #27272a);
      }

      :host([disabled][checked]) .radio {
        background-color: var(--bg-surface-2, #262626);
        border-color: var(--color-border, #27272a);
      }
    }

    /* data-theme="dark" 対応 */
    :host-context([data-theme='dark']) {
      color: var(--color-foreground, #ededed);
      --radio-bg-color: var(--bg-surface-0, #0a0a0a);
      --radio-border-color: var(--color-border-hover, #3f3f46);
    }

    :host-context([data-theme='dark']):host([checked]) .radio {
      background-color: var(--color-primary, #60a5fa);
      border-color: var(--color-primary, #60a5fa);
    }

    :host-context([data-theme='dark']):host([disabled]) .radio {
      background-color: var(--bg-surface-1, #171717);
      border-color: var(--color-border, #27272a);
    }

    :host-context([data-theme='dark']):host([disabled][checked]) .radio {
      background-color: var(--bg-surface-2, #262626);
      border-color: var(--color-border, #27272a);
    }

    /* -------------------------------------------------------------
     * prefers-reduced-motion 対応
     * ------------------------------------------------------------- */
    @media (prefers-reduced-motion: reduce) {
      :host {
        --radio-transition: 0ms;
      }

      .radio,
      .dot {
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

    // 同じname属性を持つ他のラジオボタンを未選択にする
    if (this.checked && this.name) {
      this._uncheckSiblingRadios();
    }

    // カスタムイベントを発火
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { checked: this.checked, value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _uncheckSiblingRadios() {
    // 同じname属性を持つ他のui-radioを見つけて未選択にする
    // フォームスコープ内で検索（フォームがない場合はドキュメント全体）
    const scope = this.closest('form') || document;
    const allRadios = scope.querySelectorAll(`ui-radio[name="${this.name}"]`);
    allRadios.forEach((radio) => {
      if (radio !== this && radio instanceof UiRadio) {
        radio.checked = false;
      }
    });
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
        type="radio"
        class="native-input"
        .checked=${live(this.checked)}
        ?disabled=${this.disabled}
        .value=${this.value}
        name=${this.name}
        @change=${this._handleChange}
      />
      <div
        class="radio-wrapper"
        @keydown=${this._handleKeyDown}
      >
        <div class="radio" role="presentation">
          <!-- 中央ドット -->
          <span class="dot" aria-hidden="true"></span>
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
    'ui-radio': UiRadio;
  }
}
