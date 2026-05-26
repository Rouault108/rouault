import {
  EMPTY_HEADING,
  ERROR_HEADING,
  LOADING_MESSAGE,
  SEARCH_DEBOUNCE_MS,
  SEARCH_WORKER_THRESHOLD,
} from './search-dialog-constants.js';
import type {
  UiSearchDialogItem,
  UiSearchDialogMatchField,
  UiSearchDialogSearchError,
  UiSearchDialogSearcher,
} from './search-dialog-types.js';
import { SearchDialogSearchWorker } from './search-dialog-search-worker.js';

export interface SearchDialogSearchSessionHost {
  getQuery(): string;
  isLoading(): boolean;
  isUnavailable?(): boolean;
  getItems(): readonly UiSearchDialogItem[];
  getSearcher(): UiSearchDialogSearcher | null;
  getMatchFields(): readonly UiSearchDialogMatchField[];
  setResults(results: UiSearchDialogItem[]): void;
  getActiveId(): string | null;
  setActiveId(id: string | null): void;
  setHasCompletedSearch(value: boolean): void;
  setError(error: UiSearchDialogSearchError | null): void;
  setLiveMessage(message: string): void;
  scrollActiveOptionIntoView(): void;
}

export class SearchDialogSearchSession {
  private _searchTimerId: ReturnType<typeof setTimeout> | undefined;
  private _searchToken = 0;
  private _abortController: AbortController | null = null;
  private _lastObservedQuery = '';

  constructor(
    private readonly _host: SearchDialogSearchSessionHost,
    private readonly _worker = new SearchDialogSearchWorker(),
  ) {}

  destroy(): void {
    this.clearScheduled();
    this._searchToken += 1;
    this._abortController?.abort();
    this._abortController = null;
    this._lastObservedQuery = '';
    this._worker.destroy();
  }

  clearScheduled(): void {
    if (this._searchTimerId === undefined) return;
    globalThis.clearTimeout(this._searchTimerId);
    this._searchTimerId = undefined;
  }

  handleQueryChanged(): void {
    if (this._isUnavailable()) {
      this.clearUnavailableState();
      return;
    }
    const trimmedQuery = this._syncObservedQuery({ abortOnChange: true });
    this._scheduleSearch(trimmedQuery);
  }

  handleLoadingChanged(): void {
    if (this._isUnavailable()) {
      this.clearUnavailableState();
      return;
    }
    if (this._host.isLoading()) {
      this._host.setLiveMessage(LOADING_MESSAGE);
      return;
    }

    const trimmedQuery = this._syncObservedQuery({ abortOnChange: false });
    this._scheduleSearch(trimmedQuery);
  }

  requestSearchNow(): void {
    if (this._isUnavailable()) {
      this.clearUnavailableState();
      return;
    }
    const trimmedQuery = this._syncObservedQuery({ abortOnChange: false });
    if (trimmedQuery === '') return;
    if (this._host.isLoading()) return;
    this._scheduleSearch(trimmedQuery);
  }

  private _syncObservedQuery(options: { abortOnChange: boolean }): string {
    const nextQuery = this._host.getQuery().trim();

    if (nextQuery !== this._lastObservedQuery) {
      if (options.abortOnChange) {
        this._abortController?.abort();
      }
      this._lastObservedQuery = nextQuery;
    }

    return nextQuery;
  }

  private _scheduleSearch(trimmedQuery: string): void {
    this.clearScheduled();
    this._searchToken += 1;

    if (this._isUnavailable()) {
      this.clearUnavailableState();
      return;
    }

    if (trimmedQuery === '') {
      this._abortController?.abort();
      this._abortController = null;
      this._lastObservedQuery = '';
      this._host.setResults([]);
      this._host.setActiveId(null);
      this._host.setHasCompletedSearch(false);
      this._host.setError(null);
      this._host.setLiveMessage('');
      return;
    }

    if (this._host.isLoading()) {
      this._host.setHasCompletedSearch(false);
      this._host.setError(null);
      this._host.setLiveMessage(LOADING_MESSAGE);
      return;
    }

    this._host.setHasCompletedSearch(false);
    this._host.setError(null);
    const currentToken = this._searchToken;

    this._searchTimerId = globalThis.setTimeout(() => {
      void this._executeSearch(trimmedQuery, currentToken);
    }, SEARCH_DEBOUNCE_MS);
  }

  private async _executeSearch(query: string, token: number): Promise<void> {
    if (this._isUnavailable()) {
      this.clearUnavailableState();
      return;
    }
    let rawResults: readonly UiSearchDialogItem[];

    try {
      rawResults = await this._runSearch(query, token);
    } catch (error: unknown) {
      if (SearchDialogSearchSession._isAbortError(error)) {
        return;
      }

      if (token !== this._searchToken) return;
      if (query !== this._host.getQuery().trim()) return;

      console.error('[search-dialog] search failed', error);

      this._host.setResults([]);
      this._host.setActiveId(null);
      this._host.setHasCompletedSearch(true);
      this._host.setError(
        error instanceof SearchDialogStructuredError
          ? error.searchError
          : { code: 'search-failed' },
      );
      this._host.setLiveMessage(ERROR_HEADING);
      return;
    }

    if (token !== this._searchToken) return;
    if (query !== this._host.getQuery().trim()) return;

    const normalizedResults = this._normalizeResults(rawResults);
    this._host.setResults(normalizedResults);
    this._host.setHasCompletedSearch(true);
    this._host.setError(null);
    this._syncActiveId(normalizedResults);

    if (normalizedResults.length === 0) {
      this._host.setLiveMessage(EMPTY_HEADING);
      return;
    }

    this._host.setLiveMessage(`${normalizedResults.length.toString()} 件の結果が見つかりました`);
    this._host.scrollActiveOptionIntoView();
  }

