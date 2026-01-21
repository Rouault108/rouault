import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

@customElement('ui-input')
export class UiInput extends LitElement {
  static override styles = css`
    :host {
      display: block;
      font-family: var(--font-sans, system-ui, sans-serif);
    }

    /* ホスト要素のクリックを無効化（子要素で個別に有効化）
     * 理由: Edge ブラウザでラベル領域の空白クリックが input にフォーカスを
     * 移す問題への対策。必要な要素のみ pointer-events: auto で有効化。 */
    .input-container {
      display: flex;
      flex-direction: column;
      pointer-events: none;
    }

    /* クリック可能であるべき要素のみ有効化 */
    .label,
    .caption,
    .input-wrapper,
    .helper-text,
    .error-text {
      pointer-events: auto;
    }

    /* -------------------------------------------------------------
     * ラベル
     * ------------------------------------------------------------- */
    .label {
      font-size: var(--text-sm, 0.875rem);
      font-weight: var(--font-bold, 700);
      color: var(--color-foreground);
      margin-bottom: var(--space-3, 0.75rem);
      display: inline-block;
      width: fit-content;
      cursor: pointer;
    }

    /* キャプションまたはヘルプテキストが続く場合は間隔を狭く */
    .label:has(+ .caption),
    .label:has(+ .helper-text) {
      margin-bottom: var(--space-1, 0.25rem);
    }

    /* 必須マーカー */
    :host([required]) .label::after {
      content: var(--text-required-marker, ' 必須');
      color: var(--color-error, #ef4444);
    }

    /* -------------------------------------------------------------
     * キャプション（ラベル下の補足説明）
     * ------------------------------------------------------------- */
    .caption {
      display: block;
      font-size: var(--text-xs, 0.75rem);
      font-weight: var(--font-normal, 400);
      color: var(--color-foreground-muted, #6b7280);
      margin-bottom: var(--space-3, 0.75rem);
      line-height: 1.4;
    }

    /* -------------------------------------------------------------
     * インプットラッパー（prefix + input + suffix）
     * ------------------------------------------------------------- */
    .input-wrapper {
      display: flex;
      align-items: center;
      position: relative;
      border-radius: var(--radius-md, 6px);
      overflow: hidden;
      transition: 
        border-color var(--motion-duration, 200ms) var(--motion-easing, ease-out),
        background-color var(--motion-duration, 200ms) var(--motion-easing, ease-out),
        box-shadow var(--motion-duration, 200ms) var(--motion-easing, ease-out);
    }

    /* Outlined (デフォルト) */
    :host([variant="outlined"]) .input-wrapper {
      border: 1px solid var(--color-border);
      background-color: transparent;
    }

    /* Filled */
    :host([variant="filled"]) .input-wrapper {
      border: none;
      border-bottom: 2px solid var(--color-border);
      border-radius: var(--radius-md, 6px) var(--radius-md, 6px) 0 0;
      background-color: var(--color-background-subtle);
    }

    /* Standard (下線のみ) */
    :host([variant="standard"]) .input-wrapper {
      border: none;
      border-bottom: 1px solid var(--color-border);
      border-radius: 0;
      background-color: transparent;
      padding-left: 0;
      padding-right: 0;
    }

    /* -------------------------------------------------------------
     * インタラクティブ状態（disabled/readonly でない場合のみ）
     * ------------------------------------------------------------- */

    /* Outlined - Hover */
    :host([variant="outlined"]:not([disabled]):not([readonly])) .input-wrapper:hover {
      border-color: var(--color-border-hover);
    }

    /* Outlined - Focus */
    :host([variant="outlined"]:not([disabled]):not([readonly])) .input-wrapper:focus-within {
      border-color: var(--color-primary);
      box-shadow: var(--ring-primary);
      outline: 2px solid var(--color-primary);
      outline-offset: var(--ring-offset, 2px);
    }

    /* Filled - Hover */
    :host([variant="filled"]:not([disabled]):not([readonly])) .input-wrapper:hover {
      background-color: var(--color-background);
      border-bottom-color: var(--color-border-hover);
    }

    /* Filled - Focus */
    :host([variant="filled"]:not([disabled]):not([readonly])) .input-wrapper:focus-within {
      border-bottom-color: var(--color-primary);
      background-color: var(--color-background);
      box-shadow: var(--ring-primary);
      outline: 2px solid var(--color-primary);
      outline-offset: var(--ring-offset, 2px);
    }

    /* Standard - Hover */
    :host([variant="standard"]:not([disabled]):not([readonly])) .input-wrapper:hover {
      border-bottom-color: var(--color-border-hover);
    }

    /* Standard - Focus */
    :host([variant="standard"]:not([disabled]):not([readonly])) .input-wrapper:focus-within {
      border-bottom-color: var(--color-primary);
      border-bottom-width: 2px;
      outline: 2px solid var(--color-primary);
      outline-offset: var(--ring-offset, 2px);
    }

    /* -------------------------------------------------------------
     * サイズバリエーション
     * ------------------------------------------------------------- */
    :host([size="sm"]) .input-wrapper {
      --input-padding-y: var(--space-2, 0.5rem);
      --input-padding-x: var(--space-3, 0.75rem);
      --input-font-size: var(--text-sm, 0.875rem);
    }

    :host([size="md"]) .input-wrapper {
      --input-padding-y: var(--space-3, 0.75rem);
      --input-padding-x: var(--space-4, 1rem);
      --input-font-size: var(--text-base, 1rem);
    }

    :host([size="lg"]) .input-wrapper {
      --input-padding-y: var(--space-4, 1rem);
      --input-padding-x: var(--space-5, 1.25rem);
      --input-font-size: var(--text-lg, 1.125rem);
    }

    /* -------------------------------------------------------------
     * ネイティブ Input
     * ------------------------------------------------------------- */
    .native-input {
      flex: 1;
      border: none;
      outline: none;
      background: transparent;
      color: var(--color-foreground);
      font-size: var(--input-font-size, var(--text-base, 1rem));
      padding: var(--input-padding-y, var(--space-3, 0.75rem)) 
               var(--input-padding-x, var(--space-4, 1rem));
      font-family: inherit;
      min-width: 0;
      min-height: 0;
      margin: 0;
      box-sizing: border-box;
    }

    .native-input::placeholder {
      color: var(--color-foreground-muted);
      opacity: 0.6;
    }

    /* -------------------------------------------------------------
     * Prefix / Suffix スロット
     * ------------------------------------------------------------- */
    .prefix,
    .suffix {
      display: flex;
      align-items: center;
      color: var(--color-foreground-muted);
      padding: 0 var(--space-2, 0.5rem);
    }

    .prefix[hidden],
    .suffix[hidden] {
      display: none;
    }

    /* -------------------------------------------------------------
     * ヘルパーテキスト・エラーメッセージ
     * ------------------------------------------------------------- */
    .helper-text {
      font-size: var(--text-xs, 0.75rem);
      color: var(--color-foreground-muted);
      margin-top: var(--space-1, 0.25rem);
    }

    .error-text {
      font-size: var(--text-xs, 0.75rem);
      color: var(--color-error, #ef4444);
      font-weight: var(--font-semibold, 600);
      margin-top: var(--space-1, 0.25rem);
    }

    /* -------------------------------------------------------------
     * 状態（Disabled, Readonly, Error）
     * ------------------------------------------------------------- */

    /* Disabled */
    :host([disabled]) {
      cursor: not-allowed;
      opacity: 0.6;
    }

    :host([disabled]) .input-wrapper {
      background-color: var(--color-background-subtle);
      border-color: var(--color-border);
    }

    :host([disabled]) .native-input {
      cursor: not-allowed;
    }

    /* Readonly */
    :host([readonly]) .input-wrapper {
      background-color: var(--color-background-subtle);
    }

    :host([readonly]) .native-input {
      cursor: default;
    }

    /* Error */
    :host([error]) .input-wrapper {
      border-color: var(--color-error, #ef4444);
    }

    :host([error]:not([disabled]):not([readonly])) .input-wrapper:focus-within {
      border-color: var(--color-error, #ef4444);
      box-shadow: var(--ring-error);
      outline: 2px solid var(--color-error);
      outline-offset: var(--ring-offset, 2px);
    }

    :host([error]) .label {
      color: var(--color-error, #ef4444);
    }
  `;

