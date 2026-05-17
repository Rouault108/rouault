import { LitElement, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import '../icon/icon.js';
import '../search-field/search-field.js';
import '../spinner/spinner.js';
import type { SearchField } from '../search-field/search-field.js';
import { searchDialogStyles } from './search-dialog.styles.js';
import { SearchDialogController } from './internals/search-dialog-controller.js';
import type { InteractionModality } from './internals/interaction-modality.js';
import {
  renderSearchDialogHighlightedText,
  resolveSearchDialogItemPath,
} from './internals/search-dialog-highlight.js';
import { SearchDialogSearchSession } from './internals/search-dialog-search-session.js';
import { SearchDialogSelectionModel } from './internals/search-dialog-selection-model.js';
import { SearchDialogVirtualizer } from './internals/search-dialog-virtualizer.js';
import type {
  UiSearchDialogCloseReason,
  UiSearchDialogClosedDetail,
  UiSearchDialogCloseRequestedDetail,
  UiSearchDialogItem,
  UiSearchDialogMatchField,
  UiSearchDialogMessages,
  UiSearchDialogOpenedDetail,
  UiSearchDialogOpenRequestedDetail,
  UiSearchDialogQueryChangedDetail,
  UiSearchDialogSearchError,
  UiSearchDialogSearcher,
  UiSearchDialogSelectedDetail,
} from './search-dialog.types.js';
import { renderSearchDialog } from './views/render-search-dialog.js';
import {
  getSearchBootstrapUnavailableMessage,
  type SearchBootstrapUnavailableReason,
} from '../../../../shared/search/search-unavailable-reason.js';

const DEFAULT_MATCH_FIELDS: readonly UiSearchDialogMatchField[] = ['title', 'path', 'keywords'];
const DEFAULT_MESSAGES: UiSearchDialogMessages = {
  dialogLabel: '検索',
  closeLabel: '閉じる',
  clearLabel: '検索をクリア',
  loadingHeading: '検索インデックスを読み込んでいます',
  loadingDescription: 'インデックスを読み込んでいます...',
  emptyHeading: '結果が見つかりません',
  emptyDescription: '別のキーワードで検索してください',
  errorHeading: '検索結果を取得できませんでした',
  errorDescription: '時間をおいて再度お試しください',
  keyboardHint: '↑ ↓ で移動 / Enter で選択',
};

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

  @property({ type: Boolean, attribute: 'search-unavailable', reflect: true })
  searchUnavailable = false;

  @property({ type: String, attribute: 'search-unavailable-reason', reflect: true })
  searchUnavailableReason: SearchBootstrapUnavailableReason | '' = '';

  @property({ attribute: false })
  messages: Partial<UiSearchDialogMessages> = {};

  @property({ attribute: false })
  matchFields: readonly UiSearchDialogMatchField[] = DEFAULT_MATCH_FIELDS;

  @state()
  private _results: UiSearchDialogItem[] = [];

  @state()
  private _activeId: string | null = null;

  @state()
  private _liveMessage = '';

  @state()
  private _hasCompletedSearch = false;

  @state()
  private _error: UiSearchDialogSearchError | null = null;

  @query('dialog')
  private _dialogElement?: HTMLDialogElement;

  @query('ui-search-field')
  private _searchFieldElement?: SearchField;

  @query('.result-list')
  private _resultListElement?: HTMLUListElement;

  private _virtualScrollTop = 0;
  private _lastCloseReason: UiSearchDialogCloseReason = 'programmatic';

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
      cancelScheduledSearch: () => {
        this._searchSession.clearScheduled();
      },
      scheduleSearchIfNeeded: () => {
        this._searchSession.requestSearchNow();
      },
      requestClose: (reason) => {
        this.requestClose(reason);
      },
      dispatchOpened: (detail: UiSearchDialogOpenedDetail) => {
        this.dispatchEvent(
          new CustomEvent<UiSearchDialogOpenedDetail>('ui-search-dialog-opened', {
            detail,
            bubbles: true,
            composed: true,
          }),
        );
      },
      dispatchClosed: (detail: UiSearchDialogClosedDetail) => {
        this.dispatchEvent(
          new CustomEvent<UiSearchDialogClosedDetail>('ui-search-dialog-closed', {
            detail,
            bubbles: true,
            composed: true,
          }),
        );
      },
    });

    this._searchSession = new SearchDialogSearchSession({
      getQuery: () => this.query,
      isLoading: () => this.loading,
      isUnavailable: () => this.searchUnavailable,
      getItems: () => this.items,
      getSearcher: () => this.searcher,
      getMatchFields: () => this.matchFields,
      setResults: (results) => {
        this._results = results;
      },
      getActiveId: () => this._activeId,
      setActiveId: (id) => {
        this._activeId = id;
      },
      setHasCompletedSearch: (value) => {
        this._hasCompletedSearch = value;
      },
      setError: (error) => {
        this._error = error;
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
        isUnavailable: () => this.searchUnavailable,
        getResults: () => this._results,
        getActiveId: () => this._activeId,
        setActiveId: (id) => {
          this._activeId = id;
        },
        getQuery: () => this.query,
        getSearchFieldElement: () => this._searchFieldElement,
        getCloseButtonElement: () =>
          this.shadowRoot?.querySelector<HTMLButtonElement>('.close-button') ?? null,
        getShadowRootRef: () => this.shadowRoot,
        getResultListElement: () => this._resultListElement,
        getVirtualScrollTop: () => this._virtualScrollTop,
        setVirtualScrollTop: (value) => {
          this._virtualScrollTop = value;
        },
        requestClose: (reason) => {
          this.requestClose(reason);
        },
        dispatchSelected: (detail: UiSearchDialogSelectedDetail) => {
          this.dispatchEvent(
            new CustomEvent<UiSearchDialogSelectedDetail>('ui-search-dialog-selected', {
              detail,
              bubbles: true,
              composed: true,
            }),
          );
        },
      },
      this._virtualizer,
    );
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this._controller.connect();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._controller.destroy();
    this._searchSession.destroy();
  }

  protected override willUpdate(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has('searchUnavailable')) {
      if (this.searchUnavailable) {
        this._clearUnavailableState();
      }
    }

    if (changedProperties.has('query')) {
      this._virtualScrollTop = 0;
      this._searchSession.handleQueryChanged();
    }

    if (changedProperties.has('loading')) {
      this._searchSession.handleLoadingChanged();
    }
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has('searchUnavailable')) {
      if (this.searchUnavailable) {
        this.dataset['searchUnavailable'] = 'true';
      } else {
        delete this.dataset['searchUnavailable'];
      }
    }

    if (changedProperties.has('opened')) {
      if (!this.opened) {
        this._controller.setPendingCloseReason(this._lastCloseReason);
      }
      this._controller.syncOpened(this.opened);
    }
  }

  requestOpen(trigger?: HTMLElement): void {
    this._controller.captureTrigger(trigger);
    this.dispatchEvent(
      new CustomEvent<UiSearchDialogOpenRequestedDetail>('ui-search-dialog-open-requested', {
        detail: {
          trigger: trigger ?? null,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  captureOpenModality(modality?: InteractionModality): void {
    this._controller.captureOpenModality(modality);
  }

  requestClose(reason: UiSearchDialogCloseReason = 'programmatic'): void {
    this._lastCloseReason = reason;
    this._controller.setPendingCloseReason(reason);
    this.dispatchEvent(
      new CustomEvent<UiSearchDialogCloseRequestedDetail>('ui-search-dialog-close-requested', {
        detail: {
          reason,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  focusInput(): void {
    this._searchFieldElement?.focus({ preventScroll: true });
  }

  focusClearButton(): void {
    if (!this._searchFieldElement?.clearButtonVisible) return;
    this._searchFieldElement.focusClearButton();
  }

  private _setLiveMessage(message: string): void {
    if (this._liveMessage === message) return;
    this._liveMessage = message;
  }

  private _clearUnavailableState(): void {
    this._searchSession.clearUnavailableState();
    this._results = [];
    this._activeId = null;
    this._error = null;
    this._hasCompletedSearch = false;
    this._virtualScrollTop = 0;
    this.loading = false;
    this._setLiveMessage(
      this.searchUnavailableReason
        ? getSearchBootstrapUnavailableMessage(this.searchUnavailableReason)
        : '',
    );
  }

  private readonly _onInput = (event: Event): void => {
    const input = event.currentTarget;
    if (!input || typeof input !== 'object' || !('value' in input)) return;

    const { value } = input as EventTarget & { value: unknown };
    if (typeof value !== 'string') return;

    this.dispatchEvent(
      new CustomEvent<UiSearchDialogQueryChangedDetail>('ui-search-dialog-query-changed', {
        detail: {
          query: value,
        },
        bubbles: true,
        composed: true,
      }),
    );
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
      this._selectionModel.getActiveIndex(),
    );

    return renderSearchDialog({
      query: this.query,
      loading: this.loading,
      unavailable: this.searchUnavailable,
      unavailableMessage: this.searchUnavailableReason
        ? getSearchBootstrapUnavailableMessage(this.searchUnavailableReason)
        : '',
      results: this._results,
      activeId: this._activeId,
      liveMessage: this._liveMessage,
      hasCompletedSearch: this._hasCompletedSearch,
      error: this._error,
      visibleRange,
      messages: this._getMessages(),
      getOptionId: (itemId) => this._selectionModel.getOptionId(itemId),
      renderHighlightedText: (value) => renderSearchDialogHighlightedText(value, this.query),
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

  private _getMessages(): UiSearchDialogMessages {
    return {
      ...DEFAULT_MESSAGES,
      ...Object.fromEntries(
        Object.entries(this.messages).filter(
          ([, value]) => typeof value === 'string' && value.trim() !== '',
        ),
      ),
    } as UiSearchDialogMessages;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-search-dialog': UiSearchDialog;
  }
}
