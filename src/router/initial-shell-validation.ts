import { validateCommittedRuntimeDomLinkContracts } from './dom-link-contract.js';
import type { RouterRuntimeUrlDependencies } from './router-types.js';
import { STATIC_HEADER_ROOT_SELECTOR } from '../../shared/navigation/static-header-contract.js';
import { readCanonicalStaticHeaderHtml } from '../components/app/shell/static-header-shell-mutation.js';
import { readLayoutFooterCopyrightText } from '../components/app/shell/footer-shell-mutation.js';
import {
  readSidebarShellSnapshot,
  SIDEBAR_ROOT_SELECTOR,
} from '../components/app/shell/layout-sidebar-shell-adapter.js';
import type {
  AppShellValidatedDetail,
  RuntimeDomLinkValidationContext,
} from '../components/app/shell/app-shell-events.js';

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
  const headerHtml = readCanonicalStaticHeaderHtml(currentHeader);
  const sidebarRoot = document.querySelector(SIDEBAR_ROOT_SELECTOR);
  const sidebar = sidebarRoot ? readSidebarShellSnapshot(sidebarRoot) : null;
  const detail: AppShellValidatedDetail = {
    header: currentHeader,
    navigationUrl: options.normalizedNavigationUrl,
    shell: {
      headerHtml,
      sidebarProjection: sidebar?.present ? sidebar : null,
      footerCopyrightText: readLayoutFooterCopyrightText(),
    },
    shellCommitId: 0,
    linkValidationContext,
  };
  document.dispatchEvent(
    new CustomEvent<AppShellValidatedDetail>('app-shell:validated', { detail }),
  );
};