  @property({ type: String })
  label = '';

  @property({ type: String })
  caption = '';

  @property({ type: String })
  placeholder = '';

  @property({ type: String })
  helperText = '';

  @property({ type: String })
  errorText = '';

  @property({ type: String })
  type: 'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search' = 'text';

  @property({ type: String })
  value = '';

  @property({ type: Boolean, reflect: true })
  disabled = false;

  @property({ type: Boolean, reflect: true })
  readonly = false;

  @property({ type: Boolean, reflect: true })
  required = false;

  @property({ type: Boolean, reflect: true })
  error = false;

  @property({ type: String, reflect: true })
  variant: 'outlined' | 'filled' | 'standard' = 'outlined';

  @property({ type: String, reflect: true })
  size: 'sm' | 'md' | 'lg' = 'md';

  @state()
  private _hasPrefixContent = false;

  @state()
  private _hasSuffixContent = false;

  @query('.native-input')
  private _input!: HTMLInputElement;

  private _inputId = crypto.randomUUID();
  private _labelId = crypto.randomUUID();

  private _onPrefixSlotChange(e: Event) {
    const slot = e.target as HTMLSlotElement;
    this._hasPrefixContent = slot.assignedNodes({ flatten: true }).length > 0;
  }

  private _onSuffixSlotChange(e: Event) {
    const slot = e.target as HTMLSlotElement;
    this._hasSuffixContent = slot.assignedNodes({ flatten: true }).length > 0;
  }

