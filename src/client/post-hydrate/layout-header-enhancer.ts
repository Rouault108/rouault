import {
  THEME_CHANGE_EVENT,
  THEME_ATTRIBUTE,
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
import { resolveStaticIconBody, type IconName } from '../../../shared/icons/icon-paths.js';
import { APP_SHELL_ROOT_SELECTOR } from '../../../shared/app-shell/app-shell-root-contract.js';
import {
  HEADER_ENHANCER_STATE,
  HEADER_READY_COMMIT_ID,
  SIDEBAR_ENHANCEMENT_STATE,
  SIDEBAR_ENHANCEMENT_COMMIT_ID,
} from '../../../shared/navigation/sidebar-enhancement-contract.js';
import { readCurrentShellCommitId } from '../../components/app/shell/app-shell-lifecycle.js';

const HEADER_SELECTOR = 'header[data-layout-header]';
const SIDEBAR_TOGGLE_OPEN_LABEL = 'サイドバーを開く';
const SIDEBAR_TOGGLE_CLOSE_LABEL = 'サイドバーを閉じる';
const APP_SHELL_SYNC_EVENTS = [
  'app-shell:committed',
  'app-shell:rollback-start',
  'app-shell:restored',
] as const;
let activeEnhancement: AbortController | null = null;

const patchStaticIcon = (container: Element | null, iconName: IconName): void => {
  const svg = container?.querySelector('svg[data-icon]');
  if (!(svg instanceof SVGElement)) {
    return;
  }
  svg.setAttribute('data-icon', iconName);
  svg.innerHTML = resolveStaticIconBody(iconName);
};

const syncThemeHeader = (root: ParentNode, preference = readAppliedThemePreference()): void => {
  const option = THEME_UI_OPTIONS[preference];
  for (const header of root.querySelectorAll(HEADER_SELECTOR)) {
    const trigger = header.querySelector<HTMLElement>('[data-theme-switcher] summary');
    trigger?.setAttribute('aria-label', `テーマ: ${option.label}`);
    const main = header.querySelector<HTMLElement>('[data-theme-preference]');
    main?.setAttribute('data-theme-preference', preference);
    patchStaticIcon(main?.querySelector('.theme-trigger-icon') ?? null, option.icon);
    const label = header.querySelector<HTMLElement>('[data-theme-current-label]');
    if (label) {
      label.textContent = option.label;
    }
    for (const item of header.querySelectorAll<HTMLElement>('[data-theme-value]')) {
      const value = item.getAttribute('data-theme-value');
      const itemOption = isThemePreference(value) ? THEME_UI_OPTIONS[value] : null;
      const selected = value === preference;
      item.setAttribute('aria-pressed', selected ? 'true' : 'false');
      if (selected) {
        item.setAttribute('data-selected', 'true');
      } else {
        item.removeAttribute('data-selected');
      }
      if (itemOption !== null) {
        patchStaticIcon(item, itemOption.icon);
      }
    }
  }
};

const syncSidebarHeader = (
  header: HTMLElement,
  snapshot: LayoutSidebarControllerSnapshot,
): void => {
  const overlaySidebarOpen = snapshot.mode === 'overlay' && snapshot.state === 'expanded';
  const sidebarExpanded = snapshot.state === 'expanded';
  header.setAttribute('data-sidebar-mode', snapshot.mode);
  header.setAttribute('data-sidebar-state', snapshot.state);
  header.setAttribute('data-overlay-sidebar-open', overlaySidebarOpen ? 'true' : 'false');

  const sidebarButton = header.querySelector<HTMLElement>('[data-layout-sidebar-toggle]');
  if (sidebarButton === null) {
    return;
  }

  const shell = header.closest(APP_SHELL_ROOT_SELECTOR);
  const generation = String(readCurrentShellCommitId());
  sidebarButton.hidden = !(
    shell?.getAttribute(HEADER_ENHANCER_STATE) === 'ready' &&
    shell.getAttribute(HEADER_READY_COMMIT_ID) === generation &&
    shell.getAttribute(SIDEBAR_ENHANCEMENT_STATE) === 'active' &&
    shell.getAttribute(SIDEBAR_ENHANCEMENT_COMMIT_ID) === generation &&
    shell.querySelector('aside[data-layout-sidebar-root]:not([hidden])') !== null &&
    header.getAttribute('data-sidebar-enabled') === 'true' &&
    snapshot.mode === 'overlay'
  );

  sidebarButton.setAttribute('aria-expanded', sidebarExpanded ? 'true' : 'false');
  sidebarButton.setAttribute(
    'aria-label',
    sidebarExpanded ? SIDEBAR_TOGGLE_CLOSE_LABEL : SIDEBAR_TOGGLE_OPEN_LABEL,
  );
};

const syncSidebarHeaders = (root: ParentNode, signal: AbortSignal): void => {
  const shell = document.querySelector<HTMLElement>(APP_SHELL_ROOT_SELECTOR);
  if (!shell || signal.aborted) return;
  const clear = (): void => {
    shell.removeAttribute(HEADER_ENHANCER_STATE);
    shell.removeAttribute(HEADER_READY_COMMIT_ID);
    for (const button of shell.querySelectorAll<HTMLElement>('[data-layout-sidebar-toggle]'))
      button.hidden = true;
  };
  clear();
  const headers = root.querySelectorAll<HTMLElement>(HEADER_SELECTOR);
  if (headers.length !== 1) return;
  for (const header of root.querySelectorAll<HTMLElement>(HEADER_SELECTOR)) {
    const sidebarId = header.getAttribute('data-sidebar-id') ?? '';
    if (sidebarId.trim().length === 0) {
      continue;
    }
    const triggers = header.querySelectorAll('[data-layout-sidebar-toggle]');
    if (triggers.length !== (header.getAttribute('data-sidebar-enabled') === 'true' ? 1 : 0))
      return;
    const observer = new MutationObserver(() => {
      syncSidebarHeader(header, layoutSidebarController.getSnapshot(sidebarId));
    });
    observer.observe(shell, {
      attributes: true,
      attributeFilter: [SIDEBAR_ENHANCEMENT_STATE, SIDEBAR_ENHANCEMENT_COMMIT_ID],
    });

    let unsubscribe: (() => void) | null = null;
    const cleanup = (): void => {
      clear();
      observer.disconnect();
      unsubscribe?.();
    };
    signal.addEventListener('abort', cleanup, { once: true });
    try {
      unsubscribe = layoutSidebarController.subscribe(sidebarId, (snapshot) => {
        syncSidebarHeader(header, snapshot);
      });

      shell.setAttribute(HEADER_READY_COMMIT_ID, String(readCurrentShellCommitId()));
      shell.setAttribute(HEADER_ENHANCER_STATE, 'ready');
      syncSidebarHeader(header, layoutSidebarController.getSnapshot(sidebarId));
    } catch (error) {
      cleanup();
      throw error;
    }
  }
};

export const enhanceLayoutHeader = (root: ParentNode, signal: AbortSignal): void => {
  if (signal.aborted) return;
  activeEnhancement?.abort();
  const listenerController = new AbortController();
  const menuController = createStaticHeaderMenuController();
  const themeObserver =
    typeof MutationObserver === 'function'
      ? new MutationObserver(() => {
          syncThemeHeader(document, readAppliedThemePreference(document.documentElement));
        })
      : null;
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
      themeObserver?.disconnect();
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
  try {
    syncThemeHeader(root);
    syncCurrentSidebarHeaders(root);
    themeObserver?.observe(document.documentElement, {
      attributeFilter: [THEME_ATTRIBUTE],
      attributes: true,
    });
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
        if (sidebarButton && !sidebarButton.hidden) {
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

    for (const eventName of APP_SHELL_SYNC_EVENTS) {
      document.addEventListener(
        eventName,
        () => {
          if (eventName === 'app-shell:rollback-start') {
            sidebarSyncController?.abort();
            return;
          }
          syncThemeHeader(document);
          syncCurrentSidebarHeaders(document);
        },
        { signal: listenerController.signal },
      );
    }
  } catch (error) {
    listenerController.abort();
    if (activeEnhancement === listenerController) activeEnhancement = null;
    throw error;
  }
};
