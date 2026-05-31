import { renderStaticIconHtml } from '../../shared/icons/render-static-icon-html.js';
import {
  createStaticRenderIdContext,
  type StaticRenderIdContext,
} from '../../shared/static-render-id-context.js';
import { SEARCH_DIALOG_STATUS_IDLE_MESSAGE } from '../search/search-dialog-constants.js';

export const GLOBAL_SEARCH_DIALOG_ID = 'global-search-dialog';

export const renderSearchDialogHtml = (options: { readonly idContext?: StaticRenderIdContext } = {}): string => {
  const idContext =
    options.idContext ?? createStaticRenderIdContext('shell:search-dialog');
  const dialogId = idContext.reserveId('search-dialog', GLOBAL_SEARCH_DIALOG_ID);
  const inputId = idContext.reserveId('search-dialog', 'global-search-input');
  const resultsId = idContext.reserveId('search-dialog', 'global-search-results');

  return `
  <section data-hydration-scope="global-search" data-search-dialog-scope>
    <dialog
      id="${dialogId}"
      class="search-dialog"
      aria-label="検索"
      aria-modal="true"
      data-search-dialog-root
      data-hydration-key="search-dialog-enhancer"
      data-hydration-capability="interactive"
      data-hydration-trigger="initial"
    >
      <div class="search-dialog__header" role="search" data-search-dialog-form>
        <label class="sr-only" for="${inputId}">検索</label>
        <div class="search-dialog__field" data-search-dialog-field>
          <span class="search-dialog__field-icon" aria-hidden="true">
            ${renderStaticIconHtml('search', 'search-dialog__field-icon-svg')}
          </span>
          <input
            id="${inputId}"
            class="search-dialog__input"
            type="search"
            role="combobox"
            aria-expanded="false"
            aria-autocomplete="list"
            aria-controls="${resultsId}"
            autocomplete="off"
            placeholder="メモを検索"
            data-search-dialog-input
          >
          <button
            class="search-dialog__clear"
            type="button"
            aria-label="検索をクリア"
            hidden
            data-search-dialog-clear
          >
            ${renderStaticIconHtml('x', 'search-dialog__clear-icon')}
          </button>
        </div>
        <button class="search-dialog__close" type="button" aria-label="検索を閉じる" data-search-dialog-close>
          ${renderStaticIconHtml('x', 'search-dialog__icon')}
        </button>
      </div>
      <div class="search-dialog__body">
        <p
          class="search-dialog__status sr-only"
          aria-live="polite"
          aria-atomic="true"
          data-search-dialog-status
          data-search-dialog-live
        >
          ${SEARCH_DIALOG_STATUS_IDLE_MESSAGE}
        </p>
        <section
          class="search-dialog__unavailable search-dialog__state"
          role="status"
          aria-atomic="true"
          hidden
          data-search-dialog-unavailable
        >
          <div class="search-dialog__state-content">
            ${renderStaticIconHtml('alert-circle', 'search-dialog__state-icon')}
            <h2 class="search-dialog__state-heading">検索を利用できません</h2>
            <p class="search-dialog__state-description" data-search-dialog-unavailable-message></p>
          </div>
        </section>
        <div class="search-dialog__loading search-dialog__state" hidden data-search-dialog-loading>
          <div class="search-dialog__spinner" aria-hidden="true"></div>
          <div class="search-dialog__status-copy" role="status" aria-atomic="true">
            <h2 class="search-dialog__status-heading">検索しています</h2>
            <p>検索インデックスを照会しています。</p>
          </div>
        </div>
        <section
          class="search-dialog__empty search-dialog__state"
          role="status"
          aria-atomic="true"
          hidden
          data-search-dialog-empty
        >
          <div class="search-dialog__state-content">
            ${renderStaticIconHtml('search', 'search-dialog__state-icon')}
            <h2 class="search-dialog__state-heading">一致するメモが見つかりません</h2>
            <p class="search-dialog__state-description">検索語を変えて試してください。</p>
          </div>
        </section>
        <section
          class="search-dialog__error search-dialog__state"
          role="status"
          aria-atomic="true"
          hidden
          data-search-dialog-error
        >
          <div class="search-dialog__state-content">
            ${renderStaticIconHtml('alert-circle', 'search-dialog__state-icon')}
            <h2 class="search-dialog__state-heading">検索を表示できません</h2>
            <p class="search-dialog__state-description" data-search-dialog-error-message></p>
          </div>
        </section>
        <ul
          id="${resultsId}"
          class="search-dialog__results"
          role="listbox"
          aria-label="検索結果"
          hidden
          data-search-dialog-results
        ></ul>
      </div>
      <footer class="search-dialog__footer" aria-hidden="true">
        <span><kbd>Enter</kbd> 移動</span>
        <span><kbd>Esc</kbd> 閉じる</span>
      </footer>
    </dialog>
  </section>
`.trim();
};
