export const APP_SHELL_SIDEBAR_OVERLAY_LAYER_ATTRIBUTE = 'data-app-shell-sidebar-overlay-layer';

export const APP_SHELL_SIDEBAR_OVERLAY_LAYER_SELECTOR = `[${APP_SHELL_SIDEBAR_OVERLAY_LAYER_ATTRIBUTE}]`;

const APP_ROOT_SELECTOR = '#app';
const FOOTER_SELECTOR = 'layout-footer';

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

  const appRoot = documentRoot.querySelector<HTMLElement>(APP_ROOT_SELECTOR);
  const footer = appRoot?.querySelector<HTMLElement>(FOOTER_SELECTOR) ?? null;

  if (appRoot instanceof HTMLElement) {
    if (footer instanceof HTMLElement && footer.parentElement === appRoot) {
      appRoot.insertBefore(layer, footer);
    } else {
      appRoot.append(layer);
    }
    return layer;
  }

  documentRoot.body.append(layer);
  return layer;
};
