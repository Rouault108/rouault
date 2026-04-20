import { css, html, LitElement, nothing, type PropertyValues } from 'lit';
import { customElement, property, queryAssignedElements, state } from 'lit/decorators.js';
import { type Placement } from '@floating-ui/dom';
import {
  AnchoredOverlayController,
  type AnchoredOverlayDismissReason,
} from '../overlay/internal/anchored-overlay-controller.js';

export type DropdownSide = 'top' | 'right' | 'bottom' | 'left';
export type DropdownAlign = 'start' | 'center' | 'end';
export type MenuItemVariant = 'default' | 'danger';

type PositionPhase = 'idle' | 'settling' | 'ready';

const OPEN_SETTLE_WATCHDOG_MS = 180;

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
 * @fires open - 公開 open state が true へ変わったとき
 * @fires close - 公開 open state が false へ変わったとき
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
      inset-inline-start: 0;
      inset-block-start: 0;
      right: auto;
      bottom: auto;
      margin: 0;
      min-width: 180px;
      max-width: 280px;
      padding: calc(var(--radius-md, 6px) - var(--radius-sm, 4px));
      background: var(--bg-surface-2, oklch(97% 0 0));
      border: var(--border-width, 1px) solid var(--border-default, oklch(90% 0 0 / 0.12));
      border-radius: var(--radius-md, 6px);
      box-shadow:
        var(--elevation-lg, 0 8px 24px oklch(0% 0 0 / 0.12)),
        inset 0 1px 0 0 oklch(100% 0 0 / 0.05);
      z-index: var(--z-anchored-overlay, var(--z-popover, 400));
      max-height: calc(var(--control-height-md, 32px) * 10);
      overflow-y: auto;
      scrollbar-width: thin;
      scrollbar-color: oklch(0% 0 0 / 0.2) transparent;
      opacity: 0;
      visibility: hidden;
      transform: scale(var(--scale-enter, 0.97));
      pointer-events: none;
      transition:
        opacity var(--duration-instant, 0ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        transform var(--duration-instant, 0ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        visibility 0s linear var(--duration-instant, 0ms);
    }

    .panel[popover],
    .panel[popover]:popover-open {
      inset: auto auto auto auto;
      margin: 0;
    }

    @media (prefers-color-scheme: dark) {
      .panel {
        box-shadow:
          var(--elevation-lg, 0 8px 24px oklch(0% 0 0 / 0.3)),
          inset 0 1px 0 0 oklch(100% 0 0 / 0.1);
      }
    }

    .panel[data-position-phase='ready'] {
      opacity: 1;
      visibility: visible;
      transform: scale(1);
      pointer-events: auto;
      transition:
        opacity var(--duration-normal, 150ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        transform var(--duration-normal, 150ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        visibility 0s;
    }

    @media (prefers-reduced-motion: reduce) {
      .panel,
      .panel[data-position-phase='ready'] {
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

  private _overlayController: AnchoredOverlayController | null = null;
  private _typeaheadBuffer = '';
  private _typeaheadTimer: ReturnType<typeof setTimeout> | null = null;
  private _restoreFocusOnClose = true;
  private readonly _menuId = `dropdown-menu-${Math.random().toString(36).slice(2, 11)}`;
  private readonly _triggerId = `dropdown-trigger-${Math.random().toString(36).slice(2, 11)}`;
  @state()
  private _resolvedTriggerId = this._triggerId;
  private _boundTriggerElement: HTMLElement | null = null;
  @state()
  private _positionPhase: PositionPhase = 'idle';
  private _positionSettleToken = 0;
  private _positionSettleRafIds: number[] = [];
  private _panelToggleAbortController: AbortController | null = null;
  private _positionWatchdogTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private _pendingOpenFocusTarget: 'first' | 'last' = 'first';

  private get _supportsPopoverApi(): boolean {
    if (typeof HTMLElement === 'undefined') {
      return false;
    }
    return 'showPopover' in HTMLElement.prototype && 'hidePopover' in HTMLElement.prototype;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('menu-item-click', this._handleMenuItemClick as EventListener);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('menu-item-click', this._handleMenuItemClick as EventListener);
    this._detachTriggerListeners(this._boundTriggerElement);
    this._boundTriggerElement = null;
    this._cancelPendingPositionSettle({ invalidateToken: true });
    this._overlayController?.destroy();

    if (this._typeaheadTimer !== null) {
      clearTimeout(this._typeaheadTimer);
      this._typeaheadTimer = null;
    }
  }

  override firstUpdated(): void {
    this._syncTriggerElement();
    this._syncPanelAccessibility();
  }

  override updated(changedProperties: PropertyValues<this>): void {
    super.updated(changedProperties);

    if (changedProperties.has('opened')) {
      const previousOpened = changedProperties.get('opened');
      const wasOpened = typeof previousOpened === 'boolean' ? previousOpened : false;
      const didOpen = !wasOpened && this.opened;
      const didClose = wasOpened && !this.opened;

      if (didOpen) {
        this._onOpen();
      } else if (didClose) {
        this._onClose();
      }

      if (didOpen || didClose) {
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
        void this._overlayController?.refreshPosition();
      }
    }

    if (changedProperties.has('disabled')) {
      if (this.disabled && this.opened) {
        this.close(false);
      } else {
        this._syncTriggerElement();
      }
    }

    if (changedProperties.has('_positionPhase')) {
      this._syncPanelAccessibility();
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

  getMenuElement(): HTMLElement | null {
    return this.shadowRoot?.querySelector<HTMLElement>('[data-ui-dropdown-panel]') ?? null;
  }

  getTriggerElement(): HTMLElement | null {
    return this._getTriggerElement();
  }

  private _onOpen(): void {
    this._cancelPendingPositionSettle({ invalidateToken: true });
    this._positionPhase = 'settling';
    this._syncPanelAccessibility();

    const token = ++this._positionSettleToken;
    const focusTarget = this._pendingOpenFocusTarget;
    this._pendingOpenFocusTarget = 'first';

    this._installPanelOpenObserver(token, focusTarget);

    try {
      this._syncPanelPopoverState(true);
    } catch {
      this._failOpen(token);
      return;
    }

    this._startOverlay();
    this._armPositionWatchdog(token, focusTarget);

    if (!this._supportsPopoverApi) {
      this._beginPositionSettle(token, focusTarget);
    }
  }

  private _onClose(): void {
    const panel = this.getMenuElement();

    this._cancelPendingPositionSettle({ invalidateToken: true });
    this._positionPhase = 'idle';
    this._syncPanelAccessibility();
    this._stopOverlay();

    try {
      this._syncPanelPopoverState(false);
    } catch {
      // close 経路では popover cleanup failure を外へ漏らさない
    }

    panel?.style.setProperty('left', '0px');
    panel?.style.setProperty('top', '0px');

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

    this._updateTriggerAria(this._positionPhase === 'ready');
  }

  private _ensureOverlayController(): AnchoredOverlayController {
    if (this._overlayController !== null) {
      return this._overlayController;
    }

    this._overlayController = new AnchoredOverlayController({
      ownerDocument: this.ownerDocument,
      getReference: () => this._getTriggerElement(),
      getFloating: () => this.getMenuElement(),
      getOpen: () => this.opened,
      getPlacement: () => this._resolvePlacement(),
      getOffset: () => 4,
      outsidePointerDismiss: true,
      escapeDismiss: true,
      scrollStrategy: 'close',
      onDismissRequest: (reason, event) => {
        this._handleOverlayDismissRequest(reason, event);
      },
    });

    return this._overlayController;
  }

  private _startOverlay(): void {
    this._ensureOverlayController().syncOpenState(true);
  }

  private _stopOverlay(): void {
    this._overlayController?.syncOpenState(false);
  }

  private _handleOverlayDismissRequest(reason: AnchoredOverlayDismissReason, event: Event): void {
    if (!this.opened) {
      return;
    }

    if (reason === 'escape' && event instanceof KeyboardEvent) {
      event.preventDefault();
      this.close(true);
      return;
    }

    if (reason === 'outside-pointer' || reason === 'scroll') {
      this.close(false);
    }
  }

  private _syncPanelPopoverState(open: boolean): void {
    const panel = this.getMenuElement() as
      | (HTMLElement & { showPopover?: () => void; hidePopover?: () => void })
      | null;

    if (!panel) {
      return;
    }

    if (!this._supportsPopoverApi) {
      panel.removeAttribute('popover');
      return;
    }

    panel.setAttribute('popover', 'manual');

    const isOpen = (() => {
      try {
        return panel.matches(':popover-open');
      } catch {
        return false;
      }
    })();

    if (open && !isOpen && typeof panel.showPopover === 'function') {
      panel.showPopover();
      return;
    }

    if (!open && isOpen && typeof panel.hidePopover === 'function') {
      panel.hidePopover();
    }
  }

  private _syncPanelAccessibility(): void {
    const panel = this.getMenuElement();
    const isReady = this._positionPhase === 'ready';

    this._updateTriggerAria(isReady);

    if (!panel) {
      return;
    }

    panel.dataset['positionPhase'] = this._positionPhase;
    panel.setAttribute('aria-hidden', isReady ? 'false' : 'true');

    if (isReady) {
      panel.removeAttribute('inert');
    } else {
      panel.setAttribute('inert', '');
    }
  }

  private _installPanelOpenObserver(
    token: number,
    focusTarget: 'first' | 'last',
  ): void {
    if (!this._supportsPopoverApi) {
      return;
    }

    const panel = this.getMenuElement();
    if (!panel) {
      return;
    }

    this._panelToggleAbortController?.abort();
    const controller = new AbortController();
    this._panelToggleAbortController = controller;

    panel.addEventListener(
      'toggle',
      (event: Event) => {
        const toggleState = (event as Event & { newState?: string }).newState;
        if (toggleState !== 'open') {
          return;
        }

        this._beginPositionSettle(token, focusTarget);
      },
      { once: true, signal: controller.signal },
    );
  }

  private _armPositionWatchdog(token: number, focusTarget: 'first' | 'last'): void {
    this._clearPositionWatchdog();
    this._positionWatchdogTimeoutId = setTimeout(() => {
      this._positionWatchdogTimeoutId = null;
      if (!this._isActiveSettleToken(token)) {
        return;
      }
      this._beginPositionSettle(token, focusTarget);
    }, OPEN_SETTLE_WATCHDOG_MS);
  }

  private _beginPositionSettle(token: number, focusTarget: 'first' | 'last'): void {
    if (!this._isActiveSettleToken(token)) {
      return;
    }

    this._clearPositionWatchdog();
    this._panelToggleAbortController?.abort();
    this._panelToggleAbortController = null;
    this._clearPendingPositionSettleRafs();

    const firstRafId = requestAnimationFrame(() => {
      this._dropPositionSettleRafId(firstRafId);
      void this._runPositionSettleSequence(token, focusTarget);
    });
    this._positionSettleRafIds.push(firstRafId);
  }

  private async _runPositionSettleSequence(
    token: number,
    focusTarget: 'first' | 'last',
  ): Promise<void> {
    if (!this._isActiveSettleToken(token)) {
      return;
    }

    const overlay = this._overlayController;
    if (!overlay) {
      this._failOpen(token);
      return;
    }

    const firstPass = await overlay.recomputePosition();
    if (!this._isActiveSettleToken(token)) {
      return;
    }

    await this._waitForAnimationFrame(token);
    if (!this._isActiveSettleToken(token)) {
      return;
    }

    const secondPass = await overlay.recomputePosition();
    if (!this._isActiveSettleToken(token)) {
      return;
    }

    if (!firstPass && !secondPass) {
      this._failOpen(token);
      return;
    }

    this._commitReadyState(token, focusTarget);
  }

  private _commitReadyState(token: number, focusTarget: 'first' | 'last'): void {
    if (!this._isActiveSettleToken(token)) {
      return;
    }

    this._positionPhase = 'ready';
    this._syncPanelAccessibility();
    this._focusInitialItem(focusTarget);
  }

  private _focusInitialItem(focusTarget: 'first' | 'last'): void {
    const items = this._getMenuItems();
    const target =
      focusTarget === 'last'
        ? [...items].reverse().find((item) => !item.disabled)
        : items.find((item) => !item.disabled);
    this._focusItem(target ?? null);
  }

  private _failOpen(token: number): void {
    if (token !== this._positionSettleToken || !this.opened) {
      return;
    }

    this.close(false);
  }

  private _waitForAnimationFrame(token: number): Promise<void> {
    return new Promise((resolve) => {
      const rafId = requestAnimationFrame(() => {
        this._dropPositionSettleRafId(rafId);
        if (token !== this._positionSettleToken) {
          resolve();
          return;
        }
        resolve();
      });
      this._positionSettleRafIds.push(rafId);
    });
  }

  private _cancelPendingPositionSettle(options?: { invalidateToken?: boolean }): void {
    if (options?.invalidateToken) {
      this._positionSettleToken += 1;
    }

    this._clearPendingPositionSettleRafs();
    this._clearPositionWatchdog();
    this._panelToggleAbortController?.abort();
    this._panelToggleAbortController = null;
  }

  private _clearPendingPositionSettleRafs(): void {
    for (const rafId of this._positionSettleRafIds) {
      cancelAnimationFrame(rafId);
    }
    this._positionSettleRafIds = [];
  }

  private _dropPositionSettleRafId(rafId: number): void {
    this._positionSettleRafIds = this._positionSettleRafIds.filter((currentId) => currentId !== rafId);
  }

  private _clearPositionWatchdog(): void {
    if (this._positionWatchdogTimeoutId !== null) {
      clearTimeout(this._positionWatchdogTimeoutId);
      this._positionWatchdogTimeoutId = null;
    }
  }

  private _isActiveSettleToken(token: number): boolean {
    return token === this._positionSettleToken && this.opened && this._positionPhase === 'settling';
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
        this._pendingOpenFocusTarget = 'first';
        this.toggle();
        break;
      }
      case 'ArrowDown': {
        event.preventDefault();
        if (!this.opened) {
          this._pendingOpenFocusTarget = 'first';
          this.open();
        }
        break;
      }
      case 'ArrowUp': {
        event.preventDefault();
        if (!this.opened) {
          this._pendingOpenFocusTarget = 'last';
          this.open();
        }
        break;
      }
    }
  };

  private _handleMenuKeyDown = (event: KeyboardEvent): void => {
    if (this._positionPhase !== 'ready') {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.close(true);
      }
      return;
    }

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
    if (this._positionPhase !== 'ready') {
      return;
    }

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
    if (this._positionPhase !== 'ready') {
      return;
    }

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
    if (this._positionPhase !== 'ready') {
      event.stopPropagation();
      return;
    }

    event.stopPropagation();
    this.dispatchEvent(
      new CustomEvent('menu-item-select', {
        bubbles: true,
        composed: true,
        detail: event.detail,
      }),
    );
    this.close(false);
    this._blurTriggerIfActive();
  };

  private _blurTriggerIfActive(): void {
    const trigger = this._getTriggerElement();
    if (!trigger) {
      return;
    }

    if (trigger === trigger.ownerDocument.activeElement) {
      trigger.blur();
    }
  }

  private _handleTriggerClick = (event: Event): void => {
    if (this.disabled) {
      event.preventDefault();
      return;
    }

    this.toggle();
  };

  private _onTriggerSlotChange = (): void => {
    this._syncTriggerElement();
    this._syncPanelAccessibility();
  };

  override render() {
    return html`
      <slot name="trigger" @slotchange="${this._onTriggerSlotChange}"></slot>

      <div
        class="panel"
        data-ui-dropdown-panel
        data-ui-overlay-surface="dropdown"
        data-position-phase="${this._positionPhase}"
        role="menu"
        id="${this._menuId}"
        aria-labelledby="${this._resolvedTriggerId}"
        aria-hidden="${this._positionPhase === 'ready' ? 'false' : 'true'}"
        ?inert=${this._positionPhase !== 'ready'}
        @keydown="${this._handleMenuKeyDown}"
      >
        <slot class="menu-slot"></slot>
      </div>
    `;
  }
}

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
