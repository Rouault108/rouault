import { css, html, LitElement, nothing, type PropertyValues } from 'lit';
import { customElement, property, queryAssignedElements, state } from 'lit/decorators.js';
import { autoUpdate, computePosition, flip, offset, shift, type Placement } from '@floating-ui/dom';

export type DropdownSide = 'top' | 'right' | 'bottom' | 'left';
export type DropdownAlign = 'start' | 'center' | 'end';
export type MenuItemVariant = 'default' | 'danger';

/**
 * command menu を一時的に提示する dropdown です。
 *
 * @slot trigger - menu button として扱う単一トリガー要素
 * @slot - `ui-menu-item` と `ui-menu-separator`
 *
 * @property {boolean} opened - 開閉状態
 * @property {DropdownSide} side - panel を出す辺
 * @property {DropdownAlign} align - panel の整列
 * @property {boolean} disabled - 開閉操作を無効化
 *
 * @fires open - 実効開状態が true へ変わったとき
 * @fires close - 実効開状態が false へ変わったとき
 * @fires menu-item-select - 項目選択時。detail: { value: string, label: string }
 */
@customElement('ui-dropdown')
export class Dropdown extends LitElement {
  static override styles = css`
    :host {
      display: inline-block;
      position: relative;
    }

    :host([disabled]) ::slotted([slot='trigger']) {
      opacity: var(--opacity-disabled, 0.5);
      cursor: not-allowed;
      pointer-events: none;
    }

    .panel {
      position: fixed;
      min-width: 180px;
      max-width: 280px;
      padding: calc(var(--radius-md, 6px) - var(--radius-sm, 4px));
      background: var(--bg-surface-2, oklch(97% 0 0));
      border: var(--border-width, 1px) solid var(--border-default, oklch(90% 0 0 / 0.12));
      border-radius: var(--radius-md, 6px);
      box-shadow:
        var(--elevation-lg, 0 8px 24px oklch(0% 0 0 / 0.12)),
        inset 0 1px 0 0 oklch(100% 0 0 / 0.05);
      z-index: var(--z-popover, 400);
      max-height: calc(var(--control-height-md, 32px) * 10);
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: oklch(0% 0 0 / 0.2) transparent;
      opacity: 0;
      transform: scale(var(--scale-enter, 0.97));
      pointer-events: none;
      transition:
        opacity var(--duration-instant, 0ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        transform var(--duration-instant, 0ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    @media (prefers-color-scheme: dark) {
      .panel {
        box-shadow:
          var(--elevation-lg, 0 8px 24px oklch(0% 0 0 / 0.3)),
          inset 0 1px 0 0 oklch(100% 0 0 / 0.1);
      }
    }

    :host([opened]) .panel {
      opacity: 1;
      transform: scale(1);
      pointer-events: auto;
      transition:
        opacity var(--duration-normal, 150ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        transform var(--duration-normal, 150ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    @media (prefers-reduced-motion: reduce) {
      .panel,
      :host([opened]) .panel {
        transition-duration: 0.01ms;
      }
    }

    @media (forced-colors: active) {
      :host ::slotted([slot='trigger']) {
        border-color: ButtonBorder !important;
        background: ButtonFace !important;
        color: ButtonText !important;
      }

      .panel {
        background: Canvas !important;
        border: var(--border-width, 1px) solid CanvasText !important;
        box-shadow: none;
      }

      :host([disabled]) ::slotted([slot='trigger']) {
        border-color: GrayText !important;
        color: GrayText !important;
        opacity: 1;
      }
    }

    @media print {
      .panel {
        display: none !important;
      }

      ::slotted([slot='trigger']) {
        opacity: 0.6;
      }

      :host([disabled]) ::slotted([slot='trigger']) {
        opacity: 0.4;
      }
    }
  `;

  @property({ type: Boolean, reflect: true })
  opened = false;

  @property({ type: String, reflect: true })
  side: DropdownSide = 'bottom';

  @property({ type: String, reflect: true })
  align: DropdownAlign = 'start';

  @property({ type: Boolean, reflect: true })
  disabled = false;

  @queryAssignedElements({ slot: 'trigger' })
  private _triggerElements!: HTMLElement[];

