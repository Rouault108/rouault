import { resolveGroupCopyButtonLabel } from './code-surface-shared.js';

const GROUP_SELECTOR = 'section[data-code-group]';
const CODE_BLOCK_SELECTOR = 'pre[data-code-block]';

const getTabKey = (tab: HTMLButtonElement, fallback = ''): string =>
  tab.dataset['codeGroupKey'] ?? fallback;

const firstNonEmpty = (...values: (string | undefined)[]): string =>
  values.find((value): value is string => typeof value === 'string' && value.length > 0) ?? '';

const syncRovingTabIndex = (tabs: HTMLButtonElement[], focusedKey: string): void => {
  for (const tab of tabs) {
    tab.tabIndex = getTabKey(tab) === focusedKey ? 0 : -1;
  }
};

interface GroupState {
  readonly group: HTMLElement;
  readonly tabs: HTMLButtonElement[];
  readonly panels: HTMLElement[];
  readonly copyButton: HTMLButtonElement | null;
}

const syncCopyButton = (state: GroupState, selectedKey: string): void => {
  const button = state.copyButton;
  if (!button) {
    return;
  }

  const activePanel =
    state.panels.find((panel) => panel.dataset['codeGroupPanel'] === selectedKey) ?? null;
  const activePre = activePanel?.querySelector<HTMLElement>(CODE_BLOCK_SELECTOR) ?? null;
  const copySourceId = activePanel?.dataset['codeCopySourceId'];
  if (!activePre || !copySourceId || activePre.dataset['codeCopyMode'] === 'hidden') {
    button.removeAttribute('data-copy-target-id');
    button.setAttribute('aria-label', 'コードをコピー');
    return;
  }

  button.setAttribute(
    'aria-label',
    resolveGroupCopyButtonLabel(activePre, activePanel.dataset['codeGroupPanelLabel'] ?? null),
  );
  button.dataset['copyTargetId'] = copySourceId;
};

const syncSelection = (state: GroupState, nextKey: string): void => {
  state.group.dataset['codeGroupSelected'] = nextKey;
  state.group.dataset['codeGroupEnhanced'] = 'true';

  for (const tab of state.tabs) {
    const selected = getTabKey(tab) === nextKey;
    tab.setAttribute('aria-selected', selected ? 'true' : 'false');
    tab.dataset['codeGroupTabActive'] = selected ? 'true' : 'false';
  }
  syncRovingTabIndex(state.tabs, nextKey);

  for (const panel of state.panels) {
    const selected = panel.dataset['codeGroupPanel'] === nextKey;
    panel.removeAttribute('hidden');
    panel.removeAttribute('aria-hidden');
    panel.dataset['codeGroupPanelActive'] = selected ? 'true' : 'false';
  }

  syncCopyButton(state, nextKey);
};

const hasDirectTabAndPanelForKey = (
  tabs: readonly HTMLButtonElement[],
  panels: readonly HTMLElement[],
  nextKey: string,
): boolean =>
  tabs.some((tab) => getTabKey(tab) === nextKey) &&
  panels.some((panel) => panel.dataset['codeGroupPanel'] === nextKey);

const propagateSelectionWithinScope = (
  state: GroupState,
  nextKey: string,
  syncRoot: ParentNode,
): void => {
  const syncScope = state.group.dataset['codeGroupSyncScope'];
  if (!syncScope) {
    return;
  }

  const groups = Array.from(syncRoot.querySelectorAll<HTMLElement>(GROUP_SELECTOR));
  for (const target of groups) {
    if (
      target === state.group ||
      target.dataset['codeGroupEnhanced'] !== 'true' ||
      target.dataset['codeGroupSyncScope'] !== syncScope
    ) {
      continue;
    }

    const tabs = getScopedTabs(target);
    const panels = getScopedPanels(target);
    if (!hasDirectTabAndPanelForKey(tabs, panels, nextKey)) {
      continue;
    }

    syncSelection({
      group: target,
      tabs,
      panels,
      copyButton: findCopyButton(target),
    }, nextKey);
  }
};

const selectFromUserInteraction = (
  state: GroupState,
  nextKey: string,
  syncRoot: ParentNode,
): void => {
  syncSelection(state, nextKey);
  propagateSelectionWithinScope(state, nextKey, syncRoot);
};

const focusTab = (state: GroupState, tab: HTMLButtonElement | undefined): void => {
  if (!tab) {
    return;
  }

  syncRovingTabIndex(state.tabs, getTabKey(tab));
  tab.focus();
};

const focusNextTab = (state: GroupState, currentIndex: number, delta: number): void => {
  if (state.tabs.length === 0) {
    return;
  }

  const nextIndex = (currentIndex + delta + state.tabs.length) % state.tabs.length;
  focusTab(state, state.tabs[nextIndex]);
};

const getDirectHeader = (group: HTMLElement): HTMLElement | null =>
  Array.from(group.children).find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement &&
      child.classList.contains('code-group-header') &&
      child.dataset['codeGroupControls'] === 'true',
  ) ?? null;

