import { html, type TemplateResult } from 'lit';
import {
  CLEAR_BUTTON_LABEL,
  CLOSE_BUTTON_LABEL,
  DIALOG_LABEL,
  EMPTY_DESCRIPTION,
  EMPTY_HEADING,
  ERROR_DESCRIPTION,
  ERROR_HEADING,
  INPUT_PLACEHOLDER,
  KEYBOARD_HINT,
  LISTBOX_ID,
  LOADING_HEADING,
  LOADING_MESSAGE,
  SEARCH_RESULTS_ARIA_LABEL,
} from '../search-dialog.constants.js';
import type { SearchDialogHighlightRenderValue } from '../internals/search-dialog-highlight.js';
import type {
  UiSearchDialogItem,
  UiSearchDialogMessages,
  UiSearchDialogSearchError,
  VisibleRange,
} from '../search-dialog.types.js';

export interface RenderSearchDialogHost {
  query: string;
  loading: boolean;
  unavailable: boolean;
  unavailableMessage: string;
  results: readonly UiSearchDialogItem[];
  activeId: string | null;
  liveMessage: string;
  hasCompletedSearch: boolean;
  error: UiSearchDialogSearchError | null;
  visibleRange: VisibleRange;
  messages: UiSearchDialogMessages;

  getOptionId: (itemId: string) => string;
  renderHighlightedText: (value: string) => SearchDialogHighlightRenderValue;
  resolvePath: (item: UiSearchDialogItem) => string;

  onInput: (event: Event) => void;
  onSearchFieldKeydown: (event: KeyboardEvent) => void;
  onCloseClick: () => void;
  onCloseButtonKeydown: (event: KeyboardEvent) => void;
  onDialogMouseDown: (event: MouseEvent) => void;
  onDialogCancel: (event: Event) => void;
  onDialogClose: () => void;
  onResultListScroll: (event: Event) => void;
  onResultClick: (event: Event) => void;
  onResultKeydown: (event: KeyboardEvent) => void;
}

