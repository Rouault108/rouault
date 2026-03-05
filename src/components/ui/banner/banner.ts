import { css, html, LitElement, nothing, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../../../lib/icons';
import '../button/button';

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
    role: 'alert',
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
      gap: var(--space-3);
      width: 100%;
      box-sizing: border-box;
      padding: var(--space-3) var(--space-4);
      min-height: var(--control-min-touch);
      border-bottom: var(--border-width-thick) solid transparent;
      background: var(--bg-tip-subtle);
      border-bottom-color: var(--primary);
      color: var(--fg-info);
      animation: banner-enter var(--duration-normal) var(--ease-out) both;
    }

    :host([data-resolved-variant='info']) {
      background: var(--bg-tip-subtle);
      border-bottom-color: var(--primary);
      color: var(--fg-info);
    }

    :host([data-resolved-variant='success']) {
      background: var(--bg-success-subtle);
      border-bottom-color: var(--success);
      color: var(--fg-success);
    }

    :host([data-resolved-variant='warning']) {
      background: var(--bg-warning-subtle);
      border-bottom-color: var(--border-warning);
      color: var(--fg-warning);
    }

    :host([data-resolved-variant='error']) {
      background: var(--bg-danger-subtle);
      border-bottom-color: var(--border-danger);
      color: var(--fg-danger);
    }

    .icon {
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--icon-base);
      height: var(--icon-base);
      color: inherit;
    }

    .fallback-icon {
      width: var(--icon-base);
      height: var(--icon-base);
      color: currentColor;
      stroke-width: 1.5;
    }

    .icon slot::slotted([slot='icon']) {
      width: var(--icon-base);
      height: var(--icon-base);
      color: currentColor;
      stroke-width: 1.5;
    }

    .message {
      flex: 1;
      min-width: 0;
      font-size: var(--text-sm);
      font-weight: var(--font-medium);
      line-height: var(--line-height-normal);
      color: inherit;
    }

    .message slot::slotted(*) {
      margin: 0;
    }

    .actions {
      flex-shrink: 0;
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .actions slot::slotted([slot='action']) {
      margin: 0;
    }

    .actions[hidden] {
      display: none !important;
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
        max-height: var(--ui-banner-exit-height);
        padding-top: var(--space-3);
        padding-bottom: var(--space-3);
      }

      to {
        opacity: 0;
        max-height: 0;
        padding-top: 0;
        padding-bottom: 0;
      }
    }

    :host([data-dismissing]) {
      animation: banner-exit var(--duration-fast) var(--ease-in) both;
      overflow: hidden;
    }

    @media (prefers-reduced-motion: reduce) {
      :host {
        animation: none;
      }

      :host([data-dismissing]) {
        animation: none;
      }
    }

    @media (forced-colors: active) {
      :host {
        border: 1px solid CanvasText;
        border-bottom-width: var(--border-width-thick);
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
      :host {
        background: none;
        color: var(--fg-default);
        border: var(--border-width) solid var(--border-default);
        border-bottom-width: var(--border-width-thick);
        padding: var(--space-2) 0;
        min-height: unset;
        animation: none;
      }

      .icon,
      .actions,
      .dismiss {
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
    if (this.getAttribute('aria-atomic') !== null) return;
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

    this.style.setProperty('--ui-banner-exit-height', `${String(this.scrollHeight)}px`);
    this.addEventListener('animationend', this._onDismissAnimationEnd, { once: true });
    this.setAttribute('data-dismissing', '');

    const durationText = getComputedStyle(this).animationDuration;
    const durationMs = durationText
      .split(',')
      .map((value) => value.trim())
      .map((value) => {
        if (value.endsWith('ms')) return Number.parseFloat(value);
        if (value.endsWith('s')) return Number.parseFloat(value) * 1000;
        return 0;
      })
      .reduce((max, value) => Math.max(max, Number.isFinite(value) ? value : 0), 0);

    this._dismissFallbackTimer = window.setTimeout(() => {
      this._finalizeDismiss();
    }, Math.max(durationMs + 50, 100));
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
            <ui-button
              type="button"
              variant="ghost"
              size="sm"
              icon-only
              aria-label="${DISMISS_LABEL}"
              @click="${this._onDismissClick}"
            >
              <iconify-icon class="dismiss-icon" icon="lucide:x" aria-hidden="true"></iconify-icon>
            </ui-button>
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
