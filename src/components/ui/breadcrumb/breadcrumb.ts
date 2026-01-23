import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * ui-breadcrumb - アクセシブルなパンくずリストコンポーネント
 *
 * @slot - パンくずリストアイテム（ui-breadcrumb-item）
 *
 * @fires navigate - アイテムがクリックされたときに発火
 *
 * @cssprop --breadcrumb-font-size - パンくずリストのフォントサイズ
 */
@customElement('ui-breadcrumb')
export class UiBreadcrumb extends LitElement {
  static override styles = css`
    /* -------------------------------------------------------------
     * ホスト要素
     * ------------------------------------------------------------- */
    :host {
      display: block;
      font-family: var(--font-sans, system-ui, sans-serif);
      font-size: var(--text-sm, 0.8125rem);
      line-height: 1.5;
    }

    /* -------------------------------------------------------------
     * ナビゲーション
     * ------------------------------------------------------------- */
    nav {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0;
    }

    /* -------------------------------------------------------------
     * スロット
     * ------------------------------------------------------------- */
    ::slotted(ui-breadcrumb-item:not(:last-child))::after {
      content: '';
    }
  `;

  @property({ type: String, reflect: true })
  separator: 'chevron' | 'slash' | 'arrow' = 'chevron';

  @property({ type: String, attribute: 'aria-label' })
  override ariaLabel = 'パンくずリスト';

  override render() {
    return html`
      <nav aria-label="${this.ariaLabel}">
        <slot></slot>
      </nav>
    `;
  }
}

/**
 * ui-breadcrumb-item - パンくずリストの個別アイテム
 *
 * @slot - リンクテキスト
 * @slot item - 省略されたアイテム（collapsed時）
 *
 * @fires navigate - リンククリック時
 */
