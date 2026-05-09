import { css, html, LitElement, nothing, type PropertyValues } from 'lit';
import { customElement, property, queryAssignedElements, state } from 'lit/decorators.js';
import { type Placement } from '@floating-ui/dom';
import {
  AnchoredOverlayController,
  type AnchoredOverlayCommitSnapshot,
  type AnchoredOverlayDismissReason,
} from '../overlay/internal/anchored-overlay-controller.js';
import { DropdownOpenSequencer } from './internal/dropdown-open-sequencer.js';

export type DropdownSide = 'top' | 'right' | 'bottom' | 'left';
export type DropdownAlign = 'start' | 'center' | 'end';
export type MenuItemVariant = 'default' | 'danger';

type PositionPhase = 'idle' | 'positioning' | 'ready';
type DropdownCloseReason =
  | 'restore'
  | 'pointer-select'
  | 'keyboard-select'
  | 'escape'
  | 'outside-pointer'
  | 'scroll'
  | 'tab'
  | 'disabled'
  | 'fail-open'
  | 'programmatic';

type DropdownCloseOptions =
  | {
      restoreFocus: true;
      reason?: 'restore' | 'keyboard-select' | 'escape' | 'programmatic';
    }
  | {
      restoreFocus: false;
      reason?:
        | 'pointer-select'
        | 'outside-pointer'
        | 'scroll'
        | 'tab'
        | 'disabled'
        | 'fail-open'
        | 'programmatic';
    };

