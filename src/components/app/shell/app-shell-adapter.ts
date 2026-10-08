import type { PreparedShellUpdate, ShellAdapter } from '../../../router/router.js';
import { createLayoutSidebarShellAdapter } from './layout-sidebar-shell-adapter.js';
import { prepareStaticHeaderMutation } from './static-header-shell-mutation.js';
import { prepareFooterCopyrightMutation } from './footer-shell-mutation.js';

export const createAppShellAdapter = (): ShellAdapter => ({
  prepare(update): PreparedShellUpdate {
    const header = prepareStaticHeaderMutation(update.shell.headerHtml);
    const sidebar = createLayoutSidebarShellAdapter().prepare(update);
    const footer = prepareFooterCopyrightMutation(update.shell.footerCopyrightText);
    return {
      commit() {
        header.commit();
        footer.commit();
        return sidebar.commit();
      },
      rollback() {
        header.rollback();
        footer.rollback();
        return sidebar.rollback();
      },
    };
  },
});
