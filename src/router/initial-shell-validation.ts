import { validateCommittedRuntimeDomLinkContracts } from './dom-link-contract.js';
import type { RouterRuntimeUrlDependencies } from './router-types.js';
import { STATIC_HEADER_ROOT_SELECTOR } from '../../shared/navigation/static-header-contract.js';
import { parseAndValidateStaticHeaderHtml } from '../components/app/shell/static-header-shell-mutation.js';
import { readSidebarShellSnapshot } from '../components/app/shell/layout-sidebar-shell-adapter.js';
import type { AppShellValidatedDetail, RuntimeDomLinkValidationContext } from '../components/app/shell/app-shell-events.js';

export const validateInitialAppShell = (options: {
  readonly urlDependencies: RouterRuntimeUrlDependencies;
  readonly currentAbsoluteUrl: string;
  readonly normalizedNavigationUrl: string;
}): void => {
  const linkValidationContext: RuntimeDomLinkValidationContext = {
    siteUrlContext: options.urlDependencies.siteUrlContext,
    currentAbsoluteUrl: options.currentAbsoluteUrl,
    normalizedNavigationUrl: options.normalizedNavigationUrl,
    routeManifestState: options.urlDependencies.routeManifestState,
  };
  validateCommittedRuntimeDomLinkContracts({
    root: document,
    sourceLabel: 'initial-shell',
    ...linkValidationContext,
  });
  const currentHeader = document.querySelector<HTMLElement>(STATIC_HEADER_ROOT_SELECTOR);
  if (!(currentHeader instanceof HTMLElement)) {
    throw new Error(`initial ${STATIC_HEADER_ROOT_SELECTOR} is required.`);
  }
  const header = parseAndValidateStaticHeaderHtml(currentHeader.outerHTML, document);
  const sidebarColumn = document.querySelector<HTMLElement>('[data-app-shell-sidebar-host]');
  const sidebar = sidebarColumn?.querySelector<HTMLElement>('layout-sidebar') ?? null;
  const sidebarProjection =
    sidebarColumn instanceof HTMLElement &&
    sidebar instanceof HTMLElement &&
    !sidebarColumn.hidden &&
    !sidebar.hidden
      ? readSidebarShellSnapshot(sidebar)
      : null;
  const detail: AppShellValidatedDetail = {
    header: currentHeader,
    navigationUrl: options.normalizedNavigationUrl,
    shell: {
      headerHtml: header.outerHTML,
      sidebarProjection: sidebarProjection?.present === true ? sidebarProjection : null,
    },
    shellCommitId: 0,
    linkValidationContext,
  };
  document.dispatchEvent(
    new CustomEvent<AppShellValidatedDetail>('app-shell:validated', { detail }),
  );
};
