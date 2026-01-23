import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

/**
 * ui-dropdown-menu - ヘッダーナビ用ドロップダウンメニュー
 * 
 * @fires menu-item-click - メニュー項目がクリックされたときに発火 { detail: { label: string } }
 * 
 * @slot trigger - トリガーボタン
 * @slot - メニュー項目（ui-menu-item, ui-menu-separator）
 */
@customElement('ui-dropdown-menu')
export class UiDropdownMenu extends LitElement {
  static override styles = css`
    :host {
      display: inline-block;
      position: relative;
      font-family: var(--font-sans, system-ui, sans-serif);
    }

    .menu-container {
      position: absolute;
      margin-top: var(--space-1, 0.25rem);
      background: var(--color-background, #ffffff);
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: var(--radius-md, 0.375rem);
      box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.1));
      padding: var(--space-1, 0.25rem);
      min-width: 12rem;
      z-index: var(--z-dropdown, 1000);
      opacity: 0;
      transform: translateY(-0.5rem);
      transition:
        opacity var(--motion-duration, 200ms) var(--motion-easing, ease-out),
        transform var(--motion-duration, 200ms) var(--motion-easing, ease-out);
      pointer-events: none;
    }

    .menu-container[data-open="true"] {
      opacity: 1;
      transform: translateY(0);
      pointer-events: auto;
    }

    .menu-container[data-placement="bottom-start"] {
      left: 0;
      top: 100%;
    }

    .menu-container[data-placement="bottom-end"] {
      right: 0;
      top: 100%;
    }

    .menu-container[data-placement="top-start"] {
      left: 0;
      bottom: 100%;
      margin-top: 0;
      margin-bottom: var(--space-1, 0.25rem);
    }

    .menu-container[data-placement="top-end"] {
      right: 0;
      bottom: 100%;
      margin-top: 0;
      margin-bottom: var(--space-1, 0.25rem);
    }

    /* ダークモード */
    @media (prefers-color-scheme: dark) {
      .menu-container {
        background: var(--bg-surface-1, #18181b);
        border-color: var(--color-border, #27272a);
        box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.5));
      }
    }

    :host-context([data-theme='dark']) .menu-container {
      background: var(--bg-surface-1, #18181b);
      border-color: var(--color-border, #27272a);
      box-shadow: var(--shadow-lg, 0 10px 15px -3px rgba(0, 0, 0, 0.5));
    }

    /* prefers-reduced-motion 対応 */
    @media (prefers-reduced-motion: reduce) {
      .menu-container {
        transition: none;
      }
    }
  `;

  @property({ type: Boolean, reflect: true })
  open = false;

  @property({ type: String })
  placement: 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end' = 'bottom-start';

  @state()
  private _menuItems: HTMLElement[] = [];

  @state()
  private _focusedIndex = -1;

  @state()
  private _triggers: HTMLElement[] = [];

  private _menuItemClickHandler = (e: Event) => {
    const customEvent = e as CustomEvent;
    this.dispatchEvent(
      new CustomEvent('menu-item-click', {
        detail: customEvent.detail,
        bubbles: true,
        composed: true,
      })
    );
    this.open = false;
  };

  private _clickOutsideHandler = (e: MouseEvent) => {
    if (!this.contains(e.target as Node)) {
      this.open = false;
    }
  };

