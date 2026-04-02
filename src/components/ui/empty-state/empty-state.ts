import { css, html, LitElement } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import '../icon/icon.js';

export type EmptyStateVariant = 'default' | 'search' | 'error';
export type EmptyStateAnnounce = 'off' | 'polite';

const VALID_VARIANTS = new Set<EmptyStateVariant>(['default', 'search', 'error']);
const VALID_ANNOUNCE_VALUES = new Set<EmptyStateAnnounce>(['off', 'polite']);

const normalizeText = (value: string): string => value.replace(/\s+/g, ' ').trim();

const normalizeVariant = (value: string): EmptyStateVariant =>
  VALID_VARIANTS.has(value as EmptyStateVariant) ? (value as EmptyStateVariant) : 'default';

const normalizeAnnounce = (value: string): EmptyStateAnnounce =>
  VALID_ANNOUNCE_VALUES.has(value as EmptyStateAnnounce) ? (value as EmptyStateAnnounce) : 'off';

let emptyStateId = 0;

@customElement('ui-empty-state')
export class EmptyState extends LitElement {
  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      animation: empty-state-enter var(--duration-normal, 200ms)
        var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1)) both;
    }

    [hidden] {
      display: none !important;
    }

    .container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--space-4, 16px);
      inline-size: 100%;
      text-align: center;
    }

    .message {
      display: flex;
      flex-direction: column;
      align-items: center;
      inline-size: min(100%, 40ch);
      text-align: center;
    }

    .illustration {
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
      color: var(--fg-muted, oklch(45% 0 0));
    }

    .icon::slotted(*) {
      inline-size: var(--icon-xl, 32px);
      block-size: var(--icon-xl, 32px);
      font-size: var(--icon-lg, 24px);
      line-height: 1;
      color: currentColor;
    }

    .heading {
      margin: 0 0 var(--space-2, 8px);
      color: var(--fg-default, #111827);
      font-size: var(--text-lg, 16px);
      font-weight: var(--font-semibold, 600);
      line-height: var(--line-height-tight, 1.25);
    }

    .heading::slotted(*) {
      margin: 0;
      color: inherit;
      font-size: inherit;
      font-weight: inherit;
      line-height: inherit;
    }

    .description {
      margin: 0;
      color: var(--fg-muted, #6e7781);
      font-size: var(--text-sm, 13px);
      font-weight: var(--font-normal, 400);
      line-height: var(--line-height-normal, 1.5);
    }

    .description::slotted(*) {
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

    .actions::slotted(*) {
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

    @media (prefers-reduced-motion: reduce) {
      :host {
        animation-duration: 0.01ms;
        animation-iteration-count: 1;
      }
    }

    @media (forced-colors: active) {
      .icon {
        color: GrayText;
      }

      .container[data-variant='error'] .icon,
      .container[data-variant='error'] .heading {
        color: CanvasText;
      }
    }

    @media print {
      .icon,
      .illustration {
        display: none !important;
      }

      .actions::slotted(button),
      .actions::slotted([role='button']),
      .actions::slotted(ui-button) {
        display: none !important;
      }
    }
  `;

  private _variant: EmptyStateVariant = 'default';
  private _announce: EmptyStateAnnounce = 'off';
  private _didWarnMissingHeading = false;
  private readonly _instanceId = ++emptyStateId;
  private readonly _headingId = `empty-state-heading-${String(this._instanceId)}`;
  private readonly _descriptionId = `empty-state-description-${String(this._instanceId)}`;

  @state()
  private _hasDescription = false;

  @state()
  private _hasAction = false;

  @state()
  private _hasIllustration = false;

  @state()
  private _hasIcon = false;

  @property({ type: String, reflect: true })
  get variant(): EmptyStateVariant {
    return this._variant;
  }

  set variant(value: string) {
    const normalized = normalizeVariant(value);
    const previous = this._variant;
    if (previous === normalized && value === normalized) {
      return;
    }

    this._variant = normalized;
    this.requestUpdate('variant', previous);
  }

  @property({ type: String, reflect: true })
  get announce(): EmptyStateAnnounce {
    return this._announce;
  }

  set announce(value: string) {
    const normalized = normalizeAnnounce(value);
    const previous = this._announce;
    if (previous === normalized && value === normalized) {
      return;
    }

    this._announce = normalized;
    this.requestUpdate('announce', previous);
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
      this._didWarnMissingHeading = false;
      return;
    }

    if (!this._didWarnMissingHeading) {
      this._didWarnMissingHeading = true;
      console.warn('[ui-empty-state]: slot="heading" is required for an accessible empty state.');
    }
  }

  private _syncDescriptionSlot(slot: HTMLSlotElement): void {
    this._hasDescription = this._readAssignedText(slot) !== '';
  }

  private _syncActionSlot(slot: HTMLSlotElement): void {
    this._hasAction = this._hasAssignedElements(slot);
  }

  private _syncIllustrationSlot(slot: HTMLSlotElement): void {
    this._hasIllustration = this._hasAssignedElements(slot);
  }

  private _syncIconSlot(slot: HTMLSlotElement): void {
    this._hasIcon = this._hasAssignedElements(slot);
  }

  private _onHeadingSlotChange = (event: Event): void => {
    const slot = event.currentTarget;
    if (!(slot instanceof HTMLSlotElement)) {
      return;
    }

    this._syncHeadingSlot(slot);
  };

  private _onDescriptionSlotChange = (event: Event): void => {
    const slot = event.currentTarget;
    if (!(slot instanceof HTMLSlotElement)) {
      return;
    }

    this._syncDescriptionSlot(slot);
  };

  private _onActionSlotChange = (event: Event): void => {
    const slot = event.currentTarget;
    if (!(slot instanceof HTMLSlotElement)) {
      return;
    }

    this._syncActionSlot(slot);
  };

  private _onIllustrationSlotChange = (event: Event): void => {
    const slot = event.currentTarget;
    if (!(slot instanceof HTMLSlotElement)) {
      return;
    }

    this._syncIllustrationSlot(slot);
  };

  private _onIconSlotChange = (event: Event): void => {
    const slot = event.currentTarget;
    if (!(slot instanceof HTMLSlotElement)) {
      return;
    }

    this._syncIconSlot(slot);
  };

  override render() {
    const politeAnnouncement = this.announce === 'polite';
    const showIllustration = this._hasIllustration;
    const showIcon = !showIllustration && this._hasIcon;

    return html`
      <section class="container" data-variant="${this.variant}">
        <div
          class="message"
          data-announce="${this.announce}"
          role=${ifDefined(politeAnnouncement ? 'status' : undefined)}
          aria-live=${ifDefined(politeAnnouncement ? 'polite' : undefined)}
          aria-atomic=${ifDefined(politeAnnouncement ? 'true' : undefined)}
        >
          <div class="illustration" aria-hidden="true" ?hidden=${!showIllustration}>
            <slot name="illustration" @slotchange=${this._onIllustrationSlotChange}></slot>
          </div>

          <div class="icon" aria-hidden="true" ?hidden=${!showIcon}>
            <slot name="icon" @slotchange=${this._onIconSlotChange}></slot>
          </div>

          <div class="heading" id="${this._headingId}">
            <slot name="heading" @slotchange=${this._onHeadingSlotChange}></slot>
          </div>

          <div class="description" id="${this._descriptionId}" ?hidden=${!this._hasDescription}>
            <slot name="description" @slotchange=${this._onDescriptionSlotChange}></slot>
          </div>
        </div>

        ${this._hasAction
          ? html`
              <div class="actions" aria-labelledby="${this._headingId}">
                <slot name="action" @slotchange=${this._onActionSlotChange}></slot>
              </div>
            `
          : html`<slot name="action" @slotchange=${this._onActionSlotChange} hidden></slot>`}
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-empty-state': EmptyState;
  }
}
