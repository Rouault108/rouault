import {
  THEME_CHANGE_EVENT,
  applyThemePreference,
  isThemePreference,
  readAppliedThemePreference,
  type ThemeChangeDetail,
} from '../../theme/theme-manager.js';
import { THEME_UI_OPTIONS } from '../../theme/theme-ui-options.js';
import { layoutSidebarController } from '../../components/layout/layout-sidebar-controller.js';
import type { LayoutSidebarControllerSnapshot } from '../../components/layout/layout-sidebar-controller.js';
import { enhanceLayoutHeaderTocBridge, toggleHeaderTocPanel } from './layout-header-toc-bridge.js';
import { createStaticHeaderMenuController } from './static-header-menu-controller.js';
import {
  isPlainPrimaryAnchorActivation,
  resolveAnchorFromActivationEvent,
} from '../../router/plain-primary-anchor-activation.js';

const HEADER_SELECTOR = 'header[data-layout-header]';
const SIDEBAR_TOGGLE_OPEN_LABEL = 'サイドバーを開く';
const SIDEBAR_TOGGLE_CLOSE_LABEL = 'サイドバーを閉じる';
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

const syncSidebarHeader = (
  header: HTMLElement,
  snapshot: LayoutSidebarControllerSnapshot,
): void => {
  const overlaySidebarOpen = snapshot.mode === 'overlay' && snapshot.state === 'expanded';
  header.setAttribute('data-sidebar-mode', snapshot.mode);
  header.setAttribute('data-sidebar-state', snapshot.state);
  header.setAttribute('data-overlay-sidebar-open', overlaySidebarOpen ? 'true' : 'false');

  const sidebarButton = header.querySelector<HTMLElement>('[data-layout-sidebar-toggle]');
  if (sidebarButton === null) {
    return;
  }

  sidebarButton.setAttribute('aria-expanded', overlaySidebarOpen ? 'true' : 'false');
  sidebarButton.setAttribute(
    'aria-label',
    overlaySidebarOpen ? SIDEBAR_TOGGLE_CLOSE_LABEL : SIDEBAR_TOGGLE_OPEN_LABEL,
  );
};

const syncSidebarHeaders = (root: ParentNode, signal: AbortSignal): void => {
  for (const header of root.querySelectorAll<HTMLElement>(HEADER_SELECTOR)) {
    const sidebarId = header.getAttribute('data-sidebar-id') ?? '';
    if (sidebarId.trim().length === 0) {
      continue;
    }

    const unsubscribe = layoutSidebarController.subscribe(sidebarId, (snapshot) => {
      syncSidebarHeader(header, snapshot);
    });

    if (signal.aborted) {
      unsubscribe();
      continue;
    }

    signal.addEventListener('abort', unsubscribe, { once: true });
  }
};

export const enhanceLayoutHeader = (root: ParentNode, signal: AbortSignal): void => {
  activeEnhancement?.abort();
  const listenerController = new AbortController();
  const menuController = createStaticHeaderMenuController();
  let sidebarSyncController: AbortController | null = null;
  const syncCurrentSidebarHeaders = (syncRoot: ParentNode): void => {
    sidebarSyncController?.abort();
    sidebarSyncController = new AbortController();
    syncSidebarHeaders(syncRoot, sidebarSyncController.signal);
  };
  listenerController.signal.addEventListener(
    'abort',
    () => {
      sidebarSyncController?.abort();
      sidebarSyncController = null;
      menuController.dispose();
    },
    { once: true },
  );
  activeEnhancement = listenerController;
  signal.addEventListener(
    'abort',
    () => {
      if (activeEnhancement === listenerController) activeEnhancement = null;
      listenerController.abort();
    },
    { once: true },
  );
  syncThemeHeader(root);
  syncCurrentSidebarHeaders(root);
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
          layoutSidebarController.toggle(sidebarId, sidebarButton);
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
      syncCurrentSidebarHeaders(document);
    },
    { signal: listenerController.signal },
  );
};