  private _escapeKeyHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.open) {
      this.open = false;
      this._triggers[0]?.focus();
      e.preventDefault();
    }
  };

  override connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this._clickOutsideHandler);
    document.addEventListener('keydown', this._escapeKeyHandler);
    this.addEventListener('keydown', this._handleKeyDown);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this._clickOutsideHandler);
    document.removeEventListener('keydown', this._escapeKeyHandler);
    this.removeEventListener('keydown', this._handleKeyDown);

    // メニューアイテムリスナーのクリーンアップ
    this._menuItems.forEach((item) => {
      item.removeEventListener('menu-item-click', this._menuItemClickHandler);
    });
  }

  override firstUpdated() {
    this._collectMenuItems();
    this._setupTriggerA11y();
  }

  override updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('open')) {
      // open が変わったら トリガーの aria-expanded を更新
      this._updateTriggerAriaExpanded();
    }
  }

  private _setupTriggerA11y() {
    const triggerSlot = this.shadowRoot?.querySelector('slot[name="trigger"]') as HTMLSlotElement;
    if (triggerSlot) {
      this._triggers = triggerSlot.assignedElements() as HTMLElement[];
      this._triggers.forEach((trigger) => {
        trigger.setAttribute('aria-haspopup', 'menu');
        trigger.setAttribute('aria-expanded', String(this.open));
      });
    }
  }

  private _updateTriggerAriaExpanded() {
    this._triggers.forEach((trigger) => {
      trigger.setAttribute('aria-expanded', String(this.open));
    });
  }

  private _collectMenuItems() {
    const slot = this.shadowRoot?.querySelector('slot:not([name])') as HTMLSlotElement;
    if (slot) {
      this._menuItems = slot
        .assignedElements()
        .filter((el) => el.tagName.toLowerCase() === 'ui-menu-item') as HTMLElement[];

      // メニュー項目のクリックイベントを監視
      this._menuItems.forEach((item) => {
        item.addEventListener('menu-item-click', this._menuItemClickHandler);
      });
    }
  }

  private _handleTriggerClick(e: Event) {
    e.stopPropagation();
    this.open = !this.open;

    if (this.open) {
      this._focusedIndex = -1;
      // メニューが開いたらフォーカスを最初の項目に移動
      this.updateComplete.then(() => {
        // 微小な遅延を入れることでフォーカス移動を確実にする
        requestAnimationFrame(() => {
          this._focusFirstItem();
        });
      });
    }
  }

  private _handleKeyDown(e: KeyboardEvent) {
    if (!this.open) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this._focusNextItem();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this._focusPreviousItem();
    } else if (e.key === 'Home') {
      e.preventDefault();
      this._focusFirstItem();
    } else if (e.key === 'End') {
      e.preventDefault();
      this._focusLastItem();
    } else if (e.key === 'Tab') {
      this.open = false;
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (this._focusedIndex >= 0) {
        const item = this._menuItems[this._focusedIndex];
        if (item && !item.hasAttribute('disabled')) {
          item.click();
        }
      }
    }
  }

  private _focusFirstItem() {
    const firstEnabledIndex = this._menuItems.findIndex(
      (item) => !item.hasAttribute('disabled')
    );
    if (firstEnabledIndex >= 0) {
      this._focusedIndex = firstEnabledIndex;
      this._menuItems[firstEnabledIndex]?.focus();
    }
  }

  private _focusLastItem() {
    for (let i = this._menuItems.length - 1; i >= 0; i--) {
      if (!this._menuItems[i]?.hasAttribute('disabled')) {
        this._focusedIndex = i;
        this._menuItems[i]?.focus();
        break;
      }
    }
  }

  private _focusNextItem() {
    let nextIndex = this._focusedIndex + 1;
    while (nextIndex < this._menuItems.length) {
      if (!this._menuItems[nextIndex]?.hasAttribute('disabled')) {
        this._focusedIndex = nextIndex;
        this._menuItems[nextIndex]?.focus();
        return;
      }
      nextIndex++;
    }
  }

  private _focusPreviousItem() {
    let prevIndex = this._focusedIndex - 1;
    while (prevIndex >= 0) {
      if (!this._menuItems[prevIndex]?.hasAttribute('disabled')) {
        this._focusedIndex = prevIndex;
        this._menuItems[prevIndex]?.focus();
        return;
      }
      prevIndex--;
    }
  }

  override render() {
    return html`
      <div @click="${this._handleTriggerClick}">
        <slot name="trigger"></slot>
      </div>

      <div
        class="menu-container"
        role="menu"
        data-open="${this.open}"
        data-placement="${this.placement}"
      >
        <slot></slot>
      </div>
    `;
  }
}

/**
 * ui-menu-item - メニュー項目
 * 
 * @fires menu-item-click - 項目がクリックされたときに発火 { detail: { label: string } }
 * 
 * @slot icon - アイコン
 * @slot - ラベルテキスト
 */
