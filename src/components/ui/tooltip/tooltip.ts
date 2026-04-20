import { type Placement } from '@floating-ui/dom';
import { css, html, LitElement, type PropertyValues, type TemplateResult } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { AnchoredOverlayController } from '../overlay/internal/anchored-overlay-controller.js';

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
const DOCUMENT_STYLE_ID = 'ui-tooltip-document-styles';
const HIT_SLOP = 10;

export const DOCUMENT_CSS = `
[data-ui-tooltip-content] {
  position: fixed;
  left: 0;
  top: 0;
  right: auto;
  bottom: auto;
  margin: 0;
  padding: 0;
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  max-inline-size: min(42ch, calc(100vw - var(--space-4, 16px)));
  z-index: var(--z-anchored-overlay, var(--z-popover, 400));
  pointer-events: auto;
  opacity: 0;
  visibility: hidden;
  transform: translateY(2px);
  transition:
    opacity var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
    transform var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)),
    visibility var(--duration-fast, 70ms) linear;
}

[data-ui-tooltip-content][data-open='true'] {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

[data-ui-tooltip-hit-area] {
  position: absolute;
  inset: 0;
}

[data-ui-tooltip-content][data-side='top'] [data-ui-tooltip-hit-area] {
  bottom: calc(-1 * var(--_tooltip-hit-slop, 10px));
}

[data-ui-tooltip-content][data-side='right'] [data-ui-tooltip-hit-area] {
  left: calc(-1 * var(--_tooltip-hit-slop, 10px));
}

[data-ui-tooltip-content][data-side='bottom'] [data-ui-tooltip-hit-area] {
  top: calc(-1 * var(--_tooltip-hit-slop, 10px));
}

[data-ui-tooltip-content][data-side='left'] [data-ui-tooltip-hit-area] {
  right: calc(-1 * var(--_tooltip-hit-slop, 10px));
}

[data-ui-tooltip-surface] {
  position: relative;
  margin: 0;
  max-inline-size: min(42ch, calc(100vw - var(--space-4, 16px)));
  padding: var(--space-1, 4px) var(--space-2, 8px);
  border: var(--border-width, 1px) solid var(--_tooltip-border, var(--border-default, oklch(20% 0 0 / 0.12)));
  border-radius: var(--radius-sm, 4px);
  background: var(--_tooltip-bg, var(--bg-surface-2, oklch(100% 0 0)));
  color: var(--_tooltip-fg, var(--fg-default, oklch(20% 0 0)));
  box-shadow: var(--_tooltip-shadow, var(--elevation-lg, 0 8px 24px oklch(0% 0 0 / 0.12)));
  font-size: var(--text-xs, 12px);
  font-weight: var(--font-medium, 500);
  letter-spacing: var(--tracking-wide, 0.025em);
  line-height: var(--line-height-normal, 1.5);
  white-space: normal;
  overflow-wrap: anywhere;
}

[data-ui-tooltip-content][data-variant='subtle'] {
  --_tooltip-bg: var(--bg-fill-muted, oklch(96% 0 0));
  --_tooltip-fg: var(--fg-muted, oklch(45% 0 0));
  --_tooltip-border: var(--border-ghost, oklch(20% 0 0 / 0.04));
  --_tooltip-shadow: var(--elevation-md, 0 4px 8px oklch(0% 0 0 / 0.08));
}

[data-ui-tooltip-content][data-variant='inverse'] {
  --_tooltip-bg: var(--fg-default, oklch(20% 0 0));
  --_tooltip-fg: var(--bg-default, oklch(98% 0.01 250));
  --_tooltip-border: var(--fg-muted, oklch(45% 0 0));
  --_tooltip-shadow: var(--elevation-lg, 0 8px 24px oklch(0% 0 0 / 0.12));
}

@media (prefers-reduced-motion: reduce) {
  [data-ui-tooltip-content],
  [data-ui-tooltip-content][data-open='true'] {
    transition-duration: var(--duration-instant, 0ms);
  }
}

@media (forced-colors: active) {
  [data-ui-tooltip-content] {
    background: Canvas;
    color: CanvasText;
    border-color: CanvasText;
    box-shadow: none;
  }
}

@media print {
  [data-ui-tooltip-content] {
    display: none !important;
  }
}
`;

const toNonNegativeFiniteNumber = (value: number, fallback: number): number => {
  if (!Number.isFinite(value)) return fallback;
  if (value < 0) return 0;
  return value;
};

