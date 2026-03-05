import {
  autoUpdate,
  computePosition,
  flip,
  offset as applyOffset,
  shift,
  type Placement,
} from '@floating-ui/dom';
import { css, html, LitElement, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';

export type UiTooltipVariant = 'default' | 'subtle' | 'inverse';
export type UiTooltipPlacement = Placement;

const VALID_VARIANTS = new Set<UiTooltipVariant>(['default', 'subtle', 'inverse']);
const VALID_PLACEMENTS = new Set<UiTooltipPlacement>([
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

const DEFAULT_OFFSET = 8;

const toNonNegativeFiniteNumber = (value: number, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback;
  if (value < 0) return 0;
  return value;
};

@customElement('ui-tooltip')
export class UiTooltip extends LitElement {
  static override styles = css`
    :host {
      display: inline-flex;
      position: relative;
      vertical-align: middle;

      --_tooltip-bg: var(--bg-surface-2, oklch(100% 0 0));
      --_tooltip-fg: var(--fg-default, oklch(20% 0.01 250));
      --_tooltip-border: var(--border-default, oklch(20% 0.03 250 / 0.12));
      --_tooltip-shadow: var(--elevation-lg, 0 8px 24px oklch(0% 0 0 / 0.12));
    }

    .tooltip {
      position: fixed;
      left: 0;
      top: 0;
      margin: 0;
      max-inline-size: min(42ch, calc(100vw - var(--space-4, 16px)));
      padding: var(--space-1, 4px) var(--space-2, 8px);
      border: var(--border-width, 1px) solid var(--_tooltip-border);
      border-radius: var(--radius-sm, 4px);
      background: var(--_tooltip-bg);
      color: var(--_tooltip-fg);
      box-shadow: var(--_tooltip-shadow);
      font-size: var(--text-xs, 12px);
      font-weight: var(--font-medium, 500);
      letter-spacing: var(--tracking-wide, 0.025em);
      line-height: var(--line-height-normal, 1.5);
      white-space: normal;
      overflow-wrap: anywhere;
      z-index: var(--z-popover, 400);
      pointer-events: none;
      opacity: 0;
      visibility: hidden;
      transform: translateY(2px);
      transition:
        opacity var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        transform var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
        visibility var(--duration-fast, 70ms) linear;
    }

    .tooltip[data-open='true'] {
      opacity: 1;
      visibility: visible;
      transform: translateY(0);
    }

    .tooltip[data-variant='subtle'] {
      --_tooltip-bg: var(--bg-fill-muted, oklch(96% 0 0));
      --_tooltip-fg: var(--fg-muted, oklch(45% 0.02 250));
      --_tooltip-border: var(--border-ghost, oklch(20% 0.03 250 / 0.04));
      --_tooltip-shadow: var(--elevation-md, 0 4px 8px oklch(0% 0 0 / 0.08));
    }

    .tooltip[data-variant='inverse'] {
      --_tooltip-bg: var(--fg-default, oklch(20% 0.01 250));
      --_tooltip-fg: var(--bg-default, oklch(98% 0.01 250));
      --_tooltip-border: var(--fg-muted, oklch(45% 0.02 250));
      --_tooltip-shadow: var(--elevation-lg, 0 8px 24px oklch(0% 0 0 / 0.12));
    }

    @media (prefers-reduced-motion: reduce) {
      .tooltip,
      .tooltip[data-open='true'] {
        transition-duration: var(--duration-instant, 0ms);
      }
    }

    @media (forced-colors: active) {
      .tooltip {
        background: Canvas;
        color: CanvasText;
        border-color: CanvasText;
        box-shadow: none;
      }
    }

    @media print {
      .tooltip {
        display: none !important;
      }
    }
  `;

  @property({ type: String })
  text = '';

  @property({ type: String, reflect: true })
  variant: UiTooltipVariant = 'default';

  @property({ type: String, reflect: true })
  placement: UiTooltipPlacement = 'top';

  @property({ type: Number, reflect: true })
  offset = DEFAULT_OFFSET;

  @property({ type: Number, attribute: 'open-delay', reflect: true })
  openDelay = 0;

  @property({ type: Number, attribute: 'close-delay', reflect: true })
  closeDelay = 0;

  @property({ type: Boolean, reflect: true })
  disabled = false;

  @state()
  private _open = false;

  @query('slot')
  private _slotElement?: HTMLSlotElement;

  @query('.tooltip')
  private _tooltipElement?: HTMLElement;

  private readonly _tooltipId = `ui-tooltip-${Math.random().toString(36).slice(2, 11)}`;

  private _triggerElement: HTMLElement | null = null;
  private _cleanupAutoUpdate: (() => void) | null = null;
  private _openTimer: ReturnType<typeof setTimeout> | null = null;
  private _closeTimer: ReturnType<typeof setTimeout> | null = null;
  private _hoveringTrigger = false;
  private _focusWithinTrigger = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('keydown', this._onKeyDown as EventListener);
  }

  override disconnectedCallback(): void {
    this.removeEventListener('keydown', this._onKeyDown as EventListener);
    this._clearTimers();
    this._teardownFloating();
    this._detachTriggerListeners(this._triggerElement);
    this._removeAriaDescribedBy();
    super.disconnectedCallback();
  }

  protected override firstUpdated(): void {
    this._syncTriggerElement();
  }

  protected override willUpdate(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has('variant') && !VALID_VARIANTS.has(this.variant)) {
      this.variant = 'default';
    }

    if (changedProperties.has('placement') && !VALID_PLACEMENTS.has(this.placement)) {
      this.placement = 'top';
    }

    if (changedProperties.has('offset')) {
      this.offset = Number.isFinite(this.offset) ? this.offset : DEFAULT_OFFSET;
    }

    if (changedProperties.has('openDelay')) {
      this.openDelay = toNonNegativeFiniteNumber(this.openDelay, 0);
    }

    if (changedProperties.has('closeDelay')) {
      this.closeDelay = toNonNegativeFiniteNumber(this.closeDelay, 0);
    }
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has('disabled') || changedProperties.has('text')) {
      if (this._shouldSuppressTooltip()) {
        this._hoveringTrigger = false;
        this._focusWithinTrigger = false;
        this._clearTimers();
        void this._closeTooltip();
      }
    }

    if ((changedProperties.has('placement') || changedProperties.has('offset')) && this._open) {
      void this._positionTooltip();
    }
  }

  private get _resolvedOffset(): number {
    return Number.isFinite(this.offset) ? this.offset : DEFAULT_OFFSET;
  }

  private get _resolvedVariant(): UiTooltipVariant {
    return VALID_VARIANTS.has(this.variant) ? this.variant : 'default';
  }

  private get _resolvedPlacement(): UiTooltipPlacement {
    return VALID_PLACEMENTS.has(this.placement) ? this.placement : 'top';
  }

  private _isTextAvailable(): boolean {
    return this.text.trim() !== '';
  }

  private _shouldSuppressTooltip(): boolean {
    return this.disabled || !this._isTextAvailable() || this._triggerElement === null;
  }

  private _syncTriggerElement(): void {
    const slot = this._slotElement;
    if (!slot) return;

    const firstElement = slot.assignedElements({ flatten: true })[0];
    const nextTrigger = firstElement instanceof HTMLElement ? firstElement : null;

    if (nextTrigger === this._triggerElement) return;

    this._detachTriggerListeners(this._triggerElement);
    this._triggerElement = nextTrigger;
    this._attachTriggerListeners(this._triggerElement);

    if (this._triggerElement === null) {
      this._hoveringTrigger = false;
      this._focusWithinTrigger = false;
      void this._closeTooltip();
    }
  }

  private _attachTriggerListeners(trigger: HTMLElement | null): void {
    if (!trigger) return;
    trigger.addEventListener('mouseenter', this._onTriggerMouseEnter);
    trigger.addEventListener('mouseleave', this._onTriggerMouseLeave);
    trigger.addEventListener('focusin', this._onTriggerFocusIn);
    trigger.addEventListener('focusout', this._onTriggerFocusOut);
  }

  private _detachTriggerListeners(trigger: HTMLElement | null): void {
    if (!trigger) return;
    trigger.removeEventListener('mouseenter', this._onTriggerMouseEnter);
    trigger.removeEventListener('mouseleave', this._onTriggerMouseLeave);
    trigger.removeEventListener('focusin', this._onTriggerFocusIn);
    trigger.removeEventListener('focusout', this._onTriggerFocusOut);
  }

  private _onSlotChange = (): void => {
    this._syncTriggerElement();
  };

  private _onTriggerMouseEnter = (): void => {
    this._hoveringTrigger = true;
    this._scheduleOpen();
  };

  private _onTriggerMouseLeave = (): void => {
    this._hoveringTrigger = false;
    this._scheduleClose();
  };

  private _onTriggerFocusIn = (): void => {
    this._focusWithinTrigger = true;
    this._scheduleOpen();
  };

  private _onTriggerFocusOut = (event: FocusEvent): void => {
    const related = event.relatedTarget;
    if (related instanceof Node && this._triggerElement?.contains(related)) {
      return;
    }

    this._focusWithinTrigger = false;
    this._scheduleClose();
  };

  private _onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || !this._open) return;

    this._hoveringTrigger = false;
    this._focusWithinTrigger = false;
    this._clearTimers();
    void this._closeTooltip();
  };

  private _scheduleOpen(): void {
    if (this._shouldSuppressTooltip()) return;

    if (this._closeTimer !== null) {
      clearTimeout(this._closeTimer);
      this._closeTimer = null;
    }

    if (this._open) {
      void this._positionTooltip();
      return;
    }

    if (this._openTimer !== null) {
      clearTimeout(this._openTimer);
    }

    if (this.openDelay <= 0) {
      void this._openTooltip();
      return;
    }

    this._openTimer = setTimeout(() => {
      this._openTimer = null;
      void this._openTooltip();
    }, this.openDelay);
  }

  private _scheduleClose(): void {
    if (this._hoveringTrigger || this._focusWithinTrigger) return;

    if (this._openTimer !== null) {
      clearTimeout(this._openTimer);
      this._openTimer = null;
    }

    if (!this._open) return;

    if (this._closeTimer !== null) {
      clearTimeout(this._closeTimer);
    }

    if (this.closeDelay <= 0) {
      void this._closeTooltip();
      return;
    }

    this._closeTimer = setTimeout(() => {
      this._closeTimer = null;
      void this._closeTooltip();
    }, this.closeDelay);
  }

  private _clearTimers(): void {
    if (this._openTimer !== null) {
      clearTimeout(this._openTimer);
      this._openTimer = null;
    }

    if (this._closeTimer !== null) {
      clearTimeout(this._closeTimer);
      this._closeTimer = null;
    }
  }

  private _applyAriaDescribedBy(): void {
    const trigger = this._triggerElement;
    if (!trigger) return;

    const current = (trigger.getAttribute('aria-describedby') ?? '').trim();
    const tokens = current.split(/\s+/).filter((token) => token !== '');

    if (!tokens.includes(this._tooltipId)) {
      tokens.push(this._tooltipId);
      trigger.setAttribute('aria-describedby', tokens.join(' '));
    }
  }

  private _removeAriaDescribedBy(): void {
    const trigger = this._triggerElement;
    if (!trigger) return;

    const current = (trigger.getAttribute('aria-describedby') ?? '').trim();
    if (current === '') return;

    const tokens = current
      .split(/\s+/)
      .filter((token) => token !== '' && token !== this._tooltipId);

    if (tokens.length === 0) {
      trigger.removeAttribute('aria-describedby');
      return;
    }

    trigger.setAttribute('aria-describedby', tokens.join(' '));
  }

  private _setupFloating(): void {
    const trigger = this._triggerElement;
    const tooltip = this._tooltipElement;
    if (!trigger || !tooltip) return;

    this._teardownFloating();
    this._cleanupAutoUpdate = autoUpdate(trigger, tooltip, () => {
      void this._positionTooltip();
    });
  }

  private _teardownFloating(): void {
    if (!this._cleanupAutoUpdate) return;
    this._cleanupAutoUpdate();
    this._cleanupAutoUpdate = null;
  }

  private async _positionTooltip(): Promise<void> {
    const trigger = this._triggerElement;
    const tooltip = this._tooltipElement;
    if (!trigger || !tooltip) return;

    const result = await computePosition(trigger, tooltip, {
      placement: this._resolvedPlacement,
      strategy: 'fixed',
      middleware: [applyOffset(this._resolvedOffset), flip({ padding: 8 }), shift({ padding: 8 })],
    });

    tooltip.style.left = `${String(Math.round(result.x))}px`;
    tooltip.style.top = `${String(Math.round(result.y))}px`;
  }

  private async _openTooltip(): Promise<void> {
    if (this._open || this._shouldSuppressTooltip()) return;

    this._open = true;
    await this.updateComplete;

    this._applyAriaDescribedBy();
    await this._positionTooltip();
    this._setupFloating();
  }

  private async _closeTooltip(): Promise<void> {
    if (!this._open) return;

    this._open = false;
    this._teardownFloating();
    this._removeAriaDescribedBy();
    await this.updateComplete;
  }

  override render(): TemplateResult {
    return html`
      <slot @slotchange="${this._onSlotChange}"></slot>
      <div
        id="${this._tooltipId}"
        class="tooltip"
        role="tooltip"
        aria-hidden="${String(!this._open)}"
        data-open="${String(this._open)}"
        data-variant="${this._resolvedVariant}"
      >
        ${this._isTextAvailable() ? this.text : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-tooltip': UiTooltip;
  }
}
