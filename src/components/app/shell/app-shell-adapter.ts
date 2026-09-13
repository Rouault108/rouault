import type { PreparedShellUpdate, ShellAdapter } from '../../../router/router.js';
import { createLayoutSidebarShellAdapter } from './layout-sidebar-shell-adapter.js';
import { prepareStaticHeaderMutation } from './static-header-shell-mutation.js';

export const createAppShellAdapter = (): ShellAdapter => ({
  prepare(update): PreparedShellUpdate {
    const header = prepareStaticHeaderMutation(update.shell.headerHtml);
    const sidebar = createLayoutSidebarShellAdapter().prepare(update);
    return {
      commit() {
        header.commit();
        return sidebar.commit();
      },
      rollback() {
        header.rollback();
        return sidebar.rollback();
      },
    };
  },
});
