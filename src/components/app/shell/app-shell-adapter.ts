import type {
  PreparedShellUpdate,
  RuntimeDocumentShellSnapshot,
  ShellAdapter,
} from '../../../router/router.js';
import {
  applyPayloadShellSnapshot,
  applyRuntimeSidebarSnapshotForRollback,
  readSidebarShellSnapshot,
} from './layout-sidebar-shell-adapter.js';
import { prepareStaticHeaderMutation } from './static-header-shell-mutation.js';

const APP_ROUTER_SELECTOR = 'app-router';
const SIDEBAR_COLUMN_SELECTOR = '[data-app-shell-sidebar-host]';
const SIDEBAR_HOST_SELECTOR = `${SIDEBAR_COLUMN_SELECTOR} layout-sidebar`;

interface SidebarProjectionHost extends HTMLElement {
  readShellProjection?(): RuntimeDocumentShellSnapshot['sidebar'];
}

let shellCommitId = 0;

export const readCurrentShellCommitId = (): number => shellCommitId;

const dispatchShellCommitted = (navigationUrl: string): void => {
  shellCommitId += 1;
  document.dispatchEvent(
    new CustomEvent('app-shell:committed', {
      detail: {
        shellCommitId,
        navigationUrl,
      },
      bubbles: true,
      composed: true,
    }),
  );
};

export const createAppShellAdapter = (): ShellAdapter => ({
  prepare(update): PreparedShellUpdate {
    const currentRouter = document.querySelector<HTMLElement>(APP_ROUTER_SELECTOR);
    const currentSidebarColumn = document.querySelector<HTMLElement>(SIDEBAR_COLUMN_SELECTOR);
    const currentSidebar = document.querySelector<SidebarProjectionHost>(SIDEBAR_HOST_SELECTOR);
    const headerMutation = prepareStaticHeaderMutation(update.shell.headerHtml);

    const previousSidebar =
      currentSidebar instanceof HTMLElement &&
      currentSidebarColumn instanceof HTMLElement &&
      !currentSidebarColumn.hidden &&
      !currentSidebar.hidden
        ? typeof currentSidebar.readShellProjection === 'function'
          ? currentSidebar.readShellProjection()
          : readSidebarShellSnapshot(currentSidebar)
        : null;
    const previousShell: RuntimeDocumentShellSnapshot = {
      headerHtml: '',
      sidebar: previousSidebar,
    };

    return {
      commit: () => {
        headerMutation.commit();
        applyPayloadShellSnapshot(update.shell, currentRouter, currentSidebarColumn, currentSidebar);
        dispatchShellCommitted(update.navigationUrl);
      },
      rollback: () => {
        headerMutation.rollback();
        applyRuntimeSidebarSnapshotForRollback(
          previousShell,
          currentRouter,
          currentSidebarColumn,
          currentSidebar,
        );
      },
    };
  },
});
