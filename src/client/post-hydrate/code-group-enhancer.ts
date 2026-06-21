import { resolveGroupCopyButtonLabel } from './code-surface-shared.js';

const GROUP_SELECTOR = 'section[data-code-group]';
const TAB_SELECTOR = '[data-code-group-tab]';
const PANEL_SELECTOR = '[data-code-group-panel]';
const CODE_BLOCK_SELECTOR = 'pre[data-code-block]';

const getTabKey = (tab: HTMLButtonElement, fallback = ''): string =>
  tab.dataset['codeGroupKey'] ?? tab.dataset['codeGroupTab'] ?? fallback;

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

const findCopyButton = (group: HTMLElement): HTMLButtonElement | null =>
  group.querySelector<HTMLButtonElement>('button[data-code-group-copy][data-copy-button]');

const applyTabSemantics = (state: GroupState): void => {
  const groupId = state.group.dataset['codeGroupId'] ?? 'code-group';
  const groupLabel = state.group.dataset['codeGroupLabel'] ?? 'コード比較';
  const tabList = state.group.querySelector<HTMLElement>('.code-group-tablist');
  if (tabList) {
    tabList.setAttribute('role', 'tablist');
    tabList.setAttribute('aria-label', groupLabel);
  }

  const tabIdsByKey = new Map<string, string>();
  const panelIdsByKey = new Map<string, string>();

  for (const [index, tab] of state.tabs.entries()) {
    const key = tab.dataset['codeGroupTab'] ?? `tab-${String(index)}`;
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

const enhanceGroup = (group: HTMLElement): void => {
  if (group.dataset['codeGroupEnhanced'] === 'true') {
    return;
  }

  const tabs = Array.from(group.querySelectorAll<HTMLButtonElement>(TAB_SELECTOR));
  const panels = Array.from(group.querySelectorAll<HTMLElement>(PANEL_SELECTOR));
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

  const initialKey =
    group.dataset['codeGroupSelected'] ??
    panels[0]?.dataset['codeGroupPanel'] ??
    tabs[0]?.dataset['codeGroupTab'] ??
    '';

  for (const [index, tab] of tabs.entries()) {
    if (tab.dataset['codeGroupTabBound'] === 'true') {
      continue;
    }

    tab.dataset['codeGroupTabBound'] = 'true';
    tab.addEventListener('click', () => {
      const nextKey = getTabKey(tab);
      syncSelection(state, nextKey);
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
          syncSelection(state, getTabKey(tab));
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
    enhanceGroup(group);
  }
};
