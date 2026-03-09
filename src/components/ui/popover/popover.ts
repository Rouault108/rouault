import {
  autoUpdate,
  computePosition,
  flip,
  offset as applyOffset,
  shift,
  type Placement,
} from '@floating-ui/dom';
import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';

export type UiPopoverVariant = 'default' | 'subtle' | 'inverse';
export type UiPopoverPlacement = Placement;

export interface UiPopoverOpenOptions {
  returnFocus?: boolean;
}

export interface UiPopoverToggleDetail {
  open: boolean;
  trigger: HTMLElement | null;
  content: HTMLElement | null;
}

export interface UiPopoverOpenedDetail {
  trigger: HTMLElement | null;
  content: HTMLElement;
}

export interface UiPopoverClosedDetail {
  trigger: HTMLElement | null;
  content: HTMLElement | null;
  returnFocus: boolean;
}

export const DOCUMENT_STYLE_ID = 'ui-popover-document-styles';

const DEFAULT_OFFSET = 8;
const EDGE_PADDING = 8;

const VALID_VARIANTS = new Set<UiPopoverVariant>(['default', 'subtle', 'inverse']);
const VALID_PLACEMENTS = new Set<UiPopoverPlacement>([
  'top',
  'top-start',
  'top-end',
  'bottom',
  'bottom-start',
  'bottom-end',
  'left',
  'left-start',
  'left-end',
  'right',
  'right-start',
  'right-end',
]);

const DOCUMENT_CSS = `
ui-popover [data-ui-popover-content] {
  position: fixed;
  left: 0;
  top: 0;
  right: auto;
  bottom: auto;
  margin: 0;
  box-sizing: border-box;
  z-index: var(--z-popover, 400);
  max-width: var(--ui-popover-max-width, min(90vw, 28rem));
  max-height: var(--ui-popover-max-height, 60vh);
  overflow-y: auto;
  padding: var(--ui-popover-padding, var(--space-3, 12px) var(--space-4, 16px));
  border: var(--border-width, 1px) solid var(--border-default, oklch(86% 0.01 250));
  border-radius: var(--radius-md, 6px);
  background: var(--bg-surface-2, oklch(100% 0 0));
  color: var(--fg-default, oklch(20% 0.01 250));
  box-shadow: var(--elevation-lg, 0 8px 24px oklch(0% 0 0 / 0.12));
  font-size: var(--text-sm, 13px);
  line-height: var(--line-height-relaxed, 1.75);
  opacity: 0;
  transform: translateY(4px);
  transition:
    opacity var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
    transform var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
    display var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9))
      allow-discrete;
}

ui-popover [data-ui-popover-content][data-variant='subtle'] {
  background: var(--bg-fill-neutral, oklch(96% 0 0));
  color: var(--fg-muted, oklch(45% 0.02 250));
  border-color: var(--border-ghost, oklch(20% 0.03 250 / 0.04));
  box-shadow: var(--elevation-md, 0 4px 8px oklch(0% 0 0 / 0.08));
}

ui-popover [data-ui-popover-content][data-variant='inverse'] {
  background: var(--fg-default, oklch(20% 0.01 250));
  color: var(--bg-default, oklch(98% 0.01 250));
  border-color: var(--fg-muted, oklch(45% 0.02 250));
  box-shadow: var(--elevation-lg, 0 8px 24px oklch(0% 0 0 / 0.12));
}

ui-popover [data-ui-popover-content][data-open='true'] {
  display: block;
  opacity: 1;
  transform: translateY(0);
}

ui-popover [data-ui-popover-content][popover]:popover-open {
  display: block;
  opacity: 1;
  transform: translateY(0);
}

@starting-style {
  ui-popover [data-ui-popover-content][popover]:popover-open {
    opacity: 0;
    transform: translateY(4px);
  }
}

ui-popover [data-ui-popover-content][data-open='false'],
ui-popover [data-ui-popover-content][popover]:not(:popover-open) {
  opacity: 0;
  transform: translateY(4px);
  transition:
    opacity var(--duration-fast, 70ms) var(--ease-in, cubic-bezier(0.55, 0, 1, 0.45)),
    transform var(--duration-fast, 70ms) var(--ease-in, cubic-bezier(0.55, 0, 1, 0.45)),
    display var(--duration-fast, 70ms) var(--ease-in, cubic-bezier(0.55, 0, 1, 0.45))
      allow-discrete;
}

ui-popover [data-ui-popover-trigger].is-active-trigger {
  background: var(--bg-active, oklch(95% 0.01 250));
  border-radius: var(--radius-sm, 4px);
}

@media (prefers-reduced-motion: reduce) {
  ui-popover [data-ui-popover-content] {
    transform: none;
    transition-duration: var(--duration-instant, 0ms);
  }
}

@media (forced-colors: active) {
  ui-popover [data-ui-popover-content] {
    background: Canvas;
    color: CanvasText;
    border: 2px solid CanvasText;
    box-shadow: none;
  }

  ui-popover [data-ui-popover-trigger] {
    color: LinkText;
  }
}

@media print {
  ui-popover [data-ui-popover-content] {
    display: none !important;
  }
}
`;

