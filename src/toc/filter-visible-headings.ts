import type { Heading } from '../components/ui/toc/toc.js';
import { getTabsUrlSyncStrategy } from '../components/ui/tabs/tabs-url-sync-strategy.js';

type TabsLike = HTMLElement & {
  selectedValue?: string | null;
  select?: (
    value: string,
    options?: {
      historyMode?: 'none' | 'push' | 'replace';
      emitEvent?: boolean;
    },
  ) => void;
};

export interface TocCapabilities {
  activeTracking: boolean;
  dynamicScopes: boolean;
  mobileSummary: boolean;
}

export type TocScopeSelection = NonNullable<Heading['scopeSelections']>[number];

const isTabPanel = (value: Element | null): value is HTMLElement =>
  value instanceof HTMLElement && value.getAttribute('role') === 'tabpanel';

const isHiddenTabPanel = (panel: HTMLElement): boolean =>
  panel.hasAttribute('hidden') || panel.getAttribute('aria-hidden') === 'true';

export const findContentRoot = (contentRootId: string): HTMLElement | null => {
  const normalized = contentRootId.trim();
  if (normalized.length === 0 || typeof document === 'undefined') {
    return null;
  }

  const element = document.getElementById(normalized);
  return element instanceof HTMLElement ? element : null;
};

export const findHeadingElement = (root: HTMLElement, id: string): HTMLElement | null => {
  const element = root.ownerDocument.getElementById(id);
  if (!(element instanceof HTMLElement)) {
    return null;
  }
  return root.contains(element) ? element : null;
};

export const isHeadingInsideInactivePanel = (
  headingElement: HTMLElement,
  contentRoot: HTMLElement,
): boolean => {
  let current: HTMLElement | null = headingElement;

  while (current && current !== contentRoot) {
    if (isTabPanel(current) && isHiddenTabPanel(current)) {
      return true;
    }
    current = current.parentElement;
  }

  return false;
};

export const filterVisibleHeadings = (
  contentRoot: HTMLElement,
  headings: readonly Heading[],
): Heading[] =>
  headings.filter((heading) => {
    const element = findHeadingElement(contentRoot, heading.id);
    return element !== null && !isHeadingInsideInactivePanel(element, contentRoot);
  });

const resolvePanelTabValue = (tabsHost: HTMLElement, panel: HTMLElement): string | null => {
  const children = Array.from(tabsHost.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  );

  const panels = children.filter((child) => child.getAttribute('slot') === 'panel');
  const tabs = children.filter((child) => child.getAttribute('slot') === 'tab');

  const panelIndex = panels.indexOf(panel);
  if (panelIndex < 0) {
    return null;
  }

  const tab = tabs[panelIndex];
  if (!(tab instanceof HTMLElement)) {
    return null;
  }

  const value = tab.getAttribute('value')?.trim() ?? '';
  return value.length > 0 ? value : null;
};

export const resolveTabValueForDescendant = (
  tabsHost: HTMLElement,
  target: HTMLElement,
): string | null => {
  const children = Array.from(tabsHost.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  );

  const panels = children.filter((child) => child.getAttribute('slot') === 'panel');
  const panel = panels.find((candidate) => candidate.contains(target));

  if (!(panel instanceof HTMLElement)) {
    return null;
  }

  return resolvePanelTabValue(tabsHost, panel);
};

export const revealHeadingInTabs = (contentRoot: HTMLElement, target: HTMLElement): void => {
  const ancestorPanels: HTMLElement[] = [];
  let current: HTMLElement | null = target.parentElement;

  while (current && current !== contentRoot) {
    if (isTabPanel(current)) {
      ancestorPanels.push(current);
    }
    current = current.parentElement;
  }

  ancestorPanels.reverse();

  for (const panel of ancestorPanels) {
    const tabsHost = panel.closest('ui-tabs') as TabsLike | null;
    if (!(tabsHost instanceof HTMLElement)) {
      continue;
    }

    const value = resolvePanelTabValue(tabsHost, panel);
    if (!value || typeof tabsHost.select !== 'function') {
      continue;
    }

    tabsHost.select(value, { historyMode: 'replace' });
  }
};

const readSelectedValueFromTabsHost = (tabsHost: TabsLike): string | null => {
  const selectedValue =
    typeof tabsHost.selectedValue === 'string' && tabsHost.selectedValue.trim().length > 0
      ? tabsHost.selectedValue.trim()
      : null;
  if (selectedValue) {
    return selectedValue;
  }

  const attributeValue = tabsHost.getAttribute('selected-value')?.trim() ?? '';
  if (attributeValue.length > 0) {
    return attributeValue;
  }

  if (tabsHost.hasAttribute('url-sync') && typeof window !== 'undefined') {
    const queryValue = getTabsUrlSyncStrategy()?.readValue(window.location.href) ?? null;
    if (queryValue) {
      return queryValue;
    }
  }

  const defaultValue = tabsHost.getAttribute('default-selected-value')?.trim() ?? '';
  return defaultValue.length > 0 ? defaultValue : null;
};

export const readTocScopeSelectionMap = (contentRoot: HTMLElement): Map<string, string> => {
  const result = new Map<string, string>();
  const tabsHosts = contentRoot.querySelectorAll<TabsLike>('ui-tabs[data-toc-scope]');

  for (const tabsHost of tabsHosts) {
    const scopeId = tabsHost.getAttribute('data-toc-scope')?.trim() ?? '';
    if (scopeId.length === 0) {
      continue;
    }

    const selectedValue = readSelectedValueFromTabsHost(tabsHost);
    if (selectedValue) {
      result.set(scopeId, selectedValue);
    }
  }

  return result;
};

export const filterHeadingsByScopeSelections = (
  headings: readonly Heading[],
  selections: ReadonlyMap<string, string>,
): Heading[] =>
  headings.filter((heading) => {
    const scopeSelections = heading.scopeSelections ?? [];
    if (scopeSelections.length === 0) {
      return true;
    }

    return scopeSelections.every(
      (selection) => selections.get(selection.scopeId) === selection.value,
    );
  });

export const applyTocScopeSelections = (
  contentRoot: HTMLElement,
  selections: readonly TocScopeSelection[],
): void => {
  for (const selection of selections) {
    const tabsHost = contentRoot.querySelector<TabsLike>(
      `ui-tabs[data-toc-scope="${selection.scopeId}"]`,
    );
    if (!(tabsHost instanceof HTMLElement) || typeof tabsHost.select !== 'function') {
      continue;
    }

    tabsHost.select(selection.value, { historyMode: 'replace' });
  }
};
