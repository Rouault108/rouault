import { readTabsSelection, selectTabsValue } from '../client/post-hydrate/tabs-enhancer.js';
import { isHTMLElement } from '../lib/dom.js';
import type { TocCapabilities, TocHeading as Heading, TocScopeSelection } from './toc-headings.js';

export type { TocCapabilities, TocScopeSelection };

const isTabPanel = (value: Element | null): value is HTMLElement =>
  isHTMLElement(value) && value.hasAttribute('data-tab-panel');

const isHiddenTabPanel = (panel: HTMLElement): boolean =>
  panel.parentElement?.hasAttribute('data-tabs-enhanced') === true &&
  (panel.hasAttribute('hidden') || panel.getAttribute('aria-hidden') === 'true');

export const findContentRoot = (contentRootId: string): HTMLElement | null => {
  const normalized = contentRootId.trim();
  if (normalized.length === 0 || typeof document === 'undefined') {
    return null;
  }

  const element = document.getElementById(normalized);
  return isHTMLElement(element) ? element : null;
};

export const findHeadingElement = (root: HTMLElement, id: string): HTMLElement | null => {
  const element = root.ownerDocument.getElementById(id);
  if (!isHTMLElement(element)) {
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

const resolvePanelTabValue = (tabsHost: HTMLElement, panel: HTMLElement): string | null =>
  panel.parentElement === tabsHost ? panel.getAttribute('data-tab-value') : null;

export const resolveTabValueForDescendant = (
  tabsHost: HTMLElement,
  target: HTMLElement,
): string | null => {
  const children = Array.from(tabsHost.children).filter((child): child is HTMLElement =>
    isHTMLElement(child),
  );

  const panels = children.filter((child) => child.hasAttribute('data-tab-panel'));
  const panel = panels.find((candidate) => candidate.contains(target));

  if (!isHTMLElement(panel)) {
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
    const tabsHost = panel.closest<HTMLElement>('[data-tabs-root]');
    if (!isHTMLElement(tabsHost)) {
      continue;
    }

    const value = resolvePanelTabValue(tabsHost, panel);
    if (!value) {
      continue;
    }

    selectTabsValue(tabsHost, value, { historyMode: 'none' });
  }
};

export const readTocScopeSelectionMap = (contentRoot: HTMLElement): Map<string, string> => {
  const result = new Map<string, string>();
  const tabsHosts = contentRoot.querySelectorAll<HTMLElement>('[data-tabs-root][data-toc-scope]');

  for (const tabsHost of tabsHosts) {
    const scopeId = tabsHost.getAttribute('data-toc-scope')?.trim() ?? '';
    if (scopeId.length === 0) {
      continue;
    }

    const selectedValue = readTabsSelection(tabsHost);
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
      (selection) =>
        !selections.has(selection.scopeId) || selections.get(selection.scopeId) === selection.value,
    );
  });

export const applyTocScopeSelections = (
  contentRoot: HTMLElement,
  selections: readonly TocScopeSelection[],
  options: {
    historyMode?: 'none' | 'push' | 'replace';
  } = {},
): void => {
  const historyMode = options.historyMode ?? 'replace';

  for (const selection of selections) {
    const tabsHost = contentRoot.querySelector<HTMLElement>(
      `[data-tabs-root][data-toc-scope="${selection.scopeId}"]`,
    );
    if (!isHTMLElement(tabsHost)) {
      continue;
    }

    selectTabsValue(tabsHost, selection.value, { historyMode });
  }
};
