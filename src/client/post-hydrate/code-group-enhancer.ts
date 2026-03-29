const ENHANCED_ATTRIBUTE = 'data-code-group-enhanced';

const getTabs = (root: HTMLElement): HTMLButtonElement[] =>
  Array.from(root.querySelectorAll<HTMLButtonElement>(':scope > [role="tablist"] > [role="tab"]'));

const getPanels = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(':scope > [role="tabpanel"]'));

const selectTab = (root: HTMLElement, nextValue: string, focusTarget: boolean): void => {
  const tabs = getTabs(root);
  const panels = getPanels(root);

  tabs.forEach((tab) => {
    const selected = tab.getAttribute('data-code-group-tab') === nextValue;
    tab.setAttribute('aria-selected', selected ? 'true' : 'false');
    tab.tabIndex = selected ? 0 : -1;
    if (selected && focusTarget) {
      tab.focus();
    }
  });

  panels.forEach((panel) => {
    panel.hidden = panel.getAttribute('data-code-group-panel') !== nextValue;
  });
};

const moveFocus = (root: HTMLElement, nextIndex: number): void => {
  const tabs = getTabs(root);
  const nextTab = tabs[nextIndex];
  const nextValue = nextTab?.getAttribute('data-code-group-tab') ?? '';
  if (nextValue.length > 0) {
    selectTab(root, nextValue, true);
  }
};

export const activateCodeGroupEnhancer = (element: HTMLElement): void => {
  if (
    element.tagName.toLowerCase() !== 'section' ||
    !element.hasAttribute('data-code-group') ||
    element.hasAttribute(ENHANCED_ATTRIBUTE)
  ) {
    return;
  }

  const root = element;
  const tabs = getTabs(root);
  if (tabs.length === 0) {
    return;
  }

  root.setAttribute(ENHANCED_ATTRIBUTE, '');

  const initialValue =
    tabs.find((tab) => tab.getAttribute('aria-selected') === 'true')?.getAttribute('data-code-group-tab') ??
    tabs[0]?.getAttribute('data-code-group-tab') ??
    '';
  if (initialValue.length === 0) {
    return;
  }

  selectTab(root, initialValue, false);

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => {
      const value = tab.getAttribute('data-code-group-tab') ?? '';
      if (value.length > 0) {
        selectTab(root, value, false);
      }
    });

    tab.addEventListener('keydown', (event) => {
      switch (event.key) {
        case 'ArrowRight':
          event.preventDefault();
          moveFocus(root, (index + 1) % tabs.length);
          break;
        case 'ArrowLeft':
          event.preventDefault();
          moveFocus(root, (index - 1 + tabs.length) % tabs.length);
          break;
        case 'Home':
          event.preventDefault();
          moveFocus(root, 0);
          break;
        case 'End':
          event.preventDefault();
          moveFocus(root, tabs.length - 1);
          break;
        case 'Enter':
        case ' ': {
          event.preventDefault();
          const value = tab.getAttribute('data-code-group-tab') ?? '';
          if (value.length > 0) {
            selectTab(root, value, true);
          }
          break;
        }
        default:
          break;
      }
    });
  });
};
