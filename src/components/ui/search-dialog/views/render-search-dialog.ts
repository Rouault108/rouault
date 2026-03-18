import { html, type TemplateResult } from 'lit';
import {
  CLEAR_BUTTON_LABEL,
  CLOSE_BUTTON_LABEL,
  DIALOG_LABEL,
  EMPTY_DESCRIPTION,
  EMPTY_HEADING,
  INPUT_PLACEHOLDER,
  LISTBOX_ID,
  LOADING_MESSAGE,
  SEARCH_RESULTS_ARIA_LABEL,
} from '../search-dialog.constants';
import type { SearchDialogHighlightRenderValue } from '../internals/search-dialog-highlight';
import type { UiSearchDialogItem, VisibleRange } from '../search-dialog.types';

export interface RenderSearchDialogHost {
  query: string;
  loading: boolean;
  results: readonly UiSearchDialogItem[];
  activeIndex: number;
  liveMessage: string;
  hasCompletedSearch: boolean;
  visibleRange: VisibleRange;

  getOptionId: (index: number) => string;
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
  const showLoading = host.loading;
  const showResults = !showLoading && host.results.length > 0;
  const showEmpty =
    !showLoading && hasQuery && host.hasCompletedSearch && host.results.length === 0;
  const activeOptionId = host.activeIndex >= 0 ? host.getOptionId(host.activeIndex) : '';
  const visibleResults = showResults
    ? host.results.slice(host.visibleRange.start, host.visibleRange.end)
    : [];

  return html`
    <dialog
      class="dialog"
      aria-label=${DIALOG_LABEL}
      aria-modal="true"
      @mousedown=${host.onDialogMouseDown}
      @cancel=${host.onDialogCancel}
      @close=${host.onDialogClose}
    >
      <div class="sr-only" aria-live="polite" aria-atomic="true">${host.liveMessage}</div>

      <div class="header">
        <ui-search-field
          class="search-field"
          label=${DIALOG_LABEL}
          hide-label
          clear-button-label=${CLEAR_BUTTON_LABEL}
          .inputRole=${'combobox'}
          .inputAriaExpanded=${showResults ? 'true' : 'false'}
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
          aria-label=${CLOSE_BUTTON_LABEL}
          @click=${host.onCloseClick}
          @keydown=${host.onCloseButtonKeydown}
        >
          <iconify-icon icon="lucide:x" aria-hidden="true"></iconify-icon>
        </button>
      </div>

      <div class="body">
        <div class="loading-state" ?hidden=${!showLoading}>
          <ui-spinner size="lg"></ui-spinner>
          <p>${LOADING_MESSAGE}</p>
        </div>

        <section class="empty-state" role="status" aria-atomic="true" ?hidden=${!showEmpty}>
          <div class="empty-state-content">
            <div class="empty-state-icon" aria-hidden="true">
              <iconify-icon icon="lucide:search"></iconify-icon>
            </div>
            <h2 class="empty-state-heading">${EMPTY_HEADING}</h2>
            <p class="empty-state-description">${EMPTY_DESCRIPTION}</p>
          </div>
        </section>

        <ul
          id=${LISTBOX_ID}
          class="result-list"
          role="listbox"
          aria-label=${SEARCH_RESULTS_ARIA_LABEL}
          ?hidden=${!showResults}
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
            const isActive = index === host.activeIndex;

            return html`
              <li
                id=${host.getOptionId(index)}
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
        <span><kbd>↑</kbd><kbd>↓</kbd>移動</span>
        <span><kbd>Enter</kbd> 選択</span>
      </div>
    </dialog>
  `;
}