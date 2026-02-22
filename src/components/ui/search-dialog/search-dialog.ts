import { css, html, LitElement, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import '../../../lib/icons';
import '../empty-state/empty-state';
import '../spinner/spinner';

const SEARCH_DEBOUNCE_MS = 150;
const DIALOG_LABEL = '検索';
const INPUT_PLACEHOLDER = '検索...';
const CLEAR_BUTTON_LABEL = '検索をクリア';
const LISTBOX_ID = 'search-listbox';
const LOADING_MESSAGE = 'インデックスを読み込んでいます...';
const EMPTY_HEADING = '一致する結果がありません';
const EMPTY_DESCRIPTION = '別のキーワードで検索してください';

export interface UiSearchDialogItem {
  title: string;
  url: string;
  path?: string;
  keywords?: readonly string[];
}

export interface UiSearchDialogOpenedDetail {
  trigger: HTMLElement | null;
}

export interface UiSearchDialogSelectedDetail {
  url: string;
  title: string;
}

export type UiSearchDialogSearcher = (
  query: string,
) => Promise<readonly UiSearchDialogItem[]> | readonly UiSearchDialogItem[];

@customElement('ui-search-dialog')
export class UiSearchDialog extends LitElement {
  static override styles = css`
    :host {
      display: block;
      --ui-search-dialog-max-width: min(640px, 90vw);
      --ui-search-dialog-max-height: min(480px, 80vh);
      --ui-search-dialog-position-top: 20%;
      --ui-search-dialog-edge-highlight: oklch(100% 0 0 / 0.08);
    }

    [hidden] {
      display: none !important;
    }

    dialog {
      box-sizing: border-box;
      margin: var(--ui-search-dialog-position-top) auto 0;
      padding: 0;
      border: var(--border-width, 1px) solid var(--border-default, oklch(88% 0.01 250 / 0.7));
      border-radius: var(--radius-xl, 12px);
      inline-size: var(--ui-search-dialog-max-width);
      max-inline-size: var(--ui-search-dialog-max-width);
      max-block-size: var(--ui-search-dialog-max-height);
      overflow: hidden;
      background: var(--bg-default, oklch(100% 0 0));
      color: var(--fg-default, oklch(20% 0.03 250));
      box-shadow: var(--elevation-xl, 0 16px 40px oklch(0% 0 0 / 0.32));
      animation: search-dialog-enter var(--duration-normal, 150ms)
        var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)) forwards;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr) auto;
      z-index: var(--z-modal, 300);
    }

    @media (prefers-color-scheme: dark) {
      dialog {
        background: var(--bg-surface-3, oklch(22% 0.02 250));
        border-top-color: var(--ui-search-dialog-edge-highlight);
      }
    }

    dialog::backdrop {
      background: oklch(0% 0 0 / var(--opacity-scrim, 0.6));
      backdrop-filter: blur(var(--blur-lg, 24px));
      animation: search-backdrop-enter var(--duration-normal, 150ms)
        var(--ease-out, cubic-bezier(0.2, 0, 0.38, 0.9)) forwards;
      z-index: var(--z-backdrop, 200);
    }

    dialog[data-closing] {
      animation: search-dialog-exit var(--duration-normal, 150ms)
        var(--ease-in, cubic-bezier(0.55, 0, 1, 0.45)) forwards;
    }

    dialog[data-closing]::backdrop {
      animation: search-backdrop-exit var(--duration-normal, 150ms)
        var(--ease-in, cubic-bezier(0.55, 0, 1, 0.45)) forwards;
    }

    .sr-only {
      position: absolute;
      inline-size: 1px;
      block-size: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: var(--space-2, 8px);
      border-bottom: var(--border-width, 1px) solid var(--border-default, oklch(88% 0.01 250 / 0.7));
      padding: var(--space-2, 8px) var(--space-3, 12px);
    }

    .input-wrapper {
      position: relative;
      min-block-size: var(--control-height-md, 32px);
      display: flex;
      align-items: center;
    }

    .input-wrapper::after {
      content: '';
      position: absolute;
      inset: 50% auto auto 50%;
      transform: translate(-50%, -50%);
      inline-size: 100%;
      block-size: var(--control-min-touch, 44px);
      pointer-events: none;
    }

    .search-input {
      inline-size: 100%;
      block-size: var(--control-height-md, 32px);
      border: none;
      background: transparent;
      color: var(--fg-default, oklch(20% 0.03 250));
      font: inherit;
      font-size: var(--text-base, 14px);
      line-height: 1.4;
      padding: 0 var(--space-1, 4px);
      outline: none;
    }

    .search-input::placeholder {
      color: var(--fg-subtle, oklch(65% 0.02 250));
    }

    .search-input:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(55% 0.2 250));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus, none);
      border-radius: var(--radius-sm, 4px);
    }

    .clear-button {
      position: relative;
      inline-size: var(--control-height-sm, 24px);
      block-size: var(--control-height-sm, 24px);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: none;
      border-radius: var(--radius-sm, 4px);
      background: transparent;
      color: var(--fg-muted, oklch(48% 0.02 250));
      cursor: pointer;
      padding: 0;
      transition:
        color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1)),
        background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1));
    }

    .clear-button::after {
      content: '';
      position: absolute;
      inset: 50% auto auto 50%;
      transform: translate(-50%, -50%);
      inline-size: var(--control-min-touch, 44px);
      block-size: var(--control-min-touch, 44px);
      pointer-events: none;
    }

    .clear-button:hover {
      color: var(--fg-default, oklch(20% 0.03 250));
      background: var(--bg-hover, oklch(from var(--fg-default, oklch(20% 0.03 250)) l c h / 0.06));
    }

    .clear-button:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(55% 0.2 250));
      outline-offset: var(--focus-ring-offset, 2px);
      animation: var(--animation-focus, none);
    }

    .clear-button iconify-icon {
      inline-size: var(--icon-sm, 14px);
      block-size: var(--icon-sm, 14px);
      font-size: var(--icon-sm, 14px);
    }

    .body {
      min-block-size: 0;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .loading-state {
      min-block-size: 100%;
      display: grid;
      place-items: center;
      align-content: center;
      gap: var(--space-3, 12px);
      padding: var(--space-6, 24px);
      color: var(--fg-muted, oklch(48% 0.02 250));
      text-align: center;
    }

    .loading-state p {
      margin: 0;
      font-size: var(--text-sm, 13px);
      color: inherit;
    }

    .empty-state {
      --space-12: var(--space-6, 24px);
      --space-8: var(--space-4, 16px);
      min-block-size: 100%;
      border: none;
    }

    .result-list {
      list-style: none;
      margin: 0;
      padding: var(--space-2, 8px);
      overflow-y: auto;
      min-block-size: 0;
    }

    .result-item {
      display: grid;
      gap: 2px;
      padding: var(--space-2, 8px) var(--space-3, 12px);
      border-radius: var(--radius-sm, 4px);
      cursor: pointer;
    }

    .result-item[aria-selected='true'] {
      background: var(--bg-surface-active, oklch(94% 0.01 250 / 0.7));
    }

    .result-item:focus-visible {
      outline: var(--focus-ring-width, 2px) solid var(--focus-ring-color, oklch(55% 0.2 250));
      outline-offset: -1px;
    }

    .item-title {
      font-size: var(--text-base, 14px);
      color: var(--fg-default, oklch(20% 0.03 250));
      line-height: 1.4;
      word-break: break-word;
    }

    .item-path {
      font-size: var(--text-xs, 12px);
      color: var(--fg-muted, oklch(48% 0.02 250));
      line-height: 1.4;
      word-break: break-all;
    }

    .footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-4, 16px);
      border-top: var(--border-width, 1px) solid var(--border-default, oklch(88% 0.01 250 / 0.7));
      padding: var(--space-2, 8px) var(--space-3, 12px);
      font-size: var(--text-xs, 12px);
      color: var(--fg-muted, oklch(48% 0.02 250));
    }

    .footer span {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1, 4px);
    }

    .footer kbd {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-inline-size: 1.2em;
      padding: var(--space-1, 4px) var(--space-2, 8px);
      border-radius: var(--radius-sm, 4px);
      background: var(--bg-fill-muted, oklch(95% 0 0));
      color: var(--fg-default, oklch(20% 0.03 250));
      font-size: inherit;
      font-family: inherit;
      line-height: 1;
    }

    @keyframes search-dialog-enter {
      from {
        opacity: 0;
        transform: scale(var(--scale-enter, 0.97));
      }

      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes search-dialog-exit {
      from {
        opacity: 1;
        transform: scale(1);
      }

      to {
        opacity: 0;
        transform: scale(var(--scale-enter, 0.97));
      }
    }

    @keyframes search-backdrop-enter {
      from {
        opacity: 0;
      }

      to {
        opacity: 1;
      }
    }

    @keyframes search-backdrop-exit {
      from {
        opacity: 1;
      }

      to {
        opacity: 0;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      dialog,
      dialog[data-closing],
      dialog::backdrop,
      dialog[data-closing]::backdrop {
        animation: none !important;
      }
    }

    @media (forced-colors: active) {
      dialog {
        background: Canvas;
        border: 2px solid CanvasText;
        box-shadow: none;
      }

      dialog::backdrop {
        background: Canvas;
        opacity: 0.7;
        backdrop-filter: none;
      }

      .result-item[aria-selected='true'] {
        outline: 2px solid Highlight;
        outline-offset: -2px;
      }

      .clear-button {
        border: 1px solid ButtonText;
        color: ButtonText;
      }
    }

    @media print {
      dialog,
      dialog::backdrop {
        display: none !important;
      }
    }
  `;

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

  @query('dialog')
  private _dialogElement?: HTMLDialogElement;

  @query('.search-input')
  private _inputElement?: HTMLInputElement;

  private _triggerElement: HTMLElement | null = null;
  private _isClosing = false;
  private _operation: Promise<void> = Promise.resolve();
  private _searchTimerId: number | undefined;
  private _searchToken = 0;

  private static _scrollLockCount = 0;
  private static _savedOverflow = '';
  private static _savedScrollbarGutter = '';

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._clearSearchTimer();
    if (this._dialogElement?.open) {
      UiSearchDialog._unlockBodyScroll();
    }
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has('opened')) {
      this._enqueue(async () => {
        if (this.opened) {
          await this._openDialog();
          return;
        }
        await this._closeDialog();
      });
    }

    if (changedProperties.has('query')) {
      this._scheduleSearch();
    }

    if (changedProperties.has('loading')) {
      if (this.loading) {
        this._setLiveMessage(LOADING_MESSAGE);
        return;
      }

      if (this.query.trim() !== '') {
        this._scheduleSearch();
      } else {
        this._setLiveMessage('');
      }
    }
  }

  open(trigger?: HTMLElement): void {
    this._captureTrigger(trigger);
    if (this.opened) return;
    this.opened = true;
  }

  close(): void {
    if (!this.opened && !this._dialogElement?.open) return;
    this.opened = false;
  }

  private _enqueue(task: () => Promise<void>): void {
    this._operation = this._operation.then(task).catch((error: unknown) => {
      console.error('[ui-search-dialog] operation failed', error);
    });
  }

  private async _openDialog(): Promise<void> {
    const dialog = this._dialogElement;
    if (!dialog) return;

    if (dialog.open) {
      UiSearchDialog._lockBodyScroll();
      this._focusInput();
      return;
    }

    if (!this._triggerElement) {
      this._captureTrigger();
    }

    try {
      dialog.showModal();
    } catch {
      this.opened = false;
      return;
    }

    UiSearchDialog._lockBodyScroll();
    this._focusInput();

    if (this.query.trim() !== '' && !this.loading) {
      this._scheduleSearch();
    }

    await this._waitForAnimations(dialog);
    if (!this.opened) return;

    this.dispatchEvent(
      new CustomEvent<UiSearchDialogOpenedDetail>('ui-search-dialog-opened', {
        detail: { trigger: this._triggerElement },
      }),
    );
  }

  private async _closeDialog(): Promise<void> {
    const dialog = this._dialogElement;
    if (!dialog) return;
    if (!dialog.open) {
      UiSearchDialog._unlockBodyScroll();
      return;
    }
    if (this._isClosing) return;

    this._clearSearchTimer();
    this._isClosing = true;

    dialog.setAttribute('data-closing', '');
    await this._waitForAnimations(dialog);
    dialog.removeAttribute('data-closing');
    dialog.close();

    this._isClosing = false;
    UiSearchDialog._unlockBodyScroll();
    this._restoreTriggerFocus();
    this.dispatchEvent(new CustomEvent('ui-search-dialog-closed'));
  }

  private async _waitForAnimations(dialog: HTMLDialogElement): Promise<void> {
    const animations = dialog.getAnimations();
    if (animations.length === 0) {
      await Promise.resolve();
      return;
    }

    await Promise.allSettled(animations.map((animation) => animation.finished));
  }

  private _focusInput(): void {
    requestAnimationFrame(() => {
      this._inputElement?.focus({ preventScroll: true });
      this._inputElement?.setSelectionRange(this.query.length, this.query.length);
    });
  }

  private _captureTrigger(trigger?: HTMLElement): void {
    if (trigger instanceof HTMLElement) {
      this._triggerElement = trigger;
      return;
    }

    const activeElement = this.ownerDocument.activeElement;
    this._triggerElement = activeElement instanceof HTMLElement ? activeElement : null;
  }

  private _restoreTriggerFocus(): void {
    const trigger = this._triggerElement;
    if (!trigger?.isConnected) return;
    trigger.focus({ preventScroll: true });
  }

  private _clearSearchTimer(): void {
    if (typeof this._searchTimerId !== 'number') return;
    window.clearTimeout(this._searchTimerId);
    this._searchTimerId = undefined;
  }

  private _scheduleSearch(): void {
    this._clearSearchTimer();
    this._searchToken += 1;

    const trimmedQuery = this.query.trim();
    if (trimmedQuery === '') {
      this._results = [];
      this._activeIndex = -1;
      this._setLiveMessage('');
      return;
    }

    if (this.loading) {
      this._setLiveMessage(LOADING_MESSAGE);
      return;
    }

    const currentToken = this._searchToken;
    this._searchTimerId = window.setTimeout(() => {
      void this._executeSearch(trimmedQuery, currentToken);
    }, SEARCH_DEBOUNCE_MS);
  }

  private async _executeSearch(query: string, token: number): Promise<void> {
    const rawResults = await this._runSearch(query);
    if (token !== this._searchToken) return;
    if (query !== this.query.trim()) return;

    const normalizedResults = this._normalizeResults(rawResults);
    this._results = normalizedResults;
    this._activeIndex = normalizedResults.length > 0 ? 0 : -1;

    if (normalizedResults.length === 0) {
      this._setLiveMessage(EMPTY_HEADING);
      return;
    }

    this._setLiveMessage(`${normalizedResults.length.toString()} 件の結果が見つかりました`);
    this._scrollActiveOptionIntoView();
  }

  private async _runSearch(query: string): Promise<readonly UiSearchDialogItem[]> {
    const searcher = this.searcher;
    if (typeof searcher === 'function') {
      return searcher(query);
    }

    return this._filterItems(query);
  }

  private _filterItems(query: string): UiSearchDialogItem[] {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery === '') return [];

    return this.items.filter((item) => {
      const title = item.title.toLowerCase();
      const path = (item.path ?? '').toLowerCase();
      const keywords = (item.keywords ?? []).map((keyword) => keyword.toLowerCase()).join(' ');

      return title.includes(normalizedQuery) || path.includes(normalizedQuery) || keywords.includes(normalizedQuery);
    });
  }

  private _normalizeResults(results: readonly UiSearchDialogItem[]): UiSearchDialogItem[] {
    const normalized: UiSearchDialogItem[] = [];
    const seen = new Set<string>();

    for (const item of results) {
      const title = item.title.trim();
      const url = item.url.trim();
      if (title === '' || url === '') continue;

      const path = typeof item.path === 'string' && item.path.trim() !== '' ? item.path.trim() : '';
      const key = `${url}::${title}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const normalizedItem: UiSearchDialogItem = {
        title,
        url,
      };

      if (path !== '') {
        normalizedItem.path = path;
      }

      if (Array.isArray(item.keywords) && item.keywords.length > 0) {
        normalizedItem.keywords = item.keywords;
      }

      normalized.push(normalizedItem);
    }

    return normalized;
  }

  private _setLiveMessage(message: string): void {
    if (this._liveMessage === message) return;
    this._liveMessage = message;
  }

  private _onInput = (event: Event): void => {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement)) return;
    this.query = input.value;
  };

  private _onInputKeydown = (event: KeyboardEvent): void => {
    if (this.loading) return;

    switch (event.key) {
      case 'ArrowDown':
        if (this._results.length === 0) return;
        event.preventDefault();
        this._moveActiveIndex(1);
        break;

      case 'ArrowUp':
        if (this._results.length === 0) return;
        event.preventDefault();
        this._moveActiveIndex(-1);
        break;

      case 'Enter':
        if (this._results.length === 0) return;
        event.preventDefault();
        this._selectActiveResult();
        break;

      default:
        break;
    }
  };

  private _moveActiveIndex(delta: 1 | -1): void {
    const total = this._results.length;
    if (total === 0) return;

    if (this._activeIndex < 0) {
      this._activeIndex = delta === 1 ? 0 : total - 1;
    } else {
      this._activeIndex = (this._activeIndex + delta + total) % total;
    }

    this._scrollActiveOptionIntoView();
  }

  private _scrollActiveOptionIntoView(): void {
    if (this._activeIndex < 0) return;
    const shadowRoot = this.shadowRoot;
    if (!shadowRoot) return;

    const activeOptionId = this._getOptionId(this._activeIndex);
    const activeOption = shadowRoot.getElementById(activeOptionId);
    activeOption?.scrollIntoView({ block: 'nearest' });
  }

  private _selectActiveResult(): void {
    const index = this._activeIndex >= 0 ? this._activeIndex : 0;
    const item = this._results[index];
    if (!item) return;

    this.dispatchEvent(
      new CustomEvent<UiSearchDialogSelectedDetail>('ui-search-dialog-selected', {
        detail: { url: item.url, title: item.title },
      }),
    );
    this.close();
  }

  private _onResultClick = (event: Event): void => {
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) return;

    const index = Number(target.dataset['index'] ?? '-1');
    if (!Number.isInteger(index) || index < 0 || index >= this._results.length) return;
    this._activeIndex = index;
    this._selectActiveResult();
  };

  private _onResultKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) return;

    event.preventDefault();
    const index = Number(target.dataset['index'] ?? '-1');
    if (!Number.isInteger(index) || index < 0 || index >= this._results.length) return;

    this._activeIndex = index;
    this._selectActiveResult();
  };

  private _onClear = (): void => {
    this.query = '';
    this._inputElement?.focus({ preventScroll: true });
  };

  private _onDialogCancel = (event: Event): void => {
    event.preventDefault();
    this.close();
  };

  private _onNativeClose = (): void => {
    if (this._isClosing) return;
    this.opened = false;
    UiSearchDialog._unlockBodyScroll();
    this._restoreTriggerFocus();
    this.dispatchEvent(new CustomEvent('ui-search-dialog-closed'));
  };

  private _getOptionId(index: number): string {
    return `search-option-${index.toString()}`;
  }

  private _resolvePath(item: UiSearchDialogItem): string {
    if (typeof item.path === 'string' && item.path.trim() !== '') {
      return item.path.trim();
    }

    try {
      const url = new URL(item.url, window.location.href);
      return `${url.pathname}${url.search}${url.hash}`;
    } catch {
      return item.url;
    }
  }

  private static _lockBodyScroll(): void {
    if (typeof document === 'undefined') return;

    const body = document.body;
    if (UiSearchDialog._scrollLockCount === 0) {
      UiSearchDialog._savedOverflow = body.style.overflow;
      UiSearchDialog._savedScrollbarGutter = body.style.scrollbarGutter;
      body.style.overflow = 'hidden';
      body.style.scrollbarGutter = 'stable';
    }

    UiSearchDialog._scrollLockCount += 1;
  }

  private static _unlockBodyScroll(): void {
    if (typeof document === 'undefined') return;
    if (UiSearchDialog._scrollLockCount === 0) return;

    UiSearchDialog._scrollLockCount -= 1;
    if (UiSearchDialog._scrollLockCount > 0) return;

    const body = document.body;
    body.style.overflow = UiSearchDialog._savedOverflow;
    body.style.scrollbarGutter = UiSearchDialog._savedScrollbarGutter;
  }

  override render() {
    const hasQuery = this.query.trim() !== '';
    const showLoading = this.loading;
    const showResults = !showLoading && this._results.length > 0;
    const showEmpty = !showLoading && hasQuery && this._results.length === 0;
    const activeOptionId = this._activeIndex >= 0 ? this._getOptionId(this._activeIndex) : '';

    return html`
      <dialog
        aria-label=${DIALOG_LABEL}
        aria-modal="true"
        @cancel=${this._onDialogCancel}
        @close=${this._onNativeClose}
      >
        <div class="sr-only" aria-live="polite" aria-atomic="true">${this._liveMessage}</div>

        <div class="header">
          <div class="input-wrapper">
            <input
              class="search-input"
              type="search"
              role="combobox"
              aria-expanded=${showResults ? 'true' : 'false'}
              aria-autocomplete="list"
              aria-controls=${LISTBOX_ID}
              aria-activedescendant=${activeOptionId}
              aria-busy=${this.loading ? 'true' : 'false'}
              placeholder=${INPUT_PLACEHOLDER}
              autocomplete="off"
              .value=${this.query}
              @input=${this._onInput}
              @keydown=${this._onInputKeydown}
            />
          </div>

          <button
            class="clear-button"
            type="button"
            aria-label=${CLEAR_BUTTON_LABEL}
            ?hidden=${!hasQuery}
            @click=${this._onClear}
          >
            <iconify-icon icon="lucide:circle-x" aria-hidden="true"></iconify-icon>
          </button>
        </div>

        <div class="body">
          <div class="loading-state" ?hidden=${!showLoading}>
            <ui-spinner size="lg"></ui-spinner>
            <p>${LOADING_MESSAGE}</p>
          </div>

          <ui-empty-state class="empty-state" variant="search" ?hidden=${!showEmpty}>
            <iconify-icon slot="icon" icon="lucide:search-x" aria-hidden="true"></iconify-icon>
            <span slot="heading">${EMPTY_HEADING}</span>
            <span slot="description">${EMPTY_DESCRIPTION}</span>
          </ui-empty-state>

          <ul id=${LISTBOX_ID} class="result-list" role="listbox" aria-label="検索結果" ?hidden=${!showResults}>
            ${this._results.map((item, index) => {
              const isActive = index === this._activeIndex;
              return html`
                <li
                  id=${this._getOptionId(index)}
                  class="result-item"
                  role="option"
                  aria-selected=${isActive ? 'true' : 'false'}
                  tabindex="-1"
                  data-index=${index.toString()}
                  @click=${this._onResultClick}
                  @keydown=${this._onResultKeydown}
                >
                  <span class="item-title">${item.title}</span>
                  <span class="item-path">${this._resolvePath(item)}</span>
                </li>
              `;
            })}
          </ul>
        </div>

        <div class="footer" aria-hidden="true">
          <span><kbd>↑</kbd><kbd>↓</kbd> 移動</span>
          <span><kbd>Enter</kbd> 選択</span>
          <span><kbd>Esc</kbd> 閉じる</span>
        </div>
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-search-dialog': UiSearchDialog;
  }
}
