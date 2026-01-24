import { LitElement, css, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';

/**
 * ui-checkbox - アクセシブルなチェックボックスコンポーネント
 *
 * @slot - ラベルテキスト
 *
 * @cssprop --checkbox-size - チェックボックスのサイズ
 * @cssprop --checkbox-border-color - ボーダーカラー
 * @cssprop --checkbox-bg-color - 背景色
 * @cssprop --checkbox-check-color - チェックマークの色
 */
@customElement('ui-checkbox')
export class UiCheckbox extends LitElement {
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
      --checkbox-border-width: 1.5px;
      --checkbox-border-radius: var(--radius-sm, 0.25rem);
      --checkbox-transition: var(--motion-duration, 200ms) var(--ease-out, ease-out);
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
     * チェックボックスコンテナ
     * ------------------------------------------------------------- */
    .checkbox-wrapper {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2, 0.5rem);
      cursor: inherit;
    }

    /* -------------------------------------------------------------
     * チェックボックス本体
     * ------------------------------------------------------------- */
    .checkbox {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      
      width: var(--checkbox-size, 20px);
      height: var(--checkbox-size, 20px);
      
      background-color: var(--checkbox-bg-color, var(--color-background, #ffffff));
      border: var(--checkbox-border-width) solid var(--checkbox-border-color, var(--color-border, #e5e7eb));
      border-radius: var(--checkbox-border-radius);
      
      transition:
        background-color var(--checkbox-transition),
        border-color var(--checkbox-transition),
        box-shadow var(--checkbox-transition);
    }

    /* Hover */
    :host(:not([disabled])) .checkbox-wrapper:hover .checkbox {
      border-color: var(--color-primary, #3b82f6);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary, #3b82f6) 15%, transparent);
    }

    /* Focus */
    .native-input:focus-visible ~ .checkbox-wrapper .checkbox {
      outline: 2px solid var(--color-primary, #3b82f6);
      outline-offset: 2px;
      box-shadow: none; /* ホバーのリングを消す */
    }

    /* Checked */
    :host([checked]) .checkbox,
    :host([indeterminate]) .checkbox {
      background-color: var(--color-primary, #3b82f6);
      border-color: var(--color-primary, #3b82f6);
    }

    /* Invalid */
    :host([invalid]) .checkbox {
      border-color: var(--color-error, #ef4444);
    }

    :host([invalid]) .checkbox-wrapper:hover .checkbox {
      border-color: var(--color-error, #ef4444);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-error, #ef4444) 15%, transparent);
    }

    /* Disabled */
    :host([disabled]) .checkbox {
      background-color: var(--color-background-subtle, #f9fafb);
      border-color: var(--color-border, #e5e7eb);
      cursor: not-allowed;
    }

    :host([disabled][checked]) .checkbox,
    :host([disabled][indeterminate]) .checkbox {
      background-color: var(--color-background-subtle, #f9fafb);
      opacity: 0.5;
    }

    /* -------------------------------------------------------------
     * チェックマーク
     * ------------------------------------------------------------- */
    .checkmark {
      position: absolute;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      opacity: 0;
      transform: scale(0.8);
      transition:
        opacity var(--checkbox-transition),
        transform var(--checkbox-transition);
    }

    :host([checked]) .checkmark {
      opacity: 1;
      transform: scale(1);
    }

    /* Indeterminate マーク（ハイフン）*/
    .indeterminate-mark {
      position: absolute;
      width: 60%;
      height: 2px;
      background-color: white;
      opacity: 0;
      transform: scale(0.8);
      transition:
        opacity var(--checkbox-transition),
        transform var(--checkbox-transition);
    }

    :host([indeterminate]) .indeterminate-mark {
      opacity: 1;
      transform: scale(1);
    }

    /* チェックマークアイコン（Iconify使用） */
    .checkmark iconify-icon {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
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
      --checkbox-size: 16px;
      font-size: var(--text-sm, 0.8125rem);
    }

    :host([size='md']) {
      --checkbox-size: 20px;
      font-size: var(--text-base, 0.875rem);
    }

    :host([size='lg']) {
      --checkbox-size: 24px;
      font-size: var(--text-lg, 1rem);
    }

    /* -------------------------------------------------------------
     * ダークモード対応
     * ------------------------------------------------------------- */
    @media (prefers-color-scheme: dark) {
      :host {
        color: var(--color-foreground, #ededed);
        --checkbox-bg-color: var(--bg-surface-1, #171717);
        --checkbox-border-color: var(--color-border, #27272a);
      }

      :host([checked]) .checkbox,
      :host([indeterminate]) .checkbox {
        background-color: var(--color-primary, #60a5fa);
        border-color: var(--color-primary, #60a5fa);
      }

      :host([disabled]) .checkbox {
        background-color: var(--bg-surface-1, #171717);
      }
    }

    /* data-theme="dark" 対応 */
    :host-context([data-theme='dark']) {
      color: var(--color-foreground, #ededed);
      --checkbox-bg-color: var(--bg-surface-1, #171717);
      --checkbox-border-color: var(--color-border, #27272a);
    }

    :host-context([data-theme='dark']):host([checked]) .checkbox,
    :host-context([data-theme='dark']):host([indeterminate]) .checkbox {
      background-color: var(--color-primary, #60a5fa);
      border-color: var(--color-primary, #60a5fa);
    }

    :host-context([data-theme='dark']):host([disabled]) .checkbox {
      background-color: var(--bg-surface-1, #171717);
    }

    /* -------------------------------------------------------------
     * prefers-reduced-motion 対応
     * ------------------------------------------------------------- */
    @media (prefers-reduced-motion: reduce) {
      :host {
        --checkbox-transition: 0ms;
      }

      .checkbox,
      .checkmark,
      .indeterminate-mark {
        transition: none;
      }
    }
  `;

  @property({ type: Boolean, reflect: true })
  checked = false;

  @property({ type: Boolean, reflect: true })
  indeterminate = false;

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

  private _handleChange(e: Event) {
    if (this.disabled) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    const target = e.target as HTMLInputElement;
    this.checked = target.checked;
    this.indeterminate = false; // チェック時に indeterminate を解除

    // カスタムイベントを発火
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { checked: this.checked, value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }

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
    // Shadow DOM 内のイベントなので composedPath() を使用
    const path = e.composedPath();
    if (path.includes(this._nativeInput)) {
      return;
    }

    // ネイティブ input をクリック
    this._nativeInput.click();
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

  override updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);

    // indeterminate プロパティは DOM 属性ではなく JavaScript プロパティなので手動設定
    if (changedProperties.has('indeterminate')) {
      this._nativeInput.indeterminate = this.indeterminate;
    }
  }

  override render() {
    return html`
      <input
        type="checkbox"
        class="native-input"
        .checked=${live(this.checked)}
        ?disabled=${this.disabled}
        .value=${this.value}
        name=${this.name}
        @change=${this._handleChange}
      />
      <div
        class="checkbox-wrapper"
        @keydown=${this._handleKeyDown}
      >
        <div class="checkbox" role="presentation">
          <!-- チェックマーク（Iconify） -->
          <span class="checkmark" aria-hidden="true">
            <iconify-icon icon="lucide:check" width="100%" height="100%"></iconify-icon>
          </span>
          <!-- Indeterminate マーク -->
          <span class="indeterminate-mark" aria-hidden="true"></span>
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
    'ui-checkbox': UiCheckbox;
  }
}
