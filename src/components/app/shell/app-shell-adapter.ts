import type {
  DocumentShellSnapshot,
  PreparedShellUpdate,
  ShellAdapter,
} from '../../../router/router.js';
import {
  applyHeaderSnapshot,
  extractHeaderShellSnapshot,
  readHeaderSnapshot,
} from './layout-header-shell-adapter.js';
import {
  applySidebarSnapshot,
  extractSidebarShellSnapshot,
  readSidebarShellSnapshot,
} from './layout-sidebar-shell-adapter.js';

const HEADER_SELECTOR = 'layout-header';
const APP_ROUTER_SELECTOR = 'app-router';
const SIDEBAR_COLUMN_SELECTOR = '[data-app-shell-sidebar-host]';
const SIDEBAR_HOST_SELECTOR = `${SIDEBAR_COLUMN_SELECTOR} layout-sidebar`;

export const createAppShellAdapter = (): ShellAdapter => ({
  extract(documentSnapshot: Document) {
    const header = extractHeaderShellSnapshot(documentSnapshot);
    if (header === null) {
      return null;
    }

    return {
      header,
      sidebar: extractSidebarShellSnapshot(documentSnapshot),
    };
  },

  prepare(update): PreparedShellUpdate {
    const currentHeader = document.querySelector<HTMLElement>(HEADER_SELECTOR);
    const currentRouter = document.querySelector<HTMLElement>(APP_ROUTER_SELECTOR);
    const currentSidebarColumn = document.querySelector<HTMLElement>(SIDEBAR_COLUMN_SELECTOR);
    const currentSidebar = document.querySelector<HTMLElement>(SIDEBAR_HOST_SELECTOR);

    const previousShell: DocumentShellSnapshot | null =
      currentHeader instanceof HTMLElement
        ? {
            header: readHeaderSnapshot(currentHeader),
            sidebar:
              currentSidebar instanceof HTMLElement &&
              currentSidebarColumn instanceof HTMLElement &&
              !currentSidebarColumn.hidden
                ? readSidebarShellSnapshot(currentSidebar)
                : null,
          }
        : null;

    const nextShell = update.shell;

    return {
      commit: () => {
        if (currentHeader instanceof HTMLElement) {
          applyHeaderSnapshot(currentHeader, nextShell);
        }

        applySidebarSnapshot(nextShell, currentRouter, currentSidebarColumn, currentSidebar);
      },
      rollback: () => {
        if (currentHeader instanceof HTMLElement) {
          applyHeaderSnapshot(currentHeader, previousShell);
        }

        applySidebarSnapshot(previousShell, currentRouter, currentSidebarColumn, currentSidebar);
      },
    };
  },
});
