import {
  VIRTUALIZATION_THRESHOLD,
  VIRTUAL_OVERSCAN,
  VIRTUAL_ROW_HEIGHT_PX,
} from './search-dialog-constants.js';
import type { VisibleRange } from './search-dialog-types.js';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export class SearchDialogVirtualizer {
  isVirtualized(total: number): boolean {
    return total > VIRTUALIZATION_THRESHOLD;
  }

  getVisibleRange(total: number, scrollTop: number, listHeight: number): VisibleRange {
    if (total <= 0) {
      return { start: 0, end: 0, topSpacer: 0, bottomSpacer: 0 };
    }

    if (!this.isVirtualized(total)) {
      return { start: 0, end: total, topSpacer: 0, bottomSpacer: 0 };
    }

    const visibleCount = Math.max(1, Math.ceil(listHeight / VIRTUAL_ROW_HEIGHT_PX));
    const windowSize = Math.min(total, visibleCount + VIRTUAL_OVERSCAN * 2);
    const rawStart =
      Math.floor(Math.max(0, scrollTop) / VIRTUAL_ROW_HEIGHT_PX) - VIRTUAL_OVERSCAN;
    const maxStart = Math.max(0, total - windowSize);
    const start = Math.min(maxStart, Math.max(0, rawStart));
    const end = Math.min(total, start + windowSize);
    const topSpacer = start * VIRTUAL_ROW_HEIGHT_PX;
    const bottomSpacer = Math.max(0, (total - end) * VIRTUAL_ROW_HEIGHT_PX);

    return { start, end, topSpacer, bottomSpacer };
  }

  getViewportIndexRange(
    total: number,
    scrollTop: number,
    listHeight: number,
  ): { start: number; end: number } {
    if (total <= 0) return { start: 0, end: 0 };

    const normalizedScrollTop = Math.max(0, scrollTop);
    const start = clamp(
      Math.floor(normalizedScrollTop / VIRTUAL_ROW_HEIGHT_PX),
      0,
      total - 1,
    );
    const visibleCount = Math.max(
      1,
      Math.ceil(Math.max(0, listHeight) / VIRTUAL_ROW_HEIGHT_PX),
    );
    const end = clamp(start + visibleCount, start + 1, total);

    return { start, end };
  }

  scrollIndexIntoView(index: number, list: HTMLElement, scrollTop: number): number {
    const listBottom = scrollTop + list.clientHeight;
    const itemTop = index * VIRTUAL_ROW_HEIGHT_PX;
    const itemBottom = itemTop + VIRTUAL_ROW_HEIGHT_PX;

    if (itemTop < scrollTop) {
      list.scrollTop = itemTop;
      return itemTop;
    }

    if (itemBottom > listBottom) {
      const nextScrollTop = itemBottom - list.clientHeight;
      list.scrollTop = nextScrollTop;
      return nextScrollTop;
    }

    return scrollTop;
  }
}