const getDirectTabList = (group: HTMLElement): HTMLElement | null => {
  const header = getDirectHeader(group);
  return (
    Array.from(header?.children ?? []).find(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && child.classList.contains('code-group-tablist'),
    ) ?? null
  );
};

const findCopyButton = (group: HTMLElement): HTMLButtonElement | null => {
  const header = getDirectHeader(group);
  const tools =
    Array.from(header?.children ?? []).find(
      (child): child is HTMLElement =>
        child instanceof HTMLElement && child.classList.contains('code-group-header-tools'),
    ) ?? null;

  return (
    Array.from(tools?.children ?? []).find(
      (child): child is HTMLButtonElement =>
        child instanceof HTMLButtonElement &&
        child.matches('button[data-code-group-copy][data-copy-button]'),
    ) ?? null
  );
};

const getScopedTabs = (group: HTMLElement): HTMLButtonElement[] => {
  const tabList = getDirectTabList(group);
  return Array.from(tabList?.children ?? []).filter(
    (child): child is HTMLButtonElement =>
      child instanceof HTMLButtonElement && child.matches('button[data-code-group-tab]'),
  );
};

const getScopedPanels = (group: HTMLElement): HTMLElement[] =>
  Array.from(group.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement &&
      child.tagName.toLowerCase() === 'section' &&
      child.hasAttribute('data-code-group-panel'),
  );

const applyTabSemantics = (state: GroupState): void => {
  const groupId = state.group.dataset['codeGroupId'] ?? 'code-group';
  const groupLabel = state.group.dataset['codeGroupLabel'] ?? 'コード比較';
  const tabList = getDirectTabList(state.group);
  if (tabList) {
    tabList.setAttribute('role', 'tablist');
    tabList.setAttribute('aria-label', groupLabel);
  }

  const tabIdsByKey = new Map<string, string>();
  const panelIdsByKey = new Map<string, string>();

  for (const [index, tab] of state.tabs.entries()) {
    const key = tab.dataset['codeGroupKey'] ?? `tab-${String(index)}`;
    const normalizedKey = getTabKey(tab, key);
    const tabId = tab.id || `${groupId}-tab-${normalizedKey}`;

    tab.id = tabId;
    tab.setAttribute('role', 'tab');
    tabIdsByKey.set(normalizedKey, tabId);
  }

  for (const [index, panel] of state.panels.entries()) {
    const key = panel.dataset['codeGroupPanel'] ?? `panel-${String(index)}`;
    const panelId = panel.id || `${groupId}-panel-${key}`;

    panel.id = panelId;
    panel.setAttribute('role', 'tabpanel');
    panelIdsByKey.set(key, panelId);
  }

  for (const tab of state.tabs) {
    const key = getTabKey(tab);
    const panelId = panelIdsByKey.get(key);
    if (panelId) {
      tab.setAttribute('aria-controls', panelId);
    }
  }

  for (const panel of state.panels) {
    const key = panel.dataset['codeGroupPanel'] ?? '';
    const tabId = tabIdsByKey.get(key);
    if (tabId) {
      panel.setAttribute('aria-labelledby', tabId);
    }
  }
};

const enhanceGroup = (group: HTMLElement, syncRoot: ParentNode): void => {
  if (group.dataset['codeGroupEnhanced'] === 'true') {
    return;
  }

  const tabs = getScopedTabs(group);
  const panels = getScopedPanels(group);
  if (tabs.length === 0 || panels.length === 0) {
    return;
  }

  const state: GroupState = {
    group,
    tabs,
    panels,
    copyButton: findCopyButton(group),
  };

  applyTabSemantics(state);

  const initialKey = firstNonEmpty(
    group.dataset['codeGroupSelected'],
    panels[0]?.dataset['codeGroupPanel'],
    tabs[0] ? getTabKey(tabs[0]) : undefined,
  );

  for (const [index, tab] of tabs.entries()) {
    if (tab.dataset['codeGroupTabBound'] === 'true') {
      continue;
    }

    tab.dataset['codeGroupTabBound'] = 'true';
    tab.addEventListener('click', () => {
      const nextKey = getTabKey(tab);
      selectFromUserInteraction(state, nextKey, syncRoot);
    });
    tab.addEventListener('keydown', (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          focusNextTab(state, index, 1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          focusNextTab(state, index, -1);
          break;
        case 'Home':
          event.preventDefault();
          focusTab(state, tabs[0]);
          break;
        case 'End':
          event.preventDefault();
          focusTab(state, tabs[tabs.length - 1]);
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          selectFromUserInteraction(state, getTabKey(tab), syncRoot);
          break;
        default:
          break;
      }
    });
  }

  syncSelection(state, initialKey);
  group.dataset['codeGroupEnhanced'] = 'true';
};

export const enhanceCodeGroups = (root: ParentNode): void => {
  const groups = Array.from(root.querySelectorAll<HTMLElement>(GROUP_SELECTOR));
  for (const group of groups) {
    enhanceGroup(group, root);
  }
};
