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
import { commitShellGeneration } from './app-shell-lifecycle.js';
import type { AppShellCommittedDetail } from './app-shell-events.js';
import { STATIC_HEADER_ROOT_SELECTOR } from '../../../../shared/navigation/static-header-contract.js';

const APP_ROUTER_SELECTOR = 'app-router';
const SIDEBAR_COLUMN_SELECTOR = '[data-app-shell-sidebar-host]';
const SIDEBAR_HOST_SELECTOR = `${SIDEBAR_COLUMN_SELECTOR} layout-sidebar`;

interface SidebarProjectionHost extends HTMLElement {
  readShellProjection?(): RuntimeDocumentShellSnapshot['sidebar'];
}

const dispatchShellCommitted = (detail: AppShellCommittedDetail): void => {
  document.dispatchEvent(
    new CustomEvent<AppShellCommittedDetail>('app-shell:committed', { detail }),
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
        applyPayloadShellSnapshot(
          update.shell,
          currentRouter,
          currentSidebarColumn,
          currentSidebar,
        );
        const header = document.querySelector<HTMLElement>(STATIC_HEADER_ROOT_SELECTOR);
        if (!(header instanceof HTMLElement)) {
          throw new Error(`committed ${STATIC_HEADER_ROOT_SELECTOR} is required.`);
        }
        commitShellGeneration(update.shellCommitId);
        dispatchShellCommitted({
          header,
          navigationUrl: update.navigationUrl,
          shell: update.shell,
          shellCommitId: update.shellCommitId,
        });
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
