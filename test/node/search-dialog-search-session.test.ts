import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  UiSearchDialogItem,
  UiSearchDialogSearchError,
  UiSearchDialogSearcher,
} from '../../src/components/ui/search-dialog/search-dialog.types.js';
import { SearchDialogSearchSession } from '../../src/components/ui/search-dialog/internals/search-dialog-search-session.js';
import { SEARCH_DEBOUNCE_MS } from '../../src/components/ui/search-dialog/search-dialog.constants.js';

interface SessionState {
  query: string;
  loading: boolean;
  items: readonly UiSearchDialogItem[];
  searcher: UiSearchDialogSearcher | null;
  matchFields: readonly ('title' | 'path' | 'keywords' | 'url')[];
  results: UiSearchDialogItem[];
  activeId: string | null;
  hasCompletedSearch: boolean;
  errorCode: string | null;
  liveMessage: string;
  scrolled: boolean;
}

function createState(): SessionState {
  return {
    query: '',
    loading: false,
    items: [],
    searcher: null,
    matchFields: ['title', 'path', 'keywords'],
    results: [],
    activeId: null,
    hasCompletedSearch: false,
    errorCode: null,
    liveMessage: '',
    scrolled: false,
  };
}

function createHost(state: SessionState) {
  return {
    getQuery: () => state.query,
    isLoading: () => state.loading,
    getItems: () => state.items,
    getSearcher: () => state.searcher,
    getMatchFields: () => state.matchFields,
    setResults: (results: UiSearchDialogItem[]) => {
      state.results = results;
    },
    getActiveId: () => state.activeId,
    setActiveId: (id: string | null) => {
      state.activeId = id;
    },
    setHasCompletedSearch: (value: boolean) => {
      state.hasCompletedSearch = value;
    },
    setError: (error: UiSearchDialogSearchError | null) => {
      state.errorCode = error?.code ?? null;
    },
    setLiveMessage: (message: string) => {
      state.liveMessage = message;
    },
    scrollActiveOptionIntoView: () => {
      state.scrolled = true;
    },
  };
}

async function waitForSearch(): Promise<void> {
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, 170);
  });
}

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((innerResolve, innerReject) => {
    resolve = innerResolve;
    reject = innerReject;
  });

  return { promise, resolve, reject };
}

