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
      font-family: var(--font-sans);
      font-size: var(--text-sm);
      line-height: var(--line-height-normal);
    }

    /* -------------------------------------------------------------
     * ナビゲーション
     * ------------------------------------------------------------- */
    nav {
      display: block;
    }

    /* リスト要素 */
    ol {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 0;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    li {
      display: contents;
    }
  `;

  @property({ type: String, reflect: true })
  separator: 'chevron' | 'slash' | 'arrow' = 'chevron';

  @property({ type: String, attribute: 'aria-label' })
  override ariaLabel = 'パンくずリスト';

  override render() {
    return html`
      <nav aria-label="${this.ariaLabel}">
        <ol>
          <li><slot></slot></li>
        </ol>
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
      position: relative;
      list-style: none;
      font-family: var(--font-sans);
      font-size: inherit;
      line-height: inherit;
    }

    /* コンテナ */
    .item-container {
      display: inline-flex;
      align-items: center;
      gap: 0;
    }

    /* -------------------------------------------------------------
     * リンク要素
     * ------------------------------------------------------------- */
    a {
      display: inline-flex;
      align-items: center;
      position: relative;
      padding: var(--item-padding, 0);
      
      color: var(--color-foreground-muted);
      text-decoration: none;
      font-weight: var(--font-normal);
      
      border-radius: var(--item-border-radius, 0);
      
      transition: 
        color var(--motion-duration) var(--motion-easing),
        background-color var(--motion-duration) var(--motion-easing);
      
      cursor: pointer;
    }

    a::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      width: 0;
      height: 1px;
      background: currentColor;
      transition: width var(--motion-duration) var(--motion-easing);
    }

    a:hover {
      color: var(--color-foreground);
      background-color: var(--item-bg-hover, transparent);
    }

    a:hover::after {
      width: 100%;
    }

    /* ドロップダウン内のアイテムは下線なし、背景変化のみ */
    :host([slot="item"]) a::after {
      display: none;
    }

    :host([slot="item"]) a {
      display: flex;
      width: 100%;
      padding: var(--space-2) var(--space-3);
      border-radius: var(--radius-sm);
      box-sizing: border-box;
    }

    :host([slot="item"]) a:hover {
      background-color: var(--breadcrumb-dropdown-item-hover-bg);
    }
    
    /* ドロップダウン内アイテムのフォーカスリング調整 */
    :host([slot="item"]) a:focus-visible {
      outline-offset: -2px; /* 内側に描画してはみ出しを防ぐ */
    }

    a:focus-visible {
      outline: var(--focus-ring-width) solid var(--color-primary);
      outline-offset: var(--focus-ring-offset);
      border-radius: var(--radius-sm);
    }

    /* -------------------------------------------------------------
     * 現在のページ
     * ------------------------------------------------------------- */
    .current {
      display: inline-flex;
      align-items: center;
      color: var(--color-foreground);
      font-weight: var(--font-medium);
    }

    /* -------------------------------------------------------------
     * 省略ボタン
     * ------------------------------------------------------------- */
    .collapsed-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      
      min-width: 1.75rem;
      height: 1.5rem;
      padding: 0 var(--space-1);
      
      background: transparent;
      border: 1px solid transparent;
      border-radius: var(--radius-sm);
      
      color: var(--color-foreground-muted);
      font-family: inherit;
      font-size: inherit;
      font-weight: var(--font-medium);
      line-height: var(--line-height-none);
      
      cursor: pointer;
      
      transition: 
        color var(--motion-duration) var(--motion-easing),
        background-color var(--motion-duration) var(--motion-easing),
        border-color var(--motion-duration) var(--motion-easing);
    }

    .collapsed-button:hover {
      background-color: var(--color-surface-hover);
      color: var(--color-foreground);
    }

    .collapsed-button:focus-visible {
      outline: var(--focus-ring-width) solid var(--color-primary);
      outline-offset: var(--focus-ring-offset);
      border-radius: var(--radius-sm);
    }

    /* ドロップダウン展開中はアクティブ状態を維持 */
    .collapsed-button[aria-expanded="true"] {
      background-color: var(--color-background-subtle);
      color: var(--color-foreground);
    }

    /* -------------------------------------------------------------
     * ドロップダウンメニュー
     * ------------------------------------------------------------- */
    .dropdown {
      position: absolute;
      top: calc(100% + var(--space-2));
      left: 50%;
      transform: translateX(-50%) translateY(-4px) scale(0.98);
      transform-origin: top center;
      z-index: var(--z-dropdown);
      
      min-width: 150px;
      width: max-content;
      
      background: var(--breadcrumb-dropdown-bg);
      border: 1px solid var(--breadcrumb-dropdown-border);
      border-radius: var(--radius-lg);
      box-shadow: var(--breadcrumb-dropdown-shadow);
      
      padding: var(--space-1);
      
      opacity: 0;
      pointer-events: none;
      
      transition:
        opacity var(--motion-duration) var(--motion-easing),
        transform var(--motion-duration) var(--motion-easing);
    }

    .dropdown.open {
      opacity: 1;
      transform: translateX(-50%) translateY(0) scale(1);
      pointer-events: auto;
    }

    /* -------------------------------------------------------------
     * ドロップダウンアイテム
     * ------------------------------------------------------------- */
    .dropdown ::slotted(ui-breadcrumb-item) {
      display: block;
      margin: 0;
    }

    /* ドロップダウン内のアイテムはセパレーターを非表示 */
    :host([slot="item"]:last-child) .separator,
    :host([slot="item"]:not(:last-child)) .separator {
      display: none;
    }

    /* -------------------------------------------------------------
     * セパレーター
     * ------------------------------------------------------------- */
    .separator {
      display: inline-flex;
      align-items: center;
      color: var(--color-foreground-muted);
      flex-shrink: 0;
      margin: 0 var(--space-2);
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
     * ダークモード対応（CSSカスタムプロパティでグローバル制御）
     * ------------------------------------------------------------- */
    :host {
      --breadcrumb-dropdown-bg: var(--color-background);
      --breadcrumb-dropdown-border: var(--color-border);
      --breadcrumb-dropdown-shadow: var(--shadow-lg);
      --breadcrumb-dropdown-item-hover-bg: var(--color-surface-hover);
    }

    @media (prefers-color-scheme: dark) {
      :host {
        --breadcrumb-dropdown-bg: var(--bg-surface-2);
        --breadcrumb-dropdown-border: var(--color-border);
        --breadcrumb-dropdown-shadow: var(--shadow-dark-lg);
        --breadcrumb-dropdown-item-hover-bg: var(--color-surface-hover);
      }
    }

    /* -------------------------------------------------------------
     * prefers-reduced-motion 対応
     * ------------------------------------------------------------- */
    @media (prefers-reduced-motion: reduce) {
      a,
      a::after,
      .collapsed-button,
      .dropdown {
        transition: none;
      }
    }

    /* -------------------------------------------------------------
     * Accessibility: High Contrast Mode (Windows)
     * ------------------------------------------------------------- */
    @media (forced-colors: active) {
      .collapsed-button {
        border: 1px solid ButtonText;
      }
      
      .collapsed-button:hover,
      .collapsed-button[aria-expanded="true"] {
        border: 1px solid Highlight;
      }
      
      .dropdown {
        border: 1px solid CanvasText;
      }
      
      :host([slot="item"]) a:hover,
      :host([slot="item"]) a:focus-visible {
        outline: 2px solid Highlight;
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
        this._focusFirstItem();
      });
    }
  }

  private _closeDropdown() {
    this._dropdownOpen = false;
  }

  private _getDropdownItems(): UiBreadcrumbItem[] {
    const slot = this.shadowRoot?.querySelector('slot[name="item"]') as HTMLSlotElement;
    if (!slot) return [];
    return slot.assignedElements({ flatten: true })
      .filter((el): el is UiBreadcrumbItem => el.tagName.toLowerCase() === 'ui-breadcrumb-item');
  }

  private _handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' && this._dropdownOpen) {
      e.preventDefault();
      this._closeDropdown();
      // 省略ボタンにフォーカスを戻す
      const button = this.shadowRoot?.querySelector('.collapsed-button') as HTMLElement;
      button?.focus();
    } else if ((e.key === 'Enter' || e.key === ' ') && !this._dropdownOpen) {
      // ボタン上でのイベントかチェック
      const isButton = (e.target as HTMLElement).classList.contains('collapsed-button') || 
                       (e.composedPath()[0] as HTMLElement).classList.contains('collapsed-button');
      
      if (isButton) {
        e.preventDefault();
        this._toggleDropdown();
      }
    } else if (this._dropdownOpen) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          this._focusNextItem();
          break;
        case 'ArrowUp':
          e.preventDefault();
          this._focusPreviousItem();
          break;
        case 'Home':
          e.preventDefault();
          this._focusFirstItem();
          break;
        case 'End':
          e.preventDefault();
          this._focusLastItem();
          break;
        case 'Tab':
          // ドロップダウンが開いている状態でTabを押したら閉じる（フォーカスが外れるため）
          this._closeDropdown();
          break;
      }
    }
  }

  private _focusFirstItem() {
    const items = this._getDropdownItems();
    if (items.length > 0) {
      this._focusItemInShadow(items[0]!);
    }
  }

  private _focusLastItem() {
    const items = this._getDropdownItems();
    if (items.length > 0) {
      this._focusItemInShadow(items[items.length - 1]!);
    }
  }

  private _focusItemInShadow(item: UiBreadcrumbItem) {
    // アイテム内のaタグ、またはアイテム自体にフォーカス
    const link = item?.shadowRoot?.querySelector('a');
    if (link) {
      (link as HTMLElement).focus();
    } else {
      item.focus();
    }
  }

  private _focusNextItem() {
    const items = this._getDropdownItems();
    if (items.length === 0) return;

    const currentFocus = this._getCurrentFocusedItem(items);
    
    if (!currentFocus) {
      // フォーカスがドロップダウン内にない場合は最初を選択
      this._focusFirstItem();
      return;
    }

    const currentIndex = items.indexOf(currentFocus);
    if (currentIndex < items.length - 1) {
      this._focusItemInShadow(items[currentIndex + 1]!);
    } else {
      // ループさせるか、止めるか。通常メニューはループしないことが多いが、利便性のためループさせる
      this._focusFirstItem();
    }
  }

  private _focusPreviousItem() {
    const items = this._getDropdownItems();
    if (items.length === 0) return;

    const currentFocus = this._getCurrentFocusedItem(items);
    
    if (!currentFocus) {
      this._focusLastItem();
      return;
    }

    const currentIndex = items.indexOf(currentFocus);
    if (currentIndex > 0) {
      this._focusItemInShadow(items[currentIndex - 1]!);
    } else {
      // 最初のアイテムで上を押したら最後のアイテムへ（ループ）
      this._focusLastItem();
    }
  }

  private _getCurrentFocusedItem(items: UiBreadcrumbItem[]): UiBreadcrumbItem | null {
    // shadowRootをまたいでアクティブな要素を探すのは難しいが、
    // assignedElementsのそれぞれについて、その中にフォーカスがあるかチェックする
    
    // document.activeElement から activeElement を掘り下げていく
    let active = document.activeElement;
    while (active && active.shadowRoot && active.shadowRoot.activeElement) {
      active = active.shadowRoot.activeElement;
    }
    
    // active が items のいずれかの ShadowRoot 内にあるか、あるいは item そのものか確認
    for (const item of items) {
      if (item === active || (item.shadowRoot && item.shadowRoot.contains(active))) {
        return item;
      }
    }
    return null;
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
        <div 
          class="dropdown ${this._dropdownOpen ? 'open' : ''}"
          @keydown=${this._handleKeyDown}
        >
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
