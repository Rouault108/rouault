import {
  captureTrigger,
  createBodyScrollLock,
  restoreTriggerFocus,
  showNativeDialog,
  waitForDialogAnimations,
} from '../../dialog/dialog-helpers';
import type { SearchField } from '../../search-field/search-field';
import { BODY_SEARCH_DIALOG_OPEN_ATTRIBUTE } from '../search-dialog.constants';
import type {
  UiSearchDialogCloseReason,
  UiSearchDialogClosedDetail,
  UiSearchDialogOpenedDetail,
} from '../search-dialog.types';

const searchDialogBodyScrollLock = createBodyScrollLock(BODY_SEARCH_DIALOG_OPEN_ATTRIBUTE);

export interface SearchDialogControllerHost {
  getOwnerDocument(): Document;
  getDialogElement(): HTMLDialogElement | undefined;
  getSearchFieldElement(): SearchField | undefined;
  getQuery(): string;
  isLoading(): boolean;
  isOpened(): boolean;
  cancelScheduledSearch(): void;
  scheduleSearchIfNeeded(): void;
  requestClose(reason: UiSearchDialogCloseReason): void;
  dispatchOpened(detail: UiSearchDialogOpenedDetail): void;
  dispatchClosed(detail: UiSearchDialogClosedDetail): void;
}

export class SearchDialogController {
  private _triggerElement: HTMLElement | null = null;
  private _isClosing = false;
  private _operation: Promise<void> = Promise.resolve();
  private _hasBodyScrollLock = false;
  private _closeReason: UiSearchDialogCloseReason = 'programmatic';

  constructor(private readonly _host: SearchDialogControllerHost) {}

  captureTrigger(trigger?: HTMLElement): void {
    this._triggerElement = captureTrigger(this._host.getOwnerDocument(), trigger);
  }

  syncOpened(opened: boolean): void {
    this._enqueue(async () => {
      if (opened) {
        await this._openDialog();
        return;
      }

      await this._closeDialog();
    });
  }

  destroy(): void {
    this._unlockBodyScroll();
  }

  readonly handleCloseClick = (): void => {
    this._host.requestClose('close-button');
  };

  readonly handleDialogMouseDown = (event: MouseEvent): void => {
    const dialog = this._host.getDialogElement();
    if (!dialog?.open) return;
    if (this._isClosing) return;
    if (event.target !== dialog) return;

    const rect = dialog.getBoundingClientRect();
    const isInsideDialogBounds =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    if (isInsideDialogBounds) return;
    this._host.requestClose('backdrop');
  };

  readonly handleDialogCancel = (event: Event): void => {
    event.preventDefault();
    this._host.requestClose('escape');
  };

  readonly handleNativeClose = (): void => {
    const wasClosing = this._isClosing;
    const closeReason = this._closeReason;
    this._isClosing = false;

    if (!wasClosing) {
      this._closeReason = 'programmatic';
      this._host.requestClose('programmatic');
      return;
    }

    this._unlockBodyScroll();
    this._restoreTriggerFocus();
    this._host.dispatchClosed({ reason: closeReason });
    this._closeReason = 'programmatic';
  };

  private _enqueue(task: () => Promise<void>): void {
    this._operation = this._operation.then(task).catch((error: unknown) => {
      console.error('[ui-search-dialog] operation failed', error);
    });
  }

  private async _openDialog(): Promise<void> {
    const dialog = this._host.getDialogElement();
    if (!dialog) return;

    if (dialog.open) {
      this._lockBodyScroll();
      this._focusInput();
      return;
    }

    this._triggerElement ??= captureTrigger(this._host.getOwnerDocument());

    if (!showNativeDialog(dialog, true)) {
      this._host.requestClose('programmatic');
      return;
    }

    this._lockBodyScroll();
    this._focusInput();

    if (this._host.getQuery().trim() !== '' && !this._host.isLoading()) {
      this._host.scheduleSearchIfNeeded();
    }

    await waitForDialogAnimations(dialog);
    if (!this._host.isOpened()) return;

    this._host.dispatchOpened({ trigger: this._triggerElement });
  }

  private async _closeDialog(): Promise<void> {
    const dialog = this._host.getDialogElement();
    if (!dialog) return;

    if (!dialog.open) {
      this._unlockBodyScroll();
      return;
    }

    if (this._isClosing) return;

    this._host.cancelScheduledSearch();
    this._isClosing = true;
    this._closeReason = this._host.isOpened() ? this._closeReason : 'programmatic';

    dialog.setAttribute('data-closing', '');
    await waitForDialogAnimations(dialog);
    dialog.removeAttribute('data-closing');
    dialog.close();
  }

  private _focusInput(): void {
    requestAnimationFrame(() => {
      const searchField = this._host.getSearchFieldElement();
      const query = this._host.getQuery();

      searchField?.focus({ preventScroll: true });
      searchField?.setSelectionRange(query.length, query.length);
    });
  }

  setPendingCloseReason(reason: UiSearchDialogCloseReason): void {
    this._closeReason = reason;
  }

  private _restoreTriggerFocus(): void {
    restoreTriggerFocus(this._triggerElement);
  }

  private _lockBodyScroll(): void {
    if (this._hasBodyScrollLock) return;
    searchDialogBodyScrollLock.lock();
    this._hasBodyScrollLock = true;
  }

  private _unlockBodyScroll(): void {
    if (!this._hasBodyScrollLock) return;
    searchDialogBodyScrollLock.unlock();
    this._hasBodyScrollLock = false;
  }
}
