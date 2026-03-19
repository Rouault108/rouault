import { expect } from '@open-wc/testing';
import { SearchDialogVirtualizer } from './search-dialog-virtualizer';

describe('SearchDialogVirtualizer', () => {
  it('threshold 以下では virtualize しない', () => {
    const virtualizer = new SearchDialogVirtualizer();

    expect(virtualizer.isVirtualized(100)).to.equal(false);
    expect(virtualizer.isVirtualized(101)).to.equal(true);
  });

  it('非 virtualized 時は全件範囲を返す', () => {
    const virtualizer = new SearchDialogVirtualizer();

    expect(virtualizer.getVisibleRange(4, 0, 320)).to.deep.equal({
      start: 0,
      end: 4,
      topSpacer: 0,
      bottomSpacer: 0,
    });
  });

  it('virtualized 時は可視範囲と spacer を返す', () => {
    const virtualizer = new SearchDialogVirtualizer();

    const range = virtualizer.getVisibleRange(160, 480, 240);

    expect(range.start).to.be.greaterThanOrEqual(0);
    expect(range.end).to.be.greaterThan(range.start);
    expect(range.topSpacer).to.equal(range.start * 48);
    expect(range.bottomSpacer).to.be.greaterThanOrEqual(0);
  });

  it('指定 index が view 外にある場合は scrollTop を更新する', () => {
    const virtualizer = new SearchDialogVirtualizer();
    const list = document.createElement('div');

    Object.defineProperty(list, 'clientHeight', {
      value: 240,
      configurable: true,
    });

    const nextScrollTop = virtualizer.scrollIndexIntoView(20, list, 0);

    expect(nextScrollTop).to.be.greaterThan(0);
  });

  it('既に visible 範囲内なら scrollTop を維持する', () => {
    const virtualizer = new SearchDialogVirtualizer();
    const list = document.createElement('div');

    Object.defineProperty(list, 'clientHeight', {
      value: 240,
      configurable: true,
    });

    list.scrollTop = 240;
    const nextScrollTop = virtualizer.scrollIndexIntoView(6, list, 240);

    expect(nextScrollTop).to.equal(240);
  });
});
