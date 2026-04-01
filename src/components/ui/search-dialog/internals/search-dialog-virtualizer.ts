import {
  VIRTUALIZATION_THRESHOLD,
  VIRTUAL_OVERSCAN,
  VIRTUAL_ROW_HEIGHT_PX,
} from '../search-dialog.constants.js';
import type { VisibleRange } from '../search-dialog.types.js';

export class SearchDialogVirtualizer {
  isVirtualized(total: number): boolean {
    return total > VIRTUALIZATION_THRESHOLD;
  }

  getVisibleRange(
    total: number,
    scrollTop: number,
    listHeight: number,
    activeIndex = -1,
  ): VisibleRange {
    if (!this.isVirtualized(total)) {
      return { start: 0, end: total, topSpacer: 0, bottomSpacer: 0 };
    }

    const visibleCount = Math.max(1, Math.ceil(listHeight / VIRTUAL_ROW_HEIGHT_PX));
    let start = Math.max(0, Math.floor(scrollTop / VIRTUAL_ROW_HEIGHT_PX) - VIRTUAL_OVERSCAN);
    let end = Math.min(total, start + visibleCount + VIRTUAL_OVERSCAN * 2);

    if (activeIndex >= 0) {
      if (activeIndex < start) {
        start = Math.max(0, activeIndex - VIRTUAL_OVERSCAN);
        end = Math.min(total, start + visibleCount + VIRTUAL_OVERSCAN * 2);
      } else if (activeIndex >= end) {
        end = Math.min(total, activeIndex + VIRTUAL_OVERSCAN + 1);
        start = Math.max(0, end - visibleCount - VIRTUAL_OVERSCAN * 2);
      }
    }

    const topSpacer = start * VIRTUAL_ROW_HEIGHT_PX;
    const bottomSpacer = Math.max(0, (total - end) * VIRTUAL_ROW_HEIGHT_PX);

    return { start, end, topSpacer, bottomSpacer };
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
