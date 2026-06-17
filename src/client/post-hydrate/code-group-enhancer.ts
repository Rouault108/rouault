import { resolveGroupCopyButtonLabel } from './code-surface-shared.js';

const GROUP_SELECTOR = 'section[data-code-group]';
const TAB_SELECTOR = '[data-code-group-tab]';
const PANEL_SELECTOR = '[data-code-group-panel]';
const CODE_BLOCK_SELECTOR = 'pre[data-code-block]';

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
    button.disabled = true;
    button.removeAttribute('data-copy-target-id');
    button.setAttribute('aria-label', 'コードをコピー');
    return;
  }

  button.setAttribute(
    'aria-label',
    resolveGroupCopyButtonLabel(activePre, activePanel.dataset['codeGroupPanelLabel'] ?? null),
  );
  button.dataset['copyTargetId'] = copySourceId;
  button.disabled = activePre.dataset['codeCopyable'] === 'false';
};

const resetCopyState = (button: HTMLButtonElement | null): void => {
  if (!button) {
    return;
  }

  button.dataset['copyState'] = 'idle';
  const describedBy = button.getAttribute('aria-describedby');
  const status = describedBy ? button.ownerDocument.getElementById(describedBy) : null;
  if (status instanceof HTMLElement && status.matches('[data-copy-status]')) {
    status.textContent = '';
  }
};

const syncSelection = (state: GroupState, nextKey: string): void => {
  state.group.dataset['codeGroupSelected'] = nextKey;
  state.group.dataset['codeGroupEnhanced'] = 'true';

  for (const tab of state.tabs) {
    const selected = (tab.dataset['codeGroupKey'] ?? tab.dataset['codeGroupTab']) === nextKey;
    tab.setAttribute('aria-selected', selected ? 'true' : 'false');
    tab.tabIndex = selected ? 0 : -1;
    tab.dataset['selected'] = selected ? 'true' : 'false';
  }

  for (const panel of state.panels) {
    const selected = panel.dataset['codeGroupPanel'] === nextKey;
    panel.hidden = !selected;
    if (selected) {
      panel.removeAttribute('data-code-group-inactive');
    } else {
      panel.setAttribute('data-code-group-inactive', 'true');
    }
  }

  resetCopyState(state.copyButton);
  syncCopyButton(state, nextKey);
};

const focusNextTab = (tabs: HTMLButtonElement[], currentIndex: number, delta: number): void => {
  if (tabs.length === 0) {
    return;
  }

  const nextIndex = (currentIndex + delta + tabs.length) % tabs.length;
  tabs[nextIndex]?.focus();
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

  for (const [index, tab] of state.tabs.entries()) {
    const key = tab.dataset['codeGroupTab'] ?? `tab-${String(index)}`;
    const normalizedKey = tab.dataset['codeGroupKey'] ?? key;
    const tabId = tab.id || `${groupId}-tab-${normalizedKey}`;
    const panelId = tab.getAttribute('aria-controls') ?? `${groupId}-panel-${normalizedKey}`;

    tab.id = tabId;
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panelId);
  }

  for (const [index, panel] of state.panels.entries()) {
    const key = panel.dataset['codeGroupPanel'] ?? `panel-${String(index)}`;
    const tabId = panel.getAttribute('aria-labelledby') ?? `${groupId}-tab-${key}`;
    const panelId = panel.id || `${groupId}-panel-${key}`;

    panel.id = panelId;
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tabId);
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
    if (tab.dataset['bound'] === 'true') {
      continue;
    }

    tab.dataset['bound'] = 'true';
    tab.addEventListener('click', () => {
      const nextKey = tab.dataset['codeGroupKey'] ?? tab.dataset['codeGroupTab'] ?? '';
      syncSelection(state, nextKey);
    });
    tab.addEventListener('keydown', (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          focusNextTab(tabs, index, 1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          focusNextTab(tabs, index, -1);
          break;
        case 'Home':
          event.preventDefault();
          tabs[0]?.focus();
          break;
        case 'End':
          event.preventDefault();
          tabs[tabs.length - 1]?.focus();
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          syncSelection(state, tab.dataset['codeGroupKey'] ?? tab.dataset['codeGroupTab'] ?? '');
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
