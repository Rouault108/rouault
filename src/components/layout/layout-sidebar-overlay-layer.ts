import { APP_SHELL_ROOT_SELECTOR } from '../../../shared/app-shell/app-shell-root-contract.js';

export const APP_SHELL_SIDEBAR_OVERLAY_LAYER_ATTRIBUTE = 'data-app-shell-sidebar-overlay-layer';

export const APP_SHELL_SIDEBAR_OVERLAY_LAYER_SELECTOR = `[${APP_SHELL_SIDEBAR_OVERLAY_LAYER_ATTRIBUTE}]`;

const FOOTER_SELECTOR = '[data-layout-footer]';

export const ensureLayoutSidebarOverlayLayer = (documentRoot: Document): HTMLElement => {
  const existing = documentRoot.querySelector<HTMLElement>(
    APP_SHELL_SIDEBAR_OVERLAY_LAYER_SELECTOR,
  );

  if (existing instanceof HTMLElement) {
    return existing;
  }

  const layer = documentRoot.createElement('div');
  layer.className = 'layout-sidebar-overlay-layer';
  layer.setAttribute(APP_SHELL_SIDEBAR_OVERLAY_LAYER_ATTRIBUTE, '');

  const appShellRoot = documentRoot.querySelector<HTMLElement>(APP_SHELL_ROOT_SELECTOR);
  const footer = appShellRoot?.querySelector<HTMLElement>(FOOTER_SELECTOR) ?? null;

  if (appShellRoot instanceof HTMLElement) {
    if (footer instanceof HTMLElement && footer.parentElement === appShellRoot) {
      appShellRoot.insertBefore(layer, footer);
    } else {
      appShellRoot.append(layer);
    }
    return layer;
  }

  documentRoot.body.append(layer);
  return layer;
};
