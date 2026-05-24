import { renderStaticArticleHeaderIconHtml } from './article-header-icon-html.js';

export const GLOBAL_SEARCH_DIALOG_ID = 'global-search-dialog';

export const renderSearchDialogHtml = (): string => `
  <section data-hydration-scope="global-search" data-search-dialog-scope>
    <dialog
      id="${GLOBAL_SEARCH_DIALOG_ID}"
      class="search-dialog"
      data-search-dialog-root
      data-hydration-key="search-dialog-enhancer"
      data-hydration-capability="interactive"
      data-hydration-trigger="initial"
    >
      <form class="search-dialog__header" role="search" method="dialog" data-search-dialog-form>
        <label class="sr-only" for="global-search-input">検索</label>
        <div class="search-dialog__field">
          <span class="search-dialog__field-icon" aria-hidden="true">
            ${renderStaticArticleHeaderIconHtml('search', 'search-dialog__field-icon-svg')}
          </span>
          <input
            id="global-search-input"
            class="search-dialog__input"
            type="search"
            role="combobox"
            aria-expanded="false"
            aria-autocomplete="list"
            aria-controls="global-search-results"
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
            ${renderStaticArticleHeaderIconHtml('x', 'search-dialog__clear-icon')}
          </button>
        </div>
        <button class="search-dialog__close" type="button" aria-label="検索を閉じる" data-search-dialog-close>
          ${renderStaticArticleHeaderIconHtml('x', 'search-dialog__icon')}
        </button>
      </form>
      <div class="search-dialog__body">
        <p
          class="search-dialog__status sr-only"
          aria-live="polite"
          aria-atomic="true"
          data-search-dialog-status
          data-search-dialog-live
        >
          キーワードを入力して検索できます。
        </p>
        <section
          class="search-dialog__unavailable search-dialog__state"
          role="status"
          aria-atomic="true"
          hidden
          data-search-dialog-unavailable
        >
          <div class="search-dialog__state-content">
            <span class="search-dialog__state-icon" aria-hidden="true"></span>
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
            <span class="search-dialog__state-icon" aria-hidden="true"></span>
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
            <span class="search-dialog__state-icon" aria-hidden="true"></span>
            <h2 class="search-dialog__state-heading">検索を表示できません</h2>
            <p class="search-dialog__state-description" data-search-dialog-error-message></p>
          </div>
        </section>
        <ol
          id="global-search-results"
          class="search-dialog__results"
          role="listbox"
          aria-label="検索結果"
          data-search-dialog-results
        ></ol>
      </div>
      <footer class="search-dialog__footer" aria-hidden="true">
        <span><kbd>Enter</kbd> 移動</span>
        <span><kbd>Esc</kbd> 閉じる</span>
      </footer>
    </dialog>
  </section>
`.trim();
