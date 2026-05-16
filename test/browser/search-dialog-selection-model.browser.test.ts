import { expect } from '@open-wc/testing';
import type { SearchField } from '../../src/components/ui/search-field/search-field.js';
import type {
  UiSearchDialogCloseReason,
  UiSearchDialogItem,
  UiSearchDialogSelectedDetail,
} from '../../src/components/ui/search-dialog/search-dialog.types.js';
import { SearchDialogSelectionModel } from '../../src/components/ui/search-dialog/internals/search-dialog-selection-model.js';
import { SearchDialogVirtualizer } from '../../src/components/ui/search-dialog/internals/search-dialog-virtualizer.js';

interface SelectionState {
  loading: boolean;
  results: readonly UiSearchDialogItem[];
  activeId: string | null;
  query: string;
  virtualScrollTop: number;
  selected: UiSearchDialogSelectedDetail[];
  closeReason: string | null;
}

function createSearchFieldStub(clearButtonVisible = false): SearchField {
  return {
    clearButtonVisible,
    focus() {
      /* noop */
    },
    focusClearButton() {
      /* noop */
    },
  } as unknown as SearchField;
}

function createSelectionHost(state: SelectionState, searchField?: SearchField) {
  const closeButton = document.createElement('button');
  const list = document.createElement('ul');
  const shadowRoot = document.createElement('div').attachShadow({ mode: 'open' });

  return {
    host: {
      isLoading: () => state.loading,
      getResults: () => state.results,
      getActiveId: () => state.activeId,
      setActiveId: (id: string | null) => {
        state.activeId = id;
      },
      getQuery: () => state.query,
      getSearchFieldElement: () => searchField,
      getCloseButtonElement: () => closeButton,
      getShadowRootRef: () => shadowRoot,
      getResultListElement: () => list,
      getVirtualScrollTop: () => state.virtualScrollTop,
      setVirtualScrollTop: (value: number) => {
        state.virtualScrollTop = value;
      },
      requestClose: (reason: UiSearchDialogCloseReason) => {
        state.closeReason = reason;
      },
      dispatchSelected: (detail: UiSearchDialogSelectedDetail) => {
        state.selected.push(detail);
      },
    },
    closeButton,
    list,
  };
}

function createKeyboardEventLike(
  key: string,
  options?: {
    shiftKey?: boolean;
    currentTarget?: EventTarget | null;
    origin?: EventTarget;
  },
): KeyboardEvent {
  let defaultPrevented = false;

  return {
    key,
    shiftKey: options?.shiftKey ?? false,
    currentTarget: options?.currentTarget ?? null,
    get defaultPrevented() {
      return defaultPrevented;
    },
    preventDefault() {
      defaultPrevented = true;
    },
    composedPath() {
      return options?.origin ? [options.origin] : [];
    },
  } as unknown as KeyboardEvent;
}

describe('SearchDialogSelectionModel', () => {
  it('ArrowDown で activeIndex を進める', () => {
    const state: SelectionState = {
      loading: false,
      results: [
        { id: 'alpha', title: 'Alpha', renderHref: '/alpha' , canonicalPathname: '/alpha' },
        { id: 'beta', title: 'Beta', renderHref: '/beta' , canonicalPathname: '/beta' },
      ],
      activeId: null,
      query: 'a',
      virtualScrollTop: 0,
      selected: [],
      closeReason: null,
    };

    const searchField = createSearchFieldStub(false);
    const { host } = createSelectionHost(state, searchField);
    const model = new SearchDialogSelectionModel(host, new SearchDialogVirtualizer());

    model.handleSearchFieldKeydown(createKeyboardEventLike('ArrowDown'));

    expect(state.activeId).to.equal('alpha');
  });

  it('ArrowUp で末尾へループする', () => {
    const state: SelectionState = {
      loading: false,
      results: [
        { id: 'alpha', title: 'Alpha', renderHref: '/alpha' , canonicalPathname: '/alpha' },
        { id: 'beta', title: 'Beta', renderHref: '/beta' , canonicalPathname: '/beta' },
      ],
      activeId: null,
      query: 'a',
      virtualScrollTop: 0,
      selected: [],
      closeReason: null,
    };

    const { host } = createSelectionHost(state, createSearchFieldStub(false));
    const model = new SearchDialogSelectionModel(host, new SearchDialogVirtualizer());

    model.handleSearchFieldKeydown(createKeyboardEventLike('ArrowUp'));

    expect(state.activeId).to.equal('beta');
  });

  it('Enter で active item を選択し close request を通知する', () => {
    const state: SelectionState = {
      loading: false,
      results: [
        { id: 'alpha', title: 'Alpha', renderHref: '/alpha' , canonicalPathname: '/alpha' },
        { id: 'beta', title: 'Beta', renderHref: '/beta' , canonicalPathname: '/beta' },
      ],
      activeId: 'beta',
      query: 'beta',
      virtualScrollTop: 0,
      selected: [],
      closeReason: null,
    };

    const { host } = createSelectionHost(state, createSearchFieldStub(false));
    const model = new SearchDialogSelectionModel(host, new SearchDialogVirtualizer());

    model.handleSearchFieldKeydown(createKeyboardEventLike('Enter'));

    expect(state.selected).to.deep.equal([
      {
        id: 'beta',
        title: 'Beta',
        renderHref: '/beta',
        canonicalPathname: '/beta',
        query: 'beta',
        index: 1,
        item: { id: 'beta', title: 'Beta', renderHref: '/beta' , canonicalPathname: '/beta' },
        selectionMethod: 'keyboard',
      },
    ]);
    expect(state.closeReason).to.equal('selection');
  });

  it('click で該当 index を選択する', () => {
    const state: SelectionState = {
      loading: false,
      results: [
        { id: 'alpha', title: 'Alpha', renderHref: '/alpha' , canonicalPathname: '/alpha' },
        { id: 'beta', title: 'Beta', renderHref: '/beta' , canonicalPathname: '/beta' },
      ],
      activeId: null,
      query: 'alpha',
      virtualScrollTop: 0,
      selected: [],
      closeReason: null,
    };

    const { host } = createSelectionHost(state, createSearchFieldStub(false));
    const model = new SearchDialogSelectionModel(host, new SearchDialogVirtualizer());

    const target = document.createElement('li');
    target.dataset['index'] = '0';

    model.handleResultClick({
      currentTarget: target,
    } as unknown as Event);

    expect(state.selected[0]?.selectionMethod).to.equal('pointer');
    expect(state.closeReason).to.equal('selection');
  });

  it('Tab で input から close button へ移動する', () => {
    const state: SelectionState = {
      loading: false,
      results: [],
      activeId: null,
      query: '',
      virtualScrollTop: 0,
      selected: [],
      closeReason: null,
    };

    const searchField = createSearchFieldStub(false);
    const { host, closeButton } = createSelectionHost(state, searchField);
    let focusCount = 0;
    closeButton.focus = () => {
      focusCount += 1;
    };
    const model = new SearchDialogSelectionModel(host, new SearchDialogVirtualizer());

    const input = document.createElement('input');
    model.handleSearchFieldKeydown(
      createKeyboardEventLike('Tab', {
        currentTarget: searchField,
        origin: input,
      }),
    );

    expect(focusCount).to.equal(1);
  });
});