type PopoverToggleState = 'open' | 'closed';
type PopoverToggleEvent = Event & { newState?: PopoverToggleState };
type PopoverElement = HTMLElement & {
  hidePopover?: () => void;
  showPopover?: () => void;
};

const toNonNegativeFiniteNumber = (value: number, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback;
  if (value < 0) return 0;
  return value;
};

@customElement('ui-popover')
export class UiPopover extends LitElement {
  static override styles = css`
    :host {
      display: inline;
    }
  `;

  @property({ type: String, reflect: true })
  variant: UiPopoverVariant = 'default';

  @property({ type: String, reflect: true })
  placement: UiPopoverPlacement = 'bottom-start';

  @property({ type: Number, reflect: true })
  offset = DEFAULT_OFFSET;

  @property({ type: Boolean, reflect: true })
  opened = false;

  @property({ type: Boolean, reflect: true })
  disabled = false;

  @property({ type: Boolean, attribute: 'keep-link-fallback', reflect: true })
  keepLinkFallback = false;

  @query('slot[name="trigger"]')
  private _triggerSlot?: HTMLSlotElement;

  @query('slot[name="content"]')
  private _contentSlot?: HTMLSlotElement;

  private readonly _fallbackPopoverId = `ui-popover-content-${Math.random().toString(36).slice(2, 11)}`;

  private _triggerElement: HTMLElement | null = null;
  private _contentElement: PopoverElement | null = null;
  private _activeTrigger: HTMLElement | null = null;
  private _openState = false;
  private _ignoreOpenedChange = false;
  private _returnFocusOnClose = true;

