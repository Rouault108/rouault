import { expect } from '@open-wc/testing';
import type { SearchField } from '../../search-field/search-field';
import type { UiSearchDialogItem, UiSearchDialogSelectedDetail } from '../search-dialog.types';
import { SearchDialogSelectionModel } from './search-dialog-selection-model';
import { SearchDialogVirtualizer } from './search-dialog-virtualizer';

interface SelectionState {
  loading: boolean;
  results: readonly UiSearchDialogItem[];
  activeIndex: number;
  virtualScrollTop: number;
  selected: UiSearchDialogSelectedDetail[];
  closed: boolean;
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
      getActiveIndex: () => state.activeIndex,
      setActiveIndex: (index: number) => {
        state.activeIndex = index;
      },
      getSearchFieldElement: () => searchField,
      getCloseButtonElement: () => closeButton,
      getShadowRootRef: () => shadowRoot,
      getResultListElement: () => list,
      getVirtualScrollTop: () => state.virtualScrollTop,
      setVirtualScrollTop: (value: number) => {
        state.virtualScrollTop = value;
      },
      close: () => {
        state.closed = true;
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
        { title: 'Alpha', url: '/alpha' },
        { title: 'Beta', url: '/beta' },
      ],
      activeIndex: -1,
      virtualScrollTop: 0,
      selected: [],
      closed: false,
    };

    const searchField = createSearchFieldStub(false);
    const { host } = createSelectionHost(state, searchField);
    const model = new SearchDialogSelectionModel(host, new SearchDialogVirtualizer());

    model.handleSearchFieldKeydown(createKeyboardEventLike('ArrowDown'));

    expect(state.activeIndex).to.equal(0);
  });

  it('ArrowUp で末尾へループする', () => {
    const state: SelectionState = {
      loading: false,
      results: [
        { title: 'Alpha', url: '/alpha' },
        { title: 'Beta', url: '/beta' },
      ],
      activeIndex: -1,
      virtualScrollTop: 0,
      selected: [],
      closed: false,
    };

    const { host } = createSelectionHost(state, createSearchFieldStub(false));
    const model = new SearchDialogSelectionModel(host, new SearchDialogVirtualizer());

    model.handleSearchFieldKeydown(createKeyboardEventLike('ArrowUp'));

    expect(state.activeIndex).to.equal(1);
  });

  it('Enter で active item を選択し close する', () => {
    const state: SelectionState = {
      loading: false,
      results: [
        { title: 'Alpha', url: '/alpha' },
        { title: 'Beta', url: '/beta' },
      ],
      activeIndex: 1,
      virtualScrollTop: 0,
      selected: [],
      closed: false,
    };

    const { host } = createSelectionHost(state, createSearchFieldStub(false));
    const model = new SearchDialogSelectionModel(host, new SearchDialogVirtualizer());

    model.handleSearchFieldKeydown(createKeyboardEventLike('Enter'));

    expect(state.selected).to.deep.equal([{ title: 'Beta', url: '/beta' }]);
    expect(state.closed).to.equal(true);
  });

  it('click で該当 index を選択する', () => {
    const state: SelectionState = {
      loading: false,
      results: [
        { title: 'Alpha', url: '/alpha' },
        { title: 'Beta', url: '/beta' },
      ],
      activeIndex: -1,
      virtualScrollTop: 0,
      selected: [],
      closed: false,
    };

    const { host } = createSelectionHost(state, createSearchFieldStub(false));
    const model = new SearchDialogSelectionModel(host, new SearchDialogVirtualizer());

    const target = document.createElement('li');
    target.dataset['index'] = '0';

    model.handleResultClick({
      currentTarget: target,
    } as unknown as Event);

    expect(state.selected).to.deep.equal([{ title: 'Alpha', url: '/alpha' }]);
    expect(state.closed).to.equal(true);
  });

  it('Tab で input から close button へ移動する', () => {
    const state: SelectionState = {
      loading: false,
      results: [],
      activeIndex: -1,
      virtualScrollTop: 0,
      selected: [],
      closed: false,
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
