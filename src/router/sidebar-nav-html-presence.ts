export {
  SidebarNavHtmlPresenceError,
  assertRuntimeSidebarNavHtmlPresence,
} from '../../shared/navigation/sidebar-nav-html-presence.js';

import { assertRuntimeSidebarNavHtmlPresence } from '../../shared/navigation/sidebar-nav-html-presence.js';

/** @deprecated Use assertRuntimeSidebarNavHtmlPresence({ sidebarPresent, navHtml }) instead. */
export const assertRuntimePresentSidebarNavHtml = (
  navHtml: unknown,
  sourceLabel = 'navigation-envelope',
): string => {
  assertRuntimeSidebarNavHtmlPresence({
    sidebarPresent: true,
    navHtml,
    sourceLabel,
  });
  return navHtml as string;
};