describe('SearchDialogSearchSession', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('空クエリなら結果をクリアする', () => {
    const state = createState();
    state.results = [{ id: 'old', title: 'old', url: '/old' }];
    state.activeId = 'old';
    state.hasCompletedSearch = true;
    state.errorCode = 'stale';
    state.liveMessage = 'old';

    const session = new SearchDialogSearchSession(createHost(state));

    session.handleQueryChanged();

    expect(state.results).to.deep.equal([]);
    expect(state.activeId).to.equal(null);
    expect(state.hasCompletedSearch).to.equal(false);
    expect(state.errorCode).to.equal(null);
    expect(state.liveMessage).to.equal('');
  });

  it('loading 中は loading message を出す', () => {
    const state = createState();
    state.query = 'alpha';
    state.loading = true;

    const session = new SearchDialogSearchSession(createHost(state));

    session.handleLoadingChanged();

    expect(state.liveMessage).to.equal('インデックスを読み込んでいます...');
  });

  it('items から title/path/keywords を同期検索する', async () => {
    const state = createState();
    state.query = 'api';
    state.items = [
      {
        id: 'alpha',
        title: 'Alpha Guide',
        url: '/alpha',
        path: '/docs/alpha',
        keywords: ['guide'],
      },
      {
        id: 'delta',
        title: 'Delta Reference',
        url: '/delta',
        path: '/api/delta',
        keywords: ['schema'],
      },
      { id: 'gamma', title: 'Gamma Note', url: '/gamma', path: '/notes/gamma', keywords: ['api'] },
    ];

    const session = new SearchDialogSearchSession(createHost(state));

    session.handleQueryChanged();
    await waitForSearch();

    expect(state.results.map((item) => item.url)).to.deep.equal(['/delta', '/gamma']);
    expect(state.activeId).to.equal('delta');
    expect(state.hasCompletedSearch).to.equal(true);
    expect(state.liveMessage).to.contain('2 件');
    expect(state.scrolled).to.equal(true);
  });

  it('custom searcher の結果を正規化し、空 id/title/url と重複を落とす', async () => {
    const state = createState();
    state.query = 'alpha';
    state.searcher = () => ({
      items: [
        { id: 'alpha', title: ' Alpha ', url: '/alpha ' },
        { id: 'alpha', title: 'Alpha', url: '/alpha' },
        { id: 'empty-title', title: '', url: '/empty-title' },
        { id: 'empty-url', title: 'Empty Url', url: '' },
        { id: '', title: 'No Id', url: '/missing-id' },
        { id: 'beta', title: 'Beta', url: '/beta', path: ' /beta ' },
      ] satisfies UiSearchDialogItem[],
    });

    const session = new SearchDialogSearchSession(createHost(state));

    session.handleQueryChanged();
    await waitForSearch();

    expect(state.results).to.deep.equal([
      { id: 'alpha', title: 'Alpha', url: '/alpha' },
      { id: 'beta', title: 'Beta', url: '/beta', path: '/beta' },
    ]);
  });

  it('構造化 error を error state として扱う', async () => {
    const state = createState();
    state.query = 'alpha';
    state.searcher = () => ({
      items: [],
      error: {
        code: 'network-error',
        message: 'network down',
      },
    });

    const session = new SearchDialogSearchSession(createHost(state));

    session.handleQueryChanged();
    await waitForSearch();

    expect(state.errorCode).to.equal('network-error');
    expect(state.results).to.deep.equal([]);
    expect(state.liveMessage).to.equal('検索結果を取得できませんでした');
  });

  it('requestSearchNow は loading=false かつ非空 query の時だけ実行する', async () => {
    const state = createState();
    state.query = 'alpha';
    state.items = [{ id: 'alpha', title: 'Alpha', url: '/alpha' }];

    const session = new SearchDialogSearchSession(createHost(state));

    session.requestSearchNow();
    await waitForSearch();

    expect(state.results).to.deep.equal([{ id: 'alpha', title: 'Alpha', url: '/alpha' }]);
  });

  it('同じ id が残る場合は activeId を維持する', async () => {
    const state = createState();
    state.query = 'a';
    state.activeId = 'beta';
    state.items = [
      { id: 'alpha', title: 'Alpha', url: '/alpha' },
      { id: 'beta', title: 'Beta', url: '/beta' },
    ];

    const session = new SearchDialogSearchSession(createHost(state));

    session.handleQueryChanged();
    await waitForSearch();

    expect(state.activeId).to.equal('beta');
  });

  it('Error.name が AbortError の場合は error state に流さない', async () => {
    const state = createState();
    state.query = 'alpha';
    state.searcher = () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      return Promise.reject(error);
    };

    const session = new SearchDialogSearchSession(createHost(state));

    session.handleQueryChanged();
    await waitForSearch();

    expect(state.errorCode).to.equal(null);
    expect(state.hasCompletedSearch).to.equal(false);
    expect(state.liveMessage).to.equal('');

    session.destroy();
  });

  it('query 変更時に実行中検索を debounce 前に abort する', async () => {
    vi.useFakeTimers();
    const state = createState();
    const signals: AbortSignal[] = [];
    state.query = 'alpha';
    state.searcher = ({ signal }) => {
      signals.push(signal);
      return createDeferred<{ items: UiSearchDialogItem[] }>().promise;
    };

    const session = new SearchDialogSearchSession(createHost(state));

    session.handleQueryChanged();
    await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);

    expect(signals).to.have.length(1);
    expect(signals[0]?.aborted).to.equal(false);

    state.query = 'beta';
    session.handleQueryChanged();

    expect(signals[0]?.aborted).to.equal(true);

    session.destroy();
  });

  it('requestSearchNow 経路で観測済みの同一 query 再通知は即時 abort しない', async () => {
    vi.useFakeTimers();
    const state = createState();
    const signals: AbortSignal[] = [];
    state.query = 'alpha';
    state.searcher = ({ signal }) => {
      signals.push(signal);
      return createDeferred<{ items: UiSearchDialogItem[] }>().promise;
    };

    const session = new SearchDialogSearchSession(createHost(state));

    session.requestSearchNow();
    await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);

    expect(signals).to.have.length(1);
    expect(signals[0]?.aborted).to.equal(false);

    session.handleQueryChanged();

    expect(signals[0]?.aborted).to.equal(false);

    session.destroy();
  });

  it('stale token の通常 Error reject をログにも UI にも反映しない', async () => {
    vi.useFakeTimers();
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const state = createState();
    const first = createDeferred<{ items: UiSearchDialogItem[] }>();
    state.query = 'alpha';
    state.searcher = () => first.promise;

    const session = new SearchDialogSearchSession(createHost(state));

    session.handleQueryChanged();
    await vi.advanceTimersByTimeAsync(SEARCH_DEBOUNCE_MS);

    state.query = 'beta';
    session.handleQueryChanged();
    first.reject(new Error('late failure'));
    await Promise.resolve();

    expect(consoleError).not.toHaveBeenCalled();
    expect(state.errorCode).to.equal(null);
    expect(state.hasCompletedSearch).to.equal(false);

    session.destroy();
  });
});
