import { css, html, LitElement, nothing, type PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import '../../../lib/icons';

const CLOSE_BUTTON_LABEL = '閉じる';
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface UiDialogOpenedDetail {
  trigger: HTMLElement | null;
}

@customElement('ui-dialog')
export class UiDialog extends LitElement {
  static override styles = css`
    :host {
      display: block;
      --ui-dialog-min-width: min(300px, 90vw);
      --ui-dialog-max-width: min(600px, 90vw);
      --ui-dialog-max-height: min(80vh, 800px);
      --ui-dialog-edge-highlight: oklch(100% 0 0 / 0.08);
    }

    dialog {
      box-sizing: border-box;
      margin: auto;
      padding: 0;
      border: var(--border-width, 1px) solid transparent;
      border-radius: var(--radius-xl, 12px);
      inline-size: var(--ui-dialog-max-width);
      min-inline-size: var(--ui-dialog-min-width);
      max-inline-size: var(--ui-dialog-max-width);
      max-block-size: var(--ui-dialog-max-height);
      overflow: hidden;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      background: var(--bg-default, oklch(100% 0 0));
      color: var(--fg-default, oklch(20% 0.03 250));
      box-shadow: var(--elevation-xl, 0 16px 40px oklch(0% 0 0 / 0.32));
      animation: dialog-enter var(--duration-slower, 250ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)) forwards;
    }

    @media (prefers-color-scheme: dark) {
      dialog {
        background: var(--bg-surface-3, oklch(22% 0.02 250));
        border-color: var(--ui-dialog-edge-highlight);
      }
    }

    dialog::backdrop {
      background: oklch(0% 0 0 / var(--opacity-scrim, 0.6));
      backdrop-filter: blur(var(--blur-lg, 24px));
      animation: backdrop-enter var(--duration-slower, 250ms) var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)) forwards;
    }

    dialog[data-closing] {
      animation: dialog-exit var(--duration-slower, 250ms) var(--ease-in, cubic-bezier(0.55, 0, 1, 0.45)) forwards;
    }

    dialog[data-closing]::backdrop {
      animation: backdrop-exit var(--duration-slower, 250ms) var(--ease-in, cubic-bezier(0.55, 0, 1, 0.45)) forwards;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3, 12px);
      padding: var(--space-4, 16px) var(--space-6, 24px);
      border-bottom: var(--border-width, 1px) solid var(--border-muted, oklch(90% 0.01 250 / 0.15));
    }

    .header slot[name='title']::slotted(*) {
      margin: 0;
    }

    .close-button {
      inline-size: var(--control-height-sm, 24px);
      block-size: var(--control-height-sm, 24px);
      border: none;
      border-radius: var(--radius-sm, 4px);
      background: transparent;
      color: var(--fg-muted, oklch(48% 0.02 250));
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      padding: 0;
      flex-shrink: 0;
      position: relative;
      transition:
        background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1)),
        color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1));
    }

    .close-button::after {
      content: '';
      position: absolute;
      inline-size: var(--control-min-touch, 44px);
      block-size: var(--control-min-touch, 44px);
      inset: 50% auto auto 50%;
      transform: translate(-50%, -50%);
    }

    .close-button:hover {
      background: var(--bg-hover, oklch(from var(--fg-default, oklch(20% 0.03 250)) l c h / 0.06));
      color: var(--fg-default, oklch(20% 0.03 250));
    }

    .close-button:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(55% 0.2 250));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus, none);
    }

    .close-button iconify-icon {
      inline-size: var(--icon-sm, 14px);
      block-size: var(--icon-sm, 14px);
      font-size: var(--icon-sm, 14px);
    }

    .body {
      overflow-y: auto;
      min-block-size: 0;
      padding: var(--space-6, 24px);
    }

    .body slot::slotted(*) {
      margin-block: 0 var(--space-4, 16px);
    }

    .body slot::slotted(*:last-child) {
      margin-block-end: 0;
    }

    .footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--space-2, 8px);
      padding: var(--space-4, 16px) var(--space-6, 24px);
      border-top: var(--border-width, 1px) solid var(--border-muted, oklch(90% 0.01 250 / 0.15));
    }

    .footer slot[name='actions']::slotted(*) {
      margin: 0;
    }

    @keyframes dialog-enter {
      from {
        opacity: 0;
        transform: scale(var(--scale-enter, 0.97));
      }

      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes dialog-exit {
      from {
        opacity: 1;
        transform: scale(1);
      }

      to {
        opacity: 0;
        transform: scale(var(--scale-enter, 0.97));
      }
    }

    @keyframes backdrop-enter {
      from {
        opacity: 0;
      }

      to {
        opacity: 1;
      }
    }

    @keyframes backdrop-exit {
      from {
        opacity: 1;
      }

      to {
        opacity: 0;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      dialog,
      dialog[data-closing],
      dialog::backdrop,
      dialog[data-closing]::backdrop {
        animation: none !important;
      }
    }

    @media (forced-colors: active) {
      dialog {
        background: Canvas;
        border: 2px solid CanvasText;
        box-shadow: none;
      }

      dialog::backdrop {
        background: Canvas;
        opacity: 0.7;
      }

      .close-button {
        border: 1px solid ButtonText;
        color: ButtonText;
      }
    }

    @media print {
      dialog,
      dialog::backdrop {
        display: none !important;
      }
    }
  `;

  @property({ type: Boolean, reflect: true })
  opened = false;

  @property({ type: Boolean, reflect: true })
  modal = true;

  @property({ attribute: 'title-id', reflect: true })
  titleId: string | undefined = undefined;

  @property({ attribute: 'description-id', reflect: true })
  descriptionId: string | undefined = undefined;

  @query('dialog')
  private _dialogElement?: HTMLDialogElement;

  @query('.close-button')
  private _closeButtonElement?: HTMLButtonElement;

  private _triggerElement: HTMLElement | null = null;
  private _isClosing = false;
  private _operation: Promise<void> = Promise.resolve();

  private static _scrollLockCount = 0;
  private static _savedOverflow = '';
  private static _savedScrollbarGutter = '';

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._dialogElement?.open) {
      UiDialog._unlockBodyScroll();
    }
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has('opened')) {
      this._enqueue(async () => {
        if (this.opened) {
          await this._openDialog();
          return;
        }
        await this._closeDialog();
      });
    }
  }

  open(trigger?: HTMLElement): void {
    this._captureTrigger(trigger);
    if (this.opened) return;
    this.opened = true;
  }

  close(): void {
    if (!this.opened && !this._dialogElement?.open) return;
    this.opened = false;
  }

  private _enqueue(task: () => Promise<void>): void {
    this._operation = this._operation.then(task).catch((error: unknown) => {
      console.error('[ui-dialog] operation failed', error);
    });
  }

  private async _openDialog(): Promise<void> {
    const dialog = this._dialogElement;
    if (!dialog) return;

    if (dialog.open) {
      UiDialog._lockBodyScroll();
      return;
    }

    if (!this._triggerElement) {
      this._captureTrigger();
    }

    try {
      if (this.modal) {
        dialog.showModal();
      } else {
        dialog.show();
      }
    } catch {
      this.opened = false;
      return;
    }

    UiDialog._lockBodyScroll();
    this._focusInitialElement();

    await this._waitForAnimations(dialog);

    if (!this.opened) return;
    this.dispatchEvent(
      new CustomEvent<UiDialogOpenedDetail>('ui-dialog-opened', {
        detail: { trigger: this._triggerElement },
      }),
    );
  }

  private async _closeDialog(): Promise<void> {
    const dialog = this._dialogElement;
    if (!dialog) return;
    if (!dialog.open) {
      UiDialog._unlockBodyScroll();
      return;
    }
    if (this._isClosing) return;

    this._isClosing = true;
    dialog.setAttribute('data-closing', '');
    await this._waitForAnimations(dialog);
    dialog.removeAttribute('data-closing');

    dialog.close();

    this._isClosing = false;
    UiDialog._unlockBodyScroll();
    this._restoreTriggerFocus();
    this.dispatchEvent(new CustomEvent('ui-dialog-closed'));
  }

  private async _waitForAnimations(dialog: HTMLDialogElement): Promise<void> {
    const animations = dialog.getAnimations();
    if (animations.length === 0) {
      await Promise.resolve();
      return;
    }

    await Promise.allSettled(animations.map((animation) => animation.finished));
  }

  private _captureTrigger(trigger?: HTMLElement): void {
    if (trigger instanceof HTMLElement) {
      this._triggerElement = trigger;
      return;
    }

    const activeElement = this.ownerDocument.activeElement;
    this._triggerElement = activeElement instanceof HTMLElement ? activeElement : null;
  }

  private _focusInitialElement(): void {
    requestAnimationFrame(() => {
      const slot = this.shadowRoot?.querySelector<HTMLSlotElement>('slot[name="actions"]');
      const actions = slot?.assignedElements({ flatten: true }) ?? [];
      const firstAction = this._findFirstFocusable(actions);
      if (firstAction) {
        firstAction.focus({ preventScroll: true });
        return;
      }

      this._closeButtonElement?.focus({ preventScroll: true });
    });
  }

  private _restoreTriggerFocus(): void {
    const target = this._triggerElement;
    if (!target?.isConnected) return;
    target.focus({ preventScroll: true });
  }

  private _findFirstFocusable(elements: readonly Element[]): HTMLElement | null {
    for (const element of elements) {
      if (element instanceof HTMLElement && element.matches(FOCUSABLE_SELECTOR)) {
        return element;
      }

      const nested = element.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      if (nested) return nested;
    }

    return null;
  }

  private _emitCancelEvent(): void {
    this.dispatchEvent(new CustomEvent('ui-dialog-cancel'));
  }

  private _onNativeCancel = (event: Event): void => {
    if (!this.modal) return;
    event.preventDefault();
    this._emitCancelEvent();
    this.close();
  };

  private _onNonModalKeydown = (event: KeyboardEvent): void => {
    if (this.modal) return;
    if (event.key !== 'Escape') return;
    event.preventDefault();
    this._emitCancelEvent();
    this.close();
  };

  private _onNonModalBackgroundClick = (event: MouseEvent): void => {
    if (this.modal) return;
    const dialog = this._dialogElement;
    if (!dialog || event.target !== dialog) return;
    this._emitCancelEvent();
    this.close();
  };

  private _onNativeClose = (): void => {
    if (this._isClosing) return;
    this.opened = false;
    UiDialog._unlockBodyScroll();
    this._restoreTriggerFocus();
    this.dispatchEvent(new CustomEvent('ui-dialog-closed'));
  };

  private _resolveIdAttribute(value: string | undefined): string | typeof nothing {
    if (typeof value !== 'string') return nothing;
    const normalized = value.trim();
    return normalized === '' ? nothing : normalized;
  }

  private static _lockBodyScroll(): void {
    if (typeof document === 'undefined') return;
    const body = document.body;

    if (UiDialog._scrollLockCount === 0) {
      UiDialog._savedOverflow = body.style.overflow;
      UiDialog._savedScrollbarGutter = body.style.scrollbarGutter;
      body.style.overflow = 'hidden';
      body.style.scrollbarGutter = 'stable';
    }

    UiDialog._scrollLockCount += 1;
  }

  private static _unlockBodyScroll(): void {
    if (typeof document === 'undefined') return;
    if (UiDialog._scrollLockCount === 0) return;

    UiDialog._scrollLockCount -= 1;
    if (UiDialog._scrollLockCount > 0) return;

    const body = document.body;
    body.style.overflow = UiDialog._savedOverflow;
    body.style.scrollbarGutter = UiDialog._savedScrollbarGutter;
  }

  override render() {
    const labelledBy = this._resolveIdAttribute(this.titleId);
    const describedBy = this._resolveIdAttribute(this.descriptionId);

    return html`
      <dialog
        aria-modal=${this.modal ? 'true' : nothing}
        aria-labelledby=${labelledBy}
        aria-describedby=${describedBy}
        @cancel=${this._onNativeCancel}
        @keydown=${this._onNonModalKeydown}
        @click=${this._onNonModalBackgroundClick}
        @close=${this._onNativeClose}
      >
        <div class="header">
          <slot name="title"></slot>
          <button class="close-button" type="button" aria-label=${CLOSE_BUTTON_LABEL} @click=${this._onCloseButtonClick}>
            <iconify-icon icon="lucide:x" aria-hidden="true"></iconify-icon>
          </button>
        </div>

        <div class="body">
          <slot></slot>
        </div>

        <div class="footer">
          <slot name="actions"></slot>
        </div>
      </dialog>
    `;
  }

  private _onCloseButtonClick = (): void => {
    this.close();
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-dialog': UiDialog;
  }
}
