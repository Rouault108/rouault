import type {
  SearchWorkerRequest,
  SearchWorkerResponse,
  UiSearchDialogItem,
} from '../search-dialog.types';

export class SearchDialogSearchWorker {
  private _searchWorker: Worker | null = null;
  private _searchWorkerUrl: string | null = null;
  private _workerUnsupported = false;

  async run(
    query: string,
    token: number,
    items: readonly UiSearchDialogItem[],
  ): Promise<readonly UiSearchDialogItem[] | null> {
    if (this._workerUnsupported) return null;

    const worker = this._ensureSearchWorker();
    if (!worker) return null;

    const request: SearchWorkerRequest = {
      token,
      query,
      items,
    };

    return new Promise<readonly UiSearchDialogItem[] | null>((resolve, reject) => {
      const onMessage = (event: MessageEvent<unknown>): void => {
        const payload = SearchDialogSearchWorker._asWorkerResponse(event.data);
        if (!payload) return;
        if (payload.token !== token) return;
        cleanup();
        resolve(payload.results);
      };

      const onError = (): void => {
        cleanup();
        this.destroy();
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
        this.destroy();
        this._workerUnsupported = true;
        resolve(null);
      }
    });
  }

  destroy(): void {
    this._searchWorker?.terminate();
    this._searchWorker = null;

    if (this._searchWorkerUrl) {
      URL.revokeObjectURL(this._searchWorkerUrl);
      this._searchWorkerUrl = null;
    }
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
}