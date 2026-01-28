import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';

/**
 * ui-dropdown - アクセシブルなドロップダウン（セレクト）コンポーネント
 *
 * @slot - オプション要素（<option>）
 *
 * @cssprop --input-padding-y - 垂直方向のパディング
 * @cssprop --input-padding-x - 水平方向のパディング
 * @cssprop --input-bg - 背景色
 *
 * @fires change - 選択が変更されたときに発火
 */
@customElement('ui-dropdown')
export class UiDropdown extends LitElement {
  static override styles = css`
    /* -------------------------------------------------------------
     * ホスト要素
     * ------------------------------------------------------------- */
    :host {
      display: inline-block;
      width: auto;
      max-width: 100%;
      font-family: var(--font-sans);
      font-size: var(--text-base);
      line-height: var(--line-height-normal);
    }

    /* -------------------------------------------------------------
     * コンテナ
     * ------------------------------------------------------------- */
    .dropdown-container {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    /* -------------------------------------------------------------
     * ラベル
     * ------------------------------------------------------------- */
    .label {
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      color: var(--color-foreground);
      padding-left: var(--space-1);
      transition: color var(--motion-duration) var(--ease-out);
    }

    :host([invalid]) .label {
      color: var(--color-error);
    }

    :host([disabled]) .label {
      opacity: var(--opacity-50);
    }

    /* -------------------------------------------------------------
     * Select ラッパー
     * ------------------------------------------------------------- */
    .select-wrapper {
      position: relative;
      display: inline-flex;
      width: auto;
      max-width: 100%;
    }

    /* -------------------------------------------------------------
     * ネイティブ Select 要素
     * ------------------------------------------------------------- */
    select {
      appearance: none;
      width: auto;
      max-width: 100%;
      padding: var(--input-padding-y, var(--space-2)) var(--input-padding-x, var(--space-3));
      padding-right: calc(var(--space-4) + var(--icon-md)); /* 矢印アイコンのスペース */
      
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      color: var(--color-foreground);
      
      background-color: var(--input-bg);
      border: var(--border-width-2) solid var(--color-border);
      border-radius: var(--radius-md);
      
      cursor: pointer;
      
      transition:
        border-color var(--motion-duration) var(--ease-out),
        background-color var(--motion-duration) var(--ease-out),
        box-shadow var(--motion-duration) var(--ease-out);
    }

    select:hover:not(:disabled) {
      border-color: var(--color-border-hover);
    }

    select:focus,
    select:active,
    select:focus-visible {
      outline: none;
    }

    select:focus-visible {
      border-color: var(--color-primary);
      outline: var(--focus-ring-width) solid var(--focus-ring-color);
      outline-offset: var(--focus-ring-offset);
    }

    select:disabled {
      cursor: not-allowed;
      opacity: var(--opacity-50);
      background-color: var(--color-background-subtle);
    }

    /* プレースホルダー */
    select option[value=""] {
      color: var(--color-foreground-muted);
    }

    .arrow-icon-wrapper {
      position: absolute;
      right: var(--input-padding-x, var(--space-3));
      display: flex;
      top: 0;
      align-items: center;
      justify-content: center;
      width: var(--icon-md);
      height: 100%;
      color: var(--color-foreground-muted);
      transition: color var(--motion-duration) var(--ease-out);
      pointer-events: none;
    }

    .arrow-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: var(--icon-md);
      height: var(--icon-md);
      color: var(--color-foreground-muted);
      transition: color var(--motion-duration) var(--ease-out);
    }

    select:focus-visible ~ .arrow-icon-wrapper .arrow-icon {
      color: var(--color-primary);
    }

    :host([disabled]) .arrow-icon-wrapper {
      opacity: var(--opacity-50);
    }

    /* -------------------------------------------------------------
     * バリアント: Outlined（デフォルト）
     * ------------------------------------------------------------- */
    :host([variant='outlined']) select {
      background-color: var(--input-bg);
      border: var(--border-width-2) solid var(--color-border);
    }

    /* -------------------------------------------------------------
     * バリアント: Filled
     * ------------------------------------------------------------- */
    :host([variant='filled']) select {
      background-color: var(--color-background-subtle);
      border: var(--border-width-2) solid transparent;
    }

    :host([variant='filled']) select:hover:not(:disabled) {
      background-color: var(--color-background-muted);
      border-color: transparent;
    }

    :host([variant='filled']) select:focus-visible {
      background-color: var(--input-bg);
      border-color: var(--color-primary);
    }

    /* -------------------------------------------------------------
     * バリアント: Standard
     * ------------------------------------------------------------- */
    :host([variant='standard']) select {
      background-color: transparent;
      border: none;
      border-bottom: var(--border-width-2) solid var(--color-border);
      border-radius: 0;
      padding-left: 0;
      padding-right: calc(var(--icon-md) + var(--space-2)); /* 矢印との間隔を確保 */
    }

    :host([variant='standard']) select:hover:not(:disabled) {
      border-bottom-color: var(--color-border-hover);
    }

    :host([variant='standard']) select:focus-visible {
      border-bottom-color: var(--color-primary);
      outline: none; /* Standardはアンダーライン変化のみ、またはカスタムリング */
      box-shadow: none;
    }
    
    :host([variant='standard']) .arrow-icon-wrapper {
      right: var(--space-none);
    }

    :host([variant='standard']) .label {
      padding-left: var(--space-none);
    }

    /* -------------------------------------------------------------
     * Invalid（エラー）状態
     * ------------------------------------------------------------- */
    :host([invalid]) select {
      border-color: var(--color-error);
    }

    :host([invalid]) select:focus-visible {
      border-color: var(--color-error);
      outline: var(--focus-ring-width) solid rgba(220, 38, 38, 0.5);
      outline-offset: var(--focus-ring-offset);
      box-shadow: none;
    }

    :host([invalid]) .arrow-icon-wrapper {
      color: var(--color-error);
    }

    /* Standard バリアントの Invalid 状態は下線のみ */
    :host([variant='standard'][invalid]) select {
      border-bottom-color: var(--color-error);
    }

    /* -------------------------------------------------------------
     * ヘルパーテキスト & エラーメッセージ
     * ------------------------------------------------------------- */
    .helper-text,
    .error-message {
      font-size: var(--text-xs);
      padding-left: var(--space-1);
      margin-top: var(--space-1);
      transition: color var(--motion-duration) var(--ease-out);
    }

    .helper-text {
      color: var(--color-foreground-muted);
    }

    .error-message {
      color: var(--color-error);
      font-weight: var(--font-medium);
    }

    :host([variant='standard']) .helper-text,
    :host([variant='standard']) .error-message {
      padding-left: var(--space-none);
    }

    /* -------------------------------------------------------------
     * サイズバリエーション
     * ------------------------------------------------------------- */
    :host([size='sm']) {
      font-size: var(--text-sm);
      --input-padding-y: var(--space-2);
      --input-padding-x: var(--space-3);
    }

    :host([size='sm']) select {
      padding-right: calc(var(--icon-sm) + var(--space-4));
    }

    :host([size='sm']) .arrow-icon-wrapper {
      width: var(--icon-sm);
      height: var(--icon-sm);
    }
    
    :host([size='sm']) .arrow-icon {
      width: var(--icon-sm);
      height: var(--icon-sm);
    }

    :host([size='sm'][variant='standard']) select {
      padding-right: calc(var(--icon-sm) + var(--space-2));
    }

    :host([size='md']) {
      font-size: var(--text-base);
      --input-padding-y: var(--space-2);
      --input-padding-x: var(--space-3);
    }

    :host([size='md']) select {
      padding-right: calc(var(--icon-md) + var(--space-4));
    }

    :host([size='md'][variant='standard']) select {
      padding-right: calc(var(--icon-md) + var(--space-2));
    }

    :host([size='lg']) {
      font-size: var(--text-lg);
      --input-padding-y: var(--space-3);
      --input-padding-x: var(--space-4);
    }

    :host([size='lg']) select {
      padding-right: calc(var(--icon-lg) + var(--space-4));
    }

    :host([size='lg']) .arrow-icon-wrapper {
      width: var(--icon-lg);
      height: var(--icon-lg);
    }
    
    :host([size='lg']) .arrow-icon {
      width: var(--icon-lg);
      height: var(--icon-lg);
    }

    :host([size='lg'][variant='standard']) select {
      padding-right: calc(var(--icon-lg) + var(--space-2));
    }

    /* -------------------------------------------------------------
     * ハイコントラストモード対応
     * ------------------------------------------------------------- */
    @media (prefers-contrast: more) {
      select {
        border-width: var(--border-width-2);
      }

      select:focus-visible {
        outline: var(--border-width-3) solid var(--color-primary);
        outline-offset: var(--focus-ring-offset);
      }

      :host([invalid]) select:focus-visible {
        outline-color: var(--color-error);
      }
    }

    /* Windows High Contrast Mode */
    @media (forced-colors: active) {
      select {
        border: var(--border-width-2) solid ButtonBorder;
      }

      select:focus-visible {
        outline: var(--border-width-3) solid Highlight;
      }

      select:disabled {
        color: GrayText;
        border-color: GrayText;
        opacity: 1;
      }

      .arrow-icon-wrapper {
        color: ButtonText;
      }

      :host([disabled]) .arrow-icon-wrapper {
        color: GrayText;
        opacity: 1;
      }
    }

    /* -------------------------------------------------------------
     * prefers-reduced-motion 対応
     * ------------------------------------------------------------- */
    @media (prefers-reduced-motion: reduce) {
      select,
      .arrow-icon-wrapper,
      .arrow-icon,
      .label {
        transition: none;
      }
    }
  `;

