import {
  THEME_CHANGE_EVENT,
  applyThemePreference,
  isThemePreference,
  readAppliedThemePreference,
  type ThemeChangeDetail,
} from '../../theme/theme-manager.js';
import { THEME_UI_OPTIONS } from '../../theme/theme-ui-options.js';
import { layoutSidebarController } from '../../components/layout/layout-sidebar-controller.js';
import {
  enhanceLayoutHeaderTocBridge,
  toggleHeaderTocPanel,
} from './layout-header-toc-bridge.js';
import {
  isPlainPrimaryAnchorActivation,
  resolveAnchorFromActivationEvent,
} from '../../router/plain-primary-anchor-activation.js';

const HEADER_SELECTOR = 'header[data-layout-header]';
let activeEnhancement: AbortController | null = null;

const syncThemeHeader = (root: ParentNode, preference = readAppliedThemePreference()): void => {
  const option = THEME_UI_OPTIONS[preference];
  for (const header of root.querySelectorAll(HEADER_SELECTOR)) {
    const main = header.querySelector<HTMLElement>('[data-theme-preference]');
    main?.setAttribute('data-theme-preference', preference);
    const label = header.querySelector<HTMLElement>('[data-theme-current-label]');
    if (label) {
      label.textContent = option.label;
    }
    for (const item of header.querySelectorAll<HTMLElement>('[data-theme-value]')) {
      const selected = item.getAttribute('data-theme-value') === preference;
      item.setAttribute('aria-pressed', selected ? 'true' : 'false');
      if (selected) {
        item.setAttribute('data-selected', 'true');
      } else {
        item.removeAttribute('data-selected');
      }
    }
  }
};

export const enhanceLayoutHeader = (root: ParentNode, signal: AbortSignal): void => {
  activeEnhancement?.abort();
  const listenerController = new AbortController();
  activeEnhancement = listenerController;
  signal.addEventListener('abort', () => {
    if (activeEnhancement === listenerController) activeEnhancement = null;
    listenerController.abort();
  }, { once: true });
  syncThemeHeader(root);
  enhanceLayoutHeaderTocBridge(listenerController.signal);

  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const tocAnchor = resolveAnchorFromActivationEvent(event);
      if (
        tocAnchor?.matches('[data-toc-trigger]') === true &&
        isPlainPrimaryAnchorActivation(event, tocAnchor) &&
        toggleHeaderTocPanel(tocAnchor)
      ) {
        event.preventDefault();
        return;
      }

      const themeButton = target.closest<HTMLElement>('[data-theme-value]');
      if (themeButton) {
        const value = themeButton.getAttribute('data-theme-value');
        if (isThemePreference(value)) {
          applyThemePreference(value);
        }
        return;
      }

      const sidebarButton = target.closest<HTMLElement>('[data-layout-sidebar-toggle]');
      if (sidebarButton) {
        const sidebarId = sidebarButton.getAttribute('data-sidebar-id') ?? '';
        if (sidebarId.length > 0) {
          layoutSidebarController.toggle(sidebarId);
        }
      }
    },
    { signal: listenerController.signal },
  );

  window.addEventListener(
    THEME_CHANGE_EVENT,
    (event) => {
      const detail = (event as CustomEvent<ThemeChangeDetail>).detail;
      syncThemeHeader(document, detail.preference);
    },
    { signal: listenerController.signal },
  );

  document.addEventListener(
    'app-shell:committed',
    () => {
      syncThemeHeader(document);
    },
    { signal: listenerController.signal },
  );
};
