import { css, html, LitElement, nothing, unsafeCSS, type PropertyValues } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import '../../../lib/icons';
import '../spinner/spinner';
import {
  captureTrigger,
  createBodyScrollLock,
  restoreTriggerFocus,
  showNativeDialog,
  waitForDialogAnimations,
} from '../dialog/dialog-helpers';
import { HIGHLIGHT_RULE_TEMPLATE } from '../highlight/highlight';

const SEARCH_DEBOUNCE_MS = 150;
const DIALOG_LABEL = '検索';
const INPUT_PLACEHOLDER = '検索';
const CLEAR_BUTTON_LABEL = '検索をクリア';
const CLOSE_BUTTON_LABEL = '閉じる';
const LISTBOX_ID = 'search-listbox';
const LOADING_MESSAGE = 'インデックスを読み込んでいます...';
const EMPTY_HEADING = '結果が見つかりません';
const EMPTY_DESCRIPTION = '別のキーワードで検索してください';
const BODY_SEARCH_DIALOG_OPEN_ATTRIBUTE = 'data-ui-search-dialog-open';
const VIRTUALIZATION_THRESHOLD = 100;
const VIRTUAL_ROW_HEIGHT_PX = 48;
const VIRTUAL_OVERSCAN = 6;
const SEARCH_WORKER_THRESHOLD = VIRTUALIZATION_THRESHOLD;
const SEARCH_DIALOG_HIGHLIGHT_SELECTOR = ':where(.result-item ui-search-highlight > mark)';
const searchDialogBodyScrollLock = createBodyScrollLock(BODY_SEARCH_DIALOG_OPEN_ATTRIBUTE);

interface SearchWorkerRequest {
  token: number;
  query: string;
  items: readonly UiSearchDialogItem[];
}

interface SearchWorkerResponse {
  token: number;
  results: readonly UiSearchDialogItem[];
}

interface HighlightPart {
  text: string;
  matched: boolean;
}

