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
} from '../../../shared/navigation/sidebar-enhancement-contract.js';
import { readCurrentShellCommitId } from '../../components/app/shell/app-shell-lifecycle.js';
import type { AppShellRollbackStartDetail } from '../../components/app/shell/app-shell-events.js';
import {
  beforeSidebarShellMutation,
  connectSidebarHeaderPort,
  readSidebarHeaderPort,
  type SidebarHeaderDisplay,
} from '../../components/layout/sidebar-presentation-coordination.js';

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

const syncSidebarHeaders = (root: ParentNode, signal: AbortSignal): void => {
  const shell = document.querySelector<HTMLElement>(APP_SHELL_ROOT_SELECTOR);
  if (!shell || signal.aborted) return;
  const headers = root.querySelectorAll<HTMLElement>(HEADER_SELECTOR);
  if (headers.length !== 1) return;
  const header = headers[0];
  if (!header) return;
  const sidebarId = header.getAttribute('data-sidebar-id') ?? '';
  if (!sidebarId.trim()) return;
  const buttons = header.querySelectorAll<HTMLButtonElement>('[data-layout-sidebar-toggle]');
  if (buttons.length !== (header.getAttribute('data-sidebar-enabled') === 'true' ? 1 : 0)) return;
  const button = buttons[0] ?? null;
  const render = (display: SidebarHeaderDisplay): void => {
    header.setAttribute('data-sidebar-mode', display.mode);
    header.setAttribute('data-sidebar-state', display.state);
    header.setAttribute(
      'data-overlay-sidebar-open',
      String(display.active && display.mode === 'overlay' && display.state === 'expanded'),
    );
    if (!button) return;
    button.hidden = !display.triggerVisible;
    button.setAttribute('aria-expanded', String(display.state === 'expanded'));
    button.setAttribute(
      'aria-label',
      display.state === 'expanded' ? SIDEBAR_TOGGLE_CLOSE_LABEL : SIDEBAR_TOGGLE_OPEN_LABEL,
    );
  };
  const finish = beforeSidebarShellMutation(header);
  shell.setAttribute(HEADER_READY_COMMIT_ID, String(readCurrentShellCommitId()));
  shell.setAttribute(HEADER_ENHANCER_STATE, 'ready');
  const disconnect = connectSidebarHeaderPort(
    shell,
    { header, button, sidebarId, generation: readCurrentShellCommitId(), render },
    () => {
      // 新しいheaderのreadinessを古いcleanupで消さない。
      if (!readSidebarHeaderPort(shell)) {
        shell.removeAttribute(HEADER_ENHANCER_STATE);
        shell.removeAttribute(HEADER_READY_COMMIT_ID);
      }
      render({ mode: 'overlay', state: 'expanded', active: false, triggerVisible: false });
    },
  );
  finish();
  signal.addEventListener('abort', disconnect, { once: true });
  const interrupted = (): boolean => signal.aborted;
  if (interrupted()) disconnect();
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
        (event: Event) => {
          if (eventName === 'app-shell:rollback-start') {
            const detail = (event as CustomEvent<AppShellRollbackStartDetail>).detail;
            const current = readCurrentShellCommitId();
            if (
              detail.failedShellCommitId !== current &&
              !(detail.previousShellCommitId === current && detail.failedShellCommitId > current)
            )
              return;
            const header = document.querySelector(HEADER_SELECTOR);
            const finish = header ? beforeSidebarShellMutation(header) : null;
            try {
              sidebarSyncController?.abort();
            } finally {
              finish?.();
            }
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
