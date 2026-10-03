import type { TabsOrientation } from './tabs.types.js';

export function scrollTabElementIntoView(
  container: HTMLElement,
  tabEl: HTMLElement,
  orientation: TabsOrientation,
): void {
  if (tabEl.getClientRects().length === 0 || container.getClientRects().length === 0) {
    return;
  }

  const containerRect = container.getBoundingClientRect();
  const tabRect = tabEl.getBoundingClientRect();

  if (orientation === 'vertical') {
    if (tabRect.top < containerRect.top) {
      container.scrollTop -= Math.ceil(containerRect.top - tabRect.top);
    } else if (tabRect.bottom > containerRect.bottom) {
      container.scrollTop += Math.ceil(tabRect.bottom - containerRect.bottom);
    }
    return;
  }

  if (tabRect.left < containerRect.left) {
    container.scrollLeft -= Math.ceil(containerRect.left - tabRect.left);
  } else if (tabRect.right > containerRect.right) {
    container.scrollLeft += Math.ceil(tabRect.right - containerRect.right);
  }
}