  private _onInput(e: Event) {
    const target = e.target as HTMLInputElement;
    this.value = target.value;
    this.dispatchEvent(new Event('input', {
      bubbles: true,
      composed: true,
    }));
  }

  private _onChange(_e: Event) {
    this.dispatchEvent(new Event('change', {
      bubbles: true,
      composed: true,
    }));
  }

  private _onFocus(_e: FocusEvent) {
    this.dispatchEvent(new Event('focus', {
      bubbles: true,
      composed: true,
    }));
  }

  private _onBlur(_e: FocusEvent) {
    this.dispatchEvent(new Event('blur', {
      bubbles: true,
      composed: true,
    }));
  }

  override render() {
    // aria-describedby の値を動的に生成
    const describedByIds: string[] = [];
    if (this.caption) describedByIds.push('caption-text');
    if (this.helperText) describedByIds.push('helper-text');
    if (this.errorText) describedByIds.push('error-text');
    const ariaDescribedBy = describedByIds.length > 0 ? describedByIds.join(' ') : undefined;

    // aria-labelledby の値（label がある場合のみ）
    const ariaLabelledBy = this.label ? this._labelId : undefined;

    return html`
      <div class="input-container">
        ${this.label ? html`
          <label class="label" id="${this._labelId}" for="${this._inputId}">
            ${this.label}
          </label>
        ` : ''}

        ${this.caption ? html`
          <div class="caption" id="caption-text">
            ${this.caption}
          </div>
        ` : ''}

        <div class="input-wrapper">
          <div class="prefix" ?hidden="${!this._hasPrefixContent}">
            <slot name="prefix" @slotchange="${this._onPrefixSlotChange}"></slot>
          </div>

          <input
            class="native-input"
            id="${this._inputId}"
            type="${this.type}"
            .value="${this.value}"
            placeholder="${this.placeholder}"
            ?disabled="${this.disabled}"
            ?readonly="${this.readonly}"
            ?required="${this.required}"
            aria-invalid="${this.error}"
            aria-labelledby="${ariaLabelledBy || nothing}"
            aria-describedby="${ariaDescribedBy || nothing}"
            @input="${this._onInput}"
            @change="${this._onChange}"
            @focus="${this._onFocus}"
            @blur="${this._onBlur}"
          />

          <div class="suffix" ?hidden="${!this._hasSuffixContent}">
            <slot name="suffix" @slotchange="${this._onSuffixSlotChange}"></slot>
          </div>
        </div>

        ${this.helperText ? html`
          <div class="helper-text" id="helper-text">
            ${this.helperText}
          </div>
        ` : ''}

        ${this.errorText ? html`
          <div class="error-text" id="error-text" aria-live="polite">
            ${this.errorText}
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * プログラムから input にフォーカスする
   */
  override focus() {
    this._input?.focus();
  }

  /**
   * プログラムから input から blur する
   */
  override blur() {
    this._input?.blur();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-input': UiInput;
  }
}
