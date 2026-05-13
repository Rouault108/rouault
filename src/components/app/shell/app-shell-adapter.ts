import type {
  PayloadDocumentShellSnapshot,
  RuntimeDocumentShellSnapshot,
  PreparedShellUpdate,
  ShellAdapter,
} from '../../../router/router.js';
import {
  applyHeaderSnapshot,
  readHeaderSnapshot,
  SAFE_FALLBACK_HEADER_SHELL_PROJECTION,
} from './layout-header-shell-adapter.js';
import {
  applyPayloadShellSnapshot,
  applyRuntimeSidebarSnapshotForRollback,
  readSidebarShellSnapshot,
} from './layout-sidebar-shell-adapter.js';

const HEADER_SELECTOR = 'layout-header';
const APP_ROUTER_SELECTOR = 'app-router';
const SIDEBAR_COLUMN_SELECTOR = '[data-app-shell-sidebar-host]';
const SIDEBAR_HOST_SELECTOR = `${SIDEBAR_COLUMN_SELECTOR} layout-sidebar`;

interface HeaderProjectionHost extends HTMLElement {
  readShellProjection?(): PayloadDocumentShellSnapshot['header'];
}

interface SidebarProjectionHost extends HTMLElement {
  readShellProjection?(): RuntimeDocumentShellSnapshot['sidebar'];
}

export const createAppShellAdapter = (): ShellAdapter => ({
  prepare(update): PreparedShellUpdate {
    const currentHeader = document.querySelector<HeaderProjectionHost>(HEADER_SELECTOR);
    const currentRouter = document.querySelector<HTMLElement>(APP_ROUTER_SELECTOR);
    const currentSidebarColumn = document.querySelector<HTMLElement>(SIDEBAR_COLUMN_SELECTOR);
    const currentSidebar = document.querySelector<SidebarProjectionHost>(SIDEBAR_HOST_SELECTOR);

    const previousHeader =
      currentHeader instanceof HTMLElement
        ? typeof currentHeader.readShellProjection === 'function'
          ? currentHeader.readShellProjection()
          : readHeaderSnapshot(currentHeader)
        : SAFE_FALLBACK_HEADER_SHELL_PROJECTION;
    const previousSidebar =
      currentSidebar instanceof HTMLElement &&
      currentSidebarColumn instanceof HTMLElement &&
      !currentSidebarColumn.hidden &&
      !currentSidebar.hidden
        ? typeof currentSidebar.readShellProjection === 'function'
          ? currentSidebar.readShellProjection()
          : readSidebarShellSnapshot(currentSidebar)
        : null;
    const previousShell: RuntimeDocumentShellSnapshot | null =
      currentHeader instanceof HTMLElement || currentSidebar instanceof HTMLElement
        ? {
            header: previousHeader,
            sidebar: previousSidebar,
          }
        : null;

    const nextShell = update.shell;

    return {
      commit: () => {
        if (currentHeader instanceof HTMLElement) {
          applyHeaderSnapshot(currentHeader, nextShell);
        }

        applyPayloadShellSnapshot(nextShell, currentRouter, currentSidebarColumn, currentSidebar);
      },
      rollback: () => {
        if (currentHeader instanceof HTMLElement) {
          applyHeaderSnapshot(currentHeader, previousShell);
        }

        applyRuntimeSidebarSnapshotForRollback(previousShell, currentRouter, currentSidebarColumn, currentSidebar);
      },
    };
  },
});