  private _floatingCleanup: (() => void) | null = null;
  private _clickOutsideCleanup: (() => void) | null = null;
  private _scrollCloseCleanup: (() => void) | null = null;
  private _typeaheadBuffer = '';
  private _typeaheadTimer: ReturnType<typeof setTimeout> | null = null;
  private _openFocusTarget: 'first' | 'last' = 'first';
  private _openFocusTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private _restoreFocusOnClose = true;
  private readonly _menuId = `dropdown-menu-${Math.random().toString(36).slice(2, 11)}`;
  private readonly _triggerId = `dropdown-trigger-${Math.random().toString(36).slice(2, 11)}`;
  @state()
  private _resolvedTriggerId = this._triggerId;
  private _boundTriggerElement: HTMLElement | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('menu-item-click', this._handleMenuItemClick as EventListener);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('menu-item-click', this._handleMenuItemClick as EventListener);
    this._detachTriggerListeners(this._boundTriggerElement);
    this._boundTriggerElement = null;
    this._cleanupFloating();
    this._cleanupClickOutside();
    this._cleanupScrollClose();

    if (this._typeaheadTimer !== null) {
      clearTimeout(this._typeaheadTimer);
    }

    if (this._openFocusTimeoutId !== null) {
      clearTimeout(this._openFocusTimeoutId);
    }
  }

  override firstUpdated(): void {
    this._syncTriggerElement();
  }

  override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);

    if (changedProperties.has('opened')) {
      const previousOpened = changedProperties.get('opened');
      const wasOpened = typeof previousOpened === 'boolean' ? previousOpened : false;

      if (this.opened) {
        this._onOpen();
      } else {
        this._onClose();
      }

      if (wasOpened !== this.opened) {
        this.dispatchEvent(
          new CustomEvent(this.opened ? 'open' : 'close', {
            bubbles: true,
            composed: true,
          }),
        );
      }
    }

    if (changedProperties.has('side') || changedProperties.has('align')) {
      if (this.opened) {
        this._setupFloating();
      }
    }

    if (changedProperties.has('disabled')) {
      this._updateTriggerAria(this.opened);
    }
  }

  open(): void {
    if (this.disabled || this.opened) {
      return;
    }
    this.opened = true;
  }

  close(restoreFocus = true): void {
    if (!this.opened) {
      return;
    }
    this._restoreFocusOnClose = restoreFocus;
    this.opened = false;
  }

  toggle(): void {
    if (this.disabled) {
      return;
    }

    if (this.opened) {
      this.close();
      return;
    }

    this.open();
  }

  private _onOpen(): void {
    this._setupFloating();
    this._setupClickOutside();
    this._setupScrollClose();
    this._updateTriggerAria(true);

    const focusTarget = this._openFocusTarget;
    this._openFocusTarget = 'first';

    if (this._openFocusTimeoutId !== null) {
      clearTimeout(this._openFocusTimeoutId);
    }

    this._openFocusTimeoutId = setTimeout(() => {
      this._openFocusTimeoutId = null;
      const items = this._getMenuItems();
      const target =
        focusTarget === 'last'
          ? [...items].reverse().find((item) => !item.disabled)
          : items.find((item) => !item.disabled);
      this._focusItem(target ?? null);
    }, 0);
  }

  private _onClose(): void {
    if (this._openFocusTimeoutId !== null) {
      clearTimeout(this._openFocusTimeoutId);
      this._openFocusTimeoutId = null;
    }

    this._cleanupFloating();
    this._cleanupClickOutside();
    this._cleanupScrollClose();
    this._updateTriggerAria(false);

    if (this._restoreFocusOnClose) {
      this._getTriggerElement()?.focus({ preventScroll: true });
    }

    this._restoreFocusOnClose = true;
  }

  private _attachTriggerListeners(trigger: HTMLElement | null): void {
    if (!trigger) {
      return;
    }

    trigger.addEventListener('click', this._handleTriggerClick);
    trigger.addEventListener('keydown', this._handleTriggerKeyDown);
  }

  private _detachTriggerListeners(trigger: HTMLElement | null): void {
    if (!trigger) {
      return;
    }

    trigger.removeEventListener('click', this._handleTriggerClick);
    trigger.removeEventListener('keydown', this._handleTriggerKeyDown);
  }

  private _syncTriggerElement(): void {
    const nextTrigger = this._getTriggerElement();

    if (this._boundTriggerElement !== nextTrigger) {
      this._detachTriggerListeners(this._boundTriggerElement);
      this._boundTriggerElement = nextTrigger;
      this._attachTriggerListeners(this._boundTriggerElement);
    }

    this._updateTriggerAria(this.opened);
  }

  private _setupFloating(): void {
    const trigger = this._getTriggerElement();
    const panel = this.shadowRoot?.querySelector<HTMLElement>('.panel');

    if (!trigger || !panel) {
      return;
    }

    this._cleanupFloating();

    const update = (): void => {
      void computePosition(trigger, panel, {
        strategy: 'fixed',
        placement: this._resolvePlacement(),
        middleware: [offset(4), flip(), shift({ padding: 8 })],
      }).then(({ x, y }) => {
        Object.assign(panel.style, {
          left: `${String(x)}px`,
          top: `${String(y)}px`,
        });
      });
    };

    update();
    this._floatingCleanup = autoUpdate(trigger, panel, update);
  }

  private _cleanupFloating(): void {
    this._floatingCleanup?.();
    this._floatingCleanup = null;
  }

  private _setupClickOutside(): void {
    const handler = (event: MouseEvent): void => {
      if (!event.composedPath().includes(this)) {
        this.close(false);
      }
    };

    document.addEventListener('mousedown', handler, { capture: true });
    this._clickOutsideCleanup = () => {
      document.removeEventListener('mousedown', handler, { capture: true });
    };
  }

  private _cleanupClickOutside(): void {
    this._clickOutsideCleanup?.();
    this._clickOutsideCleanup = null;
  }

  private _setupScrollClose(): void {
    const handler = (): void => {
      if (this.opened) {
        this.close(false);
      }
    };

    window.addEventListener('scroll', handler, { capture: true, passive: true });
    this._scrollCloseCleanup = () => {
      window.removeEventListener('scroll', handler, { capture: true });
    };
  }

  private _cleanupScrollClose(): void {
    this._scrollCloseCleanup?.();
    this._scrollCloseCleanup = null;
  }

  private _updateTriggerAria(expanded: boolean): void {
    const trigger = this._getTriggerElement();

    if (!trigger) {
      return;
    }

    trigger.setAttribute('aria-expanded', String(expanded));
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-controls', this._menuId);

    if (this.disabled) {
      trigger.setAttribute('aria-disabled', 'true');
    } else {
      trigger.removeAttribute('aria-disabled');
    }

    if (!this._isNativeButtonLikeTrigger(trigger)) {
      trigger.setAttribute('role', 'button');
      if (this.disabled) {
        trigger.setAttribute('tabindex', '-1');
      } else if (!trigger.hasAttribute('tabindex')) {
        trigger.setAttribute('tabindex', '0');
      }
    }

    if (!trigger.id) {
      trigger.id = this._triggerId;
    }

    this._resolvedTriggerId = trigger.id;
  }

  private _getMenuItems(): MenuItem[] {
    const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('.menu-slot');

    if (!slot) {
      return [];
    }

    return slot
      .assignedElements({ flatten: true })
      .filter((element): element is MenuItem => element instanceof MenuItem);
  }

  private _getTriggerElement(): HTMLElement | null {
    return this._triggerElements[0] ?? null;
  }

  private _isNativeButtonLikeTrigger(trigger: HTMLElement): boolean {
    if (trigger.tagName.toLowerCase() === 'button') {
      return true;
    }

    return (
      trigger.shadowRoot?.querySelector('button, input, select, textarea') instanceof HTMLElement
    );
  }

  private _resolvePlacement(): Placement {
    if (this.align === 'center') {
      return this.side;
    }

    return `${this.side}-${this.align}` as Placement;
  }

  private _focusItem(item: MenuItem | null): void {
    item?.focus({ preventScroll: true });
  }

  private _getFocusedItem(items: MenuItem[]): MenuItem | null {
    for (const item of items) {
      if (item.shadowRoot?.activeElement instanceof HTMLElement) {
        return item;
      }
    }

    return null;
  }

  private _handleTriggerKeyDown = (event: KeyboardEvent): void => {
    if (this.disabled) {
      return;
    }

    switch (event.key) {
      case 'Enter':
      case ' ': {
        event.preventDefault();
        this._openFocusTarget = 'first';
        this.toggle();
        break;
      }
      case 'ArrowDown': {
        event.preventDefault();
        if (!this.opened) {
          this._openFocusTarget = 'first';
          this.open();
        }
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        if (!this.opened) {
          this._openFocusTarget = 'last';
          this.open();
        }
        break;
      }
    }
  };

  private _handleMenuKeyDown = (event: KeyboardEvent): void => {
    const items = this._getMenuItems();
    const currentItem = this._getFocusedItem(items);
    const currentIndex = currentItem ? items.indexOf(currentItem) : -1;

    switch (event.key) {
      case 'Escape': {
        event.preventDefault();
        this.close(true);
        break;
      }
      case 'ArrowDown': {
        event.preventDefault();
        this._focusItem(this._findNextEnabled(items, currentIndex, 1));
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        this._focusItem(this._findNextEnabled(items, currentIndex, -1));
        break;
      }
      case 'Home': {
        event.preventDefault();
        this._focusItem(items.find((item) => !item.disabled) ?? null);
        break;
      }
      case 'End': {
        event.preventDefault();
        this._focusItem([...items].reverse().find((item) => !item.disabled) ?? null);
        break;
      }
      case 'Tab': {
        this.close(false);
        break;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        if (currentItem && !currentItem.disabled) {
          this._selectItem(currentItem);
        }
        break;
      }
      default: {
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          this._handleTypeahead(event.key, items, currentIndex);
        }
      }
    }
  };

  private _findNextEnabled(
    items: MenuItem[],
    currentIndex: number,
    direction: 1 | -1,
  ): MenuItem | null {
    const enabledItems = items.filter((item) => !item.disabled);

    if (enabledItems.length === 0) {
      return null;
    }

    const total = items.length;
    let index = currentIndex < 0 ? (direction === 1 ? -1 : total) : currentIndex;

    for (let attempt = 0; attempt < total; attempt += 1) {
      index = (index + direction + total) % total;
      const item = items[index];
      if (item && !item.disabled) {
        return item;
      }
    }

    return null;
  }

  private _handleTypeahead(char: string, items: MenuItem[], currentIndex: number): void {
    this._typeaheadBuffer += char.toLowerCase();

    if (this._typeaheadTimer !== null) {
      clearTimeout(this._typeaheadTimer);
    }

    this._typeaheadTimer = setTimeout(() => {
      this._typeaheadBuffer = '';
      this._typeaheadTimer = null;
    }, 1000);

    const enabledItems = items.filter((item) => !item.disabled);
    if (enabledItems.length === 0) {
      return;
    }

    const searchOrder =
      currentIndex >= 0
        ? [
            ...enabledItems.filter((item) => items.indexOf(item) > currentIndex),
            ...enabledItems.filter((item) => items.indexOf(item) <= currentIndex),
          ]
        : enabledItems;

    const match = searchOrder.find((item) =>
      item.getNormalizedLabel().toLowerCase().startsWith(this._typeaheadBuffer),
    );

    if (match) {
      this._focusItem(match);
    }
  }

  private _selectItem(item: MenuItem): void {
    this.dispatchEvent(
      new CustomEvent('menu-item-select', {
        bubbles: true,
        composed: true,
        detail: {
          value: item.value,
          label: item.getNormalizedLabel(),
        },
      }),
    );
    this.close(true);
  }

  private _handleMenuItemClick = (event: CustomEvent<{ value: string; label: string }>): void => {
    event.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('menu-item-select', {
        bubbles: true,
        composed: true,
        detail: event.detail,
      }),
    );
    this.close(true);
  };

  private _handleTriggerClick = (event: Event): void => {
    if (this.disabled) {
      event.preventDefault();
      return;
    }

    this.toggle();
  };

  private _onTriggerSlotChange = (): void => {
    this._syncTriggerElement();
  };

  override render() {
    return html`
      <slot name="trigger" @slotchange="${this._onTriggerSlotChange}"></slot>

      <div
        class="panel"
        role="menu"
        id="${this._menuId}"
        aria-labelledby="${this._resolvedTriggerId}"
        aria-hidden="${this.opened ? 'false' : 'true'}"
        ?inert=${!this.opened}
        @keydown="${this._handleMenuKeyDown}"
      >
        <slot class="menu-slot"></slot>
      </div>
    `;
  }
}

