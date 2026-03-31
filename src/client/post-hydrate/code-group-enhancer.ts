import '../../components/ui/copy-button/copy-button.js';
import {
  getCodeCopyValue,
  isCodeCopyDisabled,
  resolveGroupCopyButtonLabel,
  shouldRenderCodeCopyButton,
} from './code-surface-shared.js';

const GROUP_SELECTOR = 'section[data-code-group]';
const TAB_SELECTOR = '[data-code-group-tab]';
const PANEL_SELECTOR = '[data-code-group-panel]';
const CODE_BLOCK_SELECTOR = 'pre[data-code-block]';

interface CopyButtonElement extends HTMLElement {
  disabled: boolean;
  hidden: boolean;
  label: string;
  size: 'sm' | 'md';
  value: string;
  resetState?: () => void;
}

interface GroupState {
  readonly group: HTMLElement;
  readonly tabs: HTMLButtonElement[];
  readonly panels: HTMLElement[];
  readonly copyButton: CopyButtonElement | null;
}

const syncCopyButton = (state: GroupState, selectedKey: string): void => {
  const button = state.copyButton;
  if (!button) {
    return;
  }

  const activePanel = state.panels.find((panel) => panel.dataset['codeGroupPanel'] === selectedKey) ?? null;
  const activePre = activePanel?.querySelector<HTMLElement>(CODE_BLOCK_SELECTOR) ?? null;
  if (!activePre || !shouldRenderCodeCopyButton(activePre)) {
    button.hidden = true;
    button.disabled = true;
    button.value = '';
    button.label = 'コードをコピー';
    button.resetState?.();
    return;
  }

  button.hidden = false;
  button.size = 'sm';
  button.label = resolveGroupCopyButtonLabel(
    activePre,
    activePanel?.dataset['codeGroupPanelLabel'] ?? null,
  );
  button.value = getCodeCopyValue(activePre) ?? '';
  button.disabled = isCodeCopyDisabled(activePre);
  button.resetState?.();
};

const syncSelection = (state: GroupState, nextKey: string): void => {
  state.group.dataset['codeGroupSelected'] = nextKey;
  state.group.dataset['enhanced'] = 'true';

  for (const tab of state.tabs) {
    const selected = tab.dataset['codeGroupTab'] === nextKey;
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

  syncCopyButton(state, nextKey);
};

const focusNextTab = (tabs: HTMLButtonElement[], currentIndex: number, delta: number): void => {
  if (tabs.length === 0) {
    return;
  }

  const nextIndex = (currentIndex + delta + tabs.length) % tabs.length;
  tabs[nextIndex]?.focus();
};

const ensureCopyButton = (group: HTMLElement): CopyButtonElement | null => {
  const header = group.querySelector<HTMLElement>('.code-group-header');
  if (!header) {
    return null;
  }

  let tools = header.querySelector<HTMLElement>('.code-group-header-tools');
  if (!tools) {
    tools = document.createElement('div');
    tools.className = 'code-group-header-tools';
    header.append(tools);
  }

  let button = tools.querySelector<CopyButtonElement>('ui-copy-button[data-code-group-copy]');
  if (!button) {
    button = document.createElement('ui-copy-button') as CopyButtonElement;
    button.setAttribute('data-code-group-copy', 'true');
    tools.append(button);
  }

  return button;
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
    copyButton: ensureCopyButton(group),
  };

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
      const nextKey = tab.dataset['codeGroupTab'] ?? '';
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
          syncSelection(state, tab.dataset['codeGroupTab'] ?? '');
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