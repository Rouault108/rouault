import type { SearchField } from '../../search-field/search-field.js';
import type {
  UiSearchDialogCloseReason,
  UiSearchDialogItem,
  UiSearchDialogSelectedDetail,
} from '../search-dialog.types.js';
import { SearchDialogVirtualizer } from './search-dialog-virtualizer.js';

export interface SearchDialogSelectionHost {
  isLoading(): boolean;
  isUnavailable?(): boolean;
  getResults(): readonly UiSearchDialogItem[];
  getActiveId(): string | null;
  setActiveId(id: string | null): void;
  getQuery(): string;
  getSearchFieldElement(): SearchField | undefined;
  getCloseButtonElement(): HTMLButtonElement | null;
  getShadowRootRef(): ShadowRoot | null;
  getResultListElement(): HTMLUListElement | undefined;
  getVirtualScrollTop(): number;
  setVirtualScrollTop(value: number): void;
  requestClose(reason: UiSearchDialogCloseReason): void;
  dispatchSelected(detail: UiSearchDialogSelectedDetail): void;
}

export class SearchDialogSelectionModel {
  constructor(
    private readonly _host: SearchDialogSelectionHost,
    private readonly _virtualizer: SearchDialogVirtualizer,
  ) {}

  readonly handleSearchFieldKeydown = (event: KeyboardEvent): void => {
    this._onInputKeydown(event);

    if (event.defaultPrevented) {
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
    if (this._isUnavailable()) return;
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) return;

    const index = Number(target.dataset['index'] ?? '-1');
    const results = this._host.getResults();

    if (!Number.isInteger(index) || index < 0 || index >= results.length) return;

    this._host.setActiveId(results[index]?.id ?? null);
    this._selectActiveResult('pointer');
  };

  readonly handleResultKeydown = (event: KeyboardEvent): void => {
    if (this._isUnavailable()) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleResultClick(event);
    }
  };

  getOptionId(itemId: string): string {
    return `search-option-${itemId}`;
  }

  scrollActiveOptionIntoView(): void {
    const activeIndex = this.getActiveIndex();
    if (activeIndex < 0) return;

    const results = this._host.getResults();
    if (this._virtualizer.isVirtualized(results.length)) {
      this._scrollVirtualizedIndexIntoView(activeIndex);
      return;
    }

    const shadowRoot = this._host.getShadowRootRef();
    if (!shadowRoot) return;

    const activeItem = results[activeIndex];
    if (!activeItem) return;

    const activeOption = shadowRoot.getElementById(this.getOptionId(activeItem.id));
    activeOption?.scrollIntoView({ block: 'nearest' });
  }

  private _onInputKeydown(event: KeyboardEvent): void {
    if (this._isUnavailable()) return;
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
        if (event.isComposing) return;
        if (results.length === 0) return;
        event.preventDefault();
        this._selectActiveResult('keyboard');
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

    const activeIndex = this.getActiveIndex();
    const nextIndex =
      activeIndex < 0 ? (delta === 1 ? 0 : total - 1) : (activeIndex + delta + total) % total;

    this._host.setActiveId(results[nextIndex]?.id ?? null);
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

  getActiveIndex(): number {
    const activeId = this._host.getActiveId();
    if (activeId === null) return -1;
    return this._host.getResults().findIndex((item) => item.id === activeId);
  }

  private _isUnavailable(): boolean {
    return this._host.isUnavailable?.() === true;
  }

  private _selectActiveResult(selectionMethod: 'keyboard' | 'pointer'): void {
    const results = this._host.getResults();
    const activeIndex = this.getActiveIndex();
    const index = activeIndex >= 0 ? activeIndex : 0;
    const item = results[index];

    if (!item) return;

    this._host.dispatchSelected({
      id: item.id,
      renderHref: item.renderHref,
      canonicalPathname: item.canonicalPathname,
      title: item.title,
      query: this._host.getQuery(),
      index,
      item,
      selectionMethod,
    });
    this._host.requestClose('selection');
  }
}
