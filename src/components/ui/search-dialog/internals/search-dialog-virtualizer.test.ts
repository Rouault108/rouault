import { describe, expect, it } from 'vitest';
import { SearchDialogVirtualizer } from './search-dialog-virtualizer';

describe('SearchDialogVirtualizer', () => {
  it('threshold 以下では virtualize しない', () => {
    const virtualizer = new SearchDialogVirtualizer();

    expect(virtualizer.isVirtualized(100)).toBe(false);
    expect(virtualizer.isVirtualized(101)).toBe(true);
  });

  it('非 virtualized 時は全件範囲を返す', () => {
    const virtualizer = new SearchDialogVirtualizer();

    expect(virtualizer.getVisibleRange(4, 0, 320)).toEqual({
      start: 0,
      end: 4,
      topSpacer: 0,
      bottomSpacer: 0,
    });
  });

  it('virtualized 時は可視範囲と spacer を返す', () => {
    const virtualizer = new SearchDialogVirtualizer();

    const range = virtualizer.getVisibleRange(160, 480, 240);

    expect(range.start).toBeGreaterThanOrEqual(0);
    expect(range.end).toBeGreaterThan(range.start);
    expect(range.topSpacer).toBe(range.start * 48);
    expect(range.bottomSpacer).toBeGreaterThanOrEqual(0);
  });

  it('指定 index が view 外にある場合は scrollTop を更新する', () => {
    const virtualizer = new SearchDialogVirtualizer();
    const list = document.createElement('div');

    Object.defineProperty(list, 'clientHeight', {
      value: 240,
      configurable: true,
    });

    const nextScrollTop = virtualizer.scrollIndexIntoView(20, list, 0);

    expect(nextScrollTop).toBeGreaterThan(0);
    expect(list.scrollTop).toBe(nextScrollTop);
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

    expect(nextScrollTop).toBe(240);
    expect(list.scrollTop).toBe(240);
  });
});