const getPlacementSide = (placement: Placement): 'top' | 'right' | 'bottom' | 'left' => {
  const [side] = placement.split('-');
  if (side === 'right' || side === 'bottom' || side === 'left') {
    return side;
  }
  return 'top';
};

@customElement('ui-tooltip')
export class UiTooltip extends LitElement {
  static override styles = css`
    :host {
      min-inline-size: 0;
      max-inline-size: 100%;
      vertical-align: middle;
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

  private readonly _tooltipId = `ui-tooltip-${Math.random().toString(36).slice(2, 11)}`;

  private _triggerElement: HTMLElement | null = null;
  private _tooltipElement: HTMLElement | null = null;
  private _tooltipSurfaceElement: HTMLElement | null = null;
  private _overlayController: AnchoredOverlayController | null = null;
  private _openTimer: ReturnType<typeof setTimeout> | null = null;
  private _closeTimer: ReturnType<typeof setTimeout> | null = null;
  private _hoveringTrigger = false;
  private _hoveringTooltip = false;
  private _focusWithinTrigger = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.dataset['tooltipId'] = this._tooltipId;
    this._injectDocumentStyles();
    this._syncTriggerElement();
    void this.updateComplete.then(() => {
      if (!this.isConnected) return;
      this._syncTriggerElement();
    });
    this.addEventListener('keydown', this._onKeyDown as EventListener);
  }

  override disconnectedCallback(): void {
    this.removeEventListener('keydown', this._onKeyDown as EventListener);
    this._clearTimers();
    this._teardownFloating();
    this._detachTriggerListeners(this._triggerElement);
    this._removeAriaDescribedBy();
    this._open = false;
    this._hoveringTrigger = false;
    this._hoveringTooltip = false;
    this._focusWithinTrigger = false;
    this._triggerElement = null;
    this._destroyTooltipElement();
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

    if (changedProperties.has('disabled') || changedProperties.has('text')) {
      if (this._shouldSuppressTooltip()) {
        this._hoveringTrigger = false;
        this._hoveringTooltip = false;
        this._focusWithinTrigger = false;
        this._clearTimers();
        this._open = false;
      }
    }
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    this._syncTooltipElement();

    if (changedProperties.has('disabled') || changedProperties.has('text')) {
      if (this._shouldSuppressTooltip()) {
        this._removeAriaDescribedBy();
        this._destroyTooltipElement();
        return;
      }
    }

    if ((changedProperties.has('placement') || changedProperties.has('offset')) && this._open) {
      void this._overlayController?.refreshPosition();
    }
  }

  getTriggerElement(): HTMLElement | null {
    return this._triggerElement;
  }

  getTooltipElement(): HTMLElement | null {
    return this._tooltipElement;
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

  private _injectDocumentStyles(): void {
    if (typeof document === 'undefined') return;
    if (document.getElementById(DOCUMENT_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = DOCUMENT_STYLE_ID;
    style.textContent = DOCUMENT_CSS;
    document.head.append(style);
  }

  private _ensureTooltipElement(): void {
    if (typeof document === 'undefined') return;
    if (this._tooltipElement) return;

    const tooltip = document.createElement('div');
    const hitArea = document.createElement('div');
    const surface = document.createElement('div');
    tooltip.id = this._tooltipId;
    tooltip.setAttribute('role', 'tooltip');
    tooltip.setAttribute('aria-hidden', 'true');
    tooltip.setAttribute('data-ui-tooltip-content', '');
    tooltip.setAttribute('data-ui-overlay-surface', 'tooltip');
    tooltip.dataset['open'] = 'false';
    tooltip.dataset['side'] = getPlacementSide(this._resolvedPlacement);
    tooltip.dataset['variant'] = this._resolvedVariant;
    tooltip.style.setProperty('--_tooltip-hit-slop', `${String(HIT_SLOP)}px`);
    hitArea.setAttribute('data-ui-tooltip-hit-area', '');
    hitArea.setAttribute('aria-hidden', 'true');
    surface.setAttribute('data-ui-tooltip-surface', '');
    tooltip.append(hitArea, surface);
    tooltip.addEventListener('mouseenter', this._onTooltipMouseEnter);
    tooltip.addEventListener('mouseleave', this._onTooltipMouseLeave);
    document.body.append(tooltip);
    this._tooltipElement = tooltip;
    this._tooltipSurfaceElement = surface;
    this._syncTooltipElement();
  }

  private _destroyTooltipElement(): void {
    if (!this._tooltipElement) return;
    this._teardownFloating();
    this._tooltipElement.removeEventListener('mouseenter', this._onTooltipMouseEnter);
    this._tooltipElement.removeEventListener('mouseleave', this._onTooltipMouseLeave);
    this._tooltipElement.remove();
    this._tooltipElement = null;
    this._tooltipSurfaceElement = null;
  }

  private _syncTooltipElement(): void {
    const tooltip = this._tooltipElement;
    const surface = this._tooltipSurfaceElement;
    if (!tooltip || !surface) return;

    surface.textContent = this._isTextAvailable() ? this.text : '';
    tooltip.dataset['side'] = getPlacementSide(this._resolvedPlacement);
    tooltip.dataset['variant'] = this._resolvedVariant;
    tooltip.dataset['open'] = String(this._open);
    tooltip.setAttribute('aria-hidden', String(!this._open));
  }

  private _isTextAvailable(): boolean {
    return this.text.trim() !== '';
  }

  private _shouldSuppressTooltip(): boolean {
    return this.disabled || !this._isTextAvailable() || this._triggerElement === null;
  }

  private _syncTriggerElement(): void {
    const slot = this._slotElement;
    const firstElement = slot?.assignedElements({ flatten: true })[0] ?? this.firstElementChild;
    const nextTrigger = firstElement instanceof HTMLElement ? firstElement : null;

    if (nextTrigger === this._triggerElement) return;

    this._detachTriggerListeners(this._triggerElement);
    this._triggerElement = nextTrigger;
    this._attachTriggerListeners(this._triggerElement);

    if (this._triggerElement === null) {
      this._hoveringTrigger = false;
      this._hoveringTooltip = false;
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

  private _onTriggerMouseLeave = (event: MouseEvent): void => {
    this._hoveringTrigger = false;
    if (this._isTooltipTarget(event.relatedTarget)) {
      this._hoveringTooltip = true;
    }
    this._scheduleClose();
  };

  private _onTooltipMouseEnter = (): void => {
    this._hoveringTooltip = true;
    this._scheduleOpen();
  };

  private _onTooltipMouseLeave = (event: MouseEvent): void => {
    this._hoveringTooltip = false;
    if (this._isTriggerTarget(event.relatedTarget)) {
      this._hoveringTrigger = true;
    }
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
    this._hoveringTooltip = false;
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
      void this._overlayController?.refreshPosition();
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
    if (this._hoveringTrigger || this._hoveringTooltip || this._focusWithinTrigger) return;

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

  private _ensureOverlayController(): AnchoredOverlayController {
    if (this._overlayController !== null) {
      return this._overlayController;
    }

    this._overlayController = new AnchoredOverlayController({
      ownerDocument: this.ownerDocument,
      getReference: () => this._triggerElement,
      getFloating: () => this._tooltipElement,
      getOpen: () => this._open,
      getPlacement: () => this._resolvedPlacement,
      getOffset: () => this._resolvedOffset,
      outsidePointerDismiss: false,
      escapeDismiss: false,
      scrollStrategy: 'ignore',
      onPosition: ({ placement }) => {
        if (this._tooltipElement) {
          this._tooltipElement.dataset['side'] = getPlacementSide(placement);
        }
      },
    });

    return this._overlayController;
  }

  private _setupFloating(): void {
    this._ensureOverlayController().syncOpenState(true);
  }

  private _teardownFloating(): void {
    this._overlayController?.syncOpenState(false);
  }

  private async _openTooltip(): Promise<void> {
    if (this._open || this._shouldSuppressTooltip()) return;

    this._ensureTooltipElement();
    this._open = true;
    await this.updateComplete;

    this._syncTooltipElement();
    this._applyAriaDescribedBy();
    this._setupFloating();
  }

  private async _closeTooltip(): Promise<void> {
    if (!this._open) return;

    this._open = false;
    this._hoveringTooltip = false;
    this._teardownFloating();
    this._removeAriaDescribedBy();
    this._syncTooltipElement();
    await this.updateComplete;
    this._destroyTooltipElement();
  }

  private _isTooltipTarget(target: EventTarget | null): boolean {
    return target instanceof Node && this._tooltipElement?.contains(target) === true;
  }

  private _isTriggerTarget(target: EventTarget | null): boolean {
    return target instanceof Node && this._triggerElement?.contains(target) === true;
  }

  override render(): TemplateResult {
    return html` <slot @slotchange=${this._onSlotChange}></slot> `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-tooltip': UiTooltip;
  }
}