type HighlightRenderPart = string | typeof nothing | ReturnType<typeof html>;

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
      --ui-search-dialog-max-width: min(600px, 92vw);
      --ui-search-dialog-max-height: min(340px, 60vh);
      --ui-search-dialog-position-top: 14%;
      --ui-search-dialog-body-min-height: clamp(170px, 26vh, 230px);
      --ui-search-dialog-backdrop: oklch(from var(--black) l c h / var(--opacity-scrim));
      --ui-search-dialog-edge-highlight: color-mix(in oklch, var(--white) 8%, transparent);
    }

    [hidden] {
      display: none !important;
    }

    .dialog {
      box-sizing: border-box;
      margin: var(--ui-search-dialog-position-top) auto 0;
      padding: 0;
      border: var(--border-width) solid var(--border-default);
      border-radius: var(--radius-xl);
      border-top-color: var(--ui-search-dialog-edge-highlight);
      inline-size: var(--ui-search-dialog-max-width);
      max-inline-size: var(--ui-search-dialog-max-width);
      max-block-size: var(--ui-search-dialog-max-height);
      overflow: hidden;
      background: var(--bg-surface-3);
      color: var(--fg-default);
      box-shadow: var(--elevation-xl);
      animation: search-dialog-enter var(--duration-normal) var(--ease-out) forwards;
      grid-template-rows: auto minmax(0, 1fr) auto;
      z-index: var(--z-modal);
    }

    .dialog[open] {
      display: grid;
    }

    .dialog::backdrop {
      background: var(--ui-search-dialog-backdrop);
      backdrop-filter: blur(var(--blur-lg));
      animation: search-backdrop-enter var(--duration-normal) var(--ease-out) forwards;
      z-index: var(--z-backdrop);
    }

    .dialog[data-closing] {
      animation: search-dialog-exit var(--duration-normal) var(--ease-in) forwards;
    }

    .dialog[data-closing]::backdrop {
      animation: search-backdrop-exit var(--duration-normal) var(--ease-in) forwards;
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
      border-bottom: var(--border-width) solid var(--border-default);
      padding: var(--space-2, 8px) var(--space-3, 12px);
    }

    .input-wrapper {
      position: relative;
      min-block-size: 44px;
      display: flex;
      align-items: center;
      border-radius: var(--radius-md);
      background: var(--bg-fill-muted);
    }

    .input-wrapper::after {
      content: '';
      position: absolute;
      inset: 50% auto auto 50%;
      transform: translate(-50%, -50%);
      inline-size: 100%;
      block-size: var(--control-min-touch, 24px);
      pointer-events: none;
    }

    .input-icon {
      position: absolute;
      inset-inline-start: var(--space-3, 12px);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--fg-muted);
      pointer-events: none;
    }

    .input-icon iconify-icon {
      inline-size: var(--icon-base, 16px);
      block-size: var(--icon-base, 16px);
      font-size: var(--icon-base, 16px);
    }

    .search-input {
      inline-size: 100%;
      block-size: 44px;
      border: none;
      background: transparent;
      color: var(--fg-default);
      font: inherit;
      font-size: var(--text-xl, 18px);
      line-height: 1.4;
      padding: 0 calc(28px + var(--space-4, 16px)) 0 calc(16px + var(--space-5, 20px));
      outline: none;
    }

    .search-input::placeholder {
      color: var(--fg-subtle);
    }

    .search-input::-webkit-search-cancel-button,
    .search-input::-webkit-search-decoration,
    .search-input::-webkit-search-results-button,
    .search-input::-webkit-search-results-decoration {
      -webkit-appearance: none;
      appearance: none;
      display: none;
    }

    .search-input::-ms-clear,
    .search-input::-ms-reveal {
      display: none;
      inline-size: 0;
      block-size: 0;
    }

    .search-input:focus-visible {
      outline: var(--focus-ring-width) solid var(--focus-ring-color);
      outline-offset: var(--focus-ring-offset);
      animation: var(--animation-focus, none);
      border-radius: var(--radius-sm);
    }

    .clear-button {
      position: absolute;
      inset-block-start: 50%;
      inset-inline-end: var(--space-2, 8px);
      transform: translateY(-50%);
      inline-size: 28px;
      block-size: 28px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: none;
      border-radius: var(--radius-sm);
      background: transparent;
      color: var(--fg-muted);
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
      inline-size: var(--control-min-touch, 24px);
      block-size: var(--control-min-touch, 24px);
      pointer-events: none;
    }

    .clear-button:hover {
      color: var(--fg-default);
      background: var(--bg-hover);
    }

    .clear-button:focus-visible {
      outline: var(--focus-ring-width) solid var(--focus-ring-color);
      outline-offset: var(--focus-ring-offset);
      animation: var(--animation-focus, none);
    }

    .clear-button iconify-icon {
      inline-size: var(--icon-sm, 14px);
      block-size: var(--icon-sm, 14px);
      font-size: var(--icon-sm, 14px);
    }

    .close-button {
      inline-size: 44px;
      block-size: 44px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: none;
      border-radius: var(--radius-md);
      background: transparent;
      color: var(--fg-muted);
      opacity: 0.72;
      cursor: pointer;
      padding: 0;
      transition:
        opacity var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1)),
        color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1)),
        background-color var(--duration-fast, 70ms) var(--ease-out, cubic-bezier(0.33, 1, 0.68, 1));
    }

    .close-button:hover {
      opacity: 1;
      color: var(--fg-default);
      background: var(--bg-hover);
    }

    .close-button:focus-visible {
      opacity: 1;
      color: var(--fg-default);
      background: var(--bg-hover);
      outline: var(--focus-ring-width) solid var(--focus-ring-color);
      outline-offset: var(--focus-ring-offset);
      animation: var(--animation-focus, none);
    }

    .close-button iconify-icon {
      inline-size: var(--icon-base, 16px);
      block-size: var(--icon-base, 16px);
      font-size: var(--icon-base, 16px);
    }

    .body {
      min-block-size: var(--ui-search-dialog-body-min-height);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .loading-state {
      flex: 1 1 auto;
      min-block-size: 0;
      display: grid;
      place-items: center;
      align-content: center;
      gap: var(--space-3, 12px);
      padding: var(--space-6, 24px);
      color: var(--fg-muted);
      text-align: center;
    }

    .loading-state p {
      margin: 0;
      font-size: var(--text-sm, 13px);
      color: inherit;
    }

    .empty-state {
      --ui-search-dialog-empty-state-padding-inline: clamp(var(--space-5, 20px), 4vw, var(--space-7, 28px));
      --ui-search-dialog-empty-state-padding-block-start: clamp(var(--space-5, 20px), 4vw, var(--space-7, 28px));
      flex: 1 1 auto;
      min-block-size: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      padding-inline: var(--ui-search-dialog-empty-state-padding-inline);
      padding-block-start: var(--ui-search-dialog-empty-state-padding-block-start);
      padding-block-end: calc(var(--ui-search-dialog-empty-state-padding-block-start) * 0.7);
      text-align: center;
    }

    .empty-state-content {
      display: grid;
      justify-items: center;
      gap: var(--space-3, 12px);
      inline-size: min(100%, 22rem);
    }

    .empty-state-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      inline-size: 40px;
      block-size: 40px;
      color: var(--fg-subtle);
    }

    .empty-state-icon iconify-icon {
      inline-size: 40px;
      block-size: 40px;
      font-size: 40px;
    }

    .empty-state-heading {
      margin: 0;
      color: var(--fg-default);
      font-size: var(--text-lg, 16px);
      font-weight: var(--font-semibold, 600);
      line-height: var(--line-height-tight, 1.25);
      letter-spacing: 0.01em;
    }

    .empty-state-description {
      margin: 0;
      max-inline-size: 34ch;
      color: var(--fg-muted);
      font-size: var(--text-sm, 13px);
      line-height: 1.5;
    }

    .result-list {
      flex: 1 1 auto;
      list-style: none;
      margin: 0;
      padding: var(--space-2, 8px);
      overflow-y: auto;
      min-block-size: 0;
    }

    .result-item {
      display: grid;
      gap: calc(var(--space-1, 4px) / 2);
      padding: var(--space-2, 8px) var(--space-3, 12px);
      border-radius: var(--radius-sm);
      cursor: pointer;
    }

    .result-item[aria-selected='true'] {
      background: var(--bg-surface-active);
    }

    .result-item:focus-visible {
      outline: var(--focus-ring-width) solid var(--focus-ring-color);
      outline-offset: -1px;
    }

    .item-title {
      font-size: var(--text-base, 14px);
      color: var(--fg-default);
      line-height: 1.4;
      word-break: break-word;
    }

    .item-path {
      font-size: var(--text-xs, 12px);
      color: var(--fg-muted);
      line-height: 1.4;
      word-break: break-all;
    }

    ${unsafeCSS(HIGHLIGHT_RULE_TEMPLATE(SEARCH_DIALOG_HIGHLIGHT_SELECTOR))}

    .virtual-spacer {
      block-size: 0;
    }

    .footer {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-3, 12px);
      flex-wrap: wrap;
      border-top: var(--border-width) solid var(--border-default);
      padding: var(--space-2, 8px) var(--space-3, 12px);
      font-size: var(--text-xs, 12px);
      color: var(--fg-muted);
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
      min-inline-size: 1em;
      padding: 0;
      border-radius: 0;
      background: transparent;
      color: inherit;
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
      .dialog,
      .dialog[data-closing],
      .dialog::backdrop,
      .dialog[data-closing]::backdrop {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1;
      }
    }

    @media (forced-colors: active) {
      .dialog {
        background: Canvas;
        border: var(--border-width-thick) solid CanvasText;
        box-shadow: none;
      }

      .dialog::backdrop {
        background: Canvas;
        opacity: 0.7;
        backdrop-filter: none;
      }

      .result-item[aria-selected='true'] {
        outline: var(--border-width-thick) solid Highlight;
        outline-offset: calc(-1 * var(--border-width-thick));
      }

      .clear-button {
        border: var(--border-width) solid ButtonText;
        color: ButtonText;
      }

      .close-button {
        border: var(--border-width) solid ButtonText;
        color: ButtonText;
      }
    }

    @media print {
      .dialog,
      .dialog::backdrop {
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

  @state()
  private _hasCompletedSearch = false;

  @query('dialog')
  private _dialogElement?: HTMLDialogElement;

  @query('.search-input')
  private _inputElement?: HTMLInputElement;

  @query('.result-list')
  private _resultListElement?: HTMLUListElement;

  private _triggerElement: HTMLElement | null = null;
  private _isClosing = false;
  private _operation: Promise<void> = Promise.resolve();
  private _searchTimerId: number | undefined;
  private _searchToken = 0;
  private _searchWorker: Worker | null = null;
  private _searchWorkerUrl: string | null = null;
  private _workerUnsupported = false;
  private _virtualScrollTop = 0;
  private _hasBodyScrollLock = false;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this._clearSearchTimer();
    this._destroySearchWorker();
    if (this._dialogElement?.open) {
      this._unlockBodyScroll();
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
      this._virtualScrollTop = 0;
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
    this._triggerElement = captureTrigger(this.ownerDocument, trigger);
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
      this._lockBodyScroll();
      this._focusInput();
      return;
    }

    this._triggerElement ??= captureTrigger(this.ownerDocument);

    if (!showNativeDialog(dialog, true)) {
      this.opened = false;
      return;
    }

    this._lockBodyScroll();
    this._focusInput();

    if (this.query.trim() !== '' && !this.loading) {
      this._scheduleSearch();
    }

    await waitForDialogAnimations(dialog);
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
      this._unlockBodyScroll();
      return;
    }
    if (this._isClosing) return;

    this._clearSearchTimer();
    this._isClosing = true;

    dialog.setAttribute('data-closing', '');
    await waitForDialogAnimations(dialog);
    dialog.removeAttribute('data-closing');
    // dialog.close() が native close イベントを発火 → _onNativeClose がクリーンアップとイベント発火を担う
    dialog.close();
  }

  private _focusInput(): void {
    requestAnimationFrame(() => {
      this._inputElement?.focus({ preventScroll: true });
      this._inputElement?.setSelectionRange(this.query.length, this.query.length);
    });
  }

  private _restoreTriggerFocus(): void {
    restoreTriggerFocus(this._triggerElement);
  }

  private _lockBodyScroll(): void {
    if (this._hasBodyScrollLock) return;
    searchDialogBodyScrollLock.lock();
    this._hasBodyScrollLock = true;
  }

  private _unlockBodyScroll(): void {
    if (!this._hasBodyScrollLock) return;
    searchDialogBodyScrollLock.unlock();
    this._hasBodyScrollLock = false;
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
      this._hasCompletedSearch = false;
      this._setLiveMessage('');
      return;
    }

    if (this.loading) {
      this._hasCompletedSearch = false;
      this._setLiveMessage(LOADING_MESSAGE);
      return;
    }

    this._hasCompletedSearch = false;
    const currentToken = this._searchToken;
    this._searchTimerId = window.setTimeout(() => {
      void this._executeSearch(trimmedQuery, currentToken);
    }, SEARCH_DEBOUNCE_MS);
  }

  private async _executeSearch(query: string, token: number): Promise<void> {
    let rawResults: readonly UiSearchDialogItem[];
    try {
      rawResults = await this._runSearch(query, token);
    } catch (error: unknown) {
      console.error('[ui-search-dialog] search failed', error);
      if (token !== this._searchToken) return;
      this._results = [];
      this._activeIndex = -1;
      this._hasCompletedSearch = true;
      this._setLiveMessage(EMPTY_HEADING);
      return;
    }

    if (token !== this._searchToken) return;
    if (query !== this.query.trim()) return;

    const normalizedResults = this._normalizeResults(rawResults);
    this._results = normalizedResults;
    this._activeIndex = normalizedResults.length > 0 ? 0 : -1;
    this._hasCompletedSearch = true;

    if (normalizedResults.length === 0) {
      this._setLiveMessage(EMPTY_HEADING);
      return;
    }

    this._setLiveMessage(`${normalizedResults.length.toString()} 件の結果が見つかりました`);
    this._scrollActiveOptionIntoView();
  }

  private async _runSearch(query: string, token: number): Promise<readonly UiSearchDialogItem[]> {
    const searcher = this.searcher;
    if (typeof searcher === 'function') {
      return searcher(query);
    }

    if (this.items.length > SEARCH_WORKER_THRESHOLD) {
      try {
        const workerResults = await this._runSearchInWorker(query, token);
        if (workerResults !== null) {
          return workerResults;
        }
      } catch {
        // Workerが失敗した場合は同期フィルタにフォールバック
      }
    }

    return this._filterItems(query);
  }

  private async _runSearchInWorker(query: string, token: number): Promise<readonly UiSearchDialogItem[] | null> {
    if (this._workerUnsupported) return null;

    const worker = this._ensureSearchWorker();
    if (!worker) return null;

    const request: SearchWorkerRequest = {
      token,
      query,
      items: this.items,
    };

    return new Promise<readonly UiSearchDialogItem[] | null>((resolve, reject) => {
      const onMessage = (event: MessageEvent<unknown>): void => {
        const payload = UiSearchDialog._asWorkerResponse(event.data);
        if (!payload) return;
        if (payload.token !== token) return;
        cleanup();
        resolve(payload.results);
      };

      const onError = (): void => {
        cleanup();
        this._destroySearchWorker();
        this._workerUnsupported = true;
        reject(new Error('search worker failed'));
      };

      const cleanup = (): void => {
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onError);
      };

      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onError);

      try {
        worker.postMessage(request);
      } catch {
        cleanup();
        this._destroySearchWorker();
        this._workerUnsupported = true;
        resolve(null);
      }
    });
  }

  private _ensureSearchWorker(): Worker | null {
    if (this._searchWorker) {
      return this._searchWorker;
    }
    if (typeof Worker === 'undefined') {
      this._workerUnsupported = true;
      return null;
    }

    const workerSource = `
      const normalize = (value) => typeof value === 'string' ? value.trim() : '';
      self.addEventListener('message', (event) => {
        const payload = event.data ?? {};
        const query = normalize(payload.query).toLowerCase();
        const token = Number(payload.token ?? -1);
        const sourceItems = Array.isArray(payload.items) ? payload.items : [];
        if (query === '') {
          self.postMessage({ token, results: [] });
          return;
        }
        const results = sourceItems.filter((item) => {
          if (!item || typeof item !== 'object') return false;
          const title = normalize(item.title).toLowerCase();
          const url = normalize(item.url).toLowerCase();
          const path = normalize(item.path).toLowerCase();
          const keywords = Array.isArray(item.keywords)
            ? item.keywords.map((keyword) => normalize(keyword).toLowerCase()).join(' ')
            : '';
          return title.includes(query) || url.includes(query) || path.includes(query) || keywords.includes(query);
        });
        self.postMessage({ token, results });
      });
    `;

    const blob = new Blob([workerSource], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    try {
      this._searchWorker = new Worker(url, { name: 'ui-search-dialog-worker' });
      this._searchWorkerUrl = url;
    } catch {
      URL.revokeObjectURL(url);
      this._workerUnsupported = true;
      this._searchWorker = null;
      this._searchWorkerUrl = null;
    }

    return this._searchWorker;
  }

  private _destroySearchWorker(): void {
    this._searchWorker?.terminate();
    this._searchWorker = null;
    if (this._searchWorkerUrl) {
      URL.revokeObjectURL(this._searchWorkerUrl);
      this._searchWorkerUrl = null;
    }
  }

  private static _asWorkerResponse(payload: unknown): SearchWorkerResponse | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }

    const record = payload as Record<string, unknown>;
    const token = record['token'];
    const results = record['results'];
    if (typeof token !== 'number' || !Array.isArray(results)) {
      return null;
    }

    return {
      token,
      results: results as readonly UiSearchDialogItem[],
    };
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

      case 'Tab':
        if (!event.shiftKey) {
          // Shadow DOM 内の Tab 移動を明示して、入力クリアと閉じるの役割を分離する
          const clearBtn = this.shadowRoot?.querySelector<HTMLButtonElement>('.clear-button');
          const closeBtn = this.shadowRoot?.querySelector<HTMLButtonElement>('.close-button');
          if (clearBtn && !clearBtn.hidden) {
            event.preventDefault();
            clearBtn.focus();
          } else if (closeBtn) {
            event.preventDefault();
            closeBtn.focus();
          }
        }
        break;

      default:
        break;
    }
  };

  private _onAuxiliaryControlKeydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Tab') return;

    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) return;

    const clearButton = this.shadowRoot?.querySelector<HTMLButtonElement>('.clear-button');
    const closeButton = this.shadowRoot?.querySelector<HTMLButtonElement>('.close-button');
    const input = this._inputElement;
    if (!closeButton || !input) return;

    const clearVisible = !!clearButton && !clearButton.hidden;
    if (event.shiftKey) {
      if (target === closeButton) {
        event.preventDefault();
        if (clearVisible) {
          clearButton.focus();
        } else {
          input.focus();
        }
      } else if (target === clearButton) {
        event.preventDefault();
        input.focus();
      }
      return;
    }

    if (target === clearButton) {
      event.preventDefault();
      closeButton.focus();
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
    if (this._isVirtualized()) {
      this._scrollVirtualizedIndexIntoView(this._activeIndex);
      return;
    }

    const shadowRoot = this.shadowRoot;
    if (!shadowRoot) return;
    const activeOptionId = this._getOptionId(this._activeIndex);
    const activeOption = shadowRoot.getElementById(activeOptionId);
    activeOption?.scrollIntoView({ block: 'nearest' });
  }

  private _scrollVirtualizedIndexIntoView(index: number): void {
    const list = this._resultListElement;
    if (!list) return;

    const rowHeight = VIRTUAL_ROW_HEIGHT_PX;
    const listTop = list.scrollTop;
    const listBottom = listTop + list.clientHeight;
    const itemTop = index * rowHeight;
    const itemBottom = itemTop + rowHeight;

    if (itemTop < listTop) {
      list.scrollTop = itemTop;
      this._virtualScrollTop = itemTop;
      return;
    }

    if (itemBottom > listBottom) {
      const targetTop = itemBottom - list.clientHeight;
      list.scrollTop = targetTop;
      this._virtualScrollTop = targetTop;
    }
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

  private _onCloseClick = (): void => {
    this.close();
  };

  private _onDialogPointerDown = (event: MouseEvent): void => {
    const dialog = this._dialogElement;
    if (!dialog?.open) return;
    if (this._isClosing) return;
    if (event.target !== dialog) return;

    const rect = dialog.getBoundingClientRect();
    const isInsideDialogBounds =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    if (isInsideDialogBounds) return;
    this.close();
  };

  private _onDialogCancel = (event: Event): void => {
    event.preventDefault();
    this.close();
  };

  private _onNativeClose = (): void => {
    const wasClosing = this._isClosing;
    this._isClosing = false;

    if (!wasClosing) {
      // ブラウザがネイティブに閉じた場合（_closeDialog 経由でない）
      this.opened = false;
    }

    this._unlockBodyScroll();
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

  private _splitHighlightParts(value: string, query: string): HighlightPart[] {
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery === '') {
      return [{ text: value, matched: false }];
    }

    const normalizedValue = value.toLowerCase();
    const parts: HighlightPart[] = [];
    let cursor = 0;

    while (cursor < value.length) {
      const matchIndex = normalizedValue.indexOf(normalizedQuery, cursor);
      if (matchIndex === -1) {
        const trailingText = value.slice(cursor);
        if (trailingText !== '') {
          parts.push({ text: trailingText, matched: false });
        }
        break;
      }

      if (matchIndex > cursor) {
        parts.push({ text: value.slice(cursor, matchIndex), matched: false });
      }

      const matchEnd = matchIndex + normalizedQuery.length;
      parts.push({ text: value.slice(matchIndex, matchEnd), matched: true });
      cursor = matchEnd;
    }

    return parts.length > 0 ? parts : [{ text: value, matched: false }];
  }

  private _renderHighlightedText(value: string): string | typeof nothing | HighlightRenderPart[] {
    const parts = this._splitHighlightParts(value, this.query);
    const hasMatch = parts.some((part) => part.matched);
    if (!hasMatch) {
      return value;
    }

    return parts.map((part) =>
      part.matched
        ? html`<ui-search-highlight origin="search">${part.text}</ui-search-highlight>`
        : part.text || nothing,
    );
  }

  private _onResultListScroll = (event: Event): void => {
    if (!this._isVirtualized()) return;
    const target = event.currentTarget;
    if (!(target instanceof HTMLElement)) return;
    this._virtualScrollTop = target.scrollTop;
  };

  private _isVirtualized(): boolean {
    return this._results.length > VIRTUALIZATION_THRESHOLD;
  }

  private _getVisibleRange(): {
    start: number;
    end: number;
    topSpacer: number;
    bottomSpacer: number;
  } {
    const total = this._results.length;
    if (!this._isVirtualized()) {
      return { start: 0, end: total, topSpacer: 0, bottomSpacer: 0 };
    }

    const listHeight = this._resultListElement?.clientHeight ?? 320;
    const visibleCount = Math.max(1, Math.ceil(listHeight / VIRTUAL_ROW_HEIGHT_PX));
    const start = Math.max(0, Math.floor(this._virtualScrollTop / VIRTUAL_ROW_HEIGHT_PX) - VIRTUAL_OVERSCAN);
    const end = Math.min(total, start + visibleCount + VIRTUAL_OVERSCAN * 2);
    const topSpacer = start * VIRTUAL_ROW_HEIGHT_PX;
    const bottomSpacer = Math.max(0, (total - end) * VIRTUAL_ROW_HEIGHT_PX);

    return { start, end, topSpacer, bottomSpacer };
  }

  override render() {
    const hasQuery = this.query.trim() !== '';
    const showLoading = this.loading;
    const showResults = !showLoading && this._results.length > 0;
    const showEmpty = !showLoading && hasQuery && this._hasCompletedSearch && this._results.length === 0;
    const activeOptionId = this._activeIndex >= 0 ? this._getOptionId(this._activeIndex) : '';
    const visibleRange = this._getVisibleRange();
    const visibleResults = showResults ? this._results.slice(visibleRange.start, visibleRange.end) : [];

    return html`
      <dialog
        class="dialog"
        aria-label=${DIALOG_LABEL}
        aria-modal="true"
        @mousedown=${this._onDialogPointerDown}
        @cancel=${this._onDialogCancel}
        @close=${this._onNativeClose}
      >
        <div class="sr-only" aria-live="polite" aria-atomic="true">${this._liveMessage}</div>

        <div class="header">
          <div class="input-wrapper">
            <span class="input-icon" aria-hidden="true">
              <iconify-icon icon="lucide:search"></iconify-icon>
            </span>

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

            <button
              class="clear-button"
              type="button"
              aria-label=${CLEAR_BUTTON_LABEL}
              ?hidden=${!hasQuery}
              @click=${this._onClear}
              @keydown=${this._onAuxiliaryControlKeydown}
            >
              <iconify-icon icon="lucide:circle-x" aria-hidden="true"></iconify-icon>
            </button>
          </div>

          <button
            class="close-button"
            type="button"
            aria-label=${CLOSE_BUTTON_LABEL}
            @click=${this._onCloseClick}
            @keydown=${this._onAuxiliaryControlKeydown}
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
            aria-label="検索結果"
            ?hidden=${!showResults}
            @scroll=${this._onResultListScroll}
          >
            <li
              class="virtual-spacer"
              role="presentation"
              aria-hidden="true"
              style=${`block-size:${visibleRange.topSpacer.toString()}px`}
            ></li>
            ${visibleResults.map((item, visibleIndex) => {
              const index = visibleRange.start + visibleIndex;
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
                  <span class="item-title">${this._renderHighlightedText(item.title)}</span>
                  <span class="item-path">${this._renderHighlightedText(this._resolvePath(item))}</span>
                </li>
              `;
            })}
            <li
              class="virtual-spacer"
              role="presentation"
              aria-hidden="true"
              style=${`block-size:${visibleRange.bottomSpacer.toString()}px`}
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
}

declare global {
  interface HTMLElementTagNameMap {
    'ui-search-dialog': UiSearchDialog;
  }
}