  @property({ type: String })
  label = '';

  @property({ type: Boolean, reflect: true })
  disabled = false;

  @property({ type: Boolean, reflect: true })
  invalid = false;

  @property({ type: String, reflect: true })
  size: 'sm' | 'md' | 'lg' = 'md';

  @property({ type: String, reflect: true })
  variant: 'outlined' | 'filled' | 'standard' = 'outlined';

  @property({ type: String })
  name = '';

  @property({ type: String })
  value = '';

  @property({ type: String })
  helper = '';

  @property({ type: String })
  errorMessage = '';

  @query('select')
  private _selectElement!: HTMLSelectElement;

  override firstUpdated() {
    // 初期オプション同期
    this._syncOptions();
  }

  /**
   * スロットから option 要素を同期
   * slotchange イベントで動的更新にも対応
   */
  private _handleSlotChange() {
    this._syncOptions();
  }

  private _syncOptions() {
    const slot = this.shadowRoot?.querySelector('slot');
    if (!slot || !this._selectElement) return;

    const assignedNodes = slot.assignedNodes({ flatten: true });
    const options = assignedNodes.filter(
      (node) => node.nodeName === 'OPTION' || node.nodeName === 'OPTGROUP'
    ) as (HTMLOptionElement | HTMLOptGroupElement)[];

    // 既存のオプションをクリア（デフォルトスロット由来のもののみ）
    this._selectElement.innerHTML = '';

    // option/optgroup 要素を select に追加
    options.forEach((element) => {
      const clonedElement = element.cloneNode(true) as typeof element;
      this._selectElement.appendChild(clonedElement);
    });

    // selected 属性を持つオプションを検出
    const selectedOption = options.find(
      (el) => el.nodeName === 'OPTION' && (el as HTMLOptionElement).hasAttribute('selected')
    ) as HTMLOptionElement | undefined;
    
    if (selectedOption && !this.value) {
      this.value = selectedOption.value;
    }

    // value プロパティが設定されている場合、選択状態を反映
    if (this.value) {
      this._selectElement.value = this.value;
    }
  }

