import type { NavigationShellSnapshot } from '../../shared/navigation/navigation-shell-snapshot.js';
import { validateNavigationEnvelopeShell } from '../../shared/navigation/navigation-shell-validator.js';
import { parseAndValidateStaticHeaderHtml } from '../components/app/shell/static-header-shell-mutation.js';

export interface ContentTransitionShell {
  readonly kind: 'note' | 'page';
  readonly layoutKey: string;
}

// BaseLayoutが生成する既知profileを検証する。配置の一致は有効性と別の情報にする。
export const readContentTransitionShell = (
  input: NavigationShellSnapshot,
  owner: Document,
): ContentTransitionShell | null => {
  try {
    const shell = validateNavigationEnvelopeShell(input);
    const header = parseAndValidateStaticHeaderHtml(shell.headerHtml, owner);
    const note = header.getAttribute('data-note-layout') === 'true';
    const sidebarEnabled = header.getAttribute('data-sidebar-enabled') === 'true';
    const tocPresence = header.getAttribute('data-toc-presence');
    const tocReserved = header.getAttribute('data-toc-trigger-reserved') === 'true';
    const sidebar = shell.sidebarProjection;
    if (
      header.className !== 'layout-header' ||
      sidebarEnabled !== (sidebar !== null) ||
      (!note && sidebarEnabled) ||
      (tocPresence === 'absent' && tocReserved) ||
      (sidebar !== null &&
        (header.getAttribute('data-sidebar-id') !== sidebar.sidebarId ||
          !Number.isFinite(sidebar.fixedBreakpoint) ||
          sidebar.fixedBreakpoint <= 0))
    )
      return null;
    return {
      kind: note ? 'note' : 'page',
      layoutKey: JSON.stringify([
        note,
        sidebarEnabled,
        tocPresence,
        tocReserved,
        sidebar
          ? [
              sidebar.sidebarId,
              sidebar.stateScopeId,
              sidebar.presentation,
              sidebar.fixedBreakpoint,
              sidebar.topologyRevision,
            ]
          : null,
        shell.footerCopyrightText ?? null,
      ]),
    };
  } catch {
    return null;
  }
};
