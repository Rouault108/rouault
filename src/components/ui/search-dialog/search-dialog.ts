import { LitElement, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import '../../../lib/icons';
import '../search-field/search-field';
import '../spinner/spinner';
import type { SearchField } from '../search-field/search-field';
import { searchDialogStyles } from './search-dialog.styles';
import { SearchDialogController } from './internals/search-dialog-controller';
import {
  renderSearchDialogHighlightedText,
  resolveSearchDialogItemPath,
} from './internals/search-dialog-highlight';
import { SearchDialogSearchSession } from './internals/search-dialog-search-session';
import { SearchDialogSelectionModel } from './internals/search-dialog-selection-model';
import { SearchDialogVirtualizer } from './internals/search-dialog-virtualizer';
import type {
  UiSearchDialogItem,
  UiSearchDialogOpenedDetail,
  UiSearchDialogSearcher,
  UiSearchDialogSelectedDetail,
} from './search-dialog.types';
import { renderSearchDialog } from './views/render-search-dialog';

@customElement('ui-search-dialog')
export class UiSearchDialog extends LitElement {
  static override styles = searchDialogStyles;

  @property({ type: Boolean, reflect: true })
  opened = false;

  @property({ type: String, reflect: true })
  query = '';

  @property({ type: Boolean, reflect: true })
  loading = false;

  @property({ attribute: false })
  items: readonly UiSearchDialogItem[] = [];

  @property({ attribute: false })
  searcher: UiSearchDialogSearcher | null = null;

  @state()
  private _results: UiSearchDialogItem[] = [];

  @state()
  private _activeIndex = -1;

  @state()
  private _liveMessage = '';

  @state()
  private _hasCompletedSearch = false;

  @query('dialog')
  private _dialogElement?: HTMLDialogElement;

  @query('ui-search-field')
  private _searchFieldElement?: SearchField;

  @query('.result-list')
  private _resultListElement?: HTMLUListElement;

  private _virtualScrollTop = 0;

  private readonly _virtualizer: SearchDialogVirtualizer;
  private readonly _controller: SearchDialogController;
  private readonly _searchSession: SearchDialogSearchSession;
  private readonly _selectionModel: SearchDialogSelectionModel;

  constructor() {
    super();

    this._virtualizer = new SearchDialogVirtualizer();

    this._controller = new SearchDialogController({
      getOwnerDocument: () => this.ownerDocument,
      getDialogElement: () => this._dialogElement,
      getSearchFieldElement: () => this._searchFieldElement,
      getQuery: () => this.query,
      isLoading: () => this.loading,
      isOpened: () => this.opened,
      setOpened: (value) => {
        this.opened = value;
      },
      cancelScheduledSearch: () => {
        this._searchSession.clearScheduled();
      },
      scheduleSearchIfNeeded: () => {
        this._searchSession.requestSearchNow();
      },
      dispatchOpened: (detail: UiSearchDialogOpenedDetail) => {
        this.dispatchEvent(
          new CustomEvent<UiSearchDialogOpenedDetail>('ui-search-dialog-opened', {
            detail,
          }),
        );
      },
      dispatchClosed: () => {
        this.dispatchEvent(new CustomEvent('ui-search-dialog-closed'));
      },
    });

    this._searchSession = new SearchDialogSearchSession({
      getQuery: () => this.query,
      isLoading: () => this.loading,
      getItems: () => this.items,
      getSearcher: () => this.searcher,
      setResults: (results) => {
        this._results = results;
      },
      setActiveIndex: (index) => {
        this._activeIndex = index;
      },
      setHasCompletedSearch: (value) => {
        this._hasCompletedSearch = value;
      },
      setLiveMessage: (message) => {
        this._setLiveMessage(message);
      },
      scrollActiveOptionIntoView: () => {
        this._selectionModel.scrollActiveOptionIntoView();
      },
    });

    this._selectionModel = new SearchDialogSelectionModel(
      {
        isLoading: () => this.loading,
        getResults: () => this._results,
        getActiveIndex: () => this._activeIndex,
        setActiveIndex: (index) => {
          this._activeIndex = index;
        },
        getSearchFieldElement: () => this._searchFieldElement,
        getCloseButtonElement: () =>
          this.shadowRoot?.querySelector<HTMLButtonElement>('.close-button') ?? null,
        getShadowRootRef: () => this.shadowRoot,
        getResultListElement: () => this._resultListElement,
        getVirtualScrollTop: () => this._virtualScrollTop,
        setVirtualScrollTop: (value) => {
          this._virtualScrollTop = value;
        },
        close: () => {
          this.close();
        },
        dispatchSelected: (detail: UiSearchDialogSelectedDetail) => {
          this.dispatchEvent(
            new CustomEvent<UiSearchDialogSelectedDetail>('ui-search-dialog-selected', {
              detail,
            }),
          );
        },
      },
      this._virtualizer,
    );
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._controller.destroy();
    this._searchSession.destroy();
  }

  protected override willUpdate(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has('query')) {
      this._virtualScrollTop = 0;
      this._searchSession.handleQueryChanged();
    }

    if (changedProperties.has('loading')) {
      this._searchSession.handleLoadingChanged();
    }
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has('opened')) {
      this._controller.syncOpened(this.opened);
    }
  }

  open(trigger?: HTMLElement): void {
    this._controller.captureTrigger(trigger);
    if (this.opened) return;
    this.opened = true;
  }

  close(): void {
    if (!this.opened && !this._dialogElement?.open) return;
    this.opened = false;
  }

  private _setLiveMessage(message: string): void {
    if (this._liveMessage === message) return;
    this._liveMessage = message;
  }

  private readonly _onInput = (event: Event): void => {
    const input = event.currentTarget;
    if (!input || typeof input !== 'object' || !('value' in input)) return;

    const { value } = input as EventTarget & { value: unknown };
    if (typeof value !== 'string') return;

    this.query = value;
  };

  private readonly _onSearchFieldKeydown = (event: KeyboardEvent): void => {
    this._selectionModel.handleSearchFieldKeydown(event);
  };

  private readonly _onCloseButtonKeydown = (event: KeyboardEvent): void => {
    this._selectionModel.handleAuxiliaryControlKeydown(event);
  };

  private readonly _onResultListScroll = (event: Event): void => {
    if (!this._virtualizer.isVirtualized(this._results.length)) return;

    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) return;

    this._virtualScrollTop = target.scrollTop;
  };

  override render() {
    const visibleRange = this._virtualizer.getVisibleRange(
      this._results.length,
      this._virtualScrollTop,
      this._resultListElement?.clientHeight ?? 320,
    );

    return renderSearchDialog({
      query: this.query,
      loading: this.loading,
      results: this._results,
      activeIndex: this._activeIndex,
      liveMessage: this._liveMessage,
      hasCompletedSearch: this._hasCompletedSearch,
      visibleRange,
      getOptionId: (index) => this._selectionModel.getOptionId(index),
      renderHighlightedText: (value) =>
        renderSearchDialogHighlightedText(value, this.query),
      resolvePath: (item) => resolveSearchDialogItemPath(item, window.location.href),
      onInput: this._onInput,
      onSearchFieldKeydown: this._onSearchFieldKeydown,
      onCloseClick: this._controller.handleCloseClick,
      onCloseButtonKeydown: this._onCloseButtonKeydown,
      onDialogMouseDown: this._controller.handleDialogMouseDown,
      onDialogCancel: this._controller.handleDialogCancel,
      onDialogClose: this._controller.handleNativeClose,
      onResultListScroll: this._onResultListScroll,
      onResultClick: this._selectionModel.handleResultClick,
      onResultKeydown: this._selectionModel.handleResultKeydown,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-search-dialog': UiSearchDialog;
  }
}