@customElement('ui-breadcrumb-item')
export class UiBreadcrumbItem extends LitElement {
  static override styles = css`
    /* -------------------------------------------------------------
     * ホスト要素
     * ------------------------------------------------------------- */
    :host {
      display: inline-flex;
      align-items: center;
      gap: 0;
      font-family: var(--font-sans, system-ui, sans-serif);
      font-size: inherit;
      line-height: inherit;
      position: relative;
    }

    /* -------------------------------------------------------------
     * リンク要素
     * ------------------------------------------------------------- */
    a {
      display: block;
      padding: var(--item-padding, 0);
      
      color: var(--color-foreground-muted, #6b7280);
      text-decoration: none;
      font-weight: var(--font-normal, 400);
      
      border-radius: var(--item-border-radius, 0);
      
      transition: 
        color var(--motion-duration, 200ms) var(--ease-out, ease-out),
        background-color var(--motion-duration, 200ms) var(--ease-out, ease-out);
      
      cursor: pointer;
    }

    a:hover {
      color: var(--color-foreground, #111827);
      background-color: var(--item-bg-hover, transparent);
      text-decoration: underline;
      text-underline-offset: 0.2em;
    }

    /* ドロップダウン内のアイテムは下線なし */
    :host([slot="item"]) a:hover {
      text-decoration: none;
      background-color: var(--color-background-subtle, #f3f4f6);
    }

    a:focus-visible {
      outline: 2px solid var(--color-primary, #3b82f6);
      outline-offset: 2px;
      border-radius: var(--radius-sm, 0.25rem);
    }

    /* -------------------------------------------------------------
     * 現在のページ（リンクではない）
     * ------------------------------------------------------------- */
    .current {
      color: var(--color-foreground, #111827);
      font-weight: var(--font-medium, 500);
    }

    /* -------------------------------------------------------------
     * 省略ボタン（ゴーストスタイル - テキストと同じ高さ）
     * ------------------------------------------------------------- */
    .collapsed-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      
      padding: 0;
      
      background: transparent;
      border: none;
      border-radius: var(--radius-sm, 0.25rem);
      
      color: var(--color-foreground-muted, #6b7280);
      font-family: inherit;
      font-size: inherit;
      font-weight: var(--font-medium, 500);
      line-height: 1;
      
      cursor: pointer;
      
      transition: 
        color var(--motion-duration, 200ms) var(--motion-easing, ease-out),
        background-color var(--motion-duration, 200ms) var(--motion-easing, ease-out);
    }

    .collapsed-button:hover {
      background-color: var(--color-background-subtle, #f3f4f6);
      color: var(--color-foreground, #111827);
    }

    .collapsed-button:focus-visible {
      outline: 2px solid var(--color-primary, #3b82f6);
      outline-offset: 2px;
    }

    .collapsed-button[aria-expanded="true"] {
      background-color: var(--color-background-subtle, #f3f4f6);
      color: var(--color-foreground, #111827);
    }

    /* -------------------------------------------------------------
     * ドロップダウンメニュー
     * ------------------------------------------------------------- */
    .dropdown {
      position: absolute;
      top: calc(100% + var(--space-1, 0.25rem));
      left: 50%;
      transform: translateX(-50%) translateY(-0.25rem);
      z-index: var(--z-dropdown, 200);
      
      min-width: 150px;
      width: max-content;
      
      background: var(--color-background, #ffffff);
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: var(--radius-lg, 0.5rem);
      box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
      
      padding: var(--space-1, 0.25rem);
      
      opacity: 0;
      pointer-events: none;
      
      transition:
        opacity var(--motion-duration, 200ms) var(--motion-easing, ease-out),
        transform var(--motion-duration, 200ms) var(--motion-easing, ease-out);
    }

    .dropdown.open {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
      pointer-events: auto;
    }

    /* -------------------------------------------------------------
     * ドロップダウンアイテム
     * ------------------------------------------------------------- */
    .dropdown ::slotted(ui-breadcrumb-item) {
      display: block;
      margin: 0;
    }

    /* ドロップダウン内のアイテムはセパレーターを非表示（特異度を上げて!importantを回避） */
    :host([slot="item"]:last-child) .separator,
    :host([slot="item"]:not(:last-child)) .separator {
      display: none;
    }

    /* スロット内のアイテムにホバー効果を適用するためのグローバルスタイル */
    :host([collapsed]) ::slotted(ui-breadcrumb-item[slot="item"]) {
      --item-padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
      --item-border-radius: var(--radius-sm, 0.25rem);
    }

    /* -------------------------------------------------------------
     * セパレーター
     * ------------------------------------------------------------- */
    .separator {
      display: inline-flex;
      align-items: center;
      color: var(--color-foreground-muted, #6b7280);
      flex-shrink: 0;
      margin: 0 var(--space-2, 0.5rem);
    }

    .separator svg {
      width: 1em;
      height: 1em;
      stroke: currentColor;
    }

    /* 最後のアイテムにはセパレーターを表示しない */
    :host(:last-child) .separator {
      display: none;
    }

    /* -------------------------------------------------------------
     * ダークモード対応（グローバルトークンを使用）
     * ------------------------------------------------------------- */
    @media (prefers-color-scheme: dark) {
      /* ドロップダウン内のホバー背景 */
      :host([slot="item"]) a:hover {
        background-color: var(--bg-surface-2, #262626);
      }

      /* ドロップダウン本体の背景とシャドウ */
      .dropdown {
        background: var(--bg-surface-2, #262626);
        border-color: var(--color-border, #27272a);
        box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.3));
      }
    }

    /* data-theme="dark" 対応 */
    :host-context([data-theme='dark']):host([slot="item"]) a:hover {
      background-color: var(--bg-surface-2, #262626);
    }

    :host-context([data-theme='dark']) .dropdown {
      background: var(--bg-surface-2, #262626);
      border-color: var(--color-border, #27272a);
      box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.3));
    }

    /* -------------------------------------------------------------
     * prefers-reduced-motion 対応
     * ------------------------------------------------------------- */
    @media (prefers-reduced-motion: reduce) {
      a,
      .collapsed-button,
      .dropdown {
        transition: none;
      }
    }
  `;

  @property({ type: String })
  href = '';

  @property({ type: Boolean, reflect: true })
  current = false;

  @property({ type: Boolean, reflect: true })
  collapsed = false;

  @property({ type: String, attribute: 'collapsed-aria-label' })
  collapsedAriaLabel = '省略されたパンくずを表示';

  @property({ type: Boolean })
  private _dropdownOpen = false;