@customElement('ui-menu-item')
export class UiMenuItem extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    [role="menuitem"] {
      display: flex;
      align-items: center;
      gap: var(--space-2, 0.5rem);
      padding: var(--space-2, 0.5rem) var(--space-3, 0.75rem);
      background: transparent;
      border: none;
      border-radius: var(--radius-sm, 0.25rem);
      color: var(--color-foreground, #111827);
      font-family: inherit;
      font-size: var(--text-sm, 0.875rem);
      line-height: 1.5;
      cursor: pointer;
      user-select: none;
      width: 100%;
      text-align: left;
      transition:
        background-color var(--motion-duration, 200ms) var(--motion-easing, ease-out),
        color var(--motion-duration, 200ms) var(--motion-easing, ease-out);
    }

    [role="menuitem"]:hover:not([aria-disabled="true"]) {
      background-color: var(--bg-surface-1, #f3f4f6);
    }

    [role="menuitem"]:focus-visible {
      outline: 2px solid var(--color-primary, #3b82f6);
      outline-offset: -2px;
    }

    [role="menuitem"]:active:not([aria-disabled="true"]) {
      transform: scale(0.98);
    }

    [role="menuitem"][aria-disabled="true"] {
      opacity: 0.4;
      cursor: not-allowed;
    }

    .icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1rem;
      height: 1rem;
      flex-shrink: 0;
    }

    .icon[hidden] {
      display: none;
    }

    /* ダークモード */
    @media (prefers-color-scheme: dark) {
      [role="menuitem"] {
        color: var(--color-foreground, #f9fafb);
      }

      [role="menuitem"]:hover:not([aria-disabled="true"]) {
        background-color: var(--bg-surface-2, #27272a);
      }
    }

    :host-context([data-theme='dark']) [role="menuitem"] {
      color: var(--color-foreground, #f9fafb);
    }

    :host-context([data-theme='dark']) [role="menuitem"]:hover:not([aria-disabled="true"]) {
      background-color: var(--bg-surface-2, #27272a);
    }

    /* prefers-reduced-motion 対応 */
    @media (prefers-reduced-motion: reduce) {
      [role="menuitem"] {
        transition: none;
      }
    }
  `;

  @property({ type: Boolean, reflect: true })
  disabled = false;

  @state()
  private _hasIcon = false;

  override focus(options?: FocusOptions) {
    const button = this.shadowRoot?.querySelector('button');
    if (button) {
      button.focus(options);
    } else {
      super.focus(options);
    }
  }

  override click() {
    const button = this.shadowRoot?.querySelector('button');
    if (button) {
      button.click();
    } else {
      super.click();
    }
  }

  private _handleClick() {
    if (this.disabled) return;

    const label = this.textContent?.trim() || '';

    this.dispatchEvent(
      new CustomEvent('menu-item-click', {
        detail: { label },
        bubbles: true,
        composed: true,
      })
    );
  }

  private _handleIconSlotChange(e: Event) {
    const slot = e.target as HTMLSlotElement;
    this._hasIcon = slot.assignedNodes().length > 0;
  }

  override render() {
    return html`
      <button
        role="menuitem"
        aria-disabled="${this.disabled}"
        @click="${this._handleClick}"
      >
        <span class="icon" ?hidden="${!this._hasIcon}">
          <slot name="icon" @slotchange="${this._handleIconSlotChange}"></slot>
        </span>
        <slot></slot>
      </button>
    `;
  }
}

/**
 * ui-menu-separator - メニューの区切り線
 */
@customElement('ui-menu-separator')
export class UiMenuSeparator extends LitElement {
  static override styles = css`
    :host {
      display: block;
      margin: var(--space-1, 0.25rem) 0;
    }

    hr {
      border: none;
      border-top: 1px solid var(--color-border, #e5e7eb);
      margin: 0;
    }

    /* ダークモード */
    @media (prefers-color-scheme: dark) {
      hr {
        border-top-color: var(--color-border, #27272a);
      }
    }

    :host-context([data-theme='dark']) hr {
      border-top-color: var(--color-border, #27272a);
    }
  `;

  override render() {
    return html`<hr role="separator" />`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-dropdown-menu': UiDropdownMenu;
    'ui-menu-item': UiMenuItem;
    'ui-menu-separator': UiMenuSeparator;
  }
}
