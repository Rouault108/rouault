import { css, html, LitElement, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../../../lib/icons';

export type BannerVariant = 'info' | 'warning' | 'error' | 'success';
type BannerRole = 'status' | 'alert';

interface BannerVariantConfig {
  readonly icon: string;
  readonly role: BannerRole;
}

const VALID_VARIANTS = new Set<BannerVariant>(['info', 'warning', 'error', 'success']);
const DISMISS_LABEL = '通知を閉じる';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

const VARIANT_CONFIG: Record<BannerVariant, BannerVariantConfig> = {
  info: {
    icon: 'lucide:info',
    role: 'status',
  },
  warning: {
    icon: 'lucide:triangle-alert',
    role: 'status',
  },
  error: {
    icon: 'lucide:circle-x',
    role: 'alert',
  },
  success: {
    icon: 'lucide:circle-check',
    role: 'status',
  },
};

const normalizeText = (value: string): string => value.replace(/\s+/g, ' ').trim();

@customElement('ui-banner')
export class Banner extends LitElement {
  static override get observedAttributes(): string[] {
    const base = super.observedAttributes;
    if (base.includes('role')) return base;
    return [...base, 'role'];
  }

  static override styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: var(--space-3, 12px);
      width: 100%;
      box-sizing: border-box;
      padding: var(--space-3, 12px) var(--space-4, 16px);
      min-height: var(--control-min-touch, 44px);
      border-bottom: 2px solid transparent;
      background: var(--bg-tip-subtle, oklch(96% 0.04 250));
      border-bottom-color: var(--primary, oklch(55% 0.2 250));
      color: var(--fg-info, var(--primary, oklch(55% 0.2 250)));
      animation: banner-enter var(--duration-normal, 150ms) var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1)) both;
    }

    :host([data-resolved-variant='info']) {
      background: var(--bg-tip-subtle, oklch(96% 0.04 250));
      border-bottom-color: var(--primary, oklch(55% 0.2 250));
      color: var(--fg-info, var(--primary, oklch(55% 0.2 250)));
    }

    :host([data-resolved-variant='success']) {
      background: var(--bg-success-subtle, oklch(96% 0.04 145));
      border-bottom-color: var(--success, oklch(55% 0.18 145));
      color: var(--fg-success, oklch(55% 0.18 145));
    }

    :host([data-resolved-variant='warning']) {
      background: var(--bg-warning-subtle, oklch(96% 0.04 85));
      border-bottom-color: var(--border-warning, oklch(72% 0.15 85));
      color: var(--fg-warning, oklch(55% 0.16 85));
    }

    :host([data-resolved-variant='error']) {
      background: var(--bg-danger-subtle, oklch(96% 0.03 25));
      border-bottom-color: var(--border-danger, oklch(62% 0.2 25));
      color: var(--fg-danger, oklch(55% 0.2 25));
    }

    .icon {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--icon-base, 16px);
      height: var(--icon-base, 16px);
      color: inherit;
    }

    .fallback-icon {
      width: var(--icon-base, 16px);
      height: var(--icon-base, 16px);
      color: currentColor;
      stroke-width: 1.5;
    }

    .icon slot::slotted([slot='icon']) {
      width: var(--icon-base, 16px);
      height: var(--icon-base, 16px);
      color: currentColor;
      stroke-width: 1.5;
    }

    .message {
      flex: 1;
      min-width: 0;
      font-size: var(--text-sm, 13px);
      font-weight: var(--font-medium, 500);
      line-height: var(--line-height-normal, 1.5);
      color: inherit;
    }

    .message slot::slotted(*) {
      margin: 0;
    }

    .actions {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: var(--space-2, 8px);
    }

    .actions slot::slotted([slot='action']) {
      margin: 0;
    }

    .actions[hidden] {
      display: none !important;
    }

    .dismiss {
      flex-shrink: 0;
      width: var(--control-height-sm, 24px);
      height: var(--control-height-sm, 24px);
      padding: 0;
      border: none;
      border-radius: var(--radius-sm, 4px);
      background: transparent;
      color: inherit;
      cursor: pointer;
      position: relative;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1));
    }

    .dismiss::after {
      content: '';
      position: absolute;
      inset: calc((var(--control-min-touch, 44px) - var(--control-height-sm, 24px)) / -2);
    }

    .dismiss:hover {
      background: var(--bg-hover, oklch(from var(--fg-default, oklch(20% 0.03 250)) l c h / 0.06));
    }

    .dismiss:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, var(--primary, oklch(55% 0.2 250)));
      outline-offset: var(--focus-ring-offset, 2px);
    }

    .dismiss-icon {
      width: var(--icon-sm, 14px);
      height: var(--icon-sm, 14px);
      color: currentColor;
      stroke-width: 1.5;
    }

    @keyframes banner-enter {
      from {
        opacity: 0;
        transform: translateY(-100%);
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes banner-exit {
      from {
        opacity: 1;
        max-height: 100px;
        padding-top: var(--space-3, 12px);
        padding-bottom: var(--space-3, 12px);
      }

      to {
        opacity: 0;
        max-height: 0;
        padding-top: 0;
        padding-bottom: 0;
      }
    }

    :host([data-dismissing]) {
      animation: banner-exit var(--duration-fast, 70ms) var(--ease-in, cubic-bezier(0.32, 0, 0.67, 1)) both;
      overflow: hidden;
    }

    @media (prefers-reduced-motion: reduce) {
      :host {
        animation: none;
      }

      :host([data-dismissing]) {
        animation: none;
        display: none;
      }
    }

    @media (forced-colors: active) {
      :host {
        border: 1px solid CanvasText;
        border-bottom-width: 2px;
      }

      .icon {
        color: GrayText;
      }

      :host([data-resolved-variant='error']) .icon,
      :host([data-resolved-variant='error']) .message {
        color: Highlight;
      }

      .dismiss {
        border: 1px solid ButtonText;
      }
    }

    @media print {
      :host([data-resolved-variant='info']),
      :host([data-resolved-variant='success']),
      :host([data-resolved-variant='warning']) {
        display: none !important;
      }

      :host([data-resolved-variant='error']) {
        background: none;
        border: none;
        padding: var(--space-2, 8px) 0;
        min-height: unset;
        animation: none;
      }

      :host([data-resolved-variant='error']) .icon,
      :host([data-resolved-variant='error']) .dismiss {
        display: none !important;
      }
    }
  `;

  @property({ type: String, reflect: true })
  variant: BannerVariant = 'info';

  @property({ type: Boolean, reflect: true })
  dismissible = false;

  @state()
  private _hasActions = false;

  private _roleExplicitlySet = false;
  private _isApplyingRoleAttribute = false;
  private _dismissInProgress = false;
  private _dismissFallbackTimer: number | null = null;
  private _dismissFocusTarget: HTMLElement | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this._syncResolvedVariantAttribute();
    this._ensureAtomic();

    if (this.getAttribute('role') !== null) {
      this._roleExplicitlySet = true;
    } else {
      this._applyAutoRole();
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._dismissFallbackTimer !== null) {
      window.clearTimeout(this._dismissFallbackTimer);
      this._dismissFallbackTimer = null;
    }
  }

  override firstUpdated(): void {
    this._syncActionSlotState();
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    super.attributeChangedCallback(name, old, value);
    if (name !== 'role' || old === value || this._isApplyingRoleAttribute) return;

    if (value === null) {
      this._roleExplicitlySet = false;
      this._applyAutoRole();
      return;
    }

    this._roleExplicitlySet = true;
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    this._ensureAtomic();
    this._syncResolvedVariantAttribute();

    if (changedProperties.has('variant') && !this._roleExplicitlySet) {
      this._applyAutoRole();
    }
  }

  private get _resolvedVariant(): BannerVariant {
    if (VALID_VARIANTS.has(this.variant)) return this.variant;
    return 'info';
  }

  private _ensureAtomic(): void {
    if (this.getAttribute('aria-atomic') === 'true') return;
    this.setAttribute('aria-atomic', 'true');
  }

  private _syncResolvedVariantAttribute(): void {
    const resolved = this._resolvedVariant;
    if (this.getAttribute('data-resolved-variant') === resolved) return;
    this.setAttribute('data-resolved-variant', resolved);
  }

  private _applyAutoRole(): void {
    const expectedRole = VARIANT_CONFIG[this._resolvedVariant].role;
    if (this.getAttribute('role') === expectedRole) return;

    this._isApplyingRoleAttribute = true;
    this.setAttribute('role', expectedRole);
    this._isApplyingRoleAttribute = false;
  }

  private _syncActionSlotState(): void {
    const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="action"]');
    if (!slot) return;
    this._syncActionSlot(slot);
  }

  private _syncActionSlot(slot: HTMLSlotElement): void {
    const hasElements = slot.assignedElements({ flatten: true }).length > 0;
    const hasText =
      normalizeText(
        slot
          .assignedNodes({ flatten: true })
          .map((node) => node.textContent ?? '')
          .join(' '),
      ) !== '';

    this._hasActions = hasElements || hasText;
  }

  private _onActionSlotChange = (event: Event): void => {
    const slot = event.currentTarget;
    if (!(slot instanceof HTMLSlotElement)) return;
    this._syncActionSlot(slot);
  };

  private _findFocusableWithin(root: Element | null): HTMLElement | null {
    if (!root) return null;
    if (root instanceof HTMLElement && root.matches(FOCUSABLE_SELECTOR)) return root;
    return root.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
  }

  private _resolveFocusTargetAfterDismiss(): HTMLElement | null {
    const siblingTarget = this._findFocusableWithin(this.nextElementSibling);
    if (siblingTarget) return siblingTarget;

    const mainTarget = this.ownerDocument.querySelector<HTMLElement>(`main ${FOCUSABLE_SELECTOR}`);
    if (mainTarget) return mainTarget;

    return this.ownerDocument.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
  }

  private _finalizeDismiss(): void {
    if (!this._dismissInProgress) return;
    this._dismissInProgress = false;

    if (this._dismissFallbackTimer !== null) {
      window.clearTimeout(this._dismissFallbackTimer);
      this._dismissFallbackTimer = null;
    }

    const focusTarget = this._dismissFocusTarget;
    this._dismissFocusTarget = null;
    this.remove();
    focusTarget?.focus();
  }

  private _onDismissAnimationEnd = (event: AnimationEvent): void => {
    if (event.target !== this) return;
    this._finalizeDismiss();
  };

  private _onDismissClick = (): void => {
    if (this._dismissInProgress) return;

    this._dismissInProgress = true;
    this._dismissFocusTarget = this._resolveFocusTargetAfterDismiss();

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      this._finalizeDismiss();
      return;
    }

    this.addEventListener('animationend', this._onDismissAnimationEnd, { once: true });
    this.setAttribute('data-dismissing', '');
    this._dismissFallbackTimer = window.setTimeout(() => {
      this._finalizeDismiss();
    }, 220);
  };

  override render() {
    const resolvedVariant = this._resolvedVariant;

    return html`
      <span class="icon" aria-hidden="true">
        <slot name="icon">
          <iconify-icon class="fallback-icon" icon="${VARIANT_CONFIG[resolvedVariant].icon}" aria-hidden="true"></iconify-icon>
        </slot>
      </span>

      <div class="message">
        <slot></slot>
      </div>

      <div class="actions" ?hidden="${!this._hasActions}">
        <slot name="action" @slotchange="${this._onActionSlotChange}"></slot>
      </div>

      ${this.dismissible
        ? html`
            <button class="dismiss" type="button" aria-label="${DISMISS_LABEL}" @click="${this._onDismissClick}">
              <iconify-icon class="dismiss-icon" icon="lucide:x" aria-hidden="true"></iconify-icon>
            </button>
          `
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-banner': Banner;
  }
}
