import type { SearchField } from '../../search-field/search-field';
import type {
  UiSearchDialogItem,
  UiSearchDialogSelectedDetail,
} from '../search-dialog.types';
import { SearchDialogVirtualizer } from './search-dialog-virtualizer';

export interface SearchDialogSelectionHost {
  isLoading(): boolean;
  getResults(): readonly UiSearchDialogItem[];
  getActiveIndex(): number;
  setActiveIndex(index: number): void;
  getSearchFieldElement(): SearchField | undefined;
  getCloseButtonElement(): HTMLButtonElement | null;
  getShadowRootRef(): ShadowRoot | null;
  getResultListElement(): HTMLUListElement | undefined;
  getVirtualScrollTop(): number;
  setVirtualScrollTop(value: number): void;
  close(): void;
  dispatchSelected(detail: UiSearchDialogSelectedDetail): void;
}

export class SearchDialogSelectionModel {
  constructor(
    private readonly _host: SearchDialogSelectionHost,
    private readonly _virtualizer: SearchDialogVirtualizer,
  ) {}

  readonly handleSearchFieldKeydown = (event: KeyboardEvent): void => {
    this._onInputKeydown(event);

    if (event.defaultPrevented && event.key !== 'Tab') {
      return;
    }

    this.handleAuxiliaryControlKeydown(event);
  };

  readonly handleAuxiliaryControlKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab') return;

    const closeButton = this._host.getCloseButtonElement();
    const searchField = this._host.getSearchFieldElement();
    const currentTarget = event.currentTarget;
    const origin = event.composedPath()[0];

    if (!closeButton || !searchField) return;

    if (currentTarget === closeButton && event.shiftKey) {
      event.preventDefault();

      if (searchField.clearButtonVisible) {
        searchField.focusClearButton();
      } else {
        searchField.focus({ preventScroll: true });
      }
      return;
    }

    if (currentTarget !== searchField) return;

    if (origin instanceof HTMLButtonElement) {
      event.preventDefault();

      if (event.shiftKey) {
        searchField.focus({ preventScroll: true });
      } else {
        closeButton.focus();
      }
      return;
    }

    if (origin instanceof HTMLInputElement && !event.shiftKey) {
      event.preventDefault();

      if (searchField.clearButtonVisible) {
        searchField.focusClearButton();
      } else {
        closeButton.focus();
      }
    }
  };

  readonly handleResultClick = (event: Event): void => {
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) return;

    const index = Number(target.dataset['index'] ?? '-1');
    const results = this._host.getResults();

    if (!Number.isInteger(index) || index < 0 || index >= results.length) return;

    this._host.setActiveIndex(index);
    this._selectActiveResult();
  };

  readonly handleResultKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) return;

    event.preventDefault();

    const index = Number(target.dataset['index'] ?? '-1');
    const results = this._host.getResults();

    if (!Number.isInteger(index) || index < 0 || index >= results.length) return;

    this._host.setActiveIndex(index);
    this._selectActiveResult();
  };

  getOptionId(index: number): string {
    return `search-option-${index.toString()}`;
  }

  scrollActiveOptionIntoView(): void {
    const activeIndex = this._host.getActiveIndex();
    if (activeIndex < 0) return;

    const results = this._host.getResults();
    if (this._virtualizer.isVirtualized(results.length)) {
      this._scrollVirtualizedIndexIntoView(activeIndex);
      return;
    }

    const shadowRoot = this._host.getShadowRootRef();
    if (!shadowRoot) return;

    const activeOption = shadowRoot.getElementById(this.getOptionId(activeIndex));
    activeOption?.scrollIntoView({ block: 'nearest' });
  }

  private _onInputKeydown(event: KeyboardEvent): void {
    if (this._host.isLoading()) return;

    const results = this._host.getResults();

    switch (event.key) {
      case 'ArrowDown':
        if (results.length === 0) return;
        event.preventDefault();
        this._moveActiveIndex(1);
        break;

      case 'ArrowUp':
        if (results.length === 0) return;
        event.preventDefault();
        this._moveActiveIndex(-1);
        break;

      case 'Enter':
        if (results.length === 0) return;
        event.preventDefault();
        this._selectActiveResult();
        break;

      case 'Tab':
        if (!event.shiftKey) {
          const closeButton = this._host.getCloseButtonElement();
          const searchField = this._host.getSearchFieldElement();

          if (!searchField?.clearButtonVisible && closeButton) {
            event.preventDefault();
            closeButton.focus();
          }
        }
        break;

      default:
        break;
    }
  }

  private _moveActiveIndex(delta: 1 | -1): void {
    const results = this._host.getResults();
    const total = results.length;
    if (total === 0) return;

    const activeIndex = this._host.getActiveIndex();
    const nextIndex =
      activeIndex < 0
        ? delta === 1
          ? 0
          : total - 1
        : (activeIndex + delta + total) % total;

    this._host.setActiveIndex(nextIndex);
    this.scrollActiveOptionIntoView();
  }

  private _scrollVirtualizedIndexIntoView(index: number): void {
    const list = this._host.getResultListElement();
    if (!list) return;

    const nextScrollTop = this._virtualizer.scrollIndexIntoView(
      index,
      list,
      this._host.getVirtualScrollTop(),
    );
    this._host.setVirtualScrollTop(nextScrollTop);
  }

  private _selectActiveResult(): void {
    const results = this._host.getResults();
    const activeIndex = this._host.getActiveIndex();
    const index = activeIndex >= 0 ? activeIndex : 0;
    const item = results[index];

    if (!item) return;

    this._host.dispatchSelected({
      url: item.url,
      title: item.title,
    });
    this._host.close();
  }
}