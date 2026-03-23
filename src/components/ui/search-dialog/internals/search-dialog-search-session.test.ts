import { expect } from '@open-wc/testing';
import type { UiSearchDialogItem, UiSearchDialogSearcher } from '../search-dialog.types';
import { SearchDialogSearchSession } from './search-dialog-search-session';

interface SessionState {
  query: string;
  loading: boolean;
  items: readonly UiSearchDialogItem[];
  searcher: UiSearchDialogSearcher | null;
  results: UiSearchDialogItem[];
  activeIndex: number;
  hasCompletedSearch: boolean;
  liveMessage: string;
  scrolled: boolean;
}

function createState(): SessionState {
  return {
    query: '',
    loading: false,
    items: [],
    searcher: null,
    results: [],
    activeIndex: -1,
    hasCompletedSearch: false,
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
    setResults: (results: UiSearchDialogItem[]) => {
      state.results = results;
    },
    setActiveIndex: (index: number) => {
      state.activeIndex = index;
    },
    setHasCompletedSearch: (value: boolean) => {
      state.hasCompletedSearch = value;
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
    window.setTimeout(() => {
      resolve();
    }, 170);
  });
}

describe('SearchDialogSearchSession', () => {
  it('空クエリなら結果をクリアする', () => {
    const state = createState();
    state.results = [{ title: 'old', url: '/old' }];
    state.activeIndex = 3;
    state.hasCompletedSearch = true;
    state.liveMessage = 'old';

    const session = new SearchDialogSearchSession(createHost(state));

    session.handleQueryChanged();

    expect(state.results).to.deep.equal([]);
    expect(state.activeIndex).to.equal(-1);
    expect(state.hasCompletedSearch).to.equal(false);
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
      { title: 'Alpha Guide', url: '/alpha', path: '/docs/alpha', keywords: ['guide'] },
      { title: 'Delta Reference', url: '/delta', path: '/api/delta', keywords: ['schema'] },
      { title: 'Gamma Note', url: '/gamma', path: '/notes/gamma', keywords: ['api'] },
    ];

    const session = new SearchDialogSearchSession(createHost(state));

    session.handleQueryChanged();
    await waitForSearch();

    expect(state.results.map((item) => item.url)).to.deep.equal(['/delta', '/gamma']);
    expect(state.activeIndex).to.equal(0);
    expect(state.hasCompletedSearch).to.equal(true);
    expect(state.liveMessage).to.contain('2 件');
    expect(state.scrolled).to.equal(true);
  });

  it('custom searcher の結果を正規化し、空 title/url と重複を落とす', async () => {
    const state = createState();
    state.query = 'alpha';
    state.searcher = () =>
      [
        { title: ' Alpha ', url: '/alpha ' },
        { title: 'Alpha', url: '/alpha' },
        { title: '', url: '/empty-title' },
        { title: 'Empty Url', url: '' },
        { title: 'Beta', url: '/beta', path: ' /beta ' },
      ] satisfies UiSearchDialogItem[];

    const session = new SearchDialogSearchSession(createHost(state));

    session.handleQueryChanged();
    await waitForSearch();

    expect(state.results).to.deep.equal([
      { title: 'Alpha', url: '/alpha' },
      { title: 'Beta', url: '/beta', path: '/beta' },
    ]);
  });

  it('requestSearchNow は loading=false かつ非空 query の時だけ実行する', async () => {
    const state = createState();
    state.query = 'alpha';
    state.items = [{ title: 'Alpha', url: '/alpha' }];

    const session = new SearchDialogSearchSession(createHost(state));

    session.requestSearchNow();
    await waitForSearch();

    expect(state.results).to.deep.equal([{ title: 'Alpha', url: '/alpha' }]);
  });
});
