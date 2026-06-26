import { expect } from '@open-wc/testing';
import { SearchDialogVirtualizer } from '../../src/search/search-dialog-virtualizer.js';

describe('SearchDialogVirtualizer', () => {
  it('threshold 以下では virtualize しない', () => {
    const virtualizer = new SearchDialogVirtualizer();

    expect(virtualizer.isVirtualized(100)).to.equal(false);
    expect(virtualizer.isVirtualized(101)).to.equal(true);
  });

  it('非 virtualized 時は全件範囲を返す', () => {
    const virtualizer = new SearchDialogVirtualizer();

    expect(virtualizer.getVisibleRange.length).to.equal(3);
    expect(virtualizer.getVisibleRange(4, 0, 320)).to.deep.equal({
      start: 0,
      end: 4,
      topSpacer: 0,
      bottomSpacer: 0,
    });
  });

  it('virtualized 時は scrollTop と listHeight だけで可視範囲と spacer を返す', () => {
    const virtualizer = new SearchDialogVirtualizer();

    const range = virtualizer.getVisibleRange(160, 480, 240);
    const sameRangeWithFormerActiveIndex = virtualizer.getVisibleRange(160, 480, 240);

    expect(range.start).to.be.greaterThanOrEqual(0);
    expect(range.end).to.be.greaterThan(range.start);
    expect(range.topSpacer).to.equal(range.start * 48);
    expect(range.bottomSpacer).to.be.greaterThanOrEqual(0);
    expect(sameRangeWithFormerActiveIndex).to.deep.equal(range);
  });

  it('total=0 では空 range を返す', () => {
    const virtualizer = new SearchDialogVirtualizer();

    expect(virtualizer.getVisibleRange(0, 480, 240)).to.deep.equal({
      start: 0,
      end: 0,
      topSpacer: 0,
      bottomSpacer: 0,
    });
  });

  it('過大な scrollTop でも range 上限へ clamp する', () => {
    const virtualizer = new SearchDialogVirtualizer();

    const range = virtualizer.getVisibleRange(160, 999_999, 240);

    expect(range.start).to.be.greaterThanOrEqual(0);
    expect(range.start).to.be.lessThanOrEqual(149);
    expect(range.end).to.be.greaterThanOrEqual(range.start);
    expect(range.end).to.be.lessThanOrEqual(160);
    expect(range.bottomSpacer).to.equal(0);
  });

  it('viewport range は overscan を含まない視覚範囲を返す', () => {
    const virtualizer = new SearchDialogVirtualizer();

    expect(virtualizer.getViewportIndexRange(160, 480, 240)).to.deep.equal({
      start: 10,
      end: 15,
    });
  });

  it('viewport range は空 total と高さ 0 の境界を固定する', () => {
    const virtualizer = new SearchDialogVirtualizer();

    expect(virtualizer.getViewportIndexRange(0, 480, 240)).to.deep.equal({
      start: 0,
      end: 0,
    });
    expect(virtualizer.getViewportIndexRange(160, 480, 0)).to.deep.equal({
      start: 10,
      end: 11,
    });
  });

  it('keyboard navigation 用に指定 index が view 外にある場合は scrollTop を更新する', () => {
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