/**
 * command item 専用の menu item です。
 *
 * @slot - 表示ラベル
 *
 * @property {string} value - 機械可読な意味値
 * @property {MenuItemVariant} variant - 表示バリアント
 * @property {boolean} disabled - 選択不可
 * @property {string} textValue - type-ahead とラベル正規化に使う文字列
 */
@customElement('ui-menu-item')
export class MenuItem extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    button {
      display: flex;
      align-items: center;
      gap: var(--space-2, 8px);
      height: var(--control-height-md, 32px);
      min-height: var(--control-height-md, 32px);
      width: 100%;
      box-sizing: border-box;
      padding: 0 var(--space-3, 12px);
      font-family: inherit;
      font-size: var(--text-base, 14px);
      font-weight: var(--font-normal, 400);
      color: var(--fg-default, oklch(20% 0 0));
      background: transparent;
      border: none;
      border-radius: var(--radius-sm, 4px);
      text-align: start;
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      position: relative;
      transition: background-color var(--duration-fast, 70ms)
        var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9));
    }

    button::after {
      content: '';
      position: absolute;
      inset-inline: 0;
      top: 50%;
      min-height: var(--control-min-touch, 24px);
      z-index: 0;
    }

    button > * {
      position: relative;
      z-index: 1;
    }

    button:hover:not(:disabled),
    button:focus-visible:not(:disabled),
    button:active:not(:disabled) {
      background: var(--bg-surface-active, oklch(0% 0 0 / 0.05));
    }

    button:disabled {
      color: var(--fg-subtle, oklch(48% 0 0));
      cursor: default;
      pointer-events: none;
    }

    :host([variant='danger']) button {
      color: var(--danger, oklch(55% 0.2 28));
    }

    :host([variant='danger']) button:hover:not(:disabled),
    :host([variant='danger']) button:focus-visible:not(:disabled) {
      background: var(--bg-danger-subtle, oklch(from var(--danger, oklch(55% 0.2 28)) l c h / 0.1));
    }

    button:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(60% 0.15 250));
      outline-offset: -2px;
      animation: var(--animation-focus);
    }

    ::slotted(ui-icon),
    ::slotted(svg) {
      width: var(--icon-base, 16px);
      height: var(--icon-base, 16px);
      font-size: var(--icon-base, 16px);
      flex-shrink: 0;
    }

    @media (prefers-reduced-motion: reduce) {
      button {
        transition-duration: 0.01ms;
      }
    }

    @media (forced-colors: active) {
      button {
        color: CanvasText !important;
      }

      button:hover:not(:disabled),
      button:focus-visible:not(:disabled) {
        background: Highlight !important;
        color: HighlightText !important;
      }

      button:disabled {
        color: GrayText !important;
        background: transparent !important;
      }

      :host([variant='danger']) button {
        color: CanvasText !important;
        outline: 1px solid CanvasText;
        outline-offset: -1px;
      }

      :host([variant='danger']) button:hover:not(:disabled),
      :host([variant='danger']) button:focus-visible:not(:disabled) {
        background: Highlight !important;
        color: HighlightText !important;
      }

      button:focus-visible {
        outline: 3px solid CanvasText;
        box-shadow: none;
      }
    }
  `;

  @property({ type: String, reflect: true })
  value = '';

  @property({ type: String, reflect: true })
  variant: MenuItemVariant = 'default';

  @property({ type: Boolean, reflect: true })
  disabled = false;

  @property({ type: String, attribute: 'text-value', reflect: true })
  textValue = '';

  getNormalizedLabel(): string {
    return this.textValue.trim() || this.textContent.trim() || '';
  }

  override render() {
    return html`
      <button
        role="menuitem"
        tabindex="-1"
        ?disabled=${this.disabled}
        aria-disabled="${this.disabled ? 'true' : nothing}"
        @click="${this._handleClick}"
      >
        <slot></slot>
      </button>
    `;
  }

  private _handleClick = (event: Event): void => {
    if (this.disabled) {
      event.preventDefault();
      return;
    }

    this.dispatchEvent(
      new CustomEvent('menu-item-click', {
        bubbles: true,
        composed: true,
        detail: {
          value: this.value,
          label: this.getNormalizedLabel(),
        },
      }),
    );
  };

  override focus(options?: FocusOptions): void {
    this.shadowRoot?.querySelector('button')?.focus(options);
  }
}

@customElement('ui-menu-separator')
export class MenuSeparator extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    .separator {
      height: 1px;
      margin: var(--space-1, 4px) 0;
      background: var(--border-muted, oklch(90% 0 0 / 0.08));
    }

    @media (forced-colors: active) {
      .separator {
        background: CanvasText !important;
      }
    }
  `;

  override render() {
    return html`<div class="separator" role="separator"></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-dropdown': Dropdown;
    'ui-menu-item': MenuItem;
    'ui-menu-separator': MenuSeparator;
  }
}