  private _cleanupAutoUpdate: (() => void) | null = null;
  private _fallbackOutsideCleanup: (() => void) | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this._injectDocumentStyles();
    // 再接続時はスロット要素とリスナーを再同期する（slotchange が発火しないブラウザに対応）
    void this.updateComplete.then(() => {
      this._syncElementsFromSlots();
    });
  }

  override disconnectedCallback(): void {
    this._cleanupAutoUpdate?.();
    this._cleanupAutoUpdate = null;
    this._cleanupFallbackOutsideListeners();

    this._detachTriggerListeners(this._triggerElement);
    this._detachContentListeners(this._contentElement);
    this._setTriggerState(this._activeTrigger, false);
    this._setTriggerState(this._triggerElement, false);

    // 参照をリセット：再接続時に _syncElementsFromSlots が「変化なし」と判断して
    // リスナー再アタッチをスキップしないようにする
    this._triggerElement = null;
    this._contentElement = null;
    this._activeTrigger = null;

    // DOM から切り離されたタイミングでブラウザがポップオーバーを自動的に閉じるため
    // 内部状態もリセットして再接続後の不整合を防ぐ
    this._openState = false;
    this._ignoreOpenedChange = true;
    this.opened = false;
    this._ignoreOpenedChange = false;

    super.disconnectedCallback();
  }

  protected override firstUpdated(): void {
    this._syncElementsFromSlots();
  }

  protected override willUpdate(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has('variant') && !VALID_VARIANTS.has(this.variant)) {
      this.variant = 'default';
    }

    if (changedProperties.has('placement') && !VALID_PLACEMENTS.has(this.placement)) {
      this.placement = 'bottom-start';
    }

    if (changedProperties.has('offset')) {
      this.offset = toNonNegativeFiniteNumber(this.offset, DEFAULT_OFFSET);
    }
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has('disabled') && this.disabled) {
      this.close({ returnFocus: false });
    }

    if (changedProperties.has('variant')) {
      this._applyContentSemantics(this._contentElement);
    }

    if (changedProperties.has('placement') || changedProperties.has('offset')) {
      if (this._openState) {
        this._startFloating();
      }
    }

    if (changedProperties.has('opened') && !this._ignoreOpenedChange) {
      if (this.opened && !this._openState) {
        const nextTrigger = this._activeTrigger ?? this._triggerElement;
        if (nextTrigger) {
          this.openForTrigger(nextTrigger);
        } else {
          this._setOpenedProperty(false);
        }
      }

      if (!this.opened && this._openState) {
        this.close();
      }
    }
  }

  openForTrigger(trigger: HTMLElement, options?: UiPopoverOpenOptions): void {
    if (this.disabled) return;
    const content = this._contentElement;
    if (!content) return;

    this._returnFocusOnClose = options?.returnFocus ?? true;
    this._setActiveTrigger(trigger);

    if (this._supportsPopoverApi) {
      if (this._isPopoverOpen(content)) {
        this._startFloating();
        this._commitOpenState(true);
        return;
      }

      if (typeof content.showPopover === 'function') {
        try {
          content.showPopover();
          // toggle イベントが非同期の場合に備え、同期的に状態をコミットする
          this._startFloating();
          this._commitOpenState(true);
          return;
        } catch {
          return;
        }
      }
    }

    content.hidden = false;
    content.dataset['open'] = 'true';
    this._setupFallbackOutsideListeners();
    this._startFloating();
    this._commitOpenState(true);
  }

  close(options?: UiPopoverOpenOptions): void {
    const content = this._contentElement;
    if (!content) return;

    this._returnFocusOnClose = options?.returnFocus ?? true;

    if (this._supportsPopoverApi && this._isPopoverOpen(content)) {
      if (typeof content.hidePopover === 'function') {
        try {
          content.hidePopover();
          // toggle イベントが非同期の場合に備え、同期的に状態をコミットする
          this._commitOpenState(false);
          return;
        } catch {
          // hidePopover に失敗した場合はフォールバックで状態を同期する
        }
      }
    }

    content.hidden = true;
    content.dataset['open'] = 'false';
    this._cleanupFallbackOutsideListeners();
    this._teardownFloating();
    this._commitOpenState(false);
  }

  toggleForTrigger(trigger?: HTMLElement): void {
    if (this._openState) {
      this.close();
      return;
    }

    const nextTrigger = trigger ?? this._activeTrigger ?? this._triggerElement;
    if (!nextTrigger) return;
    this.openForTrigger(nextTrigger);
  }

  private get _supportsPopoverApi(): boolean {
    if (typeof HTMLElement === 'undefined') return false;
    return 'showPopover' in HTMLElement.prototype && 'hidePopover' in HTMLElement.prototype;
  }

  private get _resolvedPlacement(): UiPopoverPlacement {
    return VALID_PLACEMENTS.has(this.placement) ? this.placement : 'bottom-start';
  }

  private get _resolvedOffset(): number {
    return toNonNegativeFiniteNumber(this.offset, DEFAULT_OFFSET);
  }

  private _injectDocumentStyles(): void {
    if (typeof document === 'undefined') return;
    if (document.getElementById(DOCUMENT_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = DOCUMENT_STYLE_ID;
    style.textContent = DOCUMENT_CSS;
    document.head.append(style);
  }

  private _getAssignedElement(slot: HTMLSlotElement | undefined): HTMLElement | null {
    if (!slot) return null;
    const assigned = slot.assignedElements({ flatten: true })[0];
    return assigned instanceof HTMLElement ? assigned : null;
  }

  private _syncElementsFromSlots(): void {
    const nextTrigger = this._getAssignedElement(this._triggerSlot);
    const nextContent = this._getAssignedElement(this._contentSlot);
    const nextPopover = nextContent as PopoverElement | null;

    if (nextTrigger !== this._triggerElement) {
      this._detachTriggerListeners(this._triggerElement);
      this._triggerElement = nextTrigger;
      this._attachTriggerListeners(this._triggerElement);
    }

    if (nextPopover !== this._contentElement) {
      this._detachContentListeners(this._contentElement);
      this._contentElement = nextPopover;
      this._attachContentListeners(this._contentElement);
    }

    this._applyTriggerSemantics(this._triggerElement);
    this._applyContentSemantics(this._contentElement);
    this._syncAriaExpanded();

    if (!this._triggerElement || !this._contentElement) {
      this._teardownFloating();
      this._cleanupFallbackOutsideListeners();
      this._commitOpenState(false);
      return;
    }

    if (this.opened && !this._openState) {
      this.openForTrigger(this._triggerElement);
      return;
    }

    if (this._openState) {
      this._startFloating();
    }
  }

  private _applyTriggerSemantics(trigger: HTMLElement | null): void {
    if (!trigger) return;

    trigger.setAttribute('data-ui-popover-trigger', '');
    trigger.setAttribute('aria-expanded', this._openState ? 'true' : 'false');
    if (trigger.getAttribute('aria-haspopup') === null) {
      trigger.setAttribute('aria-haspopup', 'dialog');
    }

    const content = this._contentElement;
    if (!content) return;
    if (content.id === '') {
      content.id = this._fallbackPopoverId;
    }
    trigger.setAttribute('aria-controls', content.id);
  }

  private _applyContentSemantics(content: PopoverElement | null): void {
    if (!content) return;

    content.setAttribute('data-ui-popover-content', '');
    content.dataset['variant'] = VALID_VARIANTS.has(this.variant) ? this.variant : 'default';
    content.dataset['open'] = this._openState ? 'true' : 'false';

    if (content.id === '') {
      content.id = this._fallbackPopoverId;
    }

    if (this._supportsPopoverApi) {
      if (content.getAttribute('popover') !== 'auto' && content.getAttribute('popover') !== 'manual') {
        content.setAttribute('popover', 'auto');
      }
    } else {
      content.removeAttribute('popover');
      content.hidden = !this._openState;
    }

    if (content.getAttribute('role') === null) {
      content.setAttribute('role', 'dialog');
      content.setAttribute('aria-modal', 'false');
    }
  }

  private _setOpenedProperty(nextOpen: boolean): void {
    if (this.opened === nextOpen) return;
    this._ignoreOpenedChange = true;
    this.opened = nextOpen;
    this._ignoreOpenedChange = false;
  }

  private _setActiveTrigger(trigger: HTMLElement | null): void {
    if (trigger === this._activeTrigger) return;
    this._setTriggerState(this._activeTrigger, false);
    this._activeTrigger = trigger;

    if (this._activeTrigger) {
      this._applyTriggerSemantics(this._activeTrigger);
    }
  }

  private _setTriggerState(trigger: HTMLElement | null, expanded: boolean): void {
    if (!trigger) return;
    trigger.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    trigger.classList.toggle('is-active-trigger', expanded);
  }

  private _syncAriaExpanded(): void {
    this._setTriggerState(this._triggerElement, this._openState && this._activeTrigger === this._triggerElement);
    if (this._activeTrigger && this._activeTrigger !== this._triggerElement) {
      this._setTriggerState(this._activeTrigger, this._openState);
    }
  }

  private _dispatchToggleEvent(open: boolean): void {
    this.dispatchEvent(
      new CustomEvent<UiPopoverToggleDetail>('ui-popover-toggle', {
        detail: {
          open,
          trigger: this._activeTrigger,
          content: this._contentElement,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _dispatchOpenedEvent(): void {
    const content = this._contentElement;
    if (!content) return;
    this.dispatchEvent(
      new CustomEvent<UiPopoverOpenedDetail>('ui-popover-opened', {
        detail: { trigger: this._activeTrigger, content },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _dispatchClosedEvent(returnFocus: boolean): void {
    this.dispatchEvent(
      new CustomEvent<UiPopoverClosedDetail>('ui-popover-closed', {
        detail: {
          trigger: this._activeTrigger,
          content: this._contentElement,
          returnFocus,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _commitOpenState(nextOpen: boolean): void {
    if (this._openState === nextOpen) {
      this._syncAriaExpanded();
      return;
    }

    this._openState = nextOpen;
    this._setOpenedProperty(nextOpen);

    const content = this._contentElement;
    if (content) {
      content.dataset['open'] = nextOpen ? 'true' : 'false';
      if (!this._supportsPopoverApi) {
        content.hidden = !nextOpen;
      }
    }

    if (nextOpen) {
      this._syncAriaExpanded();
      this._dispatchToggleEvent(true);
      this._dispatchOpenedEvent();
      return;
    }

    this._teardownFloating();
    this._cleanupFallbackOutsideListeners();

    const activeTrigger = this._activeTrigger;
    this._syncAriaExpanded();
    this._dispatchToggleEvent(false);
    this._dispatchClosedEvent(this._returnFocusOnClose);

    if (this._returnFocusOnClose) {
      activeTrigger?.focus();
    }
  }

  private _resolveToggleState(event: Event, content: PopoverElement): PopoverToggleState {
    const toggleEvent = event as PopoverToggleEvent;
    if (toggleEvent.newState === 'open' || toggleEvent.newState === 'closed') {
      return toggleEvent.newState;
    }
    return this._isPopoverOpen(content) ? 'open' : 'closed';
  }

  private _isPopoverOpen(content: Element): boolean {
    try {
      return content.matches(':popover-open');
    } catch {
      return false;
    }
  }

  private _attachTriggerListeners(trigger: HTMLElement | null): void {
    if (!trigger) return;
    trigger.addEventListener('click', this._onTriggerClick);
  }

  private _detachTriggerListeners(trigger: HTMLElement | null): void {
    if (!trigger) return;
    trigger.removeEventListener('click', this._onTriggerClick);
  }

  private _attachContentListeners(content: PopoverElement | null): void {
    if (!content) return;
    content.addEventListener('keydown', this._onContentKeyDown);
    content.addEventListener('toggle', this._onContentToggle as EventListener);
  }

  private _detachContentListeners(content: PopoverElement | null): void {
    if (!content) return;
    content.removeEventListener('keydown', this._onContentKeyDown);
    content.removeEventListener('toggle', this._onContentToggle as EventListener);
  }

  private _onTriggerSlotChange = (): void => {
    this._syncElementsFromSlots();
  };

  private _onContentSlotChange = (): void => {
    this._syncElementsFromSlots();
  };

  private _isPrimaryTriggerClick(event: MouseEvent): boolean {
    return (
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.altKey &&
      !event.shiftKey &&
      !event.defaultPrevented
    );
  }

  private _onTriggerClick = (event: MouseEvent): void => {
    if (!this._isPrimaryTriggerClick(event)) return;
    if (this.disabled) return;

    const trigger = event.currentTarget;
    if (!(trigger instanceof HTMLElement)) return;

    if (this.keepLinkFallback && !this._supportsPopoverApi && trigger instanceof HTMLAnchorElement) {
      return;
    }

    event.preventDefault();
    this.toggleForTrigger(trigger);
  };

  private _onContentKeyDown = (event: KeyboardEvent): void => {
    if (!this._openState) return;
    if (event.key !== 'Escape') return;

    event.preventDefault();
    event.stopPropagation();
    this.close({ returnFocus: true });
  };

  private _onContentToggle = (event: Event): void => {
    const content = event.currentTarget;
    if (!(content instanceof HTMLElement)) return;
    if (!this._supportsPopoverApi) return;

    const state = this._resolveToggleState(event, content as PopoverElement);
    if (state === 'open') {
      if (!this._activeTrigger) {
        this._setActiveTrigger(this._triggerElement);
      }
      this._startFloating();
      this._commitOpenState(true);
      return;
    }

    this._commitOpenState(false);
  };

  private _setupFallbackOutsideListeners(): void {
    if (this._supportsPopoverApi) return;
    if (this._fallbackOutsideCleanup) return;

    const onPointerDown = (event: PointerEvent): void => {
      if (!this._openState) return;

      const content = this._contentElement;
      const activeTrigger = this._activeTrigger;
      const path = event.composedPath();
      if (content && path.includes(content)) return;
      if (activeTrigger && path.includes(activeTrigger)) return;

      this.close({ returnFocus: false });
    };

    document.addEventListener('pointerdown', onPointerDown, true);
    this._fallbackOutsideCleanup = (): void => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      this._fallbackOutsideCleanup = null;
    };
  }

  private _cleanupFallbackOutsideListeners(): void {
    this._fallbackOutsideCleanup?.();
  }

  private _teardownFloating(): void {
    this._cleanupAutoUpdate?.();
    this._cleanupAutoUpdate = null;
  }

  private _startFloating(): void {
    const trigger = this._activeTrigger ?? this._triggerElement;
    const content = this._contentElement;
    if (!trigger || !content) return;

    const updatePosition = (): void => {
      void this._updateFloatingPosition(trigger, content);
    };

    this._teardownFloating();
    updatePosition();
    this._cleanupAutoUpdate = autoUpdate(trigger, content, updatePosition);
  }

  private async _updateFloatingPosition(trigger: HTMLElement, content: HTMLElement): Promise<void> {
    const result = await computePosition(trigger, content, {
      strategy: 'fixed',
      placement: this._resolvedPlacement,
      middleware: [
        applyOffset(this._resolvedOffset),
        flip({ padding: EDGE_PADDING }),
        shift({ padding: EDGE_PADDING }),
      ],
    });

    content.style.left = `${String(Math.round(result.x))}px`;
    content.style.top = `${String(Math.round(result.y))}px`;
  }

  override render(): TemplateResult {
    return html`
      <slot name="trigger" @slotchange="${this._onTriggerSlotChange}"></slot>
      <slot name="content" @slotchange="${this._onContentSlotChange}"></slot>
      ${nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-popover': UiPopover;
  }
}