interface NormalizedDropdownCloseOptions {
  restoreFocus: boolean;
  reason: DropdownCloseReason;
}

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
      color: var(--fg-disabled);
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
      min-width: var(--ui-dropdown-min-inline-size, 180px);
      max-width: var(--ui-dropdown-max-inline-size, 280px);
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
      scrollbar-color: var(--scrollbar-thumb, var(--fg-control-affordance)) transparent;
      opacity: 0;
      visibility: hidden;
      transform: scale(var(--scale-enter, 0.97));
      pointer-events: none;
      transition:
        opacity var(--duration-instant, 0ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        transform var(--duration-instant, 0ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        visibility 0s linear var(--duration-instant, 0ms);
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
  private _tabCloseTimer: ReturnType<typeof setTimeout> | null = null;
  private _openMethodInProgress = false;
  private _closeMethodInProgress = false;
  private _suppressNextCloseEvent = false;
  private _suppressNextCloseLifecycle = false;
  private readonly _menuId = `dropdown-menu-${Math.random().toString(36).slice(2, 11)}`;
  private readonly _triggerId = `dropdown-trigger-${Math.random().toString(36).slice(2, 11)}`;
  private readonly _openSequencer = new DropdownOpenSequencer();
  private _boundTriggerElement: HTMLElement | null = null;
  @state()
  private _positionPhase: PositionPhase = 'idle';
  private _lastCommitSnapshot: AnchoredOverlayCommitSnapshot | null = null;
  private _pendingOpenFocusTarget: 'first' | 'last' = 'first';

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('menu-item-click', this._handleMenuItemClick as EventListener);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('menu-item-click', this._handleMenuItemClick as EventListener);
    this._detachTriggerListeners(this._boundTriggerElement);
    this._boundTriggerElement = null;
    this._clearScheduledTabClose();
    this._cancelOpenSequencing();
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
      const openMethodInProgress = this._openMethodInProgress;
      const closeMethodInProgress = this._closeMethodInProgress;

      this._openMethodInProgress = false;
      this._closeMethodInProgress = false;

      let dispatchOpen = false;
      let dispatchClose = false;

      if (didOpen) {
        this._clearScheduledTabClose();

        if (this.disabled) {
          this._cancelOpenSequencing();
          this._positionPhase = 'idle';
          this._syncPanelAccessibility();
          this._suppressNextCloseEvent = true;
          this._suppressNextCloseLifecycle = true;
          this.opened = false;
        } else {
          if (!openMethodInProgress) {
            this._cancelOpenSequencing();
            this._positionPhase = 'positioning';
            this._syncPanelAccessibility();
          }

          this._onOpen();
          dispatchOpen = true;
        }
      } else if (didClose) {
        const suppressCloseLifecycle = this._suppressNextCloseLifecycle;
        const suppressCloseEvent = this._suppressNextCloseEvent;

        this._suppressNextCloseLifecycle = false;
        this._suppressNextCloseEvent = false;

        if (!suppressCloseLifecycle) {
          if (!closeMethodInProgress) {
            this._clearScheduledTabClose();
            this._cancelOpenSequencing();
            this._releaseFocusBeforePanelHide({ restoreFocus: true, reason: 'programmatic' });
            this._positionPhase = 'idle';
            this._syncPanelAccessibility();
          }

          this._onClose();
        }

        dispatchClose = !suppressCloseEvent;
      }

      if (dispatchOpen) {
        this.dispatchEvent(
          new CustomEvent('open', {
            bubbles: true,
            composed: true,
          }),
        );
      }

      if (dispatchClose) {
        this.dispatchEvent(
          new CustomEvent('close', {
            bubbles: true,
            composed: true,
          }),
        );
      }
    }

    if (changedProperties.has('side') || changedProperties.has('align')) {
      if (this.opened && this._positionPhase === 'ready') {
        void this._overlayController?.refreshPosition();
      }
    }

    if (changedProperties.has('disabled')) {
      if (this.disabled && this.opened) {
        this.close({ restoreFocus: false, reason: 'disabled' });
      } else {
        this._syncTriggerElement();
      }
    }
  }

  open(): void {
    this._clearScheduledTabClose();
    this._closeMethodInProgress = false;

    if (this.disabled || this.opened) {
      return;
    }

    this._openMethodInProgress = true;
    this._cancelOpenSequencing();
    this._positionPhase = 'positioning';
    this._syncPanelAccessibility();
    this.opened = true;
  }

  close(options: boolean | DropdownCloseOptions = true): void {
    this._clearScheduledTabClose();
    this._openMethodInProgress = false;

    if (!this.opened) {
      return;
    }

    const closeOptions = this._normalizeCloseOptions(options);

    this._cancelOpenSequencing();
    this._releaseFocusBeforePanelHide(closeOptions);
    this._positionPhase = 'idle';
    this._syncPanelAccessibility();

    this._closeMethodInProgress = true;
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
    const focusTarget = this._pendingOpenFocusTarget;
    this._pendingOpenFocusTarget = 'first';

    this._lastCommitSnapshot = null;
    this._syncPanelAccessibility();
    this._startOverlay();
    this._beginPositioning(focusTarget);
  }

  private _onClose(): void {
    this._lastCommitSnapshot = null;
    this._syncPanelAccessibility();
    this._stopOverlay();
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
      onCommit: (snapshot) => {
        this._lastCommitSnapshot = snapshot;
      },
    });

    return this._overlayController;
  }

  private _startOverlay(): void {
    this._ensureOverlayController().activate();
  }

  private _stopOverlay(): void {
    this._overlayController?.deactivate();
  }

  private _handleOverlayDismissRequest(reason: AnchoredOverlayDismissReason, event: Event): void {
    if (!this.opened) {
      return;
    }

    if (reason === 'escape' && event instanceof KeyboardEvent) {
      event.preventDefault();
      this.close({ restoreFocus: true, reason: 'escape' });
      return;
    }

    if (reason === 'outside-pointer') {
      this.close({ restoreFocus: false, reason: 'outside-pointer' });
      return;
    }

    if (reason === 'scroll') {
      this.close({ restoreFocus: false, reason: 'scroll' });
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
    panel.setAttribute('aria-labelledby', this._getTriggerElement()?.id ?? this._triggerId);

    if (isReady) {
      panel.removeAttribute('inert');
    } else {
      panel.setAttribute('inert', '');
    }
  }

  private _beginPositioning(focusTarget: 'first' | 'last'): void {
    const overlay = this._overlayController;
    if (!overlay) {
      this._failOpen();
      return;
    }

    this._openSequencer.begin({
      recomputePosition: () => overlay.recomputePosition(),
      isStillOpen: () => this.opened && this._positionPhase === 'positioning',
      getLastCommitSnapshot: () => this._lastCommitSnapshot,
      onReady: () => {
        this._commitReadyState(focusTarget);
      },
      onFail: () => {
        this._failOpen();
      },
    });
  }

  private _commitReadyState(focusTarget: 'first' | 'last'): void {
    if (!this.opened || this._positionPhase !== 'positioning') {
      return;
    }

    this._positionPhase = 'ready';
    this._syncPanelAccessibility();
    this._overlayController?.startAutoUpdate();
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

  private _failOpen(): void {
    if (!this.opened) {
      return;
    }

    this.close({ restoreFocus: false, reason: 'fail-open' });
  }

  private _cancelOpenSequencing(): void {
    this._openSequencer.cancel();
  }

  private _clearScheduledTabClose(): void {
    if (this._tabCloseTimer === null) {
      return;
    }

    clearTimeout(this._tabCloseTimer);
    this._tabCloseTimer = null;
  }

  private _scheduleTabClose(): void {
    if (this._tabCloseTimer !== null) {
      return;
    }

    this._tabCloseTimer = setTimeout(() => {
      this._tabCloseTimer = null;

      if (!this.opened) {
        return;
      }

      this.close({ restoreFocus: false, reason: 'tab' });
    }, 0);
  }

  private _normalizeCloseOptions(
    options: boolean | DropdownCloseOptions,
  ): NormalizedDropdownCloseOptions {
    if (typeof options === 'boolean') {
      return {
        restoreFocus: options,
        reason: options ? 'restore' : 'programmatic',
      };
    }

    return {
      restoreFocus: options.restoreFocus,
      reason: options.reason ?? (options.restoreFocus ? 'restore' : 'programmatic'),
    };
  }

  private _updateTriggerAria(expanded: boolean): void {
    const trigger = this._getTriggerElement();
    const panel = this.getMenuElement();

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

    panel?.setAttribute('aria-labelledby', trigger.id);
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

  private _getDeepActiveElement(root: Document | ShadowRoot = this.ownerDocument): Element | null {
    let activeElement = root.activeElement;

    while (activeElement?.shadowRoot?.activeElement) {
      activeElement = activeElement.shadowRoot.activeElement;
    }

    return activeElement;
  }

  private _hasPanelFocus(): boolean {
    const focusedItem = this._getFocusedItem(this._getMenuItems());
    if (focusedItem !== null) {
      return true;
    }

    const panel = this.getMenuElement();
    const activeElement = this._getDeepActiveElement();

    return activeElement instanceof Node && panel?.contains(activeElement) === true;
  }

  private _hasTriggerFocus(): boolean {
    const trigger = this._getTriggerElement();
    if (!(trigger instanceof HTMLElement)) {
      return false;
    }

    const activeElement = this._getDeepActiveElement();

    return (
      this.ownerDocument.activeElement === trigger ||
      activeElement === trigger ||
      (activeElement instanceof Node &&
        (trigger.contains(activeElement) || trigger.shadowRoot?.contains(activeElement) === true))
    );
  }

  private _releaseFocusBeforePanelHide(options: NormalizedDropdownCloseOptions): void {
    if (options.reason === 'tab') {
      if (!this._hasPanelFocus()) {
        return;
      }

      const activeElement = this._getDeepActiveElement();
      if (activeElement instanceof HTMLElement) {
        activeElement.blur();
      }

      return;
    }

    if (options.restoreFocus) {
      this._getTriggerElement()?.focus({ preventScroll: true });

      if (!this._hasPanelFocus()) {
        return;
      }

      const activeElement = this._getDeepActiveElement();
      if (activeElement instanceof HTMLElement) {
        activeElement.blur();
      }

      return;
    }

    if (!this._hasPanelFocus() && !this._hasTriggerFocus()) {
      return;
    }

    const activeElement = this._getDeepActiveElement();
    if (activeElement instanceof HTMLElement) {
      activeElement.blur();
    }

    if (this._hasTriggerFocus()) {
      this._getTriggerElement()?.blur();
    }
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
        this.close({ restoreFocus: true, reason: 'escape' });
      }
      return;
    }

    const items = this._getMenuItems();
    const currentItem = this._getFocusedItem(items);
    const currentIndex = currentItem ? items.indexOf(currentItem) : -1;

    switch (event.key) {
      case 'Escape': {
        event.preventDefault();
        this.close({ restoreFocus: true, reason: 'escape' });
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
        this._scheduleTabClose();
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
    this.close({ restoreFocus: true, reason: 'keyboard-select' });
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
    this.close({ restoreFocus: false, reason: 'pointer-select' });
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
        aria-labelledby="${this._triggerId}"
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
      color: var(--fg-disabled);
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