  private async _runSearch(query: string, token: number): Promise<readonly UiSearchDialogItem[]> {
    if (this._isUnavailable()) {
      return [];
    }
    const searcher = this._host.getSearcher();
    const items = this._host.getItems();

    if (searcher && items.length > 0) {
      throw new Error('search-dialog: items と searcher は同時に指定できません');
    }

    if (!searcher && items.length === 0) {
      throw new Error('search-dialog: items か searcher のいずれかが必要です');
    }

    this._abortController?.abort();
    this._abortController = new AbortController();

    if (typeof searcher === 'function') {
      const result = await searcher({
        query,
        signal: this._abortController.signal,
      });

      if (result.error) {
        throw new SearchDialogStructuredError(result.error);
      }

      return result.items;
    }

    if (
      items.length > SEARCH_WORKER_THRESHOLD &&
      SearchDialogSearchSession._canUseWorker(this._host.getMatchFields())
    ) {
      try {
        const workerResults = await this._worker.run(
          query,
          token,
          items,
          this._host.getMatchFields(),
        );
        if (workerResults !== null) {
          return workerResults;
        }
      } catch {
        // Worker が失敗した場合は同期フィルタにフォールバック
      }
    }

    return this._filterItems(query);
  }

  private _filterItems(query: string): UiSearchDialogItem[] {
    const normalizedQuery = SearchDialogSearchSession._normalizeText(query);
    if (normalizedQuery === '') return [];

    return this._host.getItems().filter((item) => {
      return this._host.getMatchFields().some((field) => {
        switch (field) {
          case 'title':
            return SearchDialogSearchSession._normalizeText(item.title).includes(normalizedQuery);
          case 'path':
            return SearchDialogSearchSession._normalizeText(item.path ?? '').includes(
              normalizedQuery,
            );
          case 'keywords':
            return (item.keywords ?? []).some((keyword) =>
              SearchDialogSearchSession._normalizeText(keyword).includes(normalizedQuery),
            );
          case 'renderHref':
            return SearchDialogSearchSession._normalizeText(item.renderHref).includes(normalizedQuery);
        }
      });
    });
  }

  private _isUnavailable(): boolean {
    return this._host.isUnavailable?.() === true;
  }

  clearUnavailableState(): void {
    this.clearScheduled();
    this._searchToken += 1;
    this._abortController?.abort();
    this._abortController = null;
    this._lastObservedQuery = '';
    this._host.setResults([]);
    this._host.setActiveId(null);
    this._host.setHasCompletedSearch(false);
    this._host.setError(null);
    this._host.setLiveMessage('');
  }

  private _normalizeResults(results: readonly UiSearchDialogItem[]): UiSearchDialogItem[] {
    const normalized: UiSearchDialogItem[] = [];
    const seen = new Set<string>();

    for (const item of results) {
      const id = item.id.trim();
      const title = item.title.trim();
      const renderHref = item.renderHref.trim();
      const canonicalPathname = item.canonicalPathname.trim();
      if (id === '' || title === '' || renderHref === '' || canonicalPathname === '') continue;

      const path = typeof item.path === 'string' && item.path.trim() !== '' ? item.path.trim() : '';
      if (seen.has(id)) continue;
      seen.add(id);

      const normalizedItem: UiSearchDialogItem = {
        id,
        title,
        renderHref,
        canonicalPathname,
      };

      if (path !== '') {
        normalizedItem.path = path;
      }

      const keywords = item.keywords;
      if (Array.isArray(keywords) && keywords.length > 0) {
        normalizedItem.keywords = keywords
          .map((keyword: string) => keyword.trim())
          .filter((keyword: string) => keyword !== '');
      }

      normalized.push(normalizedItem);
    }

    return normalized;
  }

  private _syncActiveId(results: readonly UiSearchDialogItem[]): void {
    const currentActiveId = this._host.getActiveId();
    if (results.length === 0) {
      this._host.setActiveId(null);
      return;
    }

    if (currentActiveId !== null && results.some((item) => item.id === currentActiveId)) {
      this._host.setActiveId(currentActiveId);
      this._host.scrollActiveOptionIntoView();
      return;
    }

    this._host.setActiveId(results[0]?.id ?? null);
    this._host.scrollActiveOptionIntoView();
  }

  private static _normalizeText(value: string): string {
    return value.trim().normalize('NFKC').toLocaleLowerCase('ja');
  }

  private static _canUseWorker(matchFields: readonly UiSearchDialogMatchField[]): boolean {
    return matchFields.every(
      (field) => field === 'title' || field === 'path' || field === 'keywords',
    );
  }

  private static _isAbortError(error: unknown): boolean {
    return (
      (typeof DOMException !== 'undefined' &&
        error instanceof DOMException &&
        error.name === 'AbortError') ||
      (error instanceof Error && error.name === 'AbortError')
    );
  }
}

class SearchDialogStructuredError extends Error {
  constructor(readonly searchError: UiSearchDialogSearchError) {
    super(searchError.message ?? searchError.code);
    this.name = 'SearchDialogStructuredError';
  }
}