  private _handleClick() {
    if (!this.current && this.href) {
      // カスタムイベントを発火
      this.dispatchEvent(
        new CustomEvent('navigate', {
          detail: { href: this.href },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  private _toggleDropdown() {
    this._dropdownOpen = !this._dropdownOpen;
    if (this._dropdownOpen) {
      // ドロップダウンを開いたら最初のアイテムにフォーカス
      this.updateComplete.then(() => {
        const dropdown = this.shadowRoot?.querySelector('.dropdown');
        const firstItem = dropdown?.querySelector('ui-breadcrumb-item');
        const firstLink = firstItem?.shadowRoot?.querySelector('a');
        (firstLink as HTMLElement)?.focus();
      });
    }
  }

  private _closeDropdown() {
    this._dropdownOpen = false;
  }

  private _handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && this._dropdownOpen) {
      e.preventDefault();
      this._closeDropdown();
      // 省略ボタンにフォーカスを戻す
      const button = this.shadowRoot?.querySelector('.collapsed-button') as HTMLElement;
      button?.focus();
    } else if ((e.key === 'Enter' || e.key === ' ') && !this._dropdownOpen) {
      e.preventDefault();
      this._toggleDropdown();
    } else if (e.key === 'ArrowDown' && this._dropdownOpen) {
      e.preventDefault();
      this._focusNextItem();
    } else if (e.key === 'ArrowUp' && this._dropdownOpen) {
      e.preventDefault();
      this._focusPreviousItem();
    }
  }

  private _focusNextItem() {
    const dropdown = this.shadowRoot?.querySelector('.dropdown');
    const items = Array.from(dropdown?.querySelectorAll('ui-breadcrumb-item') || []);
    const currentFocus = this.shadowRoot?.activeElement;
    
    for (let i = 0; i < items.length; i++) {
      const link = items[i]?.shadowRoot?.querySelector('a');
      if (link === currentFocus) {
        const nextItem = items[i + 1];
        if (nextItem) {
          const nextLink = nextItem?.shadowRoot?.querySelector('a') as HTMLElement;
          nextLink?.focus();
        }
        return;
      }
    }
  }

  private _focusPreviousItem() {
    const dropdown = this.shadowRoot?.querySelector('.dropdown');
    const items = Array.from(dropdown?.querySelectorAll('ui-breadcrumb-item') || []);
    const currentFocus = this.shadowRoot?.activeElement;
    
    for (let i = items.length - 1; i >= 0; i--) {
      const link = items[i]?.shadowRoot?.querySelector('a');
      if (link === currentFocus) {
        const prevItem = items[i - 1];
        if (prevItem) {
          const prevLink = prevItem?.shadowRoot?.querySelector('a') as HTMLElement;
          prevLink?.focus();
        } else {
          // 最初のアイテムの場合、ボタンにフォーカスを戻す
          const button = this.shadowRoot?.querySelector('.collapsed-button') as HTMLElement;
          button?.focus();
        }
        return;
      }
    }
  }

  override connectedCallback() {
    super.connectedCallback();
    // ドロップダウン外クリックでクローズ
    document.addEventListener('click', this._handleOutsideClick);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._handleOutsideClick);
  }

  private _handleOutsideClick = (e: MouseEvent) => {
    if (!e.composedPath().includes(this)) {
      this._closeDropdown();
    }
  };

  private _getSeparator() {
    const breadcrumb = this.closest('ui-breadcrumb');
    const separator = breadcrumb?.separator || 'chevron';

    switch (separator) {
      case 'slash':
        return html`<span class="separator" aria-hidden="true">/</span>`;
      case 'arrow':
        return html`
          <span class="separator" aria-hidden="true">
            <!-- Lucide arrow-right icon -->
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </span>
        `;
      case 'chevron':
      default:
        return html`
          <span class="separator" aria-hidden="true">
            <!-- Lucide chevron-right icon -->
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </span>
        `;
    }
  }

  override render() {
    if (this.collapsed) {
      return html`
        <button
          class="collapsed-button"
          @click=${this._toggleDropdown}
          @keydown=${this._handleKeyDown}
          aria-expanded="${this._dropdownOpen}"
          aria-label="${this.collapsedAriaLabel}"
          aria-haspopup="true"
        >
          …
        </button>
        <div class="dropdown ${this._dropdownOpen ? 'open' : ''}">
          <slot name="item"></slot>
        </div>
        ${this._getSeparator()}
      `;
    }

    return html`
      ${this.current
        ? html`<span class="current" aria-current="page"><slot></slot></span>`
        : html`<a href=${this.href} @click=${this._handleClick}><slot></slot></a>`}
      ${this._getSeparator()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-breadcrumb': UiBreadcrumb;
    'ui-breadcrumb-item': UiBreadcrumbItem;
  }
}
