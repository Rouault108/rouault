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
        <span class="search-dialog__field-icon" aria-hidden="true">
          ${renderStaticArticleHeaderIconHtml('search', 'search-dialog__icon')}
        </span>
        <input
          id="global-search-input"
          class="search-dialog__input"
          type="search"
          autocomplete="off"
          placeholder="メモを検索"
          data-search-dialog-input
        >
        <button class="search-dialog__close" type="button" aria-label="検索を閉じる" data-search-dialog-close>
          ${renderStaticArticleHeaderIconHtml('x', 'search-dialog__icon')}
        </button>
      </form>
      <div class="search-dialog__body">
        <p class="search-dialog__status" aria-live="polite" data-search-dialog-status>
          キーワードを入力して検索できます。
        </p>
        <ol class="search-dialog__results" data-search-dialog-results></ol>
      </div>
      <footer class="search-dialog__footer" aria-hidden="true">
        <span><kbd>Enter</kbd> 移動</span>
        <span><kbd>Esc</kbd> 閉じる</span>
      </footer>
    </dialog>
  </section>
`.trim();
