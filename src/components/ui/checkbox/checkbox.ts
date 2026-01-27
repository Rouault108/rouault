import { LitElement, css, html } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';

/**
 * ui-checkbox - アクセシブルなチェックボックスコンポーネント
 *
 * @slot - ラベルテキスト
 *
 * @cssprop --checkbox-size - チェックボックスのサイズ (デフォルト: 20px)
 * @cssprop --checkbox-bg - 背景色 (デフォルト: --color-background)
 * @cssprop --checkbox-border - ボーダーの色 (デフォルト: --color-border)
 * @cssprop --checkbox-bg-active - チェック時の背景色 (デフォルト: --color-primary)
 * @cssprop --checkbox-border-active - チェック時のボーダーの色 (デフォルト: --color-primary)
 * @cssprop --checkbox-check-color - チェックマークの色 (デフォルト: white)
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
      gap: var(--space-2);
      cursor: pointer;
      user-select: none;
      font-family: var(--font-sans, system-ui, sans-serif);
      font-size: var(--text-base);
      line-height: var(--line-height-normal);
      color: var(--color-foreground);

      /* 公開 CSS API */
      --checkbox-size: 20px;
      --checkbox-bg: var(--color-background);
      --checkbox-border: var(--color-border);
      --checkbox-border-active: var(--color-primary);
      --checkbox-bg-active: var(--color-primary);
      --checkbox-check-color: #ffffff;
      
      /* 内部デザイントークン */
      --_border-width: 1.5px;
      --_radius: var(--radius-sm);
      --_transition: var(--motion-duration, 200ms) var(--ease-out);
      --_scale-pressed: 0.95;
    }

    :host([disabled]) {
      cursor: not-allowed;
      opacity: 0.6;
    }

    /* -------------------------------------------------------------
     * 非表示のネイティブ入力 (SR Only パターン)
     * ------------------------------------------------------------- */
    .native-input {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
      pointer-events: none; /* クリックイベントはホストでハンドルするため */
    }

    /* -------------------------------------------------------------
     * チェックボックスコンテナ (Wrapper)
     * ------------------------------------------------------------- */
    .checkbox-wrapper {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      isolate: isolate; /* 重なり順の制御 */
    }

    /* -------------------------------------------------------------
     * チェックボックス本体 (Visual Box)
     * ------------------------------------------------------------- */
    .checkbox {
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      
      width: var(--checkbox-size);
      height: var(--checkbox-size);
      
      background-color: var(--checkbox-bg);
      border: var(--_border-width) solid var(--checkbox-border);
      border-radius: var(--_radius);
      
      transition:
        background-color var(--_transition),
        border-color var(--_transition),
        box-shadow var(--_transition),
        transform var(--_transition);
    }

    /* ホバー状態 (静謐なインタラクション) */
    @media (hover: hover) {
      :host(:not([disabled])) .checkbox-wrapper:hover .checkbox {
        border-color: var(--checkbox-border-active);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 15%, transparent);
      }
    }

    /* アクティブ状態 (押し込み) */
    :host(:not([disabled]):active) .checkbox {
      transform: scale(var(--_scale-pressed));
    }

    /* フォーカス状態 */
    .native-input:focus-visible ~ .checkbox-wrapper .checkbox {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
      box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-primary) 20%, transparent);
    }

    /* チェックおよび不確定状態 */
    :host([checked]) .checkbox,
    :host([indeterminate]) .checkbox {
      background-color: var(--checkbox-bg-active);
      border-color: var(--checkbox-border-active);
    }

    /* 無効な状態 (Invalid) */
    :host([invalid]) .checkbox {
      border-color: var(--color-error);
    }

    :host([invalid]) .checkbox-wrapper:hover .checkbox {
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-error) 15%, transparent);
    }

    /* 無効状態 (Disabled) */
    :host([disabled]) .checkbox {
      background-color: var(--color-background-subtle);
      border-color: var(--color-border);
      pointer-events: none;
    }

    /* -------------------------------------------------------------
     * チェックマーク & Indeterminateマーク
     * ------------------------------------------------------------- */
    .checkmark,
    .indeterminate-mark {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--checkbox-check-color);
      opacity: 0;
      transform: scale(0.6) translateY(2px);
      transition:
        opacity var(--_transition),
        transform var(--_transition);
      pointer-events: none;
    }

    .checkmark svg {
      width: 70%;
      height: 70%;
    }

    .indeterminate-mark::after {
      content: '';
      display: block;
      width: 60%;
      height: 2px;
      background-color: currentColor;
      border-radius: 1px;
    }

    /* アクティブ時のシンボル表示 */
    :host([checked]) .checkmark,
    :host([indeterminate]) .indeterminate-mark {
      opacity: 1;
      transform: scale(1) translateY(0);
    }

    /* -------------------------------------------------------------
     * ラベル
     * ------------------------------------------------------------- */
    .label {
      flex: 1;
      cursor: pointer;
      color: currentColor;
    }
    
    :host([disabled]) .label {
      cursor: not-allowed;
      color: var(--color-foreground-muted);
    }

    /* -------------------------------------------------------------
     * サイズバリエーション
     * ------------------------------------------------------------- */
    :host([size='sm']) {
      --checkbox-size: 16px;
      font-size: var(--text-sm);
    }

    :host([size='md']) {
      --checkbox-size: 20px;
      font-size: var(--text-base);
    }

    :host([size='lg']) {
      --checkbox-size: 24px;
      font-size: var(--text-lg);
    }

    /* -------------------------------------------------------------
     * prefers-reduced-motion 対応
     * ------------------------------------------------------------- */
    @media (prefers-reduced-motion: reduce) {
      :host {
        --_transition: 0ms;
      }
    }

    /* -------------------------------------------------------------
     * prefers-contrast: more 対応
     * ------------------------------------------------------------- */
    @media (prefers-contrast: more) {
      :host {
        --checkbox-border: WindowText;
        --checkbox-bg-active: WindowText;
        --checkbox-check-color: Window;
      }
      
      .checkbox {
        border-width: 2px;
      }
      
      .native-input:focus-visible ~ .checkbox-wrapper .checkbox {
        outline-width: 3px;
        outline-style: solid;
        outline-color: Highlight;
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
    this.indeterminate = false; // チェック時はindeterminateを解除

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

    const path = e.composedPath();
    if (path.includes(this._nativeInput)) {
      return;
    }

    this._nativeInput.click();
  }

  override updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);

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
        aria-hidden="false" 
      />
      <div class="checkbox-wrapper">
        <div class="checkbox">
          <span class="checkmark" aria-hidden="true">
            <iconify-icon icon="lucide:check" width="100%" height="100%"></iconify-icon>
          </span>
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
