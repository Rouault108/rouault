import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import '../../../lib/icons';

export type EmptyStateVariant = 'default' | 'search' | 'error';

const VALID_VARIANTS = new Set<EmptyStateVariant>(['default', 'search', 'error']);
const FALLBACK_ICON = 'lucide:inbox';

const normalizeText = (value: string): string => value.replace(/\s+/g, ' ').trim();

@customElement('ui-empty-state')
export class EmptyState extends LitElement {
  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: var(--space-12, 48px);
      min-height: 320px;
      animation: empty-state-enter var(--duration-normal, 200ms) var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1))
        both;
    }

    [hidden] {
      display: none !important;
    }

    .container {
      display: flex;
      flex-direction: column;
      align-items: center;
      inline-size: 100%;
      text-align: center;
    }

    .illustration {
      display: block;
      margin-block-end: var(--space-4, 16px);
    }

    .illustration::slotted(*) {
      max-inline-size: min(100%, var(--empty-state-illustration-max-width, 320px));
      block-size: auto;
    }

    .icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      inline-size: var(--icon-xl, 32px);
      block-size: var(--icon-xl, 32px);
      margin-block-end: var(--space-4, 16px);
      color: var(--fg-muted, #6e7781);
    }

    .fallback-icon {
      inline-size: var(--icon-xl, 32px);
      block-size: var(--icon-xl, 32px);
      color: currentColor;
      stroke-width: 1.5px;
    }

    .icon::slotted([slot='icon']) {
      inline-size: var(--icon-xl, 32px);
      block-size: var(--icon-xl, 32px);
      color: currentColor;
      stroke-width: 1.5px;
    }

    .heading {
      margin: 0 0 var(--space-2, 8px);
      color: var(--fg-default, #111827);
      font-size: var(--text-lg, 16px);
      font-weight: var(--font-semibold, 600);
      line-height: var(--line-height-tight, 1.25);
    }

    .heading--standalone {
      margin-block-end: var(--space-6, 24px);
    }

    .heading::slotted([slot='heading']) {
      margin: 0;
      color: inherit;
      font-size: inherit;
      font-weight: inherit;
      line-height: inherit;
    }

    .description {
      margin: 0 0 var(--space-6, 24px);
      max-inline-size: 40ch;
      color: var(--fg-muted, #6e7781);
      font-size: var(--text-sm, 13px);
      font-weight: var(--font-normal, 400);
      line-height: var(--line-height-normal, 1.5);
    }

    .description::slotted([slot='description']) {
      margin: 0;
      color: inherit;
      font-size: inherit;
      font-weight: inherit;
      line-height: inherit;
    }

    .actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      gap: var(--space-3, 12px);
    }

    .actions::slotted([slot='action']) {
      margin: 0;
    }

    .container[data-variant='search'] .icon {
      color: var(--fg-subtle, #8b949e);
    }

    .container[data-variant='error'] .icon {
      color: var(--fg-danger, #b42318);
    }

    .container[data-variant='error'] .heading {
      color: var(--fg-danger, #b42318);
    }

    @keyframes empty-state-enter {
      from {
        opacity: 0;
        transform: translateY(var(--space-2, 8px));
      }

      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 768px) {
      :host {
        padding: var(--space-8, 32px);
        min-height: 240px;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      :host {
        animation: none;
      }
    }

    @media (forced-colors: active) {
      .icon {
        color: GrayText;
      }

      .container[data-variant='error'] .icon,
      .container[data-variant='error'] .heading {
        color: Highlight;
      }
    }

    @media print {
      :host {
        min-height: unset;
        padding: var(--space-4, 16px);
      }

      .icon,
      .actions {
        display: none !important;
      }
    }
  `;

  @property({ type: String, reflect: true })
  variant: EmptyStateVariant = 'default';

  @state()
  private _hasDescription = false;

  @state()
  private _hasActions = false;

  @state()
  private _hasIllustration = false;

  private _didWarnMissingHeading = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this._ensureHostSemantics();
  }

  override firstUpdated(): void {
    this._synchronizeAllSlots();
  }

  override updated(): void {
    this._ensureHostSemantics();
  }

  private get _resolvedVariant(): EmptyStateVariant {
    if (VALID_VARIANTS.has(this.variant)) return this.variant;
    return 'default';
  }

  private _ensureHostSemantics(): void {
    if (this.getAttribute('role') !== 'status') {
      this.setAttribute('role', 'status');
    }

    if (this.getAttribute('aria-atomic') !== 'true') {
      this.setAttribute('aria-atomic', 'true');
    }
  }

  private _synchronizeAllSlots(): void {
    const headingSlot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="heading"]');
    if (headingSlot) this._syncHeadingSlot(headingSlot);

    const descriptionSlot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="description"]');
    if (descriptionSlot) this._syncDescriptionSlot(descriptionSlot);

    const actionSlot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="action"]');
    if (actionSlot) this._syncActionSlot(actionSlot);

    const illustrationSlot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="illustration"]');
    if (illustrationSlot) this._syncIllustrationSlot(illustrationSlot);
  }

  private _hasAssignedElements(slot: HTMLSlotElement): boolean {
    return slot.assignedElements({ flatten: true }).length > 0;
  }

  private _readAssignedText(slot: HTMLSlotElement): string {
    const text = slot
      .assignedNodes({ flatten: true })
      .map((node) => node.textContent ?? '')
      .join(' ');

    return normalizeText(text);
  }

  private _syncHeadingSlot(slot: HTMLSlotElement): void {
    const headingText = this._readAssignedText(slot);

    if (headingText !== '') {
      this.setAttribute('aria-label', headingText);
      this._didWarnMissingHeading = false;
      return;
    }

    this.removeAttribute('aria-label');

    if (!this._didWarnMissingHeading) {
      this._didWarnMissingHeading = true;
      console.warn('[ui-empty-state]: slot="heading" is required for an accessible empty state.');
    }
  }

  private _syncDescriptionSlot(slot: HTMLSlotElement): void {
    this._hasDescription = this._readAssignedText(slot) !== '';
  }

  private _syncActionSlot(slot: HTMLSlotElement): void {
    const hasElements = this._hasAssignedElements(slot);
    const hasText = this._readAssignedText(slot) !== '';
    this._hasActions = hasElements || hasText;
  }

  private _syncIllustrationSlot(slot: HTMLSlotElement): void {
    this._hasIllustration = this._hasAssignedElements(slot);
  }

  private _onHeadingSlotChange = (event: Event): void => {
    const slot = event.currentTarget;
    if (!(slot instanceof HTMLSlotElement)) return;
    this._syncHeadingSlot(slot);
  };

  private _onDescriptionSlotChange = (event: Event): void => {
    const slot = event.currentTarget;
    if (!(slot instanceof HTMLSlotElement)) return;
    this._syncDescriptionSlot(slot);
  };

  private _onActionSlotChange = (event: Event): void => {
    const slot = event.currentTarget;
    if (!(slot instanceof HTMLSlotElement)) return;
    this._syncActionSlot(slot);
  };

  private _onIllustrationSlotChange = (event: Event): void => {
    const slot = event.currentTarget;
    if (!(slot instanceof HTMLSlotElement)) return;
    this._syncIllustrationSlot(slot);
  };

  override render() {
    return html`
      <section class="container" data-variant="${this._resolvedVariant}">
        <slot
          name="illustration"
          class="illustration"
          ?hidden="${!this._hasIllustration}"
          @slotchange="${this._onIllustrationSlotChange}"
        ></slot>

        <div class="icon" aria-hidden="true" ?hidden="${this._hasIllustration}">
          <slot name="icon">
            <iconify-icon class="fallback-icon" icon="${FALLBACK_ICON}"></iconify-icon>
          </slot>
        </div>

        <div class="heading ${this._hasDescription ? '' : 'heading--standalone'}">
          <slot name="heading" @slotchange="${this._onHeadingSlotChange}"></slot>
        </div>

        <div class="description" ?hidden="${!this._hasDescription}">
          <slot name="description" @slotchange="${this._onDescriptionSlotChange}"></slot>
        </div>

        <div class="actions" ?hidden="${!this._hasActions}">
          <slot name="action" @slotchange="${this._onActionSlotChange}"></slot>
        </div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-empty-state': EmptyState;
  }
}
