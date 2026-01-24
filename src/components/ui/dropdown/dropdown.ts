import { LitElement, css, html } from 'lit';
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
      width: 100%;
      font-family: var(--font-sans, system-ui, sans-serif);
      font-size: var(--text-base, 0.875rem);
      line-height: var(--line-height-normal, 1.5);
    }

    /* -------------------------------------------------------------
     * コンテナ
     * ------------------------------------------------------------- */
    .dropdown-container {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: var(--space-1, 0.25rem);
    }

    /* -------------------------------------------------------------
     * ラベル
     * ------------------------------------------------------------- */
    .label {
      font-size: var(--text-sm, 0.8125rem);
      font-weight: var(--font-medium, 500);
      color: var(--color-foreground, #111827);
      padding-left: var(--space-1, 0.25rem);
      transition: color var(--motion-duration, 200ms) var(--ease-out, ease-out);
    }

    :host([invalid]) .label {
      color: var(--color-error, #ef4444);
    }

    :host([disabled]) .label {
      opacity: 0.5;
    }

    /* -------------------------------------------------------------
     * Select ラッパー
     * ------------------------------------------------------------- */
    .select-wrapper {
      position: relative;
      display: inline-flex;
      width: 100%;
    }

    /* -------------------------------------------------------------
     * ネイティブ Select 要素
     * ------------------------------------------------------------- */
    select {
      appearance: none;
      width: 100%;
      padding: var(--input-padding-y, 0.625rem) var(--input-padding-x, 0.875rem);
      padding-right: 2.5rem; /* 矢印アイコンのスペース */
      
      font-family: inherit;
      font-size: inherit;
      line-height: inherit;
      color: var(--color-foreground, #111827);
      
      background-color: var(--input-bg, white);
      border: 1.5px solid var(--color-border, #d1d5db);
      border-radius: var(--radius-md, 0.5rem);
      
      cursor: pointer;
      
      transition:
        border-color var(--motion-duration, 200ms) var(--ease-out, ease-out),
        background-color var(--motion-duration, 200ms) var(--ease-out, ease-out),
        box-shadow var(--motion-duration, 200ms) var(--ease-out, ease-out);
    }

    select:hover:not(:disabled) {
      border-color: var(--color-border-hover, #9ca3af);
    }

    select:focus {
      outline: none;
      border-color: var(--color-primary, #3b82f6);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary, #3b82f6) 15%, transparent);
    }

    select:disabled {
      cursor: not-allowed;
      opacity: 0.5;
      background-color: var(--color-background-subtle, #f9fafb);
    }

    /* Placeholder (first option with empty value) */
    select option[value=""] {
      color: var(--color-foreground-muted, #6b7280);
    }

    /* -------------------------------------------------------------
     * カスタム矢印アイコン
     * ------------------------------------------------------------- */
    .arrow-icon {
      position: absolute;
      right: 0.875rem;
      top: 50%;
      transform: translateY(-50%);
      pointer-events: none;
      width: 1rem;
      height: 1rem;
      color: var(--color-foreground-muted, #6b7280);
      transition: transform var(--motion-duration, 200ms) var(--ease-out, ease-out);
    }

    select:focus ~ .arrow-icon {
      color: var(--color-primary, #3b82f6);
    }

    :host([disabled]) .arrow-icon {
      opacity: 0.5;
    }

    /* -------------------------------------------------------------
     * バリアント: Outlined（デフォルト）
     * ------------------------------------------------------------- */
    :host([variant='outlined']) select {
      background-color: var(--input-bg, white);
      border: 1.5px solid var(--color-border, #d1d5db);
    }

    /* -------------------------------------------------------------
     * バリアント: Filled
     * ------------------------------------------------------------- */
    :host([variant='filled']) select {
      background-color: var(--color-background-subtle, #f3f4f6);
      border: 1.5px solid transparent;
    }

    :host([variant='filled']) select:hover:not(:disabled) {
      background-color: var(--color-background-muted, #e5e7eb);
      border-color: transparent;
    }

    :host([variant='filled']) select:focus {
      background-color: var(--input-bg, white);
      border-color: var(--color-primary, #3b82f6);
    }

    /* -------------------------------------------------------------
     * バリアント: Standard
     * ------------------------------------------------------------- */
    :host([variant='standard']) select {
      background-color: transparent;
      border: none;
      border-bottom: 1.5px solid var(--color-border, #d1d5db);
      border-radius: 0;
      padding-left: 0;
    }

    :host([variant='standard']) select:hover:not(:disabled) {
      border-bottom-color: var(--color-border-hover, #9ca3af);
    }

    :host([variant='standard']) select:focus {
      border-bottom-color: var(--color-primary, #3b82f6);
      box-shadow: none;
    }

    :host([variant='standard']) .arrow-icon {
      right: 0;
    }

    :host([variant='standard']) .label {
      padding-left: 0;
    }

    /* -------------------------------------------------------------
     * Invalid（エラー）状態
     * ------------------------------------------------------------- */
    :host([invalid]) select {
      border-color: var(--color-error, #ef4444);
    }

    :host([invalid]) select:focus {
      border-color: var(--color-error, #ef4444);
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-error, #ef4444) 15%, transparent);
    }

    :host([invalid]) .arrow-icon {
      color: var(--color-error, #ef4444);
    }

    /* Standard バリアントの Invalid 状態は下線のみ */
    :host([variant='standard'][invalid]) select {
      border-bottom-color: var(--color-error, #ef4444);
    }

    /* -------------------------------------------------------------
     * サイズバリエーション
     * ------------------------------------------------------------- */
    :host([size='sm']) {
      font-size: var(--text-sm, 0.8125rem);
    }

    :host([size='sm']) select {
      --input-padding-y: 0.5rem;
      --input-padding-x: 0.75rem;
      padding-right: 2rem;
    }

    :host([size='sm']) .arrow-icon {
      right: 0.75rem;
      width: 0.875rem;
      height: 0.875rem;
    }

    :host([size='md']) {
      font-size: var(--text-base, 0.875rem);
    }

    :host([size='md']) select {
      --input-padding-y: 0.625rem;
      --input-padding-x: 0.875rem;
    }

    :host([size='lg']) {
      font-size: var(--text-lg, 1rem);
    }

    :host([size='lg']) select {
      --input-padding-y: 0.75rem;
      --input-padding-x: 1rem;
      padding-right: 3rem;
    }

    :host([size='lg']) .arrow-icon {
      right: 1rem;
      width: 1.125rem;
      height: 1.125rem;
    }

    /* -------------------------------------------------------------
     * ダークモード対応
     * ------------------------------------------------------------- */
    @media (prefers-color-scheme: dark) {
      .label {
        color: var(--color-foreground, #ededed);
      }

      select {
        color: var(--color-foreground, #ededed);
        background-color: var(--bg-surface-0, #0a0a0a);
        border-color: var(--color-border-hover, #3f3f46);
      }

      select:hover:not(:disabled) {
        border-color: var(--color-border, #52525b);
      }

      select:disabled {
        background-color: var(--bg-surface-1, #171717);
        border-color: var(--color-border, #27272a);
      }

      :host([variant='filled']) select {
        background-color: var(--bg-surface-1, #171717);
      }

      :host([variant='filled']) select:hover:not(:disabled) {
        background-color: var(--bg-surface-2, #262626);
      }

      :host([variant='filled']) select:focus {
        background-color: var(--bg-surface-0, #0a0a0a);
      }

      :host([invalid]) select {
        border-color: var(--color-error, #ef4444);
      }

      :host([disabled][invalid]) select {
        background-color: var(--bg-surface-1, #171717);
        border-color: var(--color-border, #27272a);
      }
    }

    /* data-theme="dark" 対応 */
    :host-context([data-theme='dark']) .label {
      color: var(--color-foreground, #ededed);
    }

    :host-context([data-theme='dark']) select {
      color: var(--color-foreground, #ededed);
      background-color: var(--bg-surface-0, #0a0a0a);
      border-color: var(--color-border-hover, #3f3f46);
    }

    :host-context([data-theme='dark']) select:hover:not(:disabled) {
      border-color: var(--color-border, #52525b);
    }

    :host-context([data-theme='dark']) select:disabled {
      background-color: var(--bg-surface-1, #171717);
      border-color: var(--color-border, #27272a);
    }

    :host-context([data-theme='dark']):host([variant='filled']) select {
      background-color: var(--bg-surface-1, #171717);
    }

    :host-context([data-theme='dark']):host([variant='filled']) select:hover:not(:disabled) {
      background-color: var(--bg-surface-2, #262626);
    }

    :host-context([data-theme='dark']):host([variant='filled']) select:focus {
      background-color: var(--bg-surface-0, #0a0a0a);
    }

    :host-context([data-theme='dark']):host([invalid]) select {
      border-color: var(--color-error, #ef4444);
    }

    :host-context([data-theme='dark']):host([disabled][invalid]) select {
      background-color: var(--bg-surface-1, #171717);
      border-color: var(--color-border, #27272a);
    }

    /* -------------------------------------------------------------
     * prefers-reduced-motion 対応
     * ------------------------------------------------------------- */
    @media (prefers-reduced-motion: reduce) {
      select,
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

  @query('select')
  private _selectElement!: HTMLSelectElement;

  override firstUpdated() {
    // スロットから option 要素を取得して select に反映
    this._syncOptions();
  }

  private _syncOptions() {
    const slot = this.shadowRoot?.querySelector('slot');
    if (!slot) return;

    const assignedNodes = slot.assignedNodes({ flatten: true });
    const options = assignedNodes.filter(
      (node) => node.nodeName === 'OPTION'
    ) as HTMLOptionElement[];

    // option 要素を select に追加
    options.forEach((option) => {
      const clonedOption = option.cloneNode(true) as HTMLOptionElement;
      this._selectElement.appendChild(clonedOption);
    });

    // selected 属性を持つオプションを検出
    const selectedOption = options.find((opt) => opt.hasAttribute('selected'));
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

  override render() {
    return html`
      <div class="dropdown-container">
        ${this.label
          ? html`<label class="label" for="select">${this.label}</label>`
          : ''}
        <div class="select-wrapper">
          <select
            id="select"
            ?disabled=${this.disabled}
            name=${this.name}
            @change=${this._handleChange}
            aria-invalid="${this.invalid}"
          >
            <!-- スロットから option を同期するため、ここは空 -->
          </select>
          <!-- カスタム矢印アイコン（SVG） -->
          <svg
            class="arrow-icon"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <!-- hidden slot for option elements -->
        <slot style="display: none;"></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-dropdown': UiDropdown;
  }
}
