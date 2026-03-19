import {
  EMPTY_HEADING,
  LOADING_MESSAGE,
  SEARCH_DEBOUNCE_MS,
  SEARCH_WORKER_THRESHOLD,
} from '../search-dialog.constants';
import type { UiSearchDialogItem, UiSearchDialogSearcher } from '../search-dialog.types';
import { SearchDialogSearchWorker } from './search-dialog-search-worker';

export interface SearchDialogSearchSessionHost {
  getQuery(): string;
  isLoading(): boolean;
  getItems(): readonly UiSearchDialogItem[];
  getSearcher(): UiSearchDialogSearcher | null;
  setResults(results: UiSearchDialogItem[]): void;
  setActiveIndex(index: number): void;
  setHasCompletedSearch(value: boolean): void;
  setLiveMessage(message: string): void;
  scrollActiveOptionIntoView(): void;
}

export class SearchDialogSearchSession {
  private _searchTimerId: number | undefined;
  private _searchToken = 0;

  constructor(
    private readonly _host: SearchDialogSearchSessionHost,
    private readonly _worker = new SearchDialogSearchWorker(),
  ) {}

  destroy(): void {
    this.clearScheduled();
    this._worker.destroy();
  }

  clearScheduled(): void {
    if (typeof this._searchTimerId !== 'number') return;
    window.clearTimeout(this._searchTimerId);
    this._searchTimerId = undefined;
  }

  handleQueryChanged(): void {
    this._scheduleSearch();
  }

  handleLoadingChanged(): void {
    if (this._host.isLoading()) {
      this._host.setLiveMessage(LOADING_MESSAGE);
      return;
    }

    if (this._host.getQuery().trim() !== '') {
      this._scheduleSearch();
    } else {
      this._host.setLiveMessage('');
    }
  }

  requestSearchNow(): void {
    if (this._host.getQuery().trim() === '') return;
    if (this._host.isLoading()) return;
    this._scheduleSearch();
  }

  private _scheduleSearch(): void {
    this.clearScheduled();
    this._searchToken += 1;

    const trimmedQuery = this._host.getQuery().trim();
    if (trimmedQuery === '') {
      this._host.setResults([]);
      this._host.setActiveIndex(-1);
      this._host.setHasCompletedSearch(false);
      this._host.setLiveMessage('');
      return;
    }

    if (this._host.isLoading()) {
      this._host.setHasCompletedSearch(false);
      this._host.setLiveMessage(LOADING_MESSAGE);
      return;
    }

    this._host.setHasCompletedSearch(false);
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

      this._host.setResults([]);
      this._host.setActiveIndex(-1);
      this._host.setHasCompletedSearch(true);
      this._host.setLiveMessage(EMPTY_HEADING);
      return;
    }

    if (token !== this._searchToken) return;
    if (query !== this._host.getQuery().trim()) return;

    const normalizedResults = this._normalizeResults(rawResults);
    this._host.setResults(normalizedResults);
    this._host.setActiveIndex(normalizedResults.length > 0 ? 0 : -1);
    this._host.setHasCompletedSearch(true);

    if (normalizedResults.length === 0) {
      this._host.setLiveMessage(EMPTY_HEADING);
      return;
    }

    this._host.setLiveMessage(`${normalizedResults.length.toString()} 件の結果が見つかりました`);
    this._host.scrollActiveOptionIntoView();
  }

  private async _runSearch(query: string, token: number): Promise<readonly UiSearchDialogItem[]> {
    const searcher = this._host.getSearcher();
    if (typeof searcher === 'function') {
      return searcher(query);
    }

    const items = this._host.getItems();
    if (items.length > SEARCH_WORKER_THRESHOLD) {
      try {
        const workerResults = await this._worker.run(query, token, items);
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
    const normalizedQuery = query.trim().toLowerCase();
    if (normalizedQuery === '') return [];

    return this._host.getItems().filter((item) => {
      const title = item.title.toLowerCase();
      const path = (item.path ?? '').toLowerCase();
      const keywords = (item.keywords ?? []).map((keyword) => keyword.toLowerCase()).join(' ');

      return (
        title.includes(normalizedQuery) ||
        path.includes(normalizedQuery) ||
        keywords.includes(normalizedQuery)
      );
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
}