  private _handleChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    this.value = target.value;

    // カスタムイベントを発火
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  /**
   * aria-describedby の動的計算
   */
  private _getAriaDescribedBy(): string | undefined {
    const ids: string[] = [];
    
    if (this.invalid && this.errorMessage) {
      ids.push('error-message');
    } else if (this.helper) {
      ids.push('helper-text');
    }

    return ids.length > 0 ? ids.join(' ') : undefined;
  }

  override render() {
    const ariaDescribedBy = this._getAriaDescribedBy();
    const ariaLabelledBy = this.label ? 'label' : undefined;

    return html`
      <div class="dropdown-container">
        ${this.label
          ? html`<label class="label" id="label" for="select">${this.label}</label>`
          : ''}
        <div class="select-wrapper">
          <select
            id="select"
            ?disabled=${this.disabled}
            name=${this.name}
            @change=${this._handleChange}
            aria-invalid="${this.invalid}"
            aria-describedby=${ariaDescribedBy || nothing}
            aria-labelledby=${ariaLabelledBy || nothing}
          >
            <!-- スロットから option を同期するため、ここは空 -->
          </select>
          <!-- カスタム矢印アイコン（iconify-lucide） -->
          <div class="arrow-icon-wrapper">
            <iconify-icon
              class="arrow-icon"
              icon="lucide:chevron-down"
              aria-hidden="true"
            ></iconify-icon>
          </div>
        </div>
        
        <!-- ヘルパーテキスト（エラーがない場合のみ表示） -->
        ${!this.invalid && this.helper
          ? html`<div class="helper-text" id="helper-text">${this.helper}</div>`
          : ''}
        
        <!-- エラーメッセージ（invalid状態の場合のみ表示） -->
        ${this.invalid && this.errorMessage
          ? html`<div class="error-message" id="error-message" role="alert">${this.errorMessage}</div>`
          : ''}
        
        <!-- hidden slot for option elements -->
        <slot style="display: none;" @slotchange=${this._handleSlotChange}></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-dropdown': UiDropdown;
  }
}
