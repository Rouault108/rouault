import { css, html, LitElement, nothing, type PropertyValues } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import type { Button } from '../button/button';
import '../button/button';
import '../../../lib/icons';
import {
  captureTrigger,
  createBodyScrollLock,
  restoreTriggerFocus,
  showNativeDialog,
  waitForDialogAnimations,
} from './dialog-helpers';

const CLOSE_BUTTON_LABEL = '閉じる';
const BODY_DIALOG_OPEN_ATTRIBUTE = 'data-ui-dialog-open';
const ACCESSIBLE_NAME_REQUIRED_MESSAGE =
  '[ui-dialog] aria-labelledby (title-id) または aria-label のいずれかを設定してください。';
const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const dialogBodyScrollLock = createBodyScrollLock(BODY_DIALOG_OPEN_ATTRIBUTE);

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
      border: var(--border-width) solid transparent;
      border-radius: var(--radius-xl);
      inline-size: var(--ui-dialog-max-width);
      min-inline-size: var(--ui-dialog-min-width);
      max-inline-size: var(--ui-dialog-max-width);
      max-block-size: var(--ui-dialog-max-height);
      overflow: hidden;
      grid-template-rows: auto minmax(0, 1fr) auto;
      background: var(--bg-default);
      color: var(--fg-default);
      box-shadow: var(--elevation-xl);
      animation: dialog-enter var(--duration-slower) var(--ease-out) forwards;
    }

    dialog[open] {
      display: grid;
    }

    @media (prefers-color-scheme: dark) {
      dialog {
        background: var(--bg-surface-3);
        border-color: var(--ui-dialog-edge-highlight);
      }
    }

    dialog::backdrop {
      background: oklch(0% 0 0 / var(--opacity-scrim));
      backdrop-filter: blur(var(--blur-lg));
      animation: backdrop-enter var(--duration-slower) var(--ease-out) forwards;
    }

    dialog[data-closing] {
      animation: dialog-exit var(--duration-slower) var(--ease-in) forwards;
    }

    dialog[data-closing]::backdrop {
      animation: backdrop-exit var(--duration-slower) var(--ease-in) forwards;
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-4) var(--space-6);
    }

    .header slot[name='title']::slotted(*) {
      margin: 0;
    }

    ui-button.close-button {
      flex-shrink: 0;
    }

    ui-button.close-button::after {
      content: '';
      position: absolute;
      inset: 50% auto auto 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
    }

    ui-button.close-button::part(button) {
      border-radius: var(--radius-sm);
    }

    ui-button.close-button::part(button):hover {
      color: var(--fg-default);
    }

    .body {
      overflow-y: auto;
      min-block-size: 0;
      padding: var(--space-6);
    }

    .body slot::slotted(*) {
      margin-block: 0 var(--space-4);
    }

    .body slot::slotted(*:last-child) {
      margin-block-end: 0;
    }

    .footer {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: var(--space-2);
      padding: var(--space-4) var(--space-6);
    }

    .footer slot[name='actions']::slotted(*) {
      margin: 0;
    }

    @keyframes dialog-enter {
      from {
        opacity: 0;
        transform: scale(var(--scale-enter));
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
        transform: scale(var(--scale-enter));
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
      dialog[data-closing] {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
      }

      dialog::backdrop,
      dialog[data-closing]::backdrop {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
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

      ui-button.close-button::part(button) {
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

  @property({ attribute: 'aria-label', reflect: true })
  ariaLabelText: string | undefined = undefined;

  @query('dialog')
  private _dialogElement?: HTMLDialogElement;

  @query('.close-button')
  private _closeButtonElement?: Button;

  private _triggerElement: HTMLElement | null = null;
  private _isClosing = false;
  private _isSyncingModalMode = false;
  private _isDocumentKeydownListening = false;
  private _hasBodyScrollLock = false;
  private _operation: Promise<void> = Promise.resolve();

  private static _openDialogs: UiDialog[] = [];

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._detachDocumentKeydownListener();
    if (this._dialogElement?.open) {
      UiDialog._unregisterOpenDialog(this);
      this._unlockBodyScroll();
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

    if (changedProperties.has('modal') && this._dialogElement?.open) {
      this._enqueue(async () => {
        await this._syncModalMode();
      });
    }
  }

  open(trigger?: HTMLElement): void {
    if (this.opened) return;
    this._triggerElement = captureTrigger(this.ownerDocument, trigger);
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
    if (!this.opened) return;

    if (dialog.open) {
      UiDialog._registerOpenDialog(this);
      this._syncDocumentKeydownListener();
      this._focusInitialElement();
      await waitForDialogAnimations(dialog);
      if (!this._isCurrentlyOpened()) return;
      this._dispatchOpenedEvent();
      return;
    }

    this._triggerElement ??= captureTrigger(this.ownerDocument);

    if (!this._hasAccessibleName()) {
      console.error(ACCESSIBLE_NAME_REQUIRED_MESSAGE);
      this.opened = false;
      return;
    }

    if (!showNativeDialog(dialog, this.modal)) {
      this.opened = false;
      return;
    }

    UiDialog._registerOpenDialog(this);
    this._lockBodyScroll();
    this._syncDocumentKeydownListener();
    this._focusInitialElement();

    await waitForDialogAnimations(dialog);

    if (!this._isCurrentlyOpened()) return;
    this._dispatchOpenedEvent();
  }

  private async _closeDialog(): Promise<void> {
    const dialog = this._dialogElement;
    if (!dialog) return;
    if (this.opened) return;
    if (!dialog.open) {
      UiDialog._unregisterOpenDialog(this);
      this._syncDocumentKeydownListener();
      this._unlockBodyScroll();
      return;
    }
    if (this._isClosing) return;

    this._isClosing = true;
    dialog.setAttribute('data-closing', '');
    await waitForDialogAnimations(dialog);
    dialog.removeAttribute('data-closing');
    if (this._isCurrentlyOpened()) {
      this._isClosing = false;
      return;
    }

    dialog.close();
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
    restoreTriggerFocus(this._triggerElement);
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

  private _lockBodyScroll(): void {
    if (this._hasBodyScrollLock) return;
    dialogBodyScrollLock.lock();
    this._hasBodyScrollLock = true;
  }

  private _unlockBodyScroll(): void {
    if (!this._hasBodyScrollLock) return;
    dialogBodyScrollLock.unlock();
    this._hasBodyScrollLock = false;
  }

  private async _syncModalMode(): Promise<void> {
    const dialog = this._dialogElement;
    if (!dialog?.open) return;
    if (!this.opened) return;
    if (this._isClosing) return;

    this._isSyncingModalMode = true;
    dialog.close();

    if (!showNativeDialog(dialog, this.modal)) {
      UiDialog._unregisterOpenDialog(this);
      this._syncDocumentKeydownListener();
      this._unlockBodyScroll();
      this.opened = false;
      this._restoreTriggerFocus();
      this.dispatchEvent(new CustomEvent('ui-dialog-closed'));
      return;
    }

    UiDialog._registerOpenDialog(this);
    this._syncDocumentKeydownListener();
    this._focusInitialElement();
    await waitForDialogAnimations(dialog);
  }

  private _isCurrentlyOpened(): boolean {
    return this.opened;
  }

  private _dispatchOpenedEvent(): void {
    this.dispatchEvent(
      new CustomEvent<UiDialogOpenedDetail>('ui-dialog-opened', {
        detail: { trigger: this._triggerElement },
      }),
    );
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

  private _onDocumentKeydown = (event: KeyboardEvent): void => {
    if (this.modal) return;
    if (!this._dialogElement?.open) return;
    if (!UiDialog._isTopmostOpenDialog(this)) return;
    this._onNonModalKeydown(event);
  };

  private _onNativeClose = (): void => {
    if (this._isSyncingModalMode) {
      this._isSyncingModalMode = false;
      return;
    }

    this._isClosing = false;
    this.opened = false;
    UiDialog._unregisterOpenDialog(this);
    this._syncDocumentKeydownListener();
    this._unlockBodyScroll();
    this._restoreTriggerFocus();
    this.dispatchEvent(new CustomEvent('ui-dialog-closed'));
  };

  private _resolveIdAttribute(value: string | undefined): string | typeof nothing {
    const normalized = this._normalizeString(value);
    return normalized ?? nothing;
  }

  private _resolveAriaLabelAttribute(labelledBy: string | typeof nothing): string | typeof nothing {
    if (labelledBy !== nothing) return nothing;
    const normalized = this._normalizeString(this.ariaLabelText);
    return normalized ?? nothing;
  }

  private _hasAccessibleName(): boolean {
    return (
      this._normalizeString(this.titleId) !== undefined ||
      this._normalizeString(this.ariaLabelText) !== undefined
    );
  }

  private _normalizeString(value: string | undefined): string | undefined {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim();
    return normalized === '' ? undefined : normalized;
  }

  private _syncDocumentKeydownListener(): void {
    const shouldListen = Boolean(this._dialogElement?.open) && !this.modal;
    if (shouldListen) {
      this._attachDocumentKeydownListener();
      return;
    }

    this._detachDocumentKeydownListener();
  }

  private _attachDocumentKeydownListener(): void {
    if (this._isDocumentKeydownListening) return;
    this.ownerDocument.addEventListener('keydown', this._onDocumentKeydown, true);
    this._isDocumentKeydownListening = true;
  }

  private _detachDocumentKeydownListener(): void {
    if (!this._isDocumentKeydownListening) return;
    this.ownerDocument.removeEventListener('keydown', this._onDocumentKeydown, true);
    this._isDocumentKeydownListening = false;
  }

  private static _registerOpenDialog(dialog: UiDialog): void {
    UiDialog._openDialogs = UiDialog._openDialogs.filter((item) => item !== dialog);
    UiDialog._openDialogs.push(dialog);
  }

  private static _unregisterOpenDialog(dialog: UiDialog): void {
    UiDialog._openDialogs = UiDialog._openDialogs.filter((item) => item !== dialog);
  }

  private static _isTopmostOpenDialog(dialog: UiDialog): boolean {
    return UiDialog._openDialogs.at(-1) === dialog;
  }

  override render() {
    const labelledBy = this._resolveIdAttribute(this.titleId);
    const describedBy = this._resolveIdAttribute(this.descriptionId);
    const ariaLabel = this._resolveAriaLabelAttribute(labelledBy);

    return html`
      <dialog
        aria-modal=${this.modal ? 'true' : nothing}
        aria-labelledby=${labelledBy}
        aria-describedby=${describedBy}
        aria-label=${ariaLabel}
        @cancel=${this._onNativeCancel}
        @close=${this._onNativeClose}
      >
        <div class="header">
          <slot name="title"></slot>
          <ui-button
            class="close-button"
            variant="ghost"
            size="sm"
            icon-only
            aria-label=${CLOSE_BUTTON_LABEL}
            @click=${this._onCloseButtonClick}
          >
            <iconify-icon icon="lucide:x" aria-hidden="true"></iconify-icon>
          </ui-button>
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
