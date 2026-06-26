import { describe, expect, it } from 'vitest';

import {
  SearchDialogSelectionModel,
  type SearchDialogActiveChangeOrigin,
  type SearchDialogFocusTarget,
  type SearchDialogSelectionHost,
} from '../../src/search/search-dialog-selection-model.js';

interface SelectionRecord {
  readonly activeId: string;
  readonly method: 'keyboard' | 'pointer';
}

const createHost = (
  options: {
    readonly ids?: readonly string[];
    readonly activeId?: string | null;
    readonly navigationStartIndex?: number | null;
  } = {},
): SearchDialogSelectionHost & {
  readonly activeChanges: {
    readonly activeId: string | null;
    readonly origin: SearchDialogActiveChangeOrigin;
  }[];
  readonly selections: SelectionRecord[];
  readonly focusRequests: SearchDialogFocusTarget[];
} => {
  const ids = options.ids ?? ['a', 'b', 'c'];
  const activeChanges: {
    readonly activeId: string | null;
    readonly origin: SearchDialogActiveChangeOrigin;
  }[] = [];
  const selections: SelectionRecord[] = [];
  const focusRequests: SearchDialogFocusTarget[] = [];
  let activeId = options.activeId ?? null;

  return {
    activeChanges,
    selections,
    focusRequests,
    isLoading: () => false,
    isUnavailable: () => false,
    isClearButtonVisible: () => true,
    getResultCount: () => ids.length,
    getResultIdAt: (index) => ids[index] ?? null,
    getActiveId: () => activeId,
    getNavigationStartIndex: () => options.navigationStartIndex ?? null,
    setActiveId: (nextActiveId, origin) => {
      activeId = nextActiveId;
      activeChanges.push({ activeId: nextActiveId, origin });
    },
    requestSelection: (nextActiveId, method) => {
      selections.push({ activeId: nextActiveId, method });
    },
    requestFocus: (target) => {
      focusRequests.push(target);
    },
  };
};

describe('SearchDialogSelectionModel', () => {
  it('active がない Enter は先頭候補を暗黙選択しない', () => {
    const host = createHost({ activeId: null });
    const model = new SearchDialogSelectionModel(host);

    model.selectActive('keyboard');

    expect(host.selections).to.deep.equal([]);
  });

  it('active がない ArrowDown は host の開始 index をそのまま使う', () => {
    const host = createHost({ activeId: null, navigationStartIndex: 1 });
    const model = new SearchDialogSelectionModel(host);

    model.moveActive(1);

    expect(host.activeChanges).to.deep.equal([
      { activeId: 'b', origin: 'keyboard-navigation' },
    ]);
  });

  it('active がない ArrowUp は host の開始 index に delta を二重加算しない', () => {
    const host = createHost({ activeId: null, navigationStartIndex: 2 });
    const model = new SearchDialogSelectionModel(host);

    model.moveActive(-1);

    expect(host.activeChanges).to.deep.equal([
      { activeId: 'c', origin: 'keyboard-navigation' },
    ]);
  });

  it('active がある Arrow 移動は keyboard-navigation origin で通知する', () => {
    const host = createHost({ activeId: 'b' });
    const model = new SearchDialogSelectionModel(host);

    model.moveActive(1);

    expect(host.activeChanges).to.deep.equal([
      { activeId: 'c', origin: 'keyboard-navigation' },
    ]);
  });

  it('setActiveByIndex は呼び出し元 origin を渡す', () => {
    const host = createHost();
    const model = new SearchDialogSelectionModel(host);

    model.setActiveByIndex(1, 'pointer');

    expect(host.activeChanges).to.deep.equal([{ activeId: 'b', origin: 'pointer' }]);
  });
});
