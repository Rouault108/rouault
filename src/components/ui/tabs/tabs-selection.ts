import type { UrlHistoryMode } from './tabs.types.js';

export interface TabsSelectionController {
  select(value: string, mode: UrlHistoryMode): TabsSelectionResult;
  getActiveValue(): string | null;
}

export const tabsSelectionControllers = new WeakMap<HTMLElement, TabsSelectionController>();
export type TabsSelectionResult =
  | 'not-enhanced'
  | 'invalid-value'
  | 'selected'
  | 'unchanged'
  | 'superseded';

export const selectTabsValue = (
  root: HTMLElement,
  value: string,
  options: { historyMode: UrlHistoryMode },
): TabsSelectionResult =>
  tabsSelectionControllers.get(root)?.select(value, options.historyMode) ?? 'not-enhanced';

export const readTabsSelection = (root: HTMLElement): string | null =>
  tabsSelectionControllers.get(root)?.getActiveValue() ?? null;
