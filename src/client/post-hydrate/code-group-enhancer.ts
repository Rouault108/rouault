const GROUP_SELECTOR = 'section[data-code-group]';
const TAB_SELECTOR = '[data-code-group-tab]';
const PANEL_SELECTOR = '[data-code-group-panel]';
const COPY_BUTTON_SELECTOR = '[data-code-group-copy]';
const COPY_RESET_DELAY_MS = 1200;

interface GroupState {
  readonly group: HTMLElement;
  readonly tabs: HTMLButtonElement[];
  readonly panels: HTMLElement[];
  readonly copyButton: HTMLButtonElement | null;
}

const getPanelCodeBlock = (panel: HTMLElement): HTMLElement | null =>
  panel.querySelector<HTMLElement>('pre[data-code-block]');

const getCopyValue = (panel: HTMLElement): string | null => {
  const value = getPanelCodeBlock(panel)?.dataset['codeRaw'];
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trimEnd();
  return trimmed.length > 0 ? trimmed : null;
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

  const activePanel =
    state.panels.find((panel) => panel.dataset['codeGroupPanel'] === nextKey) ?? null;
  const copyValue = activePanel ? getCopyValue(activePanel) : null;
  if (state.copyButton) {
    state.copyButton.disabled = copyValue === null;
  }
};

const focusNextTab = (tabs: HTMLButtonElement[], currentIndex: number, delta: number): void => {
  if (tabs.length === 0) {
    return;
  }

  const nextIndex = (currentIndex + delta + tabs.length) % tabs.length;
  tabs[nextIndex]?.focus();
};

const attachCopyHandler = (state: GroupState): void => {
  if (!state.copyButton || state.copyButton.dataset['bound'] === 'true') {
    return;
  }

  const copyButton = state.copyButton;
  copyButton.dataset['bound'] = 'true';
  copyButton.addEventListener('click', () => {
    void (async () => {
      const selectedKey =
        state.group.dataset['codeGroupSelected'] ?? state.panels[0]?.dataset['codeGroupPanel'] ?? '';
      const activePanel =
        state.panels.find((panel) => panel.dataset['codeGroupPanel'] === selectedKey) ?? null;
      const copyValue = activePanel ? getCopyValue(activePanel) : null;
      if (!copyValue) {
        copyButton.disabled = true;
        return;
      }

      try {
        await navigator.clipboard.writeText(copyValue);
        copyButton.textContent = 'コピー済み';
        window.setTimeout(() => {
          copyButton.textContent = 'コピー';
        }, COPY_RESET_DELAY_MS);
      } catch {
        copyButton.textContent = '失敗';
        window.setTimeout(() => {
          copyButton.textContent = 'コピー';
        }, COPY_RESET_DELAY_MS);
      }
    })();
  });
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
    copyButton: group.querySelector<HTMLButtonElement>(COPY_BUTTON_SELECTOR),
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

  attachCopyHandler(state);
  syncSelection(state, initialKey);
  group.dataset['codeGroupEnhanced'] = 'true';
};

export const enhanceCodeGroups = (root: ParentNode): void => {
  const groups = root.querySelectorAll<HTMLElement>(GROUP_SELECTOR);
  for (const group of groups) {
    enhanceGroup(group);
  }
};
