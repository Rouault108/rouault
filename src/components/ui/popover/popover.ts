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

interface ImportMetaEnvLike {
  DEV?: boolean;
}

export type UiPopoverVariant = 'default' | 'subtle' | 'inverse';
export type UiPopoverPlacement = Placement;
export type UiPopoverOpenChangeReason =
  | 'trigger'
  | 'escape'
  | 'outside-pointer'
  | 'disabled'
  | 'slot-invalidated'
  | 'disconnected'
  | 'programmatic';

export interface UiPopoverOpenOptions {
  returnFocus?: boolean;
}

export interface UiPopoverOpenChangeRequestDetail {
  nextOpen: boolean;
  reason: UiPopoverOpenChangeReason;
  trigger: HTMLElement | null;
  content: HTMLElement | null;
}

export interface UiPopoverOpenChangeDetail {
  open: boolean;
  reason: UiPopoverOpenChangeReason;
  trigger: HTMLElement | null;
  content: HTMLElement | null;
  returnFocus: boolean;
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
const FALLBACK_POPUP_ID_PREFIX = 'ui-popover-content-';

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

export const DOCUMENT_CSS = `
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
  border: var(--border-width, 1px) solid var(--border-default, oklch(86% 0 0));
  border-radius: var(--radius-md, 6px);
  background: var(--bg-surface-2, oklch(100% 0 0));
  color: var(--fg-default, oklch(20% 0 0));
  box-shadow: var(--elevation-lg, 0 8px 24px oklch(0% 0 0 / 0.12));
  font-size: inherit;
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
  color: var(--fg-muted, oklch(45% 0 0));
  border-color: var(--border-ghost, oklch(20% 0 0 / 0.04));
  box-shadow: var(--elevation-md, 0 4px 8px oklch(0% 0 0 / 0.08));
}

ui-popover [data-ui-popover-content][data-variant='inverse'] {
  background: var(--fg-default, oklch(20% 0 0));
  color: var(--bg-default, oklch(98% 0.01 250));
  border-color: var(--fg-muted, oklch(45% 0 0));
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
  background: var(--bg-active, oklch(95% 0 0));
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
type PopoverControlMode = 'uncontrolled' | 'controlled';

interface PendingOpenChange {
  nextOpen: boolean;
  reason: UiPopoverOpenChangeReason;
  trigger: HTMLElement | null;
  returnFocus: boolean;
}

const IS_DEVELOPMENT = (import.meta as ImportMeta & { env?: ImportMetaEnvLike }).env?.DEV ?? true;

const toNonNegativeFiniteNumber = (value: number, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback;
  if (value < 0) return fallback;
  return value;
};

const isFormControl = (element: HTMLElement): boolean =>
  element instanceof HTMLButtonElement ||
  element instanceof HTMLInputElement ||
  element instanceof HTMLSelectElement ||
  element instanceof HTMLTextAreaElement;

const isInteractiveElement = (element: HTMLElement): boolean => {
  if (!element.isConnected) return false;
  if (element instanceof HTMLButtonElement) return !element.disabled;
  if (element instanceof HTMLAnchorElement) return element.hasAttribute('href');
  if (isFormControl(element)) return !element.hasAttribute('disabled');
  return element.tabIndex >= 0;
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

  @property({ type: Boolean })
  defaultOpened = false;

  @property({ type: Boolean, reflect: true })
  disabled = false;

  // 互換維持用。公開契約には含めない。
  @property({ type: Boolean, attribute: 'keep-link-fallback', reflect: true })
  keepLinkFallback = false;

  @query('slot[name="trigger"]')
  private _triggerSlot?: HTMLSlotElement;

  @query('slot[name="content"]')
  private _contentSlot?: HTMLSlotElement;

  private readonly _fallbackPopoverId = `${FALLBACK_POPUP_ID_PREFIX}${Math.random().toString(36).slice(2, 11)}`;

  private _ownerTrigger: HTMLElement | null = null;
  private _contentElement: PopoverElement | null = null;
  private _activeTrigger: HTMLElement | null = null;
  private _openState = false;
  private _controlMode: PopoverControlMode = 'uncontrolled';
  private _didInitializeControlMode = false;
  private _isReflectingOpened = false;
  private _pendingOpenChange: PendingOpenChange | null = null;
  private _dismissReasonHint: UiPopoverOpenChangeReason | null = null;
  private _cleanupAutoUpdate: (() => void) | null = null;
  private _cleanupOutsidePointerListeners: (() => void) | null = null;
  private _cleanupDocumentKeydownListener: (() => void) | null = null;
  private _contentObserver: MutationObserver | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this._injectDocumentStyles();
    void this.updateComplete.then(() => {
      this._syncElementsFromSlots();
    });
  }

  override disconnectedCallback(): void {
    this._requestStateChange(false, 'disconnected', this._activeTrigger, { returnFocus: false });
    this._teardownFloating();
    this._cleanupGlobalDismissListeners();
    this._detachTriggerListeners(this._ownerTrigger);
    this._detachContentListeners(this._contentElement);
    this._observeContentId(null);
    this._ownerTrigger = null;
    this._contentElement = null;
    super.disconnectedCallback();
  }

  protected override firstUpdated(): void {
    this._initializeControlMode();
    this._syncElementsFromSlots();

    if (this._controlMode === 'uncontrolled' && this.defaultOpened) {
      const initialTrigger = this._ownerTrigger ?? this._activeTrigger;
      if (initialTrigger) {
        this.openForTrigger(initialTrigger);
      } else {
        this._warn('defaultOpened は trigger 解決後にのみ利用できます。');
      }
    } else if (this._controlMode === 'controlled' && this.opened) {
      const initialTrigger = this._activeTrigger ?? this._ownerTrigger;
      if (initialTrigger) {
        this._applyOpenChange(true, 'programmatic', initialTrigger, false);
      } else {
        this._syncOpenedProperty(false);
      }
    }
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

    if (
      this._didInitializeControlMode &&
      changedProperties.has('opened') &&
      !this._isReflectingOpened
    ) {
      this._controlMode = 'controlled';
    }

    if (changedProperties.has('disabled') && this.disabled && this._openState) {
      this._requestStateChange(false, 'disabled', this._activeTrigger, { returnFocus: false });
    }

    if (
      this._didInitializeControlMode &&
      this._controlMode === 'controlled' &&
      changedProperties.has('opened') &&
      !this._isReflectingOpened
    ) {
      this._syncControlledOpenState();
    }
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has('variant')) {
      this._applyContentSemantics(this._contentElement);
    }

    if (changedProperties.has('placement') || changedProperties.has('offset')) {
      if (this._openState) {
        this._startFloating();
      }
    }

    if (changedProperties.has('opened') && this._isReflectingOpened) {
      this._isReflectingOpened = false;
    }
  }

  openForTrigger(trigger: HTMLElement, _options?: UiPopoverOpenOptions): void {
    if (this.disabled) return;

    const content = this._contentElement;
    if (!content) {
      this._warn('content slot が解決できないため openForTrigger() は no-op になります。');
      return;
    }

    if (!this._validateTrigger(trigger, 'openForTrigger()')) return;

    if (this._openState) {
      if (trigger === this._activeTrigger) {
        this._startFloating();
        return;
      }

      this._setActiveTrigger(trigger);
      this._syncTriggerRelationships();
      this._startFloating();
      return;
    }

    this._requestStateChange(true, 'trigger', trigger, { returnFocus: false });
  }

  close(options?: UiPopoverOpenOptions): void {
    if (!this._openState) return;
    this._requestStateChange(false, 'programmatic', this._activeTrigger, {
      returnFocus: options?.returnFocus ?? false,
    });
  }

  toggleForTrigger(trigger?: HTMLElement): void {
    const resolvedTrigger = trigger ?? (this._openState ? this._activeTrigger : this._ownerTrigger);
    if (!resolvedTrigger) {
      this._warn('toggleForTrigger() は trigger を解決できないため no-op になります。');
      return;
    }

    if (!this._validateTrigger(resolvedTrigger, 'toggleForTrigger()')) return;

    if (!this._openState) {
      this.openForTrigger(resolvedTrigger);
      return;
    }

    if (resolvedTrigger === this._activeTrigger) {
      this._requestStateChange(false, 'trigger', resolvedTrigger, { returnFocus: true });
      return;
    }

    this._setActiveTrigger(resolvedTrigger);
    this._syncTriggerRelationships();
    this._startFloating();
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

  private _initializeControlMode(): void {
    if (this._didInitializeControlMode) return;

    this._controlMode = this.hasAttribute('opened') || this.opened ? 'controlled' : 'uncontrolled';
    this._didInitializeControlMode = true;

    if (this._controlMode === 'controlled' && this.defaultOpened) {
      this._warn('opened と defaultOpened の同時指定は契約違反です。opened を優先します。');
    }

    if (this.keepLinkFallback) {
      this._warn(
        'keep-link-fallback は互換維持用です。link fallback は semantic wrapper 側へ移行してください。',
      );
    }
  }

  private _warn(message: string): void {
    if (!IS_DEVELOPMENT) return;
    console.warn(`[ui-popover] ${message}`);
  }

  private _injectDocumentStyles(): void {
    const ownerDocument = this.ownerDocument;
    if (ownerDocument.getElementById(DOCUMENT_STYLE_ID)) return;

    const style = ownerDocument.createElement('style');
    style.id = DOCUMENT_STYLE_ID;
    style.textContent = DOCUMENT_CSS;
    ownerDocument.head.append(style);
  }

  private _getAssignedElements(slot: HTMLSlotElement | undefined): HTMLElement[] {
    if (!slot) return [];
    return slot
      .assignedElements({ flatten: true })
      .filter((element): element is HTMLElement => element instanceof HTMLElement);
  }

  private _resolveSingleAssignedElement(
    slot: HTMLSlotElement | undefined,
    slotName: 'trigger' | 'content',
  ): HTMLElement | null {
    const assigned = this._getAssignedElements(slot);
    if (assigned.length === 1) return assigned.at(0) ?? null;
    if (assigned.length > 1) {
      this._warn(`${slotName} slot には単一の HTMLElement だけを与えてください。`);
    }
    return null;
  }

  private _syncElementsFromSlots(): void {
    const previousOwnerTrigger = this._ownerTrigger;
    const previousContent = this._contentElement;
    const nextOwnerTrigger = this._resolveSingleAssignedElement(this._triggerSlot, 'trigger');
    const nextContent = this._resolveSingleAssignedElement(
      this._contentSlot,
      'content',
    ) as PopoverElement | null;

    if (!nextContent && previousContent && this._openState) {
      this._requestStateChange(false, 'slot-invalidated', this._activeTrigger, {
        returnFocus: false,
      });
    }

    if (nextOwnerTrigger !== previousOwnerTrigger) {
      this._detachTriggerListeners(previousOwnerTrigger);
      this._ownerTrigger = nextOwnerTrigger;
      this._attachTriggerListeners(this._ownerTrigger);
    }

    if (nextContent !== this._contentElement) {
      this._detachContentListeners(this._contentElement);
      this._observeContentId(null);
      this._contentElement = nextContent;
      this._attachContentListeners(this._contentElement);
      this._observeContentId(this._contentElement);
    }

    if (this._activeTrigger === previousOwnerTrigger) {
      this._activeTrigger = this._ownerTrigger;
    }

    this._applyContentSemantics(this._contentElement);
    this._syncTriggerRelationships();

    if (!this._contentElement) {
      if (this._openState) {
        this._requestStateChange(false, 'slot-invalidated', this._activeTrigger, {
          returnFocus: false,
        });
      }
      return;
    }

    if (this._openState && !this._activeTrigger) {
      this._requestStateChange(false, 'slot-invalidated', null, { returnFocus: false });
      return;
    }

    if (this._openState) {
      this._startFloating();
    }
  }

  private _validateTrigger(trigger: HTMLElement, context: string): boolean {
    if (isInteractiveElement(trigger)) return true;
    this._warn(`${context} に無効な trigger が渡されました。interactive element が必要です。`);
    return false;
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
      content.setAttribute('popover', 'auto');
    } else {
      content.removeAttribute('popover');
      content.hidden = !this._openState;
    }
  }

  private _setActiveTrigger(trigger: HTMLElement | null): void {
    if (this._activeTrigger && this._activeTrigger !== trigger) {
      this._clearTriggerRelationship(this._activeTrigger);
    }
    this._activeTrigger = trigger;
  }

  private _clearTriggerRelationship(trigger: HTMLElement | null): void {
    if (!trigger) return;
    trigger.removeAttribute('data-ui-popover-trigger');
    trigger.classList.remove('is-active-trigger');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.removeAttribute('aria-controls');
  }

  private _syncTriggerRelationships(): void {
    const content = this._contentElement;
    const ownerTrigger = this._ownerTrigger;
    const activeTrigger = this._openState ? this._activeTrigger : this._ownerTrigger;

    this._clearTriggerRelationship(ownerTrigger);
    if (this._activeTrigger && this._activeTrigger !== ownerTrigger) {
      this._clearTriggerRelationship(this._activeTrigger);
    }

    if (ownerTrigger) {
      ownerTrigger.setAttribute('data-ui-popover-trigger', '');
      ownerTrigger.setAttribute('aria-expanded', 'false');
      if (!this._openState && content) {
        ownerTrigger.setAttribute('aria-controls', content.id);
      }
    }

    if (!activeTrigger || !content) return;

    activeTrigger.setAttribute('data-ui-popover-trigger', '');
    activeTrigger.setAttribute('aria-expanded', this._openState ? 'true' : 'false');
    activeTrigger.setAttribute('aria-controls', content.id);
    activeTrigger.classList.toggle('is-active-trigger', this._openState);
  }

  private _syncOpenedProperty(nextOpen: boolean): void {
    if (this.opened === nextOpen) return;
    this._isReflectingOpened = true;
    this.opened = nextOpen;
  }

  private _dispatchOpenChangeRequest(
    nextOpen: boolean,
    reason: UiPopoverOpenChangeReason,
    trigger: HTMLElement | null,
  ): boolean {
    const event = new CustomEvent<UiPopoverOpenChangeRequestDetail>(
      'ui-popover-open-change-request',
      {
        detail: {
          nextOpen,
          reason,
          trigger,
          content: this._contentElement,
        },
        bubbles: true,
        composed: true,
        cancelable: true,
      },
    );

    return this.dispatchEvent(event);
  }

  private _dispatchOpenChange(
    open: boolean,
    reason: UiPopoverOpenChangeReason,
    trigger: HTMLElement | null,
    returnFocus: boolean,
  ): void {
    this.dispatchEvent(
      new CustomEvent<UiPopoverOpenChangeDetail>('ui-popover-open-change', {
        detail: {
          open,
          reason,
          trigger,
          content: this._contentElement,
          returnFocus,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _dispatchLegacyEvents(
    open: boolean,
    trigger: HTMLElement | null,
    returnFocus: boolean,
  ): void {
    this.dispatchEvent(
      new CustomEvent<UiPopoverToggleDetail>('ui-popover-toggle', {
        detail: {
          open,
          trigger,
          content: this._contentElement,
        },
        bubbles: true,
        composed: true,
      }),
    );

    if (open && this._contentElement) {
      this.dispatchEvent(
        new CustomEvent<UiPopoverOpenedDetail>('ui-popover-opened', {
          detail: { trigger, content: this._contentElement },
          bubbles: true,
          composed: true,
        }),
      );
      return;
    }

    this.dispatchEvent(
      new CustomEvent<UiPopoverClosedDetail>('ui-popover-closed', {
        detail: {
          trigger,
          content: this._contentElement,
          returnFocus,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private _getDefaultReturnFocus(
    reason: UiPopoverOpenChangeReason,
    override: boolean | undefined,
  ): boolean {
    if (override !== undefined) return override;

    switch (reason) {
      case 'trigger':
      case 'escape':
        return true;
      case 'outside-pointer':
      case 'disabled':
      case 'slot-invalidated':
      case 'disconnected':
        return false;
      case 'programmatic':
        return false;
      default:
        return false;
    }
  }

  private _requestStateChange(
    nextOpen: boolean,
    reason: UiPopoverOpenChangeReason,
    trigger: HTMLElement | null,
    options?: UiPopoverOpenOptions,
  ): void {
    if (nextOpen === this._openState) return;

    const returnFocus = this._getDefaultReturnFocus(reason, options?.returnFocus);
    if (!this._dispatchOpenChangeRequest(nextOpen, reason, trigger)) {
      this._pendingOpenChange = null;
      return;
    }

    this._pendingOpenChange = {
      nextOpen,
      reason,
      trigger,
      returnFocus,
    };

    if (this._controlMode === 'controlled') return;

    this._applyOpenChange(nextOpen, reason, trigger, returnFocus);
  }

  private _syncControlledOpenState(): void {
    const pending = this._pendingOpenChange;
    const reason = pending?.reason ?? 'programmatic';
    const returnFocus = pending?.returnFocus ?? this._getDefaultReturnFocus(reason, undefined);
    const trigger = pending?.trigger ?? this._activeTrigger ?? this._ownerTrigger;

    if (this.opened === this._openState) {
      this._pendingOpenChange = null;
      return;
    }

    this._applyOpenChange(this.opened, reason, trigger, returnFocus);
  }

  private _applyOpenChange(
    nextOpen: boolean,
    reason: UiPopoverOpenChangeReason,
    trigger: HTMLElement | null,
    returnFocus: boolean,
  ): void {
    const content = this._contentElement;
    if (!content) {
      if (!nextOpen && this._openState) {
        this._commitOpenState(false, reason, returnFocus, trigger);
        return;
      }

      this._pendingOpenChange = null;
      this._syncOpenedProperty(false);
      return;
    }

    if (nextOpen) {
      if (!trigger || !this._validateTrigger(trigger, 'open')) {
        this._pendingOpenChange = null;
        this._syncOpenedProperty(false);
        return;
      }

      this._dismissReasonHint = null;
      this._setActiveTrigger(trigger);

      if (this._supportsPopoverApi && typeof content.showPopover === 'function') {
        if (!this._isPopoverOpen(content)) {
          try {
            content.showPopover();
          } catch {
            this._pendingOpenChange = null;
            return;
          }
        }
      } else {
        content.hidden = false;
      }

      this._commitOpenState(true, reason, returnFocus);
      return;
    }

    const closingTrigger = trigger ?? this._activeTrigger;

    if (this._supportsPopoverApi && typeof content.hidePopover === 'function') {
      if (this._isPopoverOpen(content)) {
        try {
          content.hidePopover();
        } catch {
          // Popover API の失敗時は fallback と同じ同期経路へ倒す。
        }
      }
    } else {
      content.hidden = true;
    }

    this._commitOpenState(false, reason, returnFocus, closingTrigger);
  }

  private _commitOpenState(
    nextOpen: boolean,
    reason: UiPopoverOpenChangeReason,
    returnFocus: boolean,
    closingTrigger?: HTMLElement | null,
  ): void {
    if (this._openState === nextOpen) {
      this._pendingOpenChange = null;
      this._syncTriggerRelationships();
      return;
    }

    const content = this._contentElement;
    if (content) {
      content.dataset['open'] = nextOpen ? 'true' : 'false';
      if (!this._supportsPopoverApi) {
        content.hidden = !nextOpen;
      }
    }

    this._openState = nextOpen;

    if (nextOpen) {
      this._syncOpenedProperty(true);
      this._syncTriggerRelationships();
      this._startFloating();
      this._setupGlobalDismissListeners();
      const activeTrigger = this._activeTrigger;
      this._dispatchOpenChange(true, reason, activeTrigger, returnFocus);
      this._dispatchLegacyEvents(true, activeTrigger, returnFocus);
      this._pendingOpenChange = null;
      return;
    }

    const activeTrigger = closingTrigger ?? this._activeTrigger;
    this._teardownFloating();
    this._cleanupGlobalDismissListeners();
    this._syncOpenedProperty(false);
    this._openState = false;
    this._clearTriggerRelationship(this._activeTrigger);
    this._activeTrigger = null;
    this._syncTriggerRelationships();
    this._dispatchOpenChange(false, reason, activeTrigger, returnFocus);
    this._dispatchLegacyEvents(false, activeTrigger, returnFocus);
    this._pendingOpenChange = null;

    if (returnFocus) {
      requestAnimationFrame(() => {
        activeTrigger?.focus();
      });
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
    trigger.addEventListener('keydown', this._onTriggerKeyDown);
  }

  private _detachTriggerListeners(trigger: HTMLElement | null): void {
    if (!trigger) return;
    trigger.removeEventListener('click', this._onTriggerClick);
    trigger.removeEventListener('keydown', this._onTriggerKeyDown);
  }

  private _attachContentListeners(content: PopoverElement | null): void {
    if (!content) return;
    content.addEventListener('toggle', this._onContentToggle as EventListener);
  }

  private _detachContentListeners(content: PopoverElement | null): void {
    if (!content) return;
    content.removeEventListener('toggle', this._onContentToggle as EventListener);
  }

  private _observeContentId(content: PopoverElement | null): void {
    this._contentObserver?.disconnect();
    this._contentObserver = null;

    if (!content) return;

    this._contentObserver = new MutationObserver(() => {
      if (content.id === '') {
        content.id = this._fallbackPopoverId;
      }
      this._syncTriggerRelationships();
    });

    this._contentObserver.observe(content, {
      attributes: true,
      attributeFilter: ['id'],
    });
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
    if (!this._validateTrigger(trigger, 'trigger click')) return;

    if (
      this.keepLinkFallback &&
      !this._supportsPopoverApi &&
      trigger instanceof HTMLAnchorElement
    ) {
      return;
    }

    event.preventDefault();
    this.toggleForTrigger(trigger);
  };

  private _onTriggerKeyDown = (event: KeyboardEvent): void => {
    if (!this._openState) return;
    if (event.key !== 'Escape') return;
    if (event.defaultPrevented) return;

    this._dismissReasonHint = 'escape';
    event.preventDefault();
    this._requestStateChange(false, 'escape', this._activeTrigger, { returnFocus: true });
  };

  private _onDocumentKeyDown = (event: KeyboardEvent): void => {
    if (!this._openState) return;
    if (event.key !== 'Escape') return;
    if (event.defaultPrevented) return;

    this._dismissReasonHint = 'escape';
    event.preventDefault();
    this._requestStateChange(false, 'escape', this._activeTrigger, { returnFocus: true });
  };

  private _onDocumentPointerDown = (event: PointerEvent): void => {
    if (!this._openState) return;
    if (event.defaultPrevented) return;
    if (typeof event.button === 'number' && event.button !== 0) return;

    const content = this._contentElement;
    const activeTrigger = this._activeTrigger;
    const path = event.composedPath();
    if (content && path.includes(content)) return;
    if (activeTrigger && path.includes(activeTrigger)) return;

    this._dismissReasonHint = 'outside-pointer';
    this._requestStateChange(false, 'outside-pointer', activeTrigger, { returnFocus: false });
  };

  private _onContentToggle = (event: Event): void => {
    const content = event.currentTarget;
    if (!(content instanceof HTMLElement)) return;
    if (!this._supportsPopoverApi) return;

    const state = this._resolveToggleState(event, content as PopoverElement);
    if (state === 'open') {
      if (!this._openState) {
        const pending = this._pendingOpenChange;
        const nextTrigger = pending?.trigger ?? this._activeTrigger ?? this._ownerTrigger;
        if (!nextTrigger) return;
        this._setActiveTrigger(nextTrigger);
        this._commitOpenState(
          true,
          pending?.reason ?? 'programmatic',
          pending?.returnFocus ?? false,
        );
      }
      return;
    }

    if (this._openState) {
      const pending = this._pendingOpenChange;
      const reason = pending?.reason ?? this._dismissReasonHint ?? 'outside-pointer';
      const returnFocus = pending?.returnFocus ?? this._getDefaultReturnFocus(reason, undefined);
      const trigger = pending?.trigger ?? this._activeTrigger;
      this._commitOpenState(false, reason, returnFocus, trigger);
    }

    this._dismissReasonHint = null;
  };

  private _setupGlobalDismissListeners(): void {
    if (this._cleanupOutsidePointerListeners || this._cleanupDocumentKeydownListener) return;

    const ownerDocument = this.ownerDocument;

    ownerDocument.addEventListener('pointerdown', this._onDocumentPointerDown, true);
    ownerDocument.addEventListener('keydown', this._onDocumentKeyDown);

    this._cleanupOutsidePointerListeners = (): void => {
      ownerDocument.removeEventListener('pointerdown', this._onDocumentPointerDown, true);
      this._cleanupOutsidePointerListeners = null;
    };

    this._cleanupDocumentKeydownListener = (): void => {
      ownerDocument.removeEventListener('keydown', this._onDocumentKeyDown);
      this._cleanupDocumentKeydownListener = null;
    };
  }

  private _cleanupGlobalDismissListeners(): void {
    this._cleanupOutsidePointerListeners?.();
    this._cleanupDocumentKeydownListener?.();
  }

  private _teardownFloating(): void {
    this._cleanupAutoUpdate?.();
    this._cleanupAutoUpdate = null;
  }

  private _startFloating(): void {
    const trigger = this._activeTrigger ?? this._ownerTrigger;
    const content = this._contentElement;
    if (!trigger || !content || !this._openState) return;

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