export function renderSearchDialog(host: RenderSearchDialogHost): TemplateResult {
  const hasQuery = host.query.trim() !== '';
  const showUnavailable = host.unavailable;
  const showLoading = !showUnavailable && host.loading;
  const showError = !showUnavailable && !showLoading && host.error !== null;
  const showResults = !showUnavailable && !showLoading && !showError && host.results.length > 0;
  const showEmpty =
    !showUnavailable &&
    !showLoading &&
    !showError &&
    hasQuery &&
    host.hasCompletedSearch &&
    host.results.length === 0;
  const activeOptionId = host.activeId ? host.getOptionId(host.activeId) : '';
  const visibleResults = showResults
    ? host.results.slice(host.visibleRange.start, host.visibleRange.end)
    : [];
  const dialogLabel = host.messages.dialogLabel || DIALOG_LABEL;
  const clearLabel = host.messages.clearLabel || CLEAR_BUTTON_LABEL;
  const closeLabel = host.messages.closeLabel || CLOSE_BUTTON_LABEL;
  const loadingHeading = host.messages.loadingHeading || LOADING_HEADING;
  const loadingDescription = host.messages.loadingDescription || LOADING_MESSAGE;
  const emptyHeading = host.messages.emptyHeading || EMPTY_HEADING;
  const emptyDescription = host.messages.emptyDescription || EMPTY_DESCRIPTION;
  const errorHeading = host.messages.errorHeading || ERROR_HEADING;
  const errorDescription = host.messages.errorDescription || ERROR_DESCRIPTION;
  const keyboardHint = host.messages.keyboardHint || KEYBOARD_HINT;

  return html`
    <dialog
      class="dialog"
      aria-label=${dialogLabel}
      aria-modal="true"
      @mousedown=${host.onDialogMouseDown}
      @cancel=${host.onDialogCancel}
      @close=${host.onDialogClose}
    >
      <div class="sr-only" aria-live="polite" aria-atomic="true">${host.liveMessage}</div>

      <div class="header">
        <ui-search-field
          class="search-field"
          label=${dialogLabel}
          hide-label
          clear-button-label=${clearLabel}
          .inputRole=${'combobox'}
          .inputAriaExpanded=${showResults || showEmpty || showError ? 'true' : 'false'}
          .inputAriaAutocomplete=${'list'}
          .inputAriaControls=${LISTBOX_ID}
          .inputAriaActivedescendant=${activeOptionId}
          .inputAriaBusy=${host.loading ? 'true' : 'false'}
          placeholder=${INPUT_PLACEHOLDER}
          autocomplete="off"
          .value=${host.query}
          @input=${host.onInput}
          @keydown=${host.onSearchFieldKeydown}
        ></ui-search-field>

        <button
          class="close-button"
          type="button"
          aria-label=${closeLabel}
          @click=${host.onCloseClick}
          @keydown=${host.onCloseButtonKeydown}
        >
          <ui-icon name="x" aria-hidden="true"></ui-icon>
        </button>
      </div>

      <div class="body">
        <section class="error-state" role="status" aria-atomic="true" .hidden=${!showUnavailable}>
          <div class="empty-state-content">
            <div class="empty-state-icon" aria-hidden="true">
              <ui-icon name="alert-circle"></ui-icon>
            </div>
            <h2 class="empty-state-heading">検索を利用できません</h2>
            <p class="empty-state-description">${host.unavailableMessage}</p>
          </div>
        </section>

        <div class="loading-state" .hidden=${!showLoading}>
          <ui-spinner size="lg"></ui-spinner>
          <div class="status-copy" role="status" aria-atomic="true">
            <h2 class="status-heading">${loadingHeading}</h2>
            <p>${loadingDescription}</p>
          </div>
        </div>

        <section class="empty-state" role="status" aria-atomic="true" .hidden=${!showEmpty}>
          <div class="empty-state-content">
            <div class="empty-state-icon" aria-hidden="true">
              <ui-icon name="search"></ui-icon>
            </div>
            <h2 class="empty-state-heading">${emptyHeading}</h2>
            <p class="empty-state-description">${emptyDescription}</p>
          </div>
        </section>

        <section class="error-state" role="status" aria-atomic="true" .hidden=${!showError}>
          <div class="empty-state-content">
            <div class="empty-state-icon" aria-hidden="true">
              <ui-icon name="alert-circle"></ui-icon>
            </div>
            <h2 class="empty-state-heading">${errorHeading}</h2>
            <p class="empty-state-description">
              ${host.error?.message && host.error.message.trim() !== ''
                ? host.error.message
                : errorDescription}
            </p>
          </div>
        </section>

        <ul
          id=${LISTBOX_ID}
          class="result-list"
          role="listbox"
          aria-label=${SEARCH_RESULTS_ARIA_LABEL}
          .hidden=${!showResults}
          @scroll=${host.onResultListScroll}
        >
          <li
            class="virtual-spacer"
            role="presentation"
            aria-hidden="true"
            style=${`block-size:${host.visibleRange.topSpacer.toString()}px`}
          ></li>

          ${visibleResults.map((item, visibleIndex) => {
            const index = host.visibleRange.start + visibleIndex;
            const isActive = item.id === host.activeId;

            return html`
              <li
                id=${host.getOptionId(item.id)}
                class="result-item"
                role="option"
                aria-selected=${isActive ? 'true' : 'false'}
                tabindex="-1"
                data-index=${index.toString()}
                @click=${host.onResultClick}
                @keydown=${host.onResultKeydown}
              >
                <span class="item-title">${host.renderHighlightedText(item.title)}</span>
                <span class="item-path">
                  ${host.renderHighlightedText(host.resolvePath(item))}
                </span>
              </li>
            `;
          })}

          <li
            class="virtual-spacer"
            role="presentation"
            aria-hidden="true"
            style=${`block-size:${host.visibleRange.bottomSpacer.toString()}px`}
          ></li>
        </ul>
      </div>

      <div class="footer" aria-hidden="true">
        <span>${keyboardHint}</span>
      </div>
    </dialog>
  `;
}
