import type { Heading } from '../../components/ui/toc/toc.js';

type TabsLike = HTMLElement & {
  select?: (value: string) => void;
};

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

    tabsHost.select(value);
  }